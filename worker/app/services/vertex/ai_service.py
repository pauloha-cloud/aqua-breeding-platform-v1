import json
import logging
import time
from typing import Any, Dict

from google import genai
from google.genai.types import GenerateContentConfig

from app.domain.exceptions import AIServiceError
from app.domain.models import AIArtifacts, StructuredScientificResult
from app.infrastructure.monitoring import telemetry

logger = logging.getLogger(__name__)

VERTEX_RESPONSE_SCHEMA: Dict[str, Any] = {
    "type": "OBJECT",
    "required": ["executive_markdown", "risk_notes", "management_summary", "plot_spec"],
    "properties": {
        "executive_markdown": {
            "type": "STRING",
            "description": "Narrativa técnica e executiva em formato Markdown para relatórios PDF."
        },
        "risk_notes": {
            "type": "ARRAY",
            "description": "Alertas críticos para tomada de decisão gerencial limitada a 3-5 itens.",
            "items": {"type": "STRING"}
        },
        "management_summary": {
            "type": "OBJECT",
            "required": ["headline", "decision_support", "confidence_level"],
            "properties": {
                "headline": {"type": "STRING"},
                "decision_support": {"type": "STRING"},
                "confidence_level": {"type": "STRING", "enum": ["HIGH", "MEDIUM", "LOW"]}
            }
        },
        "plot_spec": {
            "type": "OBJECT",
            "required": ["charts"],
            "properties": {
                "charts": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "required": ["id", "title", "chart_type", "data"],
                        "properties": {
                            "id": {"type": "STRING"},
                            "title": {"type": "STRING"},
                            "chart_type": {"type": "STRING", "enum": ["histogram", "bar", "scatter"]},
                            "data": {"type": "ARRAY", "items": {"type": "OBJECT"}}
                        }
                    }
                }
            }
        },
    },
}

FEW_SHOT_EXAMPLES = """
### EXEMPLO DE SAÍDA ESPERADA:
{
  "executive_markdown": "## Relatório de Evolução Genética\nO rebanho apresentou um EBV médio de +1.2 para ganho de peso...",
  "risk_notes": [
    "Descendentes do touro ID 9928 apresentam acurácia SEP abaixo do threshold.",
    "Risco de endogamia detectado na linhagem Sul."
  ],
  "management_summary": {
    "headline": "Crescimento Genético Consistente",
    "decision_support": "Manter estratégia de seleção atual com foco em ganho de peso pós-desmame.",
    "confidence_level": "HIGH"
  },
  "plot_spec": {
    "charts": [
      {
        "id": "ebv_hist",
        "title": "Distribuição de EBV",
        "chart_type": "histogram",
        "data": [{"label": "0.1", "count": 15}, {"label": "0.5", "count": 45}]
      }
    ]
  }
}
"""

SYSTEM_INSTRUCTION = f"""
Você é o Chief AI Officer do Stemma. Sua função é traduzir resultados matemáticos do Modelo Animal (MME) em insights estratégicos.
REGRAS:
1. NUNCA altere os valores numéricos fornecidos.
2. Seja determinístico na estrutura JSON.
3. Use tom executivo B2B (Agronegócio).
4. O campo 'executive_markdown' deve ter pelo menos 3 parágrafos.

{FEW_SHOT_EXAMPLES}
"""

class VertexAIInsightService:
    def __init__(self, project_id: str, location: str, model_name: str) -> None:
        self._client = genai.Client(vertexai=True, project=project_id, location=location)
        self._model_name = model_name

    def generate_insights(self, result: StructuredScientificResult, job_id: str) -> AIArtifacts:
        prompt = self._build_prompt(result)
        
        start_time = time.time()
        try:
            response = self._client.models.generate_content(
                model=self._model_name,
                contents=prompt,
                config=GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=VERTEX_RESPONSE_SCHEMA,
                    temperature=0.1
                )
            )
            latency = time.time() - start_time
            telemetry.record_latency("vertex_ai_latency", latency, job_id)
            
            raw_data = json.loads(response.text)
            telemetry.log_structured("INFO", f"Vertex AI Successful for job {job_id}", {"latency": latency})
            
            return AIArtifacts(
                executive_markdown=raw_data["executive_markdown"],
                risk_notes=raw_data["risk_notes"],
                plot_spec=raw_data["plot_spec"],
                management_summary=raw_data["management_summary"],
                raw_model_payload=raw_data
            )
        except Exception as e:
            latency = time.time() - start_time
            telemetry.log_structured("ERROR", f"Vertex AI Failure for job {job_id}", {"error": str(e), "latency": latency})
            telemetry.record_job_status("vertex_failure")
            raise AIServiceError(f"Generation failed: {str(e)}")

    def _build_prompt(self, result: StructuredScientificResult) -> str:
        input_data = {
            "kpis": result.kpis.__dict__,
            "top_5": [a.__dict__ for a in result.top_animals[:5]],
            "histogram": [h.__dict__ for h in result.histogram]
        }
        return f"Gere o relatório gerencial baseado nestes dados reais: {json.dumps(input_data)}"
