"""Simple painted placeholder chart for future analytics surfaces."""

from __future__ import annotations

from PyQt6.QtCore import QPoint, QPointF, Qt
from PyQt6.QtGui import QColor, QLinearGradient, QPainter, QPainterPath, QPen
from PyQt6.QtWidgets import QWidget


class ChartPlaceholder(QWidget):
    """Draws a synthetic trend to establish dashboard composition early."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setMinimumHeight(220)

    def paintEvent(self, event) -> None:  # noqa: ANN001
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.fillRect(self.rect(), Qt.GlobalColor.transparent)

        rect = self.rect().adjusted(6, 12, -6, -12)
        grid_pen = QPen(QColor(160, 184, 210, 70), 1)
        grid_pen.setStyle(Qt.PenStyle.DashLine)
        painter.setPen(grid_pen)

        for row in range(5):
            y = rect.top() + int((row / 4) * rect.height())
            painter.drawLine(rect.left(), y, rect.right(), y)

        points = [
            QPointF(rect.left() + rect.width() * 0.00, rect.bottom() - rect.height() * 0.70),
            QPointF(rect.left() + rect.width() * 0.18, rect.bottom() - rect.height() * 0.62),
            QPointF(rect.left() + rect.width() * 0.34, rect.bottom() - rect.height() * 0.55),
            QPointF(rect.left() + rect.width() * 0.52, rect.bottom() - rect.height() * 0.40),
            QPointF(rect.left() + rect.width() * 0.68, rect.bottom() - rect.height() * 0.48),
            QPointF(rect.left() + rect.width() * 0.84, rect.bottom() - rect.height() * 0.28),
            QPointF(rect.right(), rect.bottom() - rect.height() * 0.18),
        ]

        area_path = QPainterPath(points[0])
        for point in points[1:]:
            area_path.lineTo(point)
        area_path.lineTo(rect.right(), rect.bottom())
        area_path.lineTo(rect.left(), rect.bottom())
        area_path.closeSubpath()

        gradient = QLinearGradient(
            QPointF(rect.left(), rect.top()),
            QPointF(rect.left(), rect.bottom())
        )
        gradient.setColorAt(0.0, QColor(31, 134, 255, 80))
        gradient.setColorAt(1.0, QColor(18, 184, 166, 10))
        painter.fillPath(area_path, gradient)

        line_pen = QPen(QColor("#1f86ff"), 3)
        painter.setPen(line_pen)
        line_path = QPainterPath(points[0])
        for point in points[1:]:
            line_path.lineTo(point)
        painter.drawPath(line_path)

        node_color = QColor("#12b8a6")
        painter.setBrush(node_color)
        painter.setPen(Qt.PenStyle.NoPen)
        for point in points:
            painter.drawEllipse(point, 4, 4)
