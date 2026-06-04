import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Settings:
    project_id: str = os.getenv("GOOGLE_CLOUD_PROJECT", "stemma-dev")
    location: str = os.getenv("VERTEX_LOCATION", "us-central1")
    vertex_model: str = os.getenv("VERTEX_MODEL", "gemini-1.5-pro")
    r_script_path: str = os.getenv("R_SCRIPT_PATH", "/app/r/motor_ch4_1.R")
    output_bucket: str = os.getenv("OUTPUT_BUCKET", "stemma-results")

settings = Settings()
