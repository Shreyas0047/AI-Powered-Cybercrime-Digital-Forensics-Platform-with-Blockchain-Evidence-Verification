# Sandbox Execution Operational Runbook

## Overview

This runbook covers operating the `sandbox-agent-v2` FastAPI runtime: VM setup, session execution, rollback, and troubleshooting. The agent runs directly from source — there is no PyInstaller packaging step.

## Prerequisites

- VirtualBox installed (v6.1+)
- Windows VM with:
  - Guest Additions installed
  - Network configured (NAT or Host-only)
  - Marker file at `C:\sandbox\guest.marker`
- Python 3.11+

## VM Setup

### 1. Create Sandbox VM

```powershell
# Using VirtualBox GUI or VBoxManage
VBoxManage createvm --name "ForensicsSandbox" --ostype Windows10_64 --register
VBoxManage storagectl "ForensicsSandbox" --name "SATA" --add sata
VBoxManage storageattach "ForensicsSandbox" --storagectl "SATA" --port 0 --device 0 --type hdd --filepath "path/to/vm.vdi"
```

### 2. Configure VM

```powershell
VBoxManage modifyvm "ForensicsSandbox" --memory 2048 --cpus 2
VBoxManage modifyvm "ForensicsSandbox" --nic1 nat
```

### 3. Create Clean Baseline Snapshot

```powershell
VBoxManage snapshot "ForensicsSandbox" take "CleanBaseline"
```

### 4. Create VM Marker

Inside the VM, create:

```
C:\sandbox\guest.marker
```

Content:

```
NyxTrace Sandbox VM
This file indicates the VM is approved for sandbox execution.
```

## Starting the Agent

The sandbox agent is a FastAPI application that runs directly from source on `127.0.0.1:8765`.

```powershell
cd sandbox-agent-v2
py -3.11 -m pip install -r requirements.txt
py -3.11 main.py
```

To start it together with backend, AI service, and frontend, use the project root orchestrator:

```powershell
.\start-all.ps1
```

The backend can also launch the agent on demand via `POST /api/v1/sandbox/runtime/start` (admin-only).

## Available Simulators

The agent ships six safe educational simulators in `sandbox-agent-v2/simulators/`. Their IDs as exposed by `GET /simulators`:

| Simulator ID | Behavior |
| --- | --- |
| `system-service-alpha` | File system operations, encryption routines, system modification |
| `system-service-beta` | Network connections, persistence, child process spawning |
| `system-service-gamma` | Credential store access, sensitive registry hive reads, data staging |
| `system-service-delta` | User activity monitoring, screen data capture, document scanning |
| `system-service-epsilon` | Deep persistence install, boot configuration changes, process injection |
| `system-service-lateral` | Network discovery, SMB enumeration, pass-the-hash, remote execution |

## Execution Workflows

### Standard Execution (via UI)

1. Start the platform with `start-all.ps1`.
2. Open the frontend at `http://localhost:5173` and sign in.
3. Navigate to the Sandbox dashboard.
4. If the runtime panel reports the agent is offline, click "Start Runtime".
5. Select a simulator from the dropdown and click "New Session".
6. Observe live telemetry and log streams while the session runs.
7. Review the completed session, telemetry events, and rollback status.

### Direct API Execution

Start a session directly against the agent (bypassing the backend):

```powershell
$body = @{ simulator_id = "system-service-alpha"; timeout = 300 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:8765/sessions/start -Body $body -ContentType application/json
```

Then poll session state and events:

```powershell
Invoke-RestMethod http://127.0.0.1:8765/sessions/<session_id>
Invoke-RestMethod http://127.0.0.1:8765/sessions/<session_id>/events
```

Stop or terminate a session:

```powershell
Invoke-RestMethod -Method POST http://127.0.0.1:8765/sessions/<session_id>/stop
Invoke-RestMethod -Method POST http://127.0.0.1:8765/sessions/<session_id>/terminate
```

## Rollback Procedures

### Automatic Rollback

The pipeline reverts the VM to `CleanBaseline` on session completion or termination. The pipeline stages are:

```
REVERT  → STAGE → EXECUTE → OBSERVE → COMPLETE/FAILED
```

Both completion and failure paths force-kill the VM and restore the snapshot before transitioning to a terminal state.

### Manual Rollback

```powershell
# From host machine
VBoxManage snapshot "ForensicsSandbox" restore "CleanBaseline"
```

### Verification

After rollback, verify:

1. VM state is "Powered Off"
2. Created files are removed
3. Registry changes are reverted

```powershell
VBoxManage showvminfo "ForensicsSandbox" --machinereadable | findstr "VMState="
```

## Troubleshooting

### VM Won't Start

- Check VirtualBox installation: `VBoxManage --version`
- Verify the VM exists: `VBoxManage list vms`
- Check for conflicting processes (e.g., a stuck `VBoxHeadless`)

### Snapshot Restore Fails

- Verify the snapshot exists: `VBoxManage snapshot "ForensicsSandbox" list`
- Check disk space
- Try powered-off state first

### Simulator Execution Timeout

- Increase `timeout` in the `POST /sessions/start` request (default 300s)
- Check VM resources (CPU/memory)
- Review agent logs at `logs\agent.log`

### Monitoring Not Streaming

- Verify the VM is running and Guest Additions are loaded
- Confirm WebSocket connectivity to `ws://127.0.0.1:8765/telemetry/live`
- Check `logs\agent.log` for pipeline errors

### Agent Won't Start

- Confirm port 8765 is free: `netstat -ano | findstr :8765`
- Confirm Python 3.11+ is on PATH or set `PYTHON_PATH`
- Reinstall dependencies: `py -3.11 -m pip install -r sandbox-agent-v2\requirements.txt`

## Safety Procedures

### VM-Only Execution

All simulator execution happens inside the sandbox VM. The agent enforces:

- VM marker file presence (`C:\sandbox\guest.marker`)
- VirtualBox availability on the host
- Snapshot revert before every session
- Force rollback on completion or failure

### Emergency Stop

To immediately stop execution and reset:

```powershell
VBoxManage controlvm "ForensicsSandbox" poweroff
VBoxManage snapshot "ForensicsSandbox" restore "CleanBaseline"
```

## Maintenance

### Log Rotation

Agent logs are written to `logs\` at the project root. Recommended retention:

- Keep last 30 days
- Compress after 7 days
- Remove after 90 days

Routine logs are operational output. Preserve only logs that are intentionally part of an evidence package.

### Snapshot Management

List snapshots:

```powershell
VBoxManage snapshot "ForensicsSandbox" list
```

Delete old snapshots:

```powershell
VBoxManage snapshot "ForensicsSandbox" delete "SnapshotName"
```
