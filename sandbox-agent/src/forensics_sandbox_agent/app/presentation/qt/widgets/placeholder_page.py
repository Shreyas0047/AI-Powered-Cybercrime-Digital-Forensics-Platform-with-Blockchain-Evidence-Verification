"""Reusable placeholder page for non-dashboard navigation routes."""

from __future__ import annotations

from PyQt6.QtWidgets import QLabel, QVBoxLayout, QWidget

from forensics_sandbox_agent.app.presentation.qt.widgets.activity_feed import ActivityFeed
from forensics_sandbox_agent.app.presentation.qt.widgets.metric_card import MetricCard
from forensics_sandbox_agent.app.presentation.qt.widgets.panel import Panel
from forensics_sandbox_agent.app.presentation.qt.widgets.section_header import (
    SectionHeader,
)


class PlaceholderPage(QWidget):
    """A stylized page shell for future subsystems.

    This avoids dead navigation routes while still keeping implementation
    boundaries explicit.
    """

    def __init__(self, title: str, subtitle: str, focus_label: str) -> None:
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(18)

        hero = Panel(accent=True)
        hero_layout = hero.layout()
        if hero_layout is None:
            hero_layout = QVBoxLayout(hero)
        hero_layout.addWidget(SectionHeader(title=title, subtitle=subtitle, eyebrow="Workspace"))
        summary = QLabel(
            "This route is intentionally scaffolded ahead of subsystem delivery so "
            "navigation, panel composition, and future state wiring remain stable."
        )
        summary.setObjectName("sectionSubtitle")
        summary.setWordWrap(True)
        hero_layout.addWidget(summary)
        layout.addWidget(hero)

        row = Panel()
        row_layout = row.layout()
        if row_layout is None:
            row_layout = QVBoxLayout(row)
        row_layout.addWidget(
            ActivityFeed(
                title=f"{focus_label} Readiness",
                subtitle="These cards reserve visual space for future live data panels and command workflows.",
                entries=[
                    f"{focus_label} controls will be bound through application services, not widget-local logic.",
                    "Supporting collectors and adapters remain behind infrastructure interfaces.",
                    "The UI route is ready for event-driven updates once the subsystem is implemented.",
                ],
            )
        )
        layout.addWidget(row)

        metrics = Panel()
        metrics_layout = metrics.layout()
        if metrics_layout is None:
            metrics_layout = QVBoxLayout(metrics)
        metrics_layout.addWidget(
            SectionHeader(
                title="Planned Surface",
                subtitle="Stable slots for route-specific metrics and operational summaries.",
                eyebrow="Structure",
            )
        )
        metric_row = QVBoxLayout()
        metric_row.addWidget(MetricCard(f"{focus_label} Modules", "Planned", "Architecture scaffold in place"))
        metric_row.addWidget(MetricCard("Data Binding", "Deferred", "Awaiting subsystem implementation"))
        metrics_layout.addLayout(metric_row)
        layout.addWidget(metrics)
