"""Modern sidebar navigation widget with enterprise styling."""

from __future__ import annotations

from collections.abc import Callable

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QButtonGroup,
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from forensics_sandbox_agent.app.presentation.qt.navigation import NavigationItem
from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)


class SidebarNavigation(QFrame):
    """Premium application navigation sidebar."""

    def __init__(
        self,
        items: list[NavigationItem],
        on_selected: Callable[[str], None],
    ) -> None:
        super().__init__()
        self.setObjectName("sidebar")
        self.setStyleSheet(f"""
            QFrame#sidebar {{
                background: {DesignTokens.COLOR_SURFACE};
                border-right: 1px solid {DesignTokens.COLOR_GLASS_BORDER};
            }}
        """)
        self._on_selected = on_selected
        self._button_group = QButtonGroup(self)
        self._button_group.setExclusive(True)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 20, 16, 20)
        layout.setSpacing(8)

        self._build_header(layout)
        self._build_nav_items(layout, items)
        layout.addStretch(1)
        self._build_footer(layout)

        first_button = self._button_group.button(0)
        if first_button is not None:
            first_button.setChecked(True)

    def _build_header(self, layout: QVBoxLayout) -> None:
        """Build the branding header section."""
        header_layout = QVBoxLayout()
        header_layout.setSpacing(8)

        logo_layout = QHBoxLayout()
        logo_layout.setSpacing(12)

        logo = QLabel("[F]")
        logo.setStyleSheet(f"font-size: 24px; color: {DesignTokens.COLOR_PRIMARY}; font-weight: bold;")

        wordmark = QLabel("ForensicsHub")
        wordmark.setStyleSheet(f"font-size: 16px; font-weight: 700; color: {DesignTokens.COLOR_TEXT_PRIMARY};")

        logo_layout.addWidget(logo)
        logo_layout.addWidget(wordmark)
        logo_layout.addStretch()

        subtitle = QLabel("Digital Forensics Platform")
        subtitle.setStyleSheet(f"font-size: 10px; color: {DesignTokens.COLOR_TEXT_MUTED};")

        header_layout.addLayout(logo_layout)
        header_layout.addWidget(subtitle)

        separator = QFrame()
        separator.setFrameShape(QFrame.Shape.HLine)
        separator.setStyleSheet(f"background: {DesignTokens.COLOR_GLASS_BORDER}; height: 1px; margin: 12px 0;")

        layout.addLayout(header_layout)
        layout.addWidget(separator)

    def _build_nav_items(self, layout: QVBoxLayout, items: list[NavigationItem]) -> None:
        """Build navigation buttons."""
        section_label = QLabel("NAVIGATION")
        section_label.setStyleSheet(f"font-size: 10px; font-weight: 600; color: {DesignTokens.COLOR_TEXT_MUTED}; letter-spacing: 1px; padding: 8px 0;")
        layout.addWidget(section_label)

        for index, item in enumerate(items):
            button = QPushButton(f"{item.glyph}  {item.title}")
            button.setStyleSheet(f"""
                QPushButton {{
                    background: transparent;
                    border: none;
                    border-radius: 12px;
                    padding: 14px 16px;
                    text-align: left;
                    font-size: 14px;
                    font-weight: 500;
                    color: {DesignTokens.COLOR_TEXT_MUTED};
                }}
                QPushButton:hover {{
                    background: {DesignTokens.COLOR_PRIMARY_SOFT};
                    color: {DesignTokens.COLOR_PRIMARY};
                }}
                QPushButton:checked {{
                    background: {DesignTokens.COLOR_PRIMARY_SOFT};
                    color: {DesignTokens.COLOR_PRIMARY};
                    font-weight: 600;
                }}
            """)
            button.setCheckable(True)
            button.clicked.connect(lambda checked=False, route=item.route: self._on_selected(route))
            self._button_group.addButton(button, index)
            layout.addWidget(button)

    def _build_footer(self, layout: QVBoxLayout) -> None:
        """Build the footer section."""
        separator = QFrame()
        separator.setFrameShape(QFrame.Shape.HLine)
        separator.setStyleSheet(f"background: {DesignTokens.COLOR_GLASS_BORDER}; height: 1px; margin: 12px 0;")

        footer = QLabel("Phase 1.0 | Desktop Investigation")
        footer.setAlignment(Qt.AlignmentFlag.AlignCenter)
        footer.setStyleSheet(f"font-size: 10px; color: {DesignTokens.COLOR_TEXT_DISABLED}; padding: 8px 0;")

        layout.addWidget(separator)
        layout.addWidget(footer)

    def select_route(self, route: str, items: list[NavigationItem]) -> None:
        """Synchronize the checked item with application state."""
        for index, item in enumerate(items):
            if item.route == route:
                button = self._button_group.button(index)
                if button is not None:
                    button.setChecked(True)
                return
