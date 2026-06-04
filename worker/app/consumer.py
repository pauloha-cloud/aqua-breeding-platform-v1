from fastapi import FastAPI, BackgroundTasks, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.domain.models import JobMessage
from app.process_job import JobProcessor
from app.infrastructure.monitoring import telemetry
from app.infrastructure.gcs_service import GCSService
from app.config import settings
import logging
import uuid
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = JobProcessor()
gcs = GCSService()
logger = logging.getLogger(__name__)

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/api/jobs/upload")
async def upload_genetic_data(
    background_tasks: BackgroundTasks,
    genetic_data: UploadFile = File(...),
    project_specification: str = Form(...),
):
    try:
        job_id = f"ST-{uuid.uuid4().hex[:9].upper()}"
        file_ext = os.path.splitext(genetic_data.filename)[1]
        object_name = f"uploads/{job_id}/genetic_data{file_ext}"
        
        tmp_path = f"/tmp/{genetic_data.filename}"
        with open(tmp_path, "wb") as f:
            f.write(await genetic_data.read())
            
        input_bucket = "stemma-inputs"
        gcs.upload_file(input_bucket, object_name, tmp_path)
        
        os.remove(tmp_path)
        
        job = JobMessage(
            job_id=job_id,
            tenant_id="default-tenant",
            org_id="default-org",
            input_bucket=input_bucket,
            genetic_data_object=object_name,
            output_bucket=settings.output_bucket,
            output_prefix="results",
            requested_by="user",
            correlation_id=uuid.uuid4().hex
        )
        
        telemetry.log_structured("INFO", f"Job {job.job_id} created via API", {"project_specification": project_specification})
        
        background_tasks.add_task(processor.process, job)
        
        return {"success": True, "jobId": job.job_id, "status": "queued"}
        
    except Exception as e:
        logger.error(f"Error during file upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/pubsub/handler")
async def handler(request: Request, background_tasks: BackgroundTasks):
    """
    Consumes messages from Google Cloud Pub/Sub via Cloud Run push subscription.
    """
    try:
        body = await request.json()
        job = JobMessage(**body)
        telemetry.log_structured("INFO", f"Received job {job.job_id}", {"handler": "pubsub"})
        background_tasks.add_task(processor.process, job)
        return {"status": "accepted", "job_id": job.job_id}
    except Exception as e:
        telemetry.log_structured("ERROR", "Failed to handle pubsub event", {"error": str(e)})
        return {"status": "error", "message": str(e)}, 400
