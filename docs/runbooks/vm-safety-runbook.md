# VM Safety Runbook

This runbook will later define the operational process for running the platform inside an isolated Windows VM.

Baseline assumptions for future implementation:

- no bridged networking
- only approved sandbox directories
- disposable snapshot before execution
- no real credentials or personal data in the guest VM
- only approved simulator executables are available to the agent
