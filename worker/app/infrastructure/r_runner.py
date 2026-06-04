import subprocess
import logging
import os
from pathlib import Path
from typing import List, Optional, Tuple
from app.domain.models import RExecutionResult
from app.domain.exceptions import RExecutionError

logger = logging.getLogger(__name__)

class RScriptRunner:
    def __init__(self, script_path: str, timeout_sec: int = 300):
        self.script_path = Path(script_path)
        self.timeout_sec = timeout_sec
        if not self.script_path.exists():
            raise RExecutionError(f"R script not found at {script_path}")

    def run(self, phenotype_csv: str, pedigree_csv: str, output_dir: str) -> RExecutionResult:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        cmd = ["Rscript", str(self.script_path), phenotype_csv, pedigree_csv, str(output_path)]
        
        try:
            logger.info(f"Running R command: {' '.join(cmd)}")
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout_sec,
                check=False
            )
            
            if proc.returncode != 0:
                logger.error(f"R script failed with code {proc.returncode}: {proc.stderr}")
                raise RExecutionError(proc.stderr)
            
            # Discover produced files
            files = {str(p.name): str(p) for p in output_path.glob("*") if p.is_file()}
            
            return RExecutionResult(
                stdout=proc.stdout,
                stderr=proc.stderr,
                return_code=proc.returncode,
                output_dir=str(output_path),
                files=files
            )
        except subprocess.TimeoutExpired:
            logger.error("R script timed out")
            raise RExecutionError("R execution timeout")
        except Exception as e:
            logger.error(f"Subprocess error: {str(e)}")
            raise RExecutionError(str(e))
