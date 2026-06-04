import logging
from google.cloud import storage
from pathlib import Path

logger = logging.getLogger(__name__)

class GCSService:
    def __init__(self):
        self.client = storage.Client()

    def download_file(self, bucket_name: str, object_name: str, destination_path: str) -> str:
        """
        Downloads a file from GCS to a local path.
        """
        try:
            bucket = self.client.bucket(bucket_name)
            blob = bucket.blob(object_name)
            blob.download_to_filename(destination_path)
            logger.info(f"Downloaded gcs://{bucket_name}/{object_name} to {destination_path}")
            return destination_path
        except Exception as e:
            logger.error(f"Failed to download from GCS: {e}")
            raise

    def upload_file(self, bucket_name: str, object_name: str, source_path: str) -> str:
        """
        Uploads a local file to GCS.
        """
        try:
            bucket = self.client.bucket(bucket_name)
            blob = bucket.blob(object_name)
            blob.upload_from_filename(source_path)
            logger.info(f"Uploaded {source_path} to gcs://{bucket_name}/{object_name}")
            return f"gs://{bucket_name}/{object_name}"
        except Exception as e:
            logger.error(f"Failed to upload to GCS: {e}")
            raise
