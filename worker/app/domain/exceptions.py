class WorkerError(Exception):
    """Base exception for worker failures."""

class InvalidEventError(WorkerError):
    """Raised when Pub/Sub payload is invalid."""

class RExecutionError(WorkerError):
    """Raised when R subprocess fails."""

class AIServiceError(WorkerError):
    """Raised when Vertex AI generation fails."""
