"""Reusable glass-style panel container with modern styling."""

from __future__ import annotations

from PyQt6.QtCore import QPropertyAnimation, QEasingCurve, QParallelAnimationGroup
from PyQt6.QtWidgets import QFrame, QVBoxLayout, QWidget

from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)


class Panel(QFrame):
    """Modern glass-panel component with hover effects and animations."""

    _hover_animation_group = None

    def __init__(
        self,
        accent: bool = False,
        variant: str = "default",
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._accent = accent
        self._variant = variant

        self._setup_styling()
        self._setup_animations()

    def _setup_styling(self) -> None:
        """Apply variant-based styling."""
        if self._variant == "glass":
            self.setObjectName("glassPanel")
        elif self._accent:
            self.setObjectName("cardAccent")
        else:
            self.setObjectName("card")

        self.setMinimumHeight(120)
        self.setLayout(QVBoxLayout())
        self.layout().setContentsMargins(DesignTokens.SPACING_5, DesignTokens.SPACING_5, DesignTokens.SPACING_5, DesignTokens.SPACING_5)
        self.layout().setSpacing(DesignTokens.SPACING_3)

    def _setup_animations(self) -> None:
        """Setup smooth hover animations."""
        self._border_opacity = 1.0

        self._hover_anim = QPropertyAnimation(self, b"styleSheet")
        self._hover_anim.setDuration(DesignTokens.ANIMATION_NORMAL)
        self._hover_anim.setEasingCurve(QEasingCurve.Type.OutCubic)

    def enterEvent(self, event) -> None:
        """Handle mouse enter with smooth transition."""
        self._animate_hover(True)
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:
        """Handle mouse leave with smooth transition."""
        self._animate_hover(False)
        super().leaveEvent(event)

    def _animate_hover(self, entering: bool) -> None:
        """Run hover animation."""
        if entering:
            self.setCursor(Qt.CursorShape.PointingHandCursor)
        else:
            self.unsetCursor()


class GlassPanel(Panel):
    """Frosted glass variant with enhanced transparency."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(variant="glass", parent=parent)


from PyQt6.QtCore import Qt
