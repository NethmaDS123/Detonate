from __future__ import annotations

import argparse
import sys

from detonate_worker.daily import run_once
from detonate_worker.scheduler import run_forever


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="detonate-worker",
        description="Publish Detonate daily board seeds to Redis.",
    )
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("once", help="Publish today's boards once and exit (default).")
    sub.add_parser(
        "schedule",
        help="Publish on startup, then once per UTC day at WORKER_UTC_HOUR:WORKER_UTC_MINUTE.",
    )
    args = parser.parse_args(argv)
    command = args.command or "once"
    if command == "schedule":
        run_forever()
    elif command == "once":
        run_once()
    else:
        parser.print_help()
        sys.exit(2)


if __name__ == "__main__":
    main()
