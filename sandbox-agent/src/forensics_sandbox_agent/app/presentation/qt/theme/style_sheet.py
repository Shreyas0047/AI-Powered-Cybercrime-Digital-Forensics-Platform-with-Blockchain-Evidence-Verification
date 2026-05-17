"""Application-wide style sheet - Modern Enterprise Cybersecurity Theme.

Premium light-themed interface with clean, performant styling.
"""

from __future__ import annotations

from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)


def build_style_sheet() -> str:
    """Return a comprehensive enterprise stylesheet string."""
    t = DesignTokens
    return f"""
    * {{
        font-family: {t.FONT_FAMILY};
        color: {t.COLOR_TEXT_PRIMARY};
        font-size: {t.BODY_SIZE}px;
    }}

    QWidget {{
        background: transparent;
    }}

    QMainWindow {{
        background: {t.COLOR_BG};
    }}

    /* Scrollbars */
    QScrollBar:vertical {{
        background: transparent;
        width: 6px;
        margin: 0;
        border-radius: 3px;
    }}
    QScrollBar::handle:vertical {{
        background: {t.COLOR_BORDER};
        border-radius: 3px;
        min-height: 40px;
    }}
    QScrollBar::handle:vertical:hover {{
        background: {t.COLOR_TEXT_MUTED};
    }}
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
        height: 0;
        background: none;
        border: none;
    }}
    QScrollBar:horizontal {{
        background: transparent;
        height: 6px;
        margin: 0;
        border-radius: 3px;
    }}
    QScrollBar::handle:horizontal {{
        background: {t.COLOR_BORDER};
        border-radius: 3px;
        min-width: 40px;
    }}
    QScrollBar::handle:horizontal:hover {{
        background: {t.COLOR_TEXT_MUTED};
    }}
    QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{
        width: 0;
        background: none;
        border: none;
    }}

    /* Labels */
    QLabel {{
        background: transparent;
    }}

    /* Cards */
    QFrame#card {{
        background: {t.COLOR_SURFACE};
        border: 1px solid {t.COLOR_GLASS_BORDER};
        border-radius: {t.CARD_RADIUS}px;
    }}
    QFrame#cardAccent {{
        background: {t.COLOR_PRIMARY_SOFT};
        border: 1px solid {t.COLOR_PRIMARY_GLOW};
        border-radius: {t.CARD_RADIUS}px;
    }}
    QFrame#glassPanel {{
        background: {t.COLOR_GLASS};
        border: 1px solid {t.COLOR_GLASS_BORDER};
        border-radius: {t.PANEL_RADIUS}px;
    }}

    /* ScrollArea */
    QScrollArea {{
        background: transparent;
        border: none;
    }}
    """
