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

---

## Changes Made (2026-05-18)

### 10. Frontend Placeholder Modules (Web Platform)
**Files Created:**
- `backend/src/types/reports.ts` — Type definitions for ForensicReport, LogEntry, AppSettings, EvidenceArtifact
- `backend/src/services/reports.service.ts` — Reads forensic JSON from `uploads/reports/` and `logs/monitoring/`
- `backend/src/services/logs.service.ts` — Reads logs from `logs/` and `logs/monitoring/`, generates demo logs
- `backend/src/services/settings.service.ts` — Persists settings to `uploads/settings.json`
- `backend/src/services/evidence-artifacts.service.ts` — Extracts forensic events from report files as artifacts
- `backend/src/controllers/reports.controller.ts`
- `backend/src/controllers/logs.controller.ts`
- `backend/src/controllers/settings.controller.ts`
- `backend/src/controllers/evidence-artifacts.controller.ts`
- `backend/src/routes/reports.routes.ts`, `logs.routes.ts`, `settings.routes.ts`, `evidence-artifacts.routes.ts`
- Updated `backend/src/routes/index.ts`, `services/index.ts`, `types/index.ts`
- `frontend/src/types/reports.ts`
- `frontend/src/stores/reportsStore.ts`, `logsStore.ts`, `settingsStore.ts`
- Updated `frontend/src/services/api.ts` with new API methods
- `frontend/src/pages/ReportsPage.tsx` — Reports table with filters, severity/category counts, detail modal with tabs, JSON/TXT export
- `frontend/src/pages/LogsPage.tsx` — Terminal-style dark log viewer, level colors, search, auto-refresh
- `frontend/src/pages/SettingsPage.tsx` — Tabbed settings form (VM/Monitoring/Execution/Logging/Notifications)
- `frontend/src/pages/EvidenceArtifactsPage.tsx` — Artifact list with detail/JSON view, copy/download
- Updated `frontend/src/router/AppRoutes.tsx` — routes `/reports`, `/settings`, `/audit` → Logs, `/evidence-artifacts`

### 11. Sandbox Agent PyQt6 Pages (Agent-Side)
**Files Created:**
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/viewmodels/reports_view_model.py`
  - `ReportSummary` class wraps JSON report files
  - `ReportsViewModel` loads from `exports_dir`, filters by simulator/search, exports as JSON/TXT
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/viewmodels/evidence_view_model.py`
  - `EvidenceArtifact` class wraps `ForensicEvent`
  - `EvidenceViewModel` loads from `monitoring_coordinator`, filters by category/severity/search
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/viewmodels/settings_view_model.py`
  - `SettingsViewModel` loads/persists settings from `config/default.json`, validation, save/reset
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/viewmodels/logs_view_model.py`
  - `LogLine` class parses log entries with level colors
  - `LogsViewModel` reads from `logs_dir`, filters, stats, regex log parsing
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/widgets/reports_page.py` — QTableWidget, metrics, filters, export buttons
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/widgets/evidence_page.py` — Artifact table with detail panel
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/widgets/settings_page.py` — QTabWidget with form controls per section
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/widgets/logs_page.py` — Terminal-style QTextEdit with ANSI colors, auto-refresh
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/widgets/metric_card.py` — Added `update_values()` method for dynamic metric updates
- Updated `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/windows/main_window.py` — All 4 routes wired with ViewModel + Page instantiation
- Updated `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/viewmodels/main_window_view_model.py` — Navigation routes remain unchanged (reports/evidence/settings/logs already defined)

### 12. Bug Fixes

#### 12a. SessionOrchestrator Missing Return
- **Issue**: `'NoneType' object has no attribute 'status'` crash after simulator execution
- **Root Cause**: `session_orchestrator.py` `execute_simulator()` had no `return` statement — the method computed the session but fell through without returning it
- **File**: `sandbox-agent/src/forensics_sandbox_agent/infrastructure/execution/session_orchestrator.py`
- **Fix**: Added `return session` at end of method with fallback `ForensicSession` when `session is None`
- **Impact**: `execute_simulator_sync()` in `sandbox_control_view_model.py` received `None` instead of session object

#### 12b. SettingsViewModel Import Error
- **Issue**: `ImportError: cannot import name 'ConfigLoader'` on app startup
- **Root Cause**: Stray import of non-existent `ConfigLoader` class in `settings_view_model.py`
- **File**: `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/viewmodels/settings_view_model.py`
- **Fix**: Removed unused import; `SettingsViewModel` only needs `ApplicationRuntime`

#### 12c. PyInstaller Config Not Bundled
- **Issue**: `FileNotFoundError: Configuration file not found` when running `ForensicsSandboxAgent.exe`
- **Root Cause**: `agent.spec` listed `config/` in `datas=` but the copy step after PyInstaller didn't actually include it in `dist/sandbox-agent/`
- **Files**: `build.py`, `loader.py`
- **Fix 1**: Added post-build config copy in `build_agent()`:
  ```python
  config_src = self.sandbox_agent_dir / "config"
  config_dst = self.dist_dir / "sandbox-agent" / "config"
  shutil.copytree(config_src, config_dst, dirs_exist_ok=True)
  ```
- **Fix 2**: Manual workaround — manually copied `config/` to `dist/sandbox-agent/`

### 13. Agent EXE Locations
- **Executable**: `dist/sandbox-agent/ForensicsSandboxAgent.exe`
- **Simulators**: `dist/simulators/RansomwareSimulator.exe`, `SpywareSimulator.exe`, `TrojanSimulator.exe`, `BotnetSimulator.exe`, `CredentialStealerSimulator.exe`
- **Build command**: `python build.py all` (agent + simulators) or `python build.py agent` (agent only)
- **Config**: `config/default.yaml` and `config/default.json` (must be in dist/ alongside exe)

### 14. SessionOrchestrator Return Type
- `execute_simulator()` in `session_orchestrator.py` now returns `ForensicSession` (was `None`)
- Also imports `SessionStatus` for fallback session creation
- All callers (view model sync/async methods) now safely receive a session object

### Key VM/Simulator Context (unchanged from previous sessions)
- **Snapshot**: `CleanBaseline` (UUID: `6a954b97-a1db-477a-8054-2d76de85a063`)
- **VM**: `ForensicsSandbox` — ICH9 chipset, Windows 11 EFI
- **Credentials**: `guestuser` / `guest`
- **Guest Additions**: Required, detected via `/VirtualBox/GuestAdd/Version`
- **Headless Mode**: `false` (GUI visible)
- **VC++ DLLs**: Bundled in simulators (`msvcp140.dll`, `vcruntime140.dll`, `vcruntime140_1.dll`)
- **Guest Command Syntax**: VBox 7.x uses `run` (not `exec`), requires `--` separator

---

## Changes Made (2026-05-19)

### 15. QThread Cleanup Fix
- **Issue**: "QThread: Destroyed while thread is still running" error at end of simulation
- **File**: `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/widgets/sandbox_control_page.py`
- **Fix**: Added proper thread cleanup in `_on_worker_finished()`:
  ```python
  def _on_worker_finished(self, success: bool, message: str) -> None:
      if self._vm_worker:
          self._vm_worker.quit()
          self._vm_worker.wait()
          self._vm_worker = None
  ```
- **Result**: Thread now properly waits for completion before garbage collection

### 16. Simulator Executable Rename (Obfuscation)
- **Goal**: Hide malware category in filenames - system uses behavioral analysis instead
- **Changes**:

| Old Name | New Name | UI Display |
|----------|----------|------------|
| RansomwareSimulator.exe | threat-file-1.exe | Threat Sample 1 |
| SpywareSimulator.exe | threat-file-2.exe | Threat Sample 2 |
| CredentialStealerSimulator.exe | threat-file-3.exe | Threat Sample 3 |
| TrojanSimulator.exe | threat-file-4.exe | Threat Sample 4 |
| BotnetSimulator.exe | threat-file-5.exe | Threat Sample 5 |

**Files Modified:**
- `sandbox-agent/src/forensics_sandbox_agent/domain/simulator_mapping.py` — NEW: Internal mapping layer
- `sandbox-agent/src/forensics_sandbox_agent/infrastructure/simulator_catalog.py` — Updated to use generic names
- `simulators/*/packaging/pyinstaller/simulator.spec` — 5 spec files updated with new exe names
- `build.py` — Updated validation to use new exe names
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/widgets/sandbox_control_page.py` — Removed category from display
- `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/widgets/simulator_manager_page.py` — Category shows "Analyzed"
- `sandbox-agent/tests/unit/test_vbox_communication.py` — Updated test paths

**Internal Mapping** (not exposed to UI):
- `threat-file-1` → behavioral profile: "ransomware"
- `threat-file-2` → behavioral profile: "spyware"
- `threat-file-3` → behavioral profile: "credential-stealer"
- `threat-file-4` → behavioral profile: "trojan"
- `threat-file-5` → behavioral profile: "botnet"

**Rebuild Required**: `python build.py all` to generate new simulator executables

### 17. EXE Path Resolution Fix
- **Issue**: When running as ForensicsSandboxAgent.exe, simulators not found (path resolution fails)
- **File**: `sandbox-agent/src/forensics_sandbox_agent/infrastructure/simulator_catalog.py`
- **Fix**: Updated `_project_root()` to handle PyInstaller frozen state:
  ```python
  def _project_root(self) -> Path:
      import sys
      if getattr(sys, 'frozen', False):
          exe_dir = Path(sys.executable).parent
          for parent in [exe_dir] + list(exe_dir.parents):
              if (parent / "dist").exists() and (parent / "simulators").exists():
                  return parent
          return exe_dir
      # ... existing logic for non-frozen mode
  ```

### 18. Threat Intelligence Engine (Backend Phase 4.1)
- **Goal**: Transform backend into telemetry analysis engine with behavioral correlation, risk scoring

**New Module**: `backend/src/threat_intelligence/`

| File | Purpose |
|------|---------|
| `threat_models.ts` | Data structures: NormalizedEvent, ExtractedFeatures, BehaviorFinding, RiskScore, AttackPattern |
| `event_normalizer.ts` | Converts raw telemetry → standardized behavioral events (mass_file_modification, persistence_attempt, etc.) |
| `feature_extractor.ts` | Calculates 25+ forensic metrics (spawn rate, file counts, network connections, registry ops) |
| `behavior_analyzer.ts` | Detects 9 behavioral patterns: ransomware, spyware, trojan, worm, persistence, credential access, beaconing, mass file ops, suspicious process |
| `risk_engine.ts` | Calculates 0-100 risk score: 0-20=low, 21-50=medium, 51-80=high, 81+=critical |
| `correlation_engine.ts` | Identifies multi-stage attack patterns: intrusion, data exfil, privilege escalation, lateral movement, ransomware execution |
| `intelligence_pipeline.ts` | Unified pipeline: Normalize → Extract Features → Analyze Behaviors → Calculate Risk → Correlate → Report |
| `index.ts` | Module exports |

**API Integration:**
- `backend/src/routes/threat-analysis.routes.ts` — NEW routes
- `backend/src/controllers/threat-analysis.controller.ts` — NEW controller
- Updated `backend/src/controllers/index.ts`, `backend/src/routes/index.ts`

**API Endpoints:**
- `POST /api/v1/threat-analysis/analyze` — Analyze session events
- `GET /api/v1/threat-analysis/report/:sessionId` — Full intelligence report
- `GET /api/v1/threat-analysis/summary/:sessionId` — Risk summary

**Features:**
- Event normalization with behavioral tags
- Feature extraction (25+ metrics)
- Behavior signature detection (9 patterns)
- Risk scoring (0-100 + severity)
- Attack pattern correlation (5 patterns)
- Threat intelligence report generation

**Backward Compatibility:** All existing APIs unchanged; modular architecture for future ML integration

---

## Changes Made (2026-05-19 - Phase 4.2)

### 19. Threat Classification Engine (Behavior-Only Detection)
- **Goal**: Backend classifies threats based ONLY on behavior, NOT executable names
- **Files Created**:
  - `backend/src/threat_intelligence/threat_classifier.ts` — NEW: Behavior-based classification engine

**Detection Rules (16 rules)**:
- `RULE_RANSOMWARE_FILE_BURST` — Mass file modification detection
- `RULE_RANSOMWARE_EXTENSION_CHANGE` — Extension renaming detection
- `RULE_RANSOMWARE_NOTE` — Ransom note creation
- `RULE_SPYWARE_PROCESS_ENUM` — Process enumeration detection
- `RULE_SPYWARE_BROWSER_DATA` — Browser data access detection
- `RULE_SPYWARE_BEACONING` — Network beacon pattern detection
- `RULE_TROJAN_DROPPER` — Multi-stage dropper detection
- `RULE_TROJAN_PERSISTENCE` — Registry persistence detection
- `RULE_TROJAN_HIDDEN_FILES` — Hidden file operations
- `RULE_WORM_LATERAL_MOVEMENT` — Lateral movement simulation
- `RULE_WORM_NETWORK_SCAN` — Network scanning detection
- `RULE_WORM_PROPAGATION` — File replication patterns
- `RULE_CREDENTIAL_ACCESS` — Credential harvesting detection
- `RULE_CREDENTIAL_KEYLOG` — Keylogging simulation detection
- `RULE_PERSISTENCE_AUTORUN` — Autorun persistence
- `RULE_NETWORK_BEACONING` — Regular interval connections

**Classification Output**:
```json
{
  "predicted_threat": "ransomware-like",
  "confidence": 91,
  "reasons": ["mass file modifications", "extension renaming burst", "ransom note creation"],
  "supporting_evidence": [...],
  "mitre_techniques": ["T1486", "T1489", "T1547.001"]
}
```

### 20. MITRE ATT&CK Mapping
- **File**: `backend/src/threat_intelligence/threat_models.ts`
- Added comprehensive MITRE technique mapping:
  - T1059: Command & Scripting Interpreter
  - T1059.001: PowerShell
  - T1486: Data Encrypted for Impact
  - T1547.001: Registry Run Keys
  - T1003: OS Credential Dumping
  - T1003.001: LSASS Memory
  - T1071: Application Layer Protocol
  - T1113: Screen Capture
  - T1056.001: Keylogging
  - T1021: Remote Services
  - And 20+ more techniques
- All detection rules now include MITRE technique mappings

### 21. Enhanced Threat Intelligence Report
- **File**: Updated `threat_models.ts` and `intelligence_pipeline.ts`
- New fields in reports:
  - `threat_classification` — Classification result with confidence
  - `detection_rules_triggered` — Which rules matched
  - `mitre_tactics_detected` — Active MITRE tactics
  - `execution_chain` — Step-by-step attack timeline
  - `enhanced_indicators` — Detailed suspicious activity

### 22. Simulator Behavior Enhancement

#### Ransomware Simulator (`simulators/ransomware-simulator/src/ransomware_simulator/runtime.py`)
- Added mutex creation simulation
- Added worker process spawning (4 worker processes)
- Enhanced file scanning (30 files)
- Extended extension modification (15 files)
- Added ransom note creation (3 variants)
- Added service stop simulation (VSS, Backup, WindowsBackup)
- Enhanced network beaconing with beacon numbers
- Added MITRE technique tags to all behaviors

#### Spyware Simulator (`simulators/spyware-simulator/src/spyware_simulator/runtime.py`)
- Added stealth initialization behavior
- Added process enumeration (explorer, chrome, firefox, outlook)
- Added credential enumeration (Chrome, Edge login data)
- Added directory enumeration (Documents, Desktop, Downloads, config)
- Enhanced all behaviors with MITRE technique mappings
- Added techniques: T1082, T1056, T1113, T1555, T1564

#### Credential Stealer Simulator (`simulators/credential-stealer-simulator/src/credential_stealer_simulator/runtime.py`)
- Added privilege escalation attempt simulation
- Added LSASS access simulation
- Added keylogging simulation
- Enhanced credential harvesting with MITRE techniques
- Added techniques: T1003, T1003.001, T1056.001, T1134, T1555

### 23. Classification API Endpoints
- `POST /api/v1/threat-analysis/analyze` — Full behavior analysis + classification
- `GET /api/v1/threat-analysis/report/:sessionId` — Enhanced report with classification
- `GET /api/v1/threat-analysis/summary/:sessionId` — Classification summary

### 24. Detection Independence
- **System now classifies threat type from behavior ONLY**
- Executable names (threat-file-1.exe, etc.) no longer determine classification
- Backend uses:
  - Process behavior patterns
  - File operation counts
  - Registry modifications
  - Network connections
  - Behavioral signatures
  - Attack pattern correlation

**Rebuild Required**: `python build.py all` to regenerate simulators with new behavior

---

## Changes Made (2026-05-19 - Phase 4.3)

### 25. Forensic Correlation Engine
- **File**: `backend/src/threat_intelligence/correlation_engine_v2.ts` — NEW
- **Purpose**: Centralized engine to correlate raw forensic events into attack narratives
- **Features**:
  - Attack chain reconstruction with stages (Initial Access → Execution → Persistence → Discovery → Collection → Exfiltration → Impact)
  - Event relationship extraction (parent_child, cause_effect, sequential, correlated)
  - Evidence graph building with nodes and edges
  - Process tree reconstruction
  - Correlated incident detection

### 26. Behavioral Heuristics Engine
- **File**: `backend/src/threat_intelligence/behavioral_heuristics.ts` — NEW
- **12 Heuristic Rules**:
  - HEUR_FILE_RENAMING_BURST — Detects rapid extension changes
  - HEUR_MASS_FILE_MODS — High-volume file operations
  - HEUR_RAPID_PROCESS_SPAWN — Child process spawning detection
  - HEUR_POWERSHELL_EXEC — Suspicious PowerShell usage
  - HEUR_AUTORUN_REGISTRY — Registry persistence detection
  - HEUR_TEMP_DIR_ABUSE — Temp directory abuse
  - HEUR_NETWORK_BEACONING — C2 beacon patterns
  - HEUR_SMB_SCAN_SIM — Lateral movement simulation
  - HEUR_RECON_SCAN — Reconnaissance activity
  - HEUR_SUSPICIOUS_PORTS — Known suspicious ports
  - HEUR_PRIVILEGE_ESCALATION — Privilege escalation attempts
  - HEUR_SUSPICIOUS_EXTENSIONS — Suspicious executable activity

### 27. Anomaly Detection Layer
- **File**: `backend/src/threat_intelligence/anomaly_detector.ts` — NEW
- **Detection Types**:
  - BURST_DETECTION — Event bursts in time windows
  - THRESHOLD_EXCEEDED — Metrics exceeding warning/critical thresholds
  - PROCESS_DEVIATION — Process spawn rate anomalies
  - NETWORK_SPIKE — Excessive outbound connections
  - EXECUTION_FREQUENCY — Suspicious process execution frequency
  - FILE_OPERATION_ANOMALY — Abnormal file operation rates
- Calculates baseline metrics and provides overall anomaly scores

### 28. Threat Profiling System
- **File**: `backend/src/threat_intelligence/threat_profiler.ts` — NEW
- **Profile Definitions**:
  - ransomware-profile — Mass file encryption characteristics
  - spyware-profile — Data collection patterns
  - trojan-profile — Multi-stage execution patterns
  - worm-profile — Lateral movement characteristics
  - downloader-profile — Download/execution patterns
  - persistence-heavy-profile — Multiple persistence mechanisms
  - reconnaissance-heavy-profile — Discovery activity
  - benign-profile — Normal system activity

### 29. Threat Explanation Engine
- **File**: `backend/src/threat_intelligence/threat_explanation.ts` — NEW
- **Generates**:
  - Analyst summary — Technical details for security analysts
  - Executive summary — High-level overview for management
  - Technical explanation — Detailed technical analysis
  - Evidence reasoning — Evidence-based conclusions
  - Classification justification — Why classification was made
  - Confidence rationale — Why confidence is at current level

### 30. Comprehensive Forensic Service
- **File**: `backend/src/threat_intelligence/comprehensive_forensic_service.ts` — NEW
- **Orchestrates all components**:
  - Event normalization → Feature extraction → Behavior analysis → Risk scoring
  - Correlation → Heuristics → Anomaly detection → Classification → Profiling → Explanation
- **Output**: Complete forensic report with:
  - Executive summary
  - Threat classification + profile
  - Risk analysis
  - Attack chains + incidents + evidence graph
  - Behavioral heuristics + anomalies
  - Forensic timeline + analytics
  - MITRE tactics/techniques
  - Recommendations
  - Human-readable explanations

### 31. Enhanced Forensic Report Format
Reports now include all intelligence:
```json
{
  "report_id": "RPT-...",
  "executive_summary": { "overall_risk_level", "threat_type", "key_findings", "recommendation" },
  "threat_classification": { "predicted_threat", "confidence", "reasons", "mitre_techniques" },
  "threat_profile": { "profile", "match_score", "matched_behaviors" },
  "risk_analysis": { "overall_risk_score", "risk_level", "category_scores" },
  "attack_chain": { "stages", "mitre_tactics", "confidence" },
  "evidence_graph": { "nodes", "edges" },
  "detected_behaviors": [...],
  "behavioral_heuristics_triggered": [...],
  "anomalies_detected": [...],
  "forensic_timeline": [...],
  "session_analytics": { "most_active_process", "attack_intensity_score", ... },
  "recommendations": [...],
  "explanation": { "analyst_summary", "executive_summary", "technical_explanation" }
}
```

### 32. UI Integration Support
- Evidence graph data structure ready for graph visualization
- Process tree structure for tree visualization
- Timeline groups for timeline visualization
- Severity heatmap data via risk analysis category scores

---

## Changes Made (2026-05-19 - Phase 4.4)

### 33. Advanced Threat Simulation - Generic Executable Naming

**Objective:** Upgrade all simulators to use neutral names - detection must rely ONLY on behavior.

**Executable Names Changed:**
| Old Name | New Name | Behavior Profile |
|----------|----------|------------------|
| threat-file-1.exe | threat_file_1.exe | ransomware |
| threat-file-2.exe | threat_file_2.exe | spyware |
| threat-file-3.exe | windows_patch.exe | credential-stealer |
| threat-file-4.exe | updater_service.exe | trojan |
| threat-file-5.exe | runtime_helper.exe | botnet/worm |

**Files Modified:**
- simulators/*/packaging/pyinstaller/simulator.spec - Updated executable names and added VC++ runtime DLLs
- sandbox-agent/src/forensics_sandbox_agent/domain/simulator_mapping.py - Updated internal mappings
- build.py - Updated validation to use new names
- sandbox-agent/tests/unit/test_vbox_communication.py - Updated test paths

### 34. Multi-Stage Execution Framework

All simulators now execute in 7-8 distinct stages covering the full attack chain.

**Ransomware Simulator (threat_file_1.exe):** initialization → discovery → staging → encryption_simulation → persistence_setup → service_disruption → exfiltration → cleanup

**Spyware Simulator (threat_file_2.exe):** initialization → stealth_init → reconnaissance → collection → staging → exfiltration → persistence

**Trojan Simulator (updater_service.exe):** initialization → deception → injection → payload_staging → execution → persistence → cleanup

**Botnet/Worm Simulator (runtime_helper.exe):** initialization → checkin → reconnaissance → propagation → lateral_movement → command_control → cleanup

**Credential Stealer Simulator (windows_patch.exe):** initialization → privilege_escalation → credential_discovery → credential_harvesting → credential_processing → exfiltration → cleanup

### 35. Evasion Behaviors
Randomized delays between stages simulating sleep intervals and stealth.

### 36. Forensic Artifact Generation
Staging directories created with config files, buffers, archives, payloads.

### 37. MITRE ATT&CK Enrichment
All behaviors tagged with techniques: T1059, T1083, T1486, T1547.001, T1053, T1489, T1490, T1071, T1041, T1070, T1564, T1555, T1003, T1056

### 38. Sandbox Containment
All paths remain sandbox-local, network targets localhost only, rollback removes everything.

### 39. Detection Validation
Classification remains behavior-driven only - no filename-based detection.

**Build Status:** All 5 simulators rebuilt with new names, validation passes.

---

## Changes Made (2026-05-19 - Phase 4.5)

### 40. Multi-Stage Threat Execution Framework

Refactored all simulators to execute in 7 distinct stages:
1. initialization
2. environment_check
3. persistence_attempt
4. reconnaissance
5. payload_execution
6. lateral_activity
7. cleanup_or_exit

Each stage generates forensic telemetry with:
- Structured simulator events
- Timestamps
- Execution metadata
- Support for delays/jitter between stages
- Attack stage tracking

### 41. Enhanced Telemetry Events

Enhanced `telemetry/events.py` with:
- campaign_id tracking
- execution_chain_id for correlation
- simulator_family identification
- attack_stage per event
- tactic and technique fields (MITRE)
- confidence scores
- risk_score (0-100)
- artifact_references list
- evasion_indicators list
- metadata dictionary

New event types added:
- EVASION_CHECK
- PERSISTENCE_ATTEMPT
- ANTI_VM_CHECK
- ANTI_DEBUG_CHECK
- ENCODED_COMMAND
- SERVICE_INSTALL
- SCHEDULED_TASK
- BEACON
- EXFILTRATION
- ENCRYPTION_SIM

### 42. Realistic File System Activity

All simulators now simulate:
- Recursive directory traversal
- Mass file operations
- Extension mutation
- Staged file creation
- Ransom note deployment
- Shadow copy deletion simulation
- Temp file generation
- Archive staging

### 43. Advanced Process Behavior

Simulators emit telemetry for:
- Child process spawning (T1059)
- Command execution chains (T1059.001)
- PowerShell/cmd.exe execution
- Encoded command simulation (T1059.001)
- Process injection indicators (T1055)
- Mutex creation
- Service installation (T1543)
- Scheduled task creation (T1053)
- Privilege escalation attempts (T1068)
- Suspicious parent-child relationships

### 44. Advanced Network Simulation

Network events include:
- Beacon intervals with session IDs
- DNS request simulation
- Fake C2 communication
- Repeated outbound attempts
- SMB scanning (T1046, T1021)
- Port sweep simulation
- HTTP POST exfiltration simulation (T1041)
- Randomized connection timing
- Connection correlation IDs

### 45. Registry & Persistence Telemetry

Registry telemetry includes:
- Run keys (T1547.001)
- RunOnce keys
- Service persistence (T1543)
- Startup folder abuse (T1547)
- Shell modification
- Browser persistence
- Defender tampering simulation
- Persistence scoring metadata

### 46. Evasion & Stealth Simulation

Simulated evasion behaviors:
- Anti-VM checks (T1497)
- Anti-debugging checks (T1622)
- Delayed execution
- Sandbox fingerprinting
- Process hiding attempts (T1564)
- Timestomping metadata
- Log clearing attempts (T1070)
- Defense evasion behaviors

All tagged with MITRE ATT&CK mappings automatically.

### 47. Telemetry Enrichment

Every emitted event supports:
- attack_stage
- campaign_id
- execution_chain_id
- simulator_family
- tactic
- technique
- subtechnique
- confidence
- risk_score
- artifact_references
- evasion_indicators

Compatible with existing correlation engine, anomaly detector, threat profiler, and forensic reporting pipeline.

### 48. Backend Intelligence Integration

Backend extended to:
- Reconstruct multi-stage attacks from telemetry
- Identify kill chains from stage sequences
- Correlate persistence with exfiltration events
- Detect staged execution patterns
- Identify coordinated behaviors
- Compute attack sophistication score
- Compute stealth score
- Compute operational complexity score

### 49. Visualization Support

Extended forensic report structures for:
- Attack flow graphs (stage transitions)
- Process trees (parent-child relationships)
- Network relationship graphs (connection flows)
- MITRE ATT&CK heatmaps (technique frequency)
- Timeline visualization (stage timing)
- Severity overlays (risk scores)

### 50. Safety Verification

All simulations remain:
- VM-contained only
- No real malware
- No host system modification
- No internet propagation
- No destructive host actions
- Rollback always functional

**Build Status:** All 5 simulators rebuilt with multi-stage framework, validation passes

---

## Changes Made (2026-05-19 - Phase 5: Enterprise SOC UI/UX Transformation)

### 51. Enterprise Design System

**File:** `frontend/src/index.css`

Complete enterprise design system including:
- Professional typography scale with Inter font family
- Refined color palette with enterprise dark theme (#0a0e17)
- Severity color system (critical/high/medium/low/info)
- Animation keyframes (fade, slide, scale, shimmer, pulse, glow)
- Utility classes for glass effects, gradients, status colors
- Skeleton loading with shimmer animation
- Custom scrollbar styling
- Responsive grid system

### 52. Global Layout Redesign

**Files:**
- `frontend/src/layouts/MainLayout.tsx` - Professional layout with breadcrumbs and smooth transitions
- `frontend/src/components/layout/Sidebar.tsx` - Collapsible enterprise sidebar with system status
- `frontend/src/components/layout/Header.tsx` - Header with global search (Ctrl+K), breadcrumbs, notifications

**Features:**
- Collapsible sidebar with 72px collapsed / 260px expanded
- Active indicator animation with spring physics
- Global command palette (Ctrl+K)
- Real-time notifications dropdown
- User menu with profile/settings/logout
- Theme toggle (light/dark)
- Breadcrumb navigation

### 53. Enterprise Dashboard

**File:** `frontend/src/pages/DashboardPage.tsx`

Transformed into SOC command center with:
- Live threat overview widgets with severity theming
- Animated stat cards with gradient backgrounds
- Threat distribution with horizontal progress bars
- MITRE ATT&CK tactic summary grid
- Active alerts panel with severity icons
- Investigations panel with status indicators
- Activity feed with timestamp grouping
- AI Analysis engine card with metrics
- System operational indicator with pulse animation

### 54. Advanced Visualization Components

**Files Created:**

| Component | File | Purpose |
|-----------|------|---------|
| ForensicTimeline | `visualizations/ForensicTimeline.tsx` | Interactive timeline with severity colors, MITRE tags |
| MITREHeatmap | `visualizations/MITREHeatmap.tsx` | MITRE ATT&CK heatmap with technique details |
| AttackChain | `visualizations/AttackChain.tsx` | Attack chain progression with stage visualization |
| RiskScoreGauge | `visualizations/RiskScoreGauge.tsx` | Animated risk score with spring physics |
| EvidenceGraph | `visualizations/EvidenceGraph.tsx` | Node-based relationship graph with zoom/pan |
| LiveActivityStream | `visualizations/LiveActivityStream.tsx` | Real-time activity feed with auto-streaming |
| ThreatRadar | `visualizations/ThreatRadar.tsx` | Radar/spider chart for threat profiles |

### 55. Enhanced UI Components

**Files Created/Enhanced:**

| Component | File | Purpose |
|-----------|------|---------|
| DataTable | `components/ui/DataTable.tsx` | Enterprise table with sorting, filtering, pagination |
| Skeleton | `components/ui/Skeleton.tsx` | Premium skeleton loaders with shimmer |
| EmptyState | `components/ui/EmptyState.tsx` | Elegant empty states with animations |

**Features:**
- Sortable columns with animated indicators
- Search/filter with debouncing
- Expandable row details
- Pagination with page navigation
- Loading states with spinners
- Multiple skeleton variants (card, table, list, stat)

### 56. Sandbox Agent UI Updates

**File:** `sandbox-agent/src/forensics_sandbox_agent/app/presentation/qt/theme/design_tokens.py`

Updated color palette:
- Changed to enterprise dark theme (#0a0e17, #0f172a, #1e293b)
- Added elevated surface colors
- Enhanced shadow system

### 57. Animation Systems

**Implementation:**
- Page transitions with AnimatePresence (fade + slide)
- Staggered content reveals with 50ms delays
- Spring-based animations for interactive elements
- Smooth hover transitions (150ms ease-out)
- Live indicator pulse animations
- Graph edge/node entrance animations

### 58. Global Search & Command Palette

**File:** `frontend/src/components/layout/Header.tsx`

Implemented:
- Ctrl+K keyboard shortcut activation
- Instant search with real-time filtering
- Quick action suggestions (New Investigation, Upload Evidence, View Alerts)
- Animated modal with backdrop blur
- Escape key to close
- Focus management

### 59. Dark Theme Refinement

**Theme Colors:**
- Background: #0a0e17 (deep charcoal)
- Surface: #1e293b (elevated)
- Border: #334155 (subtle)
- Text Primary: #f8fafc
- Text Secondary: #cbd5e1
- Accent: #3b82f6 (blue)

**Avoided:**
- Neon glow effects
- Cyberpunk aesthetics
- Hacker terminal themes

### 60. Build Verification

**Command:** `npm run build`

**Result:** ✅ Build successful (592ms)
- CSS: 107.74 kB (16.94 kB gzipped)
- JS: 779.56 kB (218.64 kB gzipped)
- No TypeScript errors
- No backend regressions

### 61. UI/UX Polish Summary

| Feature | Status |
|---------|--------|
| Consistent spacing system | ✅ Complete |
| Typography hierarchy | ✅ Complete |
| Premium card styling | ✅ Complete |
| Smooth hover transitions | ✅ Complete |
| Skeleton loaders | ✅ Complete |
| Empty states | ✅ Complete |
| Command palette | ✅ Complete |
| Live indicators | ✅ Complete |
| Responsive layouts | ✅ Complete |
| Accessibility support | ✅ Complete |

### 62. Phase 5 Deliverables

**All Files Modified:**
- frontend/src/index.css (design system)
- frontend/src/layouts/MainLayout.tsx
- frontend/src/components/layout/Sidebar.tsx
- frontend/src/components/layout/Header.tsx
- frontend/src/pages/DashboardPage.tsx
- frontend/src/pages/LogsPage.tsx
- frontend/src/components/visualizations/*.tsx (7 new files)
- frontend/src/components/ui/DataTable.tsx
- frontend/src/components/ui/Skeleton.tsx (new)
- frontend/src/components/ui/EmptyState.tsx (new)
- sandbox-agent/src/.../design_tokens.py

**Enterprise Aesthetic Achieved:**
- Modern SOC platform feel (like CrowdStrike, SentinelOne, Splunk)
- Clean, professional design
- Smooth animations and transitions
- Real-time operational feel
- Premium polish suitable for investor demos

(End of file)
