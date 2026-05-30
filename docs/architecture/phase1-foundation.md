# Phase 1 Foundation

This document is a placeholder for the formal Phase 1 architecture record.

The source layout in this repository follows these principles:

- the sandbox agent (`sandbox-agent-v2`) owns VM orchestration and exposes a FastAPI runtime API consumed by the backend
- simulators are isolated Python modules with shared safety/runtime contracts, staged into the guest VM by the pipeline
- monitoring, reporting, VM, and execution modules are separated behind interfaces
- schemas are versioned from the beginning to support future AI/backend/blockchain consumers

Implementation of behavior and evidence collection is intentionally deferred.
