from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

@dataclass(slots=True)
class JobMessage:
    job_id: str
    tenant_id: str
    org_id: str
    input_bucket: str
    genetic_data_object: Optional[str] = None
    phenotype_object: Optional[str] = None
    pedigree_object: Optional[str] = None
    output_bucket: str
    output_prefix: str
    requested_by: str
    correlation_id: str

@dataclass(slots=True)
class RExecutionResult:
    stdout: str
    stderr: str
    return_code: int
    output_dir: str
    files: Dict[str, str]

@dataclass(slots=True)
class KPIBundle:
    active_animals: int
    selected_rate: float
    mean_accuracy: float
    ebv_mean: float
    ebv_std: float
    ebv_min: float
    ebv_max: float

@dataclass(slots=True)
class AnimalEBV:
    animal_id: str
    name: Optional[str]
    ebv: float
    sep: Optional[float] = None
    accuracy: Optional[float] = None
    rank: Optional[int] = None

@dataclass(slots=True)
class HistogramBin:
    label: str
    start: float
    end: float
    count: int

@dataclass(slots=True)
class StructuredScientificResult:
    kpis: KPIBundle
    top_animals: List[AnimalEBV] = field(default_factory=list)
    bottom_animals: List[AnimalEBV] = field(default_factory=list)
    histogram: List[HistogramBin] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    raw_tables: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)

@dataclass(slots=True)
class AIArtifacts:
    executive_markdown: str
    risk_notes: List[str]
    plot_spec: Dict[str, Any]
    management_summary: Dict[str, Any]
    raw_model_payload: Dict[str, Any]
