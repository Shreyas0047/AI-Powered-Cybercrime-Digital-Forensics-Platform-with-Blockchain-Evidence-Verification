import subprocess
import time
import sys
from pathlib import Path

def run_cmd(args):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=30)
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return -1, "", str(e)

def check_step(name, success_condition, error_msg):
    print(f"[*] Checking {name}...", end="", flush=True)
    if success_condition:
        print(" [OK]")
        return True
    else:
        print(" [FAILED]")
        print(f"    ERROR: {error_msg}")
        return False

def main():
    print("="*60)
    print(" FORENSICS PLATFORM - VM READINESS CHECKER")
    print("="*60)

    # 1. Check VBoxManage
    rc, out, err = run_cmd(["VBoxManage", "--version"])
    if not check_step("VBoxManage Accessibility", rc == 0, "VBoxManage not in PATH or not installed"):
        sys.exit(1)
    print(f"    Version: {out}")

    # 2. Check VM Existence
    vm_name = "ForensicsSandbox"
    rc, out, err = run_cmd(["VBoxManage", "list", "vms"])
    vm_exists = f'"{vm_name}"' in out
    if not check_step(f"VM Existence ({vm_name})", vm_exists, f"VM '{vm_name}' not found in VirtualBox"):
        sys.exit(1)

    # 3. Check Snapshot
    snapshot_name = "CleanBaseline"
    rc, out, err = run_cmd(["VBoxManage", "snapshot", vm_name, "list"])
    snap_exists = snapshot_name in out
    if not check_step(f"Snapshot Existence ({snapshot_name})", snap_exists, f"Snapshot '{snapshot_name}' not found"):
        print("    HINT: Take a snapshot named 'CleanBaseline' while the VM is powered off.")
        sys.exit(1)

    # 4. Check VM State
    rc, out, err = run_cmd(["VBoxManage", "showvminfo", vm_name, "--machinereadable"])
    is_running = 'VMState="running"' in out
    
    if not is_running:
        print("[!] VM is not running. Attempting to start for further checks...")
        run_cmd(["VBoxManage", "startvm", vm_name, "--type", "gui"])
        rc, out, err = run_cmd(["VBoxManage", "showvminfo", vm_name, "--machinereadable"])
        is_running = 'VMState="running"' in out
        if not check_step("VM Manual Start", is_running, "Could not start VM automatically"):
            sys.exit(1)

    # 5. Check Guest Additions (Low Level)
    rc, out, err = run_cmd(["VBoxManage", "guestproperty", "get", vm_name, "/VirtualBox/GuestAdd/Version"])
    has_ga = "Value:" in out
    if not check_step("Guest Additions Service", has_ga, "Guest Additions not detected in Guest"):
        print("    HINT: Install VirtualBox Guest Additions inside the Windows VM.")
        sys.exit(1)
    
    # 5.1 Deep Verification (Can we actually run commands?)
    print("[*] Verifying Guest Command Execution...", end="", flush=True)
    rc, out, err = run_cmd([
        "VBoxManage", "guestcontrol", vm_name, "run", 
        "--username", "guestuser", "--password", "guest", 
        "--", "cmd.exe", "/c", "echo ready"
    ])
    if rc == 0:
        print(" [OK]")
    else:
        print(" [FAILED]")
        print("    ERROR: Guest is not responding to commands yet.")
        print("    HINT: Wait a few more seconds for Windows to finish loading services.")
        sys.exit(1)

    # 6. Check Guest User Account & Directory Access
    # We test the exact command the agent uses
    print("[*] Testing Guest Control (Username: guestuser, Password: guest)...", end="", flush=True)
    rc, out, err = run_cmd([
        "VBoxManage", "guestcontrol", vm_name, "stat", 
        "--username", "guestuser", "--password", "guest", 
        "--", "C:/"
    ])
    if rc == 0:
        print(" [OK]")
    else:
        print(" [FAILED]")
        print(f"    ERROR: {err}")
        print("    HINT 1: Ensure Windows user 'guestuser' exists with password 'guest'.")
        print("    HINT 2: Ensure you are LOGGED IN to that user in the VM window.")
        sys.exit(1)

    # 7. Check Sandbox Folders
    print("[*] Checking Guest Folders (C:/sandbox/simulators)...", end="", flush=True)
    rc, out, err = run_cmd([
        "VBoxManage", "guestcontrol", vm_name, "stat", 
        "--username", "guestuser", "--password", "guest", 
        "--", "C:/sandbox/simulators"
    ])
    if rc == 0:
        print(" [OK]")
    else:
        print(" [FAILED]")
        print("    HINT: Create the folder 'C:\\sandbox\\simulators' inside the VM.")
        sys.exit(1)

    print("\n" + "="*60)
    print(" SUCCESS: YOUR ENVIRONMENT IS READY!")
    print(" You can now run the Sandbox Agent and execute simulators.")
    print("="*60)

if __name__ == "__main__":
    main()
