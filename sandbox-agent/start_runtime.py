#!/usr/bin/env python3
"""Start the Sandbox Runtime API Service.

This script starts the headless sandbox runtime service that provides
remote control and telemetry streaming for the sandbox execution environment.

Usage:
    python start_runtime.py [--host HOST] [--port PORT]

Example:
    python start_runtime.py --host 127.0.0.1 --port 8765
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from forensics_sandbox_agent.infrastructure.runtime_api import run_server


def main():
    parser = argparse.ArgumentParser(
        description='Start the Sandbox Runtime API Service'
    )
    parser.add_argument(
        '--host',
        default='127.0.0.1',
        help='Host to bind to (default: 127.0.0.1)'
    )
    parser.add_argument(
        '--port',
        type=int,
        default=8765,
        help='Port to bind to (default: 8765)'
    )

    args = parser.parse_args()

    print(f"Starting Sandbox Runtime API on {args.host}:{args.port}")
    run_server(host=args.host, port=args.port)


if __name__ == '__main__':
    main()