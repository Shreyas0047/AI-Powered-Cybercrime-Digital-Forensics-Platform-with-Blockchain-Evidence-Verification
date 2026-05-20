"""Module entry point for running the runtime API."""

from forensics_sandbox_agent.infrastructure.runtime_api import run_server
import argparse


def main():
    parser = argparse.ArgumentParser(description='Sandbox Runtime API')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8765, help='Port to bind to')
    args = parser.parse_args()

    print(f"Starting Sandbox Runtime API on {args.host}:{args.port}")
    run_server(host=args.host, port=args.port)


if __name__ == '__main__':
    main()