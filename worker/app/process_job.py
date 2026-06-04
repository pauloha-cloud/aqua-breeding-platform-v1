import time
from __future__ import annotations
import logging
import json
import os
import tempfile
from pathlib import Path
from app.domain.models import JobMessage, StructuredScientificResult
from app.infrastructure.r_runner import RScriptRunner
from app.services.vertex.ai_service import VertexAIInsightService
from app.infrastructure.gcs_service import GCSService
from app.config import settings
from app.infrastructure.monitoring import telemetry
from app.data_prep import prepare_genetic_input

logger = logging.getLogger(__name__)

class JobProcessor:
    def __init__(self):
        self.r_runner = RScriptRunner(settings.r_script_path)
        self.gcs = GCSService()
        self.ai_service = VertexAIInsightService(
            settings.project_id, 
            settings.location, 
            settings.vertex_model
        )

    def process(self, job: JobMessage):
        start_time = time.time()
        telemetry.log_structured("INFO", f"Job {job.job_id} started", {"correlation_id": job.correlation_id})
        
        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                tmp_path = Path(tmp_dir)
                
                # 1. Download Inputs from GCS
                if job.genetic_data_object:
                    telemetry.log_structured("INFO", "Processing single genetic data file", {"job_id": job.job_id})
                    genetic_file_ext = os.path.splitext(job.genetic_data_object)[1] or '.csv'
                    genetic_local = self.gcs.download_file(
                        job.input_bucket,
                        job.genetic_data_object,
                        str(tmp_path / f"genetic_data{genetic_file_ext}")
                    )
                    pheno_local, ped_local = prepare_genetic_input(genetic_local, str(tmp_path))
                else:
                    telemetry.log_structured("INFO", "Processing separate phenotype/pedigree files", {"job_id": job.job_id})
                    pheno_local = self.gcs.download_file(
                        job.input_bucket, 
                        job.phenotype_object, 
                        str(tmp_path / "phenotype.csv")
                    )
                    ped_local = self.gcs.download_file(
                        job.input_bucket, 
                        job.pedigree_object, 
                        str(tmp_path / "pedigree.csv")
                    )
                
                # 2. Execute R Script
                r_start = time.time()
                r_output_dir = tmp_path / "output"
                result = self.r_runner.run(pheno_local, ped_local, str(r_output_dir))
                telemetry.record_latency("r_runner_latency", time.time() - r_start, job.job_id)
                
                # 3. Upload Results to GCS
                for filename, local_path in result.files.items():
                    gcs_object = f"{job.output_prefix}/{job.job_id}/{filename}"
                    self.gcs.upload_file(job.output_bucket, gcs_object, local_path)
                
                # 4. Process Scientific Results (Mocking for now, as before)
                # structured_result = self._parse_r_outputs(result.files)
                
                # 5. Generate AI Insights
                # ai_artifacts = self.ai_service.generate_insights(structured_result, job.job_id)
                
                total_latency = time.time() - start_time
                telemetry.record_latency("total_job_latency", total_latency, job.job_id)
                telemetry.log_structured("INFO", f"Job {job.job_id} completed successfully", {"latency": total_latency})

        except Exception as e:
            total_latency = time.time() - start_time
            telemetry.log_structured("ERROR", f"Job {job.job_id} failed", {"error": str(e), "latency": total_latency})
            telemetry.record_job_status("job_failure")
            raise
        
    def _parse_r_outputs(self, files: dict) -> StructuredScientificResult:
        # Implementation to read CSVs and build the DTO
        pass
