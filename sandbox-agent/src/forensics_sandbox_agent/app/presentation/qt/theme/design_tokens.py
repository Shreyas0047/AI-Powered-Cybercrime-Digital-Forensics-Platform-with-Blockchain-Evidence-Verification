"""Centralized design constants for the desktop shell.

A modern enterprise cybersecurity aesthetic with glassmorphism,
subtle gradients, and premium visual hierarchy.
"""

from __future__ import annotations


class DesignTokens:
    # Window dimensions
    WINDOW_MIN_WIDTH = 1400
    WINDOW_MIN_HEIGHT = 900
    SIDEBAR_WIDTH = 260
    TOPBAR_HEIGHT = 72
    CONTENT_RADIUS = 20
    CARD_RADIUS = 16
    PANEL_RADIUS = 20

    # Spacing scale
    SPACING_1 = 6
    SPACING_2 = 10
    SPACING_3 = 14
    SPACING_4 = 18
    SPACING_5 = 22
    SPACING_6 = 28
    SPACING_7 = 36
    SPACING_8 = 48

    # Typography scale
    FONT_FAMILY = "'Segoe UI Variable', 'Segoe UI', 'Inter', system-ui, sans-serif"
    TITLE_SIZE = 32
    HEADING_SIZE = 20
    SUBHEADING_SIZE = 16
    BODY_SIZE = 14
    CAPTION_SIZE = 12
    SMALL_SIZE = 11

    # Enterprise Light Theme - Primary Palette
    COLOR_BG = "#f8fafc"
    COLOR_BG_SECONDARY = "#f1f5f9"
    COLOR_SURFACE = "#ffffff"

    # Glassmorphism & Transparency
    COLOR_GLASS = "rgba(255, 255, 255, 0.72)"
    COLOR_GLASS_LIGHT = "rgba(255, 255, 255, 0.85)"
    COLOR_GLASS_BORDER = "rgba(148, 163, 184, 0.15)"
    COLOR_OVERLAY = "rgba(15, 23, 42, 0.04)"

    # Borders
    COLOR_BORDER = "rgba(148, 163, 184, 0.2)"
    COLOR_BORDER_HOVER = "rgba(59, 130, 246, 0.4)"
    COLOR_BORDER_ACTIVE = "rgba(59, 130, 246, 0.6)"

    # Text hierarchy
    COLOR_TEXT_PRIMARY = "#0f172a"
    COLOR_TEXT_SECONDARY = "#334155"
    COLOR_TEXT_MUTED = "#64748b"
    COLOR_TEXT_DISABLED = "#94a3b8"

    # Cybersecurity accent colors
    COLOR_PRIMARY = "#3b82f6"
    COLOR_PRIMARY_HOVER = "#2563eb"
    COLOR_PRIMARY_SOFT = "rgba(59, 130, 246, 0.1)"
    COLOR_PRIMARY_GLOW = "rgba(59, 130, 246, 0.25)"

    COLOR_SECONDARY = "#10b981"
    COLOR_SECONDARY_HOVER = "#059669"
    COLOR_SECONDARY_SOFT = "rgba(16, 185, 129, 0.1)"

    COLOR_ACCENT = "#8b5cf6"
    COLOR_ACCENT_HOVER = "#7c3aed"
    COLOR_ACCENT_SOFT = "rgba(139, 92, 246, 0.1)"
    COLOR_ACCENT_PRIMARY = COLOR_ACCENT
    COLOR_ACCENT_SECONDARY = COLOR_PRIMARY

    # Status colors
    COLOR_SUCCESS = "#10b981"
    COLOR_SUCCESS_SOFT = "rgba(16, 185, 129, 0.12)"
    COLOR_SUCCESS_BG = "#d1fae5"

    COLOR_WARNING = "#f59e0b"
    COLOR_WARNING_SOFT = "rgba(245, 158, 11, 0.12)"
    COLOR_WARNING_BG = "#fef3c7"

    COLOR_DANGER = "#ef4444"
    COLOR_DANGER_SOFT = "rgba(239, 68, 68, 0.12)"
    COLOR_DANGER_BG = "#fee2e2"

    COLOR_INFO = "#06b6d4"
    COLOR_INFO_SOFT = "rgba(6, 182, 212, 0.12)"

    # Threat severity colors
    COLOR_CRITICAL = "#dc2626"
    COLOR_HIGH = "#ea580c"
    COLOR_MEDIUM = "#ca8a04"
    COLOR_LOW = "#65a30d"
    COLOR_INFO_LEVEL = "#0ea5e9"

    # Shadows
    COLOR_SHADOW = "rgba(15, 23, 42, 0.06)"
    COLOR_SHADOW_LIGHT = "rgba(15, 23, 42, 0.03)"
    COLOR_SHADOW_MEDIUM = "rgba(15, 23, 42, 0.08)"
    COLOR_SHADOW_LARGE = "rgba(15, 23, 42, 0.12)"

    # Gradients
    GRADIENT_BG_START = "#f8fafc"
    GRADIENT_BG_END = "#f1f5f9"

    GRADIENT_PRIMARY_START = "#3b82f6"
    GRADIENT_PRIMARY_END = "#6366f1"

    GRADIENT_SUCCESS_START = "#10b981"
    GRADIENT_SUCCESS_END = "#06b6d4"

    GRADIENT_CARD_START = "rgba(255, 255, 255, 0.9)"
    GRADIENT_CARD_END = "rgba(248, 250, 252, 0.7)"

    # Cyber grid pattern
    COLOR_GRID = "rgba(59, 130, 246, 0.03)"
    COLOR_GRID_LINES = "rgba(148, 163, 184, 0.08)"

    # Animation durations (ms)
    ANIMATION_FAST = 150
    ANIMATION_NORMAL = 250
    ANIMATION_SLOW = 400
    ANIMATION_PAGE = 300

    # Easing curves
    EASING_STANDARD = "cubic-bezier(0.4, 0, 0.2, 1)"
    EASING_DECELERATE = "cubic-bezier(0, 0, 0.2, 1)"
    EASING_ACCELERATE = "cubic-bezier(0.4, 0, 1, 1)"
    EASING_SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)"
