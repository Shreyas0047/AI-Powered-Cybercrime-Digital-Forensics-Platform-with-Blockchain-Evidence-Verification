"""Small animation helpers for polished but restrained transitions."""

from __future__ import annotations

from PyQt6.QtCore import QEasingCurve, QPropertyAnimation
from PyQt6.QtWidgets import QGraphicsOpacityEffect, QWidget


def build_fade_in(widget: QWidget, duration_ms: int = 220) -> QPropertyAnimation:
    """Create a fade-in animation for a widget.

    The returned animation must be retained by the caller for the lifetime of
    the transition. This keeps the helper generic and side-effect free.
    """

    effect = widget.graphicsEffect()
    if not isinstance(effect, QGraphicsOpacityEffect):
        effect = QGraphicsOpacityEffect(widget)
        widget.setGraphicsEffect(effect)

    animation = QPropertyAnimation(effect, b"opacity", widget)
    animation.setDuration(duration_ms)
    animation.setStartValue(0.0)
    animation.setEndValue(1.0)
    animation.setEasingCurve(QEasingCurve.Type.InOutCubic)
    return animation
