# ForensicsAI Platform: System Analysis

## Project Overview
The **ForensicsAI Platform** is an integrated ecosystem for simulating malware behavior and conducting digital forensic investigations. It combines real-time telemetry, AI-driven analysis, and blockchain-backed evidence verification.

## Core Components

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React, TypeScript, Vite | Investigation dashboard, telemetry visualization, and reporting. |
| **Backend** | Node.js, Express, MongoDB Atlas | API Gateway, WebSocket orchestration, and business logic. |
| **AI Service** | Python, FastAPI, Scikit-learn | Threat classification, anomaly detection, and severity scoring. |
| **Sandbox Agent** | Python, FastAPI | VM orchestration, simulator pipeline, telemetry streaming over REST + WebSocket. |
| **Simulators** | Python | Modular "safe" malware behavior models (alpha, beta, gamma, delta, epsilon, lateral). |
| **Blockchain** | Solidity, Ethereum | Immutable evidence hashing and Chain of Custody tracking. |

## Operational Workflow

1. **Initialization**: Start the **Backend** (port 3000), **Frontend** (port 5173), and **AI Service** (port 8000).
2. **Environment Setup**: The **Sandbox Agent** is deployed in a controlled VirtualBox environment.
3. **Simulation**: A user triggers a **Simulator** through the Agent. The simulator performs scripted actions that mimic cyberattacks.
4. **Telemetry Ingestion**: The Agent captures system changes (files, registry, network) and streams them to the **Backend** via WebSockets.
5. **AI Evaluation**: The **AI Service** analyzes the stream to classify the threat type and calculate a risk score.
6. **Evidence Archiving**: The **Backend** stores the full report in MongoDB and anchors the evidence hash to the **Blockchain** for integrity verification.

## Security & Ethics
This platform is strictly for **educational and research purposes**. The simulators are designed to be non-destructive and operate only within designated sandbox environments.
