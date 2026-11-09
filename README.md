# teamwinest-noia
# 🛡️ NetOps & Compliance AI Assistant 
### AI-Driven Telecommunications Incident Investigation & Regulatory Compliance Platform

[![Next.js](https://img.shields.io/badge/Next.js-14%2F15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai)](https://openai.com/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Integrated%20Inference-000000?style=for-the-badge&logo=pinecone)](https://www.pinecone.io/)
[![ClickHouse](https://img.shields.io/badge/ClickHouse-Telemetry-FFCC01?style=for-the-badge&logo=clickhouse)](https://clickhouse.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An advanced, full-stack AI agent application built for telecommunications Network Operations Centers (NOC). This platform bridges the historical gap between real-time network telemetry analysis and statutory legal compliance (such as the **Nigeria Data Protection Act 2023 - NDPA**). 

When a critical site alarm occurs (e.g., IP spoofing or unauthorized SSH access at `SITE-PHC-0054`), the AI agent autonomously queries live operational logs, correlates anomalies, searches legal compliance vectors, and drafts mandatory incident reports within statutory timelines (e.g., 72-hour breach notification rules).

---

## 🚀 Key Features

* **🤖 Autonomous Function-Calling Agent:** Powered by OpenAI `gpt-4o` with multi-step tool execution loops.
* **⚡ Live ClickHouse Telemetry Querying (`query_network_logs`):** Directly inspects high-throughput operational log tables (`network_logs_dataset`) for site-specific alarms, severity levels, and probable causes.
* **📚 Integrated Regulatory RAG (`search_regulatory_documents`):** Leverages Pinecone serverless document indexes with integrated inference (`llama-text-embed-v2` and `EmbedQuery`) to fetch exact legal clauses without vector dimension mismatches.
* **🔒 ITU-T Y.3172 AI Readiness 2.0 Aligned:** Built with enterprise-grade guardrails, data de-identification, purpose limitation, and Human-In-The-Loop (HITL) review protocols.
* **💻 Modern Full-Stack Next.js Architecture:** Seamlessly connects backend tool execution with an interactive, responsive NOC operator dashboard.

---

## 📦 Installation & Dependencies

Ensure you have **Node.js** installed on your system. Install the required client packages for OpenAI, Pinecone, and ClickHouse:

```bash
# Install core dependencies
npm install openai @pinecone-database/pinecone@latest @clickhouse/client
