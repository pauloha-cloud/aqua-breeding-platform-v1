import time
import logging
import json
from google.cloud import monitoring_v3
from app.config import settings

logger = logging.getLogger(__name__)

class StemmaTelemetry:
    def __init__(self):
        self.client = monitoring_v3.MetricServiceClient()
        self.project_name = f"projects/{settings.project_id}"

    def log_structured(self, severity: str, message: str, payload: dict):
        """
        Gera um log estruturado compatível com o Cloud Logging.
        """
        log_entry = {
            "severity": severity,
            "message": message,
            **payload
        }
        print(json.dumps(log_entry))

    def record_latency(self, metric_name: str, value: float, job_id: str):
        """
        Grava latência customizada no Cloud Monitoring.
        """
        series = monitoring_v3.TimeSeries()
        series.metric.type = f"custom.googleapis.com/stemma/worker/{metric_name}"
        series.resource.type = "global"
        
        point = monitoring_v3.Point()
        point.value.double_value = value
        now = time.time()
        point.interval.end_time.seconds = int(now)
        point.interval.end_time.nanos = int((now - int(now)) * 10**9)
        series.points = [point]
        
        try:
            self.client.create_time_series(name=self.project_name, time_series=[series])
        except Exception as e:
            logger.error(f"Failed to record metric {metric_name}: {e}")

    def record_job_status(self, status: str):
        """
        Incrementa contador de status de jobs.
        """
        # Semelhante ao record_latency, mas para contadores binários/status
        pass

telemetry = StemmaTelemetry()
