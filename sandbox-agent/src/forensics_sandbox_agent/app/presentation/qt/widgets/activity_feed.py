"""Modern activity feed panel with enterprise styling."""

from __future__ import annotations

from PyQt6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)


class ActivityFeed(QFrame):
    """Timeline-style investigation activity feed with modern design."""

    def __init__(self, title: str, subtitle: str, entries: list[str]) -> None:
        super().__init__()
        self.setObjectName("card")
        self._entries = entries

        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        self._build_header(layout, title, subtitle)
        self._build_timeline(layout)

    def _build_header(self, layout: QVBoxLayout, title: str, subtitle: str) -> None:
        """Build the section header."""
        header = QWidget()
        header_layout = QVBoxLayout(header)
        header_layout.setContentsMargins(0, 0, 0, 0)
        header_layout.setSpacing(4)

        eyebrow = QLabel("ACTIVITY FEED")
        eyebrow.setStyleSheet(f"""
            QLabel {{
                font-size: 10px;
                font-weight: 700;
                color: {DesignTokens.COLOR_PRIMARY};
                letter-spacing: 1.5px;
            }}
        """)

        title_widget = QLabel(title)
        title_widget.setStyleSheet(f"""
            QLabel {{
                font-size: {DesignTokens.SUBHEADING_SIZE}px;
                font-weight: 600;
                color: {DesignTokens.COLOR_TEXT_PRIMARY};
            }}
        """)

        subtitle_widget = QLabel(subtitle)
        subtitle_widget.setStyleSheet(f"""
            QLabel {{
                font-size: {DesignTokens.SMALL_SIZE}px;
                color: {DesignTokens.COLOR_TEXT_MUTED};
            }}
        """)
        subtitle_widget.setWordWrap(True)

        header_layout.addWidget(eyebrow)
        header_layout.addWidget(title_widget)
        header_layout.addWidget(subtitle_widget)
        layout.addWidget(header)

    def _build_timeline(self, layout: QVBoxLayout) -> None:
        """Build the timeline entries."""
        timeline_widget = QWidget()
        timeline_layout = QVBoxLayout(timeline_widget)
        timeline_layout.setContentsMargins(0, 0, 0, 0)
        timeline_layout.setSpacing(12)

        for i, entry in enumerate(self._entries):
            item = ActivityItem(
                icon=self._get_icon_for_entry(i),
                text=entry,
                timestamp=self._get_timestamp(i),
                variant=self._get_variant_for_entry(i),
            )
            timeline_layout.addWidget(item)

        timeline_layout.addStretch(1)
        layout.addWidget(timeline_widget, 1)

    def _get_icon_for_entry(self, index: int) -> str:
        icons = ["[*]", "[OK]", "[?]", "[#]", "[!]"]
        return icons[index % len(icons)]

    def _get_timestamp(self, index: int) -> str:
        timestamps = ["Just now", "2m ago", "5m ago", "10m ago", "15m ago"]
        return timestamps[index % len(timestamps)]

    def _get_variant_for_entry(self, index: int) -> str:
        variants = ["default", "success", "info", "warning", "default"]
        return variants[index % len(variants)]


class ActivityItem(QFrame):
    """Single activity feed item with modern styling."""

    def __init__(self, icon: str, text: str, timestamp: str, variant: str = "default") -> None:
        super().__init__()
        self.setObjectName("card")
        self.setStyleSheet(f"""
            QFrame#card {{
                background: {DesignTokens.COLOR_SURFACE};
                border: 1px solid {DesignTokens.COLOR_GLASS_BORDER};
                border-radius: 12px;
                padding: 14px;
            }}
            QFrame#card:hover {{
                border-color: {DesignTokens.COLOR_BORDER_HOVER};
            }}
        """)
        self._setup_ui(icon, text, timestamp, variant)

    def _setup_ui(self, icon: str, text: str, timestamp: str, variant: str) -> None:
        """Build the item UI."""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(14)

        icon_label = QLabel(icon)
        icon_label.setStyleSheet(f"""
            QLabel {{
                font-size: 14px;
                font-weight: 700;
                background: {DesignTokens.COLOR_PRIMARY_SOFT};
                border-radius: 10px;
                padding: 8px;
                min-width: 40px;
                max-width: 40px;
                min-height: 40px;
                max-height: 40px;
                qproperty-alignment: 'AlignCenter';
            }}
        """)

        content = QVBoxLayout()
        content.setSpacing(4)

        text_label = QLabel(text)
        text_label.setStyleSheet(f"""
            QLabel {{
                font-size: {DesignTokens.BODY_SIZE}px;
                color: {DesignTokens.COLOR_TEXT_SECONDARY};
            }}
        """)
        text_label.setWordWrap(True)

        time_label = QLabel(timestamp)
        time_label.setStyleSheet(f"""
            QLabel {{
                font-size: {DesignTokens.SMALL_SIZE}px;
                color: {DesignTokens.COLOR_TEXT_MUTED};
            }}
        """)

        content.addWidget(text_label)
        content.addWidget(time_label)

        layout.addWidget(icon_label)
        layout.addLayout(content, 1)
