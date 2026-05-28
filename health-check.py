"""
ForensicsAI Platform Health Check
Verifies all services are communicating correctly.

Usage: python health-check.py
"""

import urllib.request
import urllib.error
import json
import sys

SERVICES = [
    {"name": "Backend API", "url": "http://localhost:3000/api/v1/operations/health", "critical": True},
    {"name": "Backend Ready", "url": "http://localhost:3000/api/v1/operations/ready", "critical": True},
    {"name": "AI Service", "url": "http://localhost:8000/health", "critical": False},
    {"name": "Sandbox Agent", "url": "http://127.0.0.1:8765/health", "critical": False},
]


def check_service(service: dict) -> dict:
    try:
        req = urllib.request.Request(service["url"], method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = json.loads(resp.read().decode())
            status = body.get("status", "unknown")
            return {"name": service["name"], "status": "UP", "detail": status, "ok": True}
    except urllib.error.URLError as e:
        return {"name": service["name"], "status": "DOWN", "detail": str(e.reason), "ok": False}
    except Exception as e:
        return {"name": service["name"], "status": "ERROR", "detail": str(e), "ok": False}


def main():
    print("=" * 50)
    print("  ForensicsAI Platform Health Check")
    print("=" * 50)
    print()

    results = [check_service(s) for s in SERVICES]
    all_critical_ok = True

    for i, result in enumerate(results):
        icon = "[OK]" if result["ok"] else "[X] "
        status_line = f"  {icon} {result['name']:<20} {result['status']:<8} {result['detail']}"
        print(status_line)

        if not result["ok"] and SERVICES[i]["critical"]:
            all_critical_ok = False

    print()
    print("-" * 50)

    up_count = sum(1 for r in results if r["ok"])
    total = len(results)
    print(f"  Services: {up_count}/{total} operational")

    if all_critical_ok:
        print("  Platform: HEALTHY (critical services OK)")
        print()
        return 0
    else:
        print("  Platform: DEGRADED (critical service down)")
        print()
        return 1


if __name__ == "__main__":
    sys.exit(main())
