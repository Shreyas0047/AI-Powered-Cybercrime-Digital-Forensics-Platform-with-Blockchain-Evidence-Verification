"""Reusable section header widget."""

from __future__ import annotations

from PyQt6.QtWidgets import QLabel, QVBoxLayout, QWidget


class SectionHeader(QWidget):
    """Standard title block for panels and pages."""

    def __init__(self, title: str, subtitle: str, eyebrow: str | None = None) -> None:
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(4)

        if eyebrow:
            eyebrow_label = QLabel(eyebrow)
            eyebrow_label.setObjectName("eyebrow")
            layout.addWidget(eyebrow_label)

        title_label = QLabel(title)
        title_label.setObjectName("sectionTitle")
        subtitle_label = QLabel(subtitle)
        subtitle_label.setObjectName("sectionSubtitle")
        subtitle_label.setWordWrap(True)

        layout.addWidget(title_label)
        layout.addWidget(subtitle_label)
