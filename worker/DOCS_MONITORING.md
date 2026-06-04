# Stemma Observability Configuration

Esta documentação detalha os artefatos de monitoramento integrados ao Google Cloud's Operations Suite.

## 📊 Métricas Customizadas (Custom Metrics)

O Worker Analítico exporta as seguintes métricas para o Cloud Monitoring:
- `custom.googleapis.com/stemma/worker/total_job_latency`: Tempo total de processamento do Job.
- `custom.googleapis.com/stemma/worker/vertex_ai_latency`: Latência de resposta da Vertex AI.
- `custom.googleapis.com/stemma/worker/r_runner_latency`: Tempo de execução do script R.

## 🚀 Painel de Monitoramento (Cloud Monitoring Dashboard)

Sugestão de estrutura para o Dashboard "Stemma Analytics Health":
- **Widget 1 (Line Chart)**: Latência média dos Jobs nos últimos 60 min.
- **Widget 2 (Stacked Bar)**: Sucesso vs Falha por Job ID.
- **Widget 3 (Heatmap)**: Distribuição de latência da Vertex AI.

## ⚠️ Alertas Críticos (Cloud Logging Alerts)

Filtros de Log para configuração de alertas:

### 1. Falha Crítica no Worker
**Filter**: `resource.type="cloud_run_revision" AND severity="ERROR" AND jsonPayload.message~"Job .* failed"`
- **Notificação**: Enviar para o canal `#stemma-alerts` (Slack) e Engenharia de Plantão.

### 2. Falha na Vertex AI (Timeout ou Schema)
**Filter**: `resource.type="cloud_run_revision" AND severity="ERROR" AND jsonPayload.message~"Vertex AI Failure"`
- **Ação**: Abrir incident no PagerDuty.

### 3. Falha no Script R (MME Engine)
**Filter**: `resource.type="cloud_run_revision" AND severity="ERROR" AND jsonPayload.message~"R execution failed"`

## 💡 Próximos Passos
Para implementar estes alertas no console do GCP:
1. Vá em **Monitoring > Alerting**.
2. Clique em **Create Policy**.
3. Selecione a métrica customizada ou cole o filtro de Logs acima em "Logs-based metric". 
4. Configure os "Notification Channels" para Slack e Email.
