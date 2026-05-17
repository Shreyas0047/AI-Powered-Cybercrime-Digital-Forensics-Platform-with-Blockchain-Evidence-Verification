"""Modern top navigation bar with enterprise styling."""

from __future__ import annotations

from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)


class TopBar(QFrame):
    """Premium application header with context and action controls."""

    new_session_requested = pyqtSignal()

    def __init__(self, page_title: str, page_subtitle: str) -> None:
        super().__init__()
        self.setObjectName("topbar")
        self.setStyleSheet(f"""
            QFrame#topbar {{
                background: {DesignTokens.COLOR_SURFACE};
                border-bottom: 1px solid {DesignTokens.COLOR_GLASS_BORDER};
            }}
        """)
        self.setMinimumHeight(DesignTokens.TOPBAR_HEIGHT)

        self._setup_ui(page_title, page_subtitle)

    def _setup_ui(self, page_title: str, page_subtitle: str) -> None:
        """Build the top bar UI."""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(24, 0, 24, 0)
        layout.setSpacing(20)

        # Title section
        title_col = QVBoxLayout()
        title_col.setSpacing(2)

        self._title_widget = QLabel(page_title)
        self._title_widget.setStyleSheet(f"font-size: {DesignTokens.HEADING_SIZE}px; font-weight: 700; color: {DesignTokens.COLOR_TEXT_PRIMARY};")

        self._subtitle_widget = QLabel(page_subtitle)
        self._subtitle_widget.setStyleSheet(f"font-size: {DesignTokens.CAPTION_SIZE}px; color: {DesignTokens.COLOR_TEXT_MUTED};")

        title_col.addWidget(self._title_widget)
        title_col.addWidget(self._subtitle_widget)

        layout.addLayout(title_col)
        layout.addStretch(1)

        # Actions
        actions = QHBoxLayout()
        actions.setSpacing(12)

        # Status
        status_dot = QFrame()
        status_dot.setFixedSize(8, 8)
        status_dot.setStyleSheet(f"background: {DesignTokens.COLOR_SUCCESS}; border-radius: 4px;")

        status_label = QLabel("System Active")
        status_label.setStyleSheet(f"font-size: {DesignTokens.SMALL_SIZE}px; font-weight: 600; color: {DesignTokens.COLOR_SUCCESS};")

        actions.addWidget(status_dot)
        actions.addWidget(status_label)

        # Separator
        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.VLine)
        sep.setStyleSheet(f"background: {DesignTokens.COLOR_GLASS_BORDER}; width: 1px; margin: 8px 8px;")
        actions.addWidget(sep)

        # Search
        search = QLineEdit()
        search.setPlaceholderText("Search...")
        search.setMinimumWidth(200)
        search.setFixedHeight(36)
        search.setStyleSheet(f"""
            QLineEdit {{
                background: {DesignTokens.COLOR_SURFACE};
                border: 1px solid {DesignTokens.COLOR_BORDER};
                border-radius: 10px;
                padding: 0 14px;
                font-size: 13px;
            }}
        """)
        actions.addWidget(search)

        # New Session button
        new_session = QPushButton("New Session")
        new_session.clicked.connect(self.new_session_requested.emit)
        new_session.setFixedHeight(36)
        new_session.setStyleSheet(f"""
            QPushButton {{
                background: linear-gradient(135deg, {DesignTokens.COLOR_PRIMARY}, {DesignTokens.COLOR_ACCENT});
                color: white;
                border: none;
                border-radius: 10px;
                padding: 0 20px;
                font-weight: 600;
                font-size: 13px;
            }}
        """)
        actions.addWidget(new_session)

        layout.addLayout(actions)

    def update_context(self, page_title: str, page_subtitle: str) -> None:
        """Update the header when navigation changes."""
        self._title_widget.setText(page_title)
        self._subtitle_widget.setText(page_subtitle)
