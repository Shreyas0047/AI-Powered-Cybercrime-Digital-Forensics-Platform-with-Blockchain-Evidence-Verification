"""Common path helpers used across the desktop agent."""

from __future__ import annotations

from pathlib import Path


def package_root() -> Path:
    """Return the package root for runtime-relative lookups."""
    return Path(__file__).resolve().parents[3]
