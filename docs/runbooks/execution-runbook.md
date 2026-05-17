# Sandbox Execution Operational Runbook

## Overview

This runbook provides operational procedures for the Forensics Sandbox Agent platform, covering VM setup, execution workflows, rollback procedures, and troubleshooting.

## Prerequisites

- VirtualBox installed (v6.1+)
- Windows VM with:
  - Guest additions installed
  - Network configured (NAT or Host-only)
  - Marker file at `C:/sandbox/guest.marker`
- Python 3.11+
- PyInstaller for building executables

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
Forensics Sandbox VM
This file indicates the VM is approved for sandbox execution.
```

## Build Procedures

### Build Agent Executable

```bash
cd /path/to/project
python build.py agent
```

Output: `dist/sandbox-agent/ForensicsSandboxAgent.exe`

### Build Simulator Executables

```bash
# Build all simulators
python build.py simulator

# Or build individual
python build.py simulator --simulator ransomware-simulator
```

Output: `dist/simulators/[SimulatorName]Simulator.exe`

## Execution Workflows

### Standard Execution

1. Start the sandbox agent
2. Navigate to Sandbox Control page
3. Click "Start VM"
4. Click "Restore Snapshot" to reset to CleanBaseline
5. Select a simulator from the list
6. Click "Execute Selected"
7. Monitor execution in the log panel
8. View results in the Monitoring page

### Programmatic Execution

```python
from forensics_sandbox_agent.app.config.loader import load_settings
from forensics_sandbox_agent.app.logging.logger import configure_logging
from forensics_sandbox_agent.app.services.service_registry import ServiceRegistry

# Initialize
settings = load_settings()
logger = configure_logging(settings)
services = ServiceRegistry.bootstrap(settings, logger)

# Execute
session = services.session_orchestrator.execute_simulator(simulator)
```

## Rollback Procedures

### Automatic Rollback

The system automatically rolls back after execution if configured:
```yaml
execution_policy:
  rollback_policy:
    enabled: true
    always_rollback_on_completion: true
```

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

## Troubleshooting

### VM Won't Start

- Check VirtualBox installation
- Verify VM configuration
- Check for conflicting processes

### Snapshot Restore Fails

- Verify snapshot exists: `VBoxManage snapshot "ForensicsSandbox" list`
- Check disk space
- Try powered-off state first

### Simulator Execution Timeout

- Increase timeout in config
- Check VM resources
- Review simulator logs

### Monitoring Not Collecting Events

- Verify VM is running
- Check monitoring is enabled in config
- Review monitoring logs

## Safety Procedures

### VM-Only Execution

All simulator execution MUST occur inside the sandbox VM. The system validates:
- VM marker file presence
- VirtualBox installation
- Safe directory restrictions

### Execution Prevention

If validation fails:
1. Execution is blocked
2. Error is logged
3. User is notified

### Emergency Stop

To immediately stop execution:
1. Power off VM: `VBoxManage controlvm "ForensicsSandbox" poweroff`
2. Restore snapshot: `VBoxManage snapshot "ForensicsSandbox" restore "CleanBaseline"`

## Maintenance

### Log Rotation

Logs are stored in `logs/` directory. Implement rotation:
- Keep last 30 days
- Compress after 7 days
- Remove after 90 days

### Snapshot Management

List snapshots:
```powershell
VBoxManage snapshot "ForensicsSandbox" list
```

Delete old snapshots:
```powershell
VBoxManage snapshot "ForensicsSandbox" delete "SnapshotName"
```

### Configuration Backup

Backup configuration:
```powershell
Copy-Item "sandbox-agent/config/default.yaml" "config_backup.yaml"
```