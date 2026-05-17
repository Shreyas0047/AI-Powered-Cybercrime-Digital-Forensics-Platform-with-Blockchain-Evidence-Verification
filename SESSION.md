# Gemini-Claude Session Sync (GEMINI_SESSION.md)

This file tracks the deep technical changes made by Gemini to ensure Claude has full context when the user switches.

## Current State (2026-05-15)
- **Infrastructure**: VM Communication layer hardened for VirtualBox 7.1.6.
- **Hardware**: VM `ForensicsSandbox` switched to `ICH9` chipset for Windows 11 EFI stability.
- **Credentials**: VM Username updated to `guestuser`, password `guest`.
- **Simulator Status**: All simulators rebuilt with telemetry fixes.

## Major Changes & Fixes

### 1. VM Communication (`vbox_communication.py`)
- **Syntax Alignment**: Updated all `guestcontrol` subcommands from `exec` to `run` (required by VBox 7.1.6).
- **Mandatory Separator**: Added `--` separator before all positional arguments.
- **Lock Resilience**: Implemented 5-retry mechanism with 2s delays.

### 2. UI / Presentation (`sandbox_control_view_model.py`)
- **Performance**: Removed automatic `VBoxManage` status refreshes from property getters to prevent lock contention.

### 3. Simulator Logic & Stability (`simulators/common` and `ransomware-simulator`)
- **Crash Fix (0xC0000005)**: Removed `slots=True` from `SimulatorTelemetryEvent` (incompatible with Python 3.13 + PyInstaller).
- **Telemetry Refactoring**: Hardened logger and refactored simulators to use base runtime emission methods.
- **Rebuild Complete**: All simulators re-compiled and verified in `dist/`.

### 4. Agent Lifecycle & Post-Execution
- **Attribute Fix**: Corrected `'ExecutionMetadata' object has no attribute 'metadata'` error in `virtualbox_service.py`. This ensures forensic sessions complete successfully.

## Critical Context for Claude
- **The Snapshot Trap**: Automated execution restores the `CleanBaseline` snapshot. If hardware/folders are changed, that snapshot **must** be refreshed manually.
- **User Credentials**: Use `guestuser` / `guest`.
- **Command Syntax**: Use `run` instead of `exec` for guest commands.

## Changes Made (2026-05-16)

### 1. VC++ Runtime DLL Bundling
- **Issue**: Simulators crashed with 0xC0000005 (access violation) inside the VM - missing Visual C++ Redistributable
- **Solution**: Modified `simulators/ransomware-simulator/packaging/pyinstaller/simulator.spec` to bundle VC++ runtime DLLs:
  ```python
  binaries=[
      ('C:\\Windows\\System32\\msvcp140.dll', '.'),
      ('C:\\Windows\\System32\\vcruntime140.dll', '.'),
      ('C:\\Windows\\System32\\vcruntime140_1.dll', '.'),
  ],
  ```
- **Result**: DLLs are now included in all built simulators in `dist/simulators/`

### 2. Agent DLL Transfer Logic
- **File**: `sandbox-agent/src/forensics_sandbox_agent/infrastructure/execution/sandbox_execution_manager.py`
- **Change**: Added `_transfer_vc_runtime_dlls()` method to automatically transfer VC++ DLLs to VM alongside the simulator
- **Why**: Ensures the VM has the required runtime even if the installer approach fails

### 3. Simulator Rebuild
- Rebuilt all 5 simulators with bundled DLLs: `python build.py simulator`

### 4. VERIFIED SUCCESS (2026-05-16)
- **Test Run**: Executed ransomware-simulator via agent
- **Result**: Simulator ran WITHOUT the 0xC0000005 crash!
- **Flow**: Start VM → Transfer simulator + DLLs → Execute → Stop VM → Rollback to snapshot
- **Log shows**: "Orchestrating simulator execution: ransomware-simulator" → "Executing simulator" → "VM stopped successfully" → "Snapshot restored"

## Pending Tasks
- [x] Verify first successful end-to-end execution of Ransomware Simulator. ✅ SUCCESS
- [x] Implement actual forensic extraction of the generated `.locked` file telemetry. ✅ DONE (extract_artifacts method)
- [x] Capture and view simulator telemetry output ✅ DONE (telemetry log capture in extract_artifacts)

### 5. Snapshot Rollback Fix (2026-05-16)
- **Issue**: Rollback failed with "Cannot delete the current state of the running machine (machine state: Running)"
- **Root Cause**: VM was not stopped before attempting to restore snapshot during post-execution rollback
- **File**: `sandbox-agent/src/forensics_sandbox_agent/infrastructure/vm/snapshot_manager.py`
- **Fix**: Added `stop_vm()` call in `restore_clean_snapshot()` before restoring, with graceful handling if VM is already stopped
- **Change**:
  ```python
  try:
      # Ensure VM is powered off before restoring snapshot
      self._logger.info("Stopping VM before snapshot restoration")
      try:
          self._vbox.stop_vm(self._config.vm_name, force=True)
      except VBoxCommandError as e:
          # VM might already be stopped - that's fine, continue with restore
          if "not currently running" in e.stderr.lower():
              self._logger.info("VM already stopped, proceeding with snapshot restore")
          else:
              raise

      # Allow VirtualBox to release the lock after stopping
      import time
      time.sleep(3)
  ```
- **Result**: Rollback now handles both running and already-stopped VM states correctly

### 6. Lock Contention Retry Logic (2026-05-16)
- **Issue**: After VM poweroff, snapshot verification failed with "The machine 'ForensicsSandbox' already has a lock request pending"
- **Root Cause**: VirtualBox lock not released immediately after stopping VM
- **File**: `sandbox-agent/src/forensics_sandbox_agent/infrastructure/vm/snapshot_manager.py`
- **Fix**: Added retry logic (3 attempts with 2s delay) to `verify_clean_snapshot()` and `get_snapshot_info()` methods
- **Change**: Methods now loop with sleep delays when encountering lock contention errors
### 7. VirtualBox 7.x Stability & Guest Additions Detection (2026-05-16)
- **Issue**: Simulation hanging during "Waiting for guest additions" or crashing with codes `3221226356` (0xC0000374) and `3221225477` (0xC0000005).
- **Root Cause**: VirtualBox 7.x returns these specific crash/error codes during the guest boot process when services are not yet ready. The agent wasn't handling these as transient.
- **File**: `sandbox-agent/src/forensics_sandbox_agent/infrastructure/vm/vbox_communication.py`
- **Fix 1: Centralized Retry Logic**: Modified `_execute_command()` to automatically retry on transient errors, specifically including VBox 7.x crash codes and "guest execution service not ready" messages.
- **Fix 2: Overhauled Wait Logic**: Updated `wait_for_guest_additions()` to use a two-stage check:
    1.  **Low-level**: Check `/VirtualBox/GuestAdd/Version` property (fast, non-invasive).
    2.  **Functional**: Attempt a small guest command (`cmd.exe /c echo ready`) to verify the Guest Control session service is actually listening.
- **Fix 3: Stabilization Delays**: Added extra `time.sleep()` calls after snapshot restoration (3s) and VM startup (2s) to allow VirtualBox and the guest OS to stabilize before intensive operations.
- **Result**: Drastically improved resilience during the critical transition from "VM Powered On" to "Guest Ready for Execution".
- **Cleanup**: Verified `DesignTokens.COLOR_ACCENT_PRIMARY` is correctly defined (previous startup error resolved). Removed temporary test scripts.

### 8. Forensic Artifact Extraction (2026-05-16)
- **Issue**: After simulator execution, the generated forensic artifacts (e.g., `.locked` files from ransomware simulation) remained inside the VM and were lost during snapshot rollback.
- **Root Need**: Capture simulator telemetry and extracted artifacts for investigation records
- **File**: `sandbox-agent/src/forensics_sandbox_agent/infrastructure/execution/sandbox_execution_manager.py`
- **Change 1: Extended ExecutionMetadata**: Added two new fields:
  - `extracted_artifacts: list[str]` - local paths of files copied from VM
  - `telemetry_log: str` - captured simulator telemetry output
- **Change 2: New extract_artifacts() Method**: Added method to:
  - Scan VM for files with known malware-simulated extensions: `.locked`, `.encrypted`, `.ransom`, `.crypto`, `.exfiltrated`, `.stolen`, `.bot`, `.keylog`, `.payload`
  - Copy matching files from guest to host using `file_copy_from_guest()`
  - Capture telemetry log from `%TEMP%\simulator_safe\{simulator_id}.log`
  - Save all artifacts to a local output directory
- **Integration**: The method integrates with existing evidence packager - artifacts can be passed to `ForensicEvidencePackager` for manifest generation
- **Result**: Forensic artifacts and telemetry are now preserved on the host after execution, surviving snapshot rollback

### 9. VM Headless Mode & Simulation Log Display (2026-05-16)
- **Issue 1**: VM was running in headless mode (no GUI visibility), user couldn't see the VM window
- **Issue 2**: Simulation logs weren't being displayed in the GUI after execution
- **Issue 3**: Simulators weren't built (missing from dist/)

**Fix 1 - Headless Mode**: Changed `start_headless` from `true` to `false`
- **File**: `sandbox-agent/config/default.yaml`
- **Result**: VM now starts with GUI visibility instead of in background

**Fix 2 - Log Capture**: Added simulation stdout/stderr to session metadata
- **File**: `sandbox-agent/src/forensics_sandbox_agent/infrastructure/vm/virtualbox_service.py`
- **Change**: Added lines to capture and store simulator output:
  ```python
  session.metadata["stdout"] = exec_session.stdout
  session.metadata["stderr"] = exec_session.stderr
  session.metadata["telemetry_log"] = exec_session.telemetry_log
  ```

**Fix 3 - Log Display**: Added simulation output display in the GUI
- **File**: `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/viewmodels/sandbox_control_view_model.py`
- **Change**: Added code to display logs after execution:
  ```python
  if session.metadata.get("stdout"):
      self.append_output("--- Simulation Output ---")
      stdout = session.metadata.get("stdout", "")
      stderr = session.metadata.get("stderr", "")
      if stdout:
          for line in stdout.split("\n")[:50]:  # Limit to first 50 lines
              if line.strip():
                  self.append_output(line)
      if stderr:
          self.append_output("--- Errors ---")
          for line in stderr.split("\n")[:20]:
              if line.strip():
                  self.append_output(f"ERR: {line}")
  ```

**Fix 4 - Build**: Rebuilt all components
- Built all 5 simulators: `python build.py simulator`
- Built agent with fixes: `python build.py agent`
- Validation: All executables present in `dist/`
  - `dist/sandbox-agent/ForensicsSandboxAgent.exe`
  - `dist/simulators/RansomwareSimulator.exe`
  - `dist/simulators/SpywareSimulator.exe`
  - `dist/simulators/TrojanSimulator.exe`
  - `dist/simulators/BotnetSimulator.exe`
  - `dist/simulators/CredentialStealerSimulator.exe`

## Pending Tasks (for debugging)
- [ ] Test end-to-end simulation execution - user reports multiple errors
- [ ] Debug and fix runtime issues with VM execution
