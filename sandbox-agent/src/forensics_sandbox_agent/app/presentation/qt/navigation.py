"""Navigation models for the desktop shell."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class NavigationItem:
    route: str
    title: str
    subtitle: str
    glyph: str
