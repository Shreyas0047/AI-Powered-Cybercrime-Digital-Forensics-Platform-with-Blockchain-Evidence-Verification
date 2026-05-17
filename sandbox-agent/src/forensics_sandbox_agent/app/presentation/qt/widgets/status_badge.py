"""Status badge and animated pulse indicator widgets."""

from __future__ import annotations

from PyQt6.QtCore import QEasingCurve, QPropertyAnimation, QRectF, Qt, QTimer, pyqtProperty
from PyQt6.QtGui import QColor, QPainter
from PyQt6.QtWidgets import QLabel, QHBoxLayout, QWidget


class PulseIndicator(QWidget):
    """Subtle animated pulse used for live-status affordances."""

    def __init__(self, color: str = "#1ab98b", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._color = QColor(color)
        self._scale = 0.0
        self.setFixedSize(16, 16)

        self._animation = QPropertyAnimation(self, b"pulseScale", self)
        self._animation.setDuration(1800)
        self._animation.setStartValue(0.15)
        self._animation.setEndValue(1.0)
        self._animation.setEasingCurve(QEasingCurve.Type.OutCubic)
        self._animation.finished.connect(self._restart)
        self._animation.start()

    def _restart(self) -> None:
        QTimer.singleShot(120, self._animation.start)

    def get_pulse_scale(self) -> float:
        return self._scale

    def set_pulse_scale(self, value: float) -> None:
        self._scale = float(value)
        self.update()

    pulseScale = pyqtProperty(float, fget=get_pulse_scale, fset=set_pulse_scale)

    def paintEvent(self, event) -> None:  # noqa: ANN001
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setPen(Qt.PenStyle.NoPen)

        glow = QColor(self._color)
        glow.setAlpha(55)
        painter.setBrush(glow)
        outer = QRectF(2, 2, 12 * self._scale, 12 * self._scale)
        from PyQt6.QtCore import QPointF
        outer.moveCenter(QPointF(self.rect().center().x(), self.rect().center().y()))
        painter.drawEllipse(outer)

        solid = QColor(self._color)
        solid.setAlpha(230)
        painter.setBrush(solid)
        painter.drawEllipse(QRectF(4, 4, 8, 8))


class StatusBadge(QWidget):
    """Badge combining a pulse indicator and a short status message."""

    def __init__(self, label: str, color: str = "#1ab98b") -> None:
        super().__init__()
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 8)
        layout.setSpacing(8)

        indicator = PulseIndicator(color=color)
        text = QLabel(label)
        text.setObjectName("metricLabel")

        layout.addWidget(indicator)
        layout.addWidget(text)
