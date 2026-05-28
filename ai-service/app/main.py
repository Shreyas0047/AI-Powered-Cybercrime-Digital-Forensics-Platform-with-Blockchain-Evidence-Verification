"""
Forensic AI Analysis Engine - Main Application

FastAPI microservice for AI-powered forensic threat analysis.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
import logging
import os
from datetime import datetime, timezone

from app.core.config import config
from app.core.models import (
    TelemetryAnalysisRequest,
    TelemetryEvent,
    AnalysisResponse,
    InvestigationSummary
)
from app.modules.telemetry_analysis import telemetry_analyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=config.SERVICE_NAME,
    version=config.SERVICE_VERSION,
    description="AI-powered forensic threat analysis engine for cybersecurity investigations",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
_allowed_origins = os.environ.get(
    "AI_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": config.SERVICE_NAME,
        "version": config.SERVICE_VERSION,
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": config.SERVICE_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/api/v1/analyze/telemetry", response_model=AnalysisResponse)
async def analyze_telemetry(request: TelemetryAnalysisRequest):
    """
    Analyze forensic telemetry from sandbox execution.

    This endpoint performs comprehensive AI analysis on telemetry events,
    including threat classification, severity scoring, anomaly detection,
    and generates investigation summaries.
    """
    try:
        logger.info(f"Starting telemetry analysis for session: {request.session_id}")

        # Validate request
        if not request.events:
            raise HTTPException(status_code=400, detail="No events provided for analysis")

        # Process large telemetry in chunks to avoid OOM
        CHUNK_SIZE = config.MAX_TELEMETRY_EVENTS
        events = request.events
        if len(events) > CHUNK_SIZE:
            logger.info(f"Large telemetry ({len(events)} events) — processing in {len(events)//CHUNK_SIZE + 1} chunks")
            # Analyze first chunk for primary classification, sample remaining
            events = events[:CHUNK_SIZE] + events[CHUNK_SIZE::max(1, len(events[CHUNK_SIZE:]) // 500)]
            request = TelemetryAnalysisRequest(
                session_id=request.session_id,
                investigation_id=request.investigation_id,
                events=events[:CHUNK_SIZE],
                metadata=request.metadata,
            )

        # Run analysis
        result = await telemetry_analyzer.analyze_telemetry(request)

        # Run forensic pipeline for attack chain + MITRE mapping
        from app.modules.forensic_pipeline import forensic_pipeline
        events_raw = [{"type": e.type, "source": e.source, "details": e.details, "timestamp": e.timestamp} for e in request.events]
        pipeline_result = forensic_pipeline.analyze(events_raw)

        logger.info(f"Analysis complete for session: {request.session_id}, severity: {result.severity_level.value}")

        return AnalysisResponse(
            success=True,
            message="Telemetry analysis completed successfully",
            data={
                "session_id": result.session_id,
                "analysis_timestamp": result.analysis_timestamp.isoformat(),
                "total_events": result.total_events,
                "suspicious_events": result.suspicious_events,
                "threat_classification": pipeline_result.threat_classification,
                "severity_score": max(result.severity_score, pipeline_result.severity_score),
                "severity_level": result.severity_level.value,
                "anomalies": result.anomalies,
                "behavioral_summary": result.behavioral_summary,
                "recommendations": result.recommendations,
                "confidence": result.confidence,
                "mitre_mapping": [
                    {"technique_id": h.technique_id, "technique_name": h.technique_name, "tactic": h.tactic, "confidence": h.confidence, "evidence_snippets": h.evidence_snippets}
                    for h in pipeline_result.mitre_mapping
                ],
                "attack_chain": [
                    {"phase": link.phase.value, "techniques": [t.technique_id for t in link.techniques], "event_count": link.event_count}
                    for link in pipeline_result.attack_chain
                ],
                "anti_forensics_detected": pipeline_result.anti_forensics_detected,
                "anti_forensics_indicators": pipeline_result.anti_forensics_indicators,
                "reconstruction_summary": pipeline_result.reconstruction_summary,
                "predicted_next_step": pipeline_result.predicted_next_step,
                "stealth_rating": pipeline_result.stealth_rating,
            }
        )

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))

    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/v1/analyze/report", response_model=AnalysisResponse)
async def analyze_forensic_report(
    report_data: dict,
    investigation_id: str = None
):
    """
    Analyze a forensic report by running its events/indicators through
    the same classification and scoring pipeline used for telemetry.
    """
    try:
        if investigation_id and not isinstance(investigation_id, str):
            raise HTTPException(status_code=400, detail="investigation_id must be a string")
        logger.info(f"Starting report analysis for investigation: {investigation_id}")

        from app.modules.feature_extraction import feature_extractor
        from app.modules.threat_classification import threat_classifier
        from app.modules.severity_scoring import severity_scorer
        from app.modules.summarization import summarizer as ai_summarizer

        # Build TelemetryEvent objects from report data
        raw_events = report_data.get("events", [])
        events = []
        for ev in raw_events:
            events.append(TelemetryEvent(
                timestamp=ev.get("timestamp", datetime.now(timezone.utc).isoformat()),
                type=ev.get("type", "unknown"),
                source=ev.get("source", "report"),
                details=ev.get("details", {}),
            ))

        # If no events, derive indicators from IOCs/summary for a lighter analysis
        iocs = report_data.get("iocIndicators", report_data.get("iocs", []))
        summary_text = report_data.get("summary", "")

        if not events and not iocs:
            return AnalysisResponse(
                success=True,
                message="No analysable data in report",
                data={"investigation_id": investigation_id, "threat_indicators": [], "recommendations": ["Provide events or IOCs for analysis"]}
            )

        # Run feature extraction if we have events
        if events:
            features = feature_extractor.extract_features(events)
            classifications = threat_classifier.classify(features)
            severity_result = severity_scorer.calculate_severity(features, classifications, 0)
            primary = threat_classifier.get_primary_threat(classifications)

            report_summary = ai_summarizer.generate_summary(
                features=features,
                severity_score=severity_result.score,
                severity_level=severity_result.level,
                classifications=classifications,
                anomalies=[],
                session_id=investigation_id or "report"
            )

            analysis_result = {
                "investigation_id": investigation_id,
                "severity_score": severity_result.score,
                "severity_level": severity_result.level.value,
                "primary_threat": primary.value if primary else "normal",
                "classifications": {k.value: v for k, v in classifications.items()} if classifications else {},
                "findings_summary": report_summary.executive_summary,
                "key_findings": report_summary.key_findings,
                "threat_indicators": iocs,
                "recommendations": report_summary.recommendations,
                "confidence": report_summary.confidence,
            }
        else:
            # IOC-only analysis
            analysis_result = {
                "investigation_id": investigation_id,
                "severity_score": min(len(iocs) * 15.0, 100.0),
                "severity_level": "high" if len(iocs) > 3 else "medium",
                "primary_threat": "suspicious_behavior",
                "findings_summary": f"Report contains {len(iocs)} indicators of compromise requiring investigation.",
                "threat_indicators": iocs,
                "recommendations": [
                    "Cross-reference IOCs with threat intelligence feeds",
                    "Check for lateral movement from affected hosts",
                    "Update detection rules with identified indicators",
                ],
                "confidence": 0.6,
            }

        return AnalysisResponse(success=True, message="Report analysis completed", data=analysis_result)

    except Exception as e:
        logger.error(f"Report analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/v1/enrich/alert", response_model=AnalysisResponse)
async def enrich_alert(alert_data: dict):
    """
    Enrich an alert with AI analysis using the classification and scoring pipeline.
    """
    try:
        logger.info(f"Enriching alert: {alert_data.get('alert_id', 'unknown')}")

        from app.modules.feature_extraction import feature_extractor
        from app.modules.threat_classification import threat_classifier
        from app.modules.severity_scoring import severity_scorer

        # Build events from alert context
        raw_events = alert_data.get("events", [])
        events = []
        for ev in raw_events:
            events.append(TelemetryEvent(
                timestamp=ev.get("timestamp", datetime.now(timezone.utc).isoformat()),
                type=ev.get("type", "unknown"),
                source=ev.get("source", "alert"),
                details=ev.get("details", {}),
            ))

        iocs = alert_data.get("iocIndicators", alert_data.get("indicators", []))
        description = alert_data.get("description", "")
        alert_severity = alert_data.get("severity", "medium")

        if events:
            features = feature_extractor.extract_features(events)
            classifications = threat_classifier.classify(features)
            severity_result = severity_scorer.calculate_severity(features, classifications, 0)
            primary = threat_classifier.get_primary_threat(classifications)

            # Derive recommendations from classification
            recommendations = []
            if primary and primary.value != "normal":
                recommendations.append(f"Investigate {primary.value.replace('_', ' ')} indicators")
            if features.suspicious_processes > 0:
                recommendations.append(f"Review {features.suspicious_processes} suspicious processes")
            if features.external_ips:
                recommendations.append(f"Block/investigate external IPs: {', '.join(features.external_ips[:5])}")
            if features.persistence_keys:
                recommendations.append("Check persistence mechanisms for unauthorized entries")
            if not recommendations:
                recommendations.append("Continue monitoring for additional suspicious activity")

            enriched_alert = {
                "alert_id": alert_data.get("alert_id"),
                "ai_severity_assessment": severity_result.level.value,
                "severity_score": severity_result.score,
                "threat_classification": primary.value if primary else "normal",
                "classifications": {k.value: v for k, v in classifications.items()} if classifications else {},
                "confidence": min(0.5 + (len(events) * 0.05), 0.95),
                "analysis_summary": f"Analyzed {len(events)} events. Primary threat: {primary.value if primary else 'none'}. Severity: {severity_result.level.value} ({severity_result.score:.1f}/100).",
                "indicators_found": len(iocs),
                "recommendations": recommendations,
            }
        else:
            # Lightweight enrichment from metadata only
            ioc_count = len(iocs)
            score = min(ioc_count * 20.0, 100.0)
            level = "critical" if score >= 80 else "high" if score >= 60 else "medium" if score >= 40 else "low"

            enriched_alert = {
                "alert_id": alert_data.get("alert_id"),
                "ai_severity_assessment": level,
                "severity_score": score,
                "threat_classification": "suspicious_behavior" if ioc_count > 0 else "normal",
                "confidence": 0.5 if ioc_count == 0 else min(0.6 + ioc_count * 0.05, 0.85),
                "analysis_summary": f"Alert contains {ioc_count} IOCs. {description[:200] if description else 'No description.'}",
                "indicators_found": ioc_count,
                "recommendations": [
                    "Correlate with other alerts from same source",
                    "Cross-reference IOCs with threat intelligence",
                    "Review affected systems for compromise indicators",
                ],
            }

        return AnalysisResponse(success=True, message="Alert enriched successfully", data=enriched_alert)

    except Exception as e:
        logger.error(f"Alert enrichment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {str(e)}")


@app.post("/api/v1/summarize/investigation", response_model=AnalysisResponse)
async def summarize_investigation(investigation_data: dict):
    """
    Generate AI-powered investigation summary from investigation data
    by running available events through the full analysis pipeline.
    """
    try:
        logger.info("Generating investigation summary")

        from app.modules.feature_extraction import feature_extractor
        from app.modules.threat_classification import threat_classifier
        from app.modules.severity_scoring import severity_scorer
        from app.modules.anomaly_detection import anomaly_detector
        from app.modules.summarization import summarizer as ai_summarizer

        # Extract events from investigation data
        raw_events = investigation_data.get("events", investigation_data.get("telemetry", []))
        events = []
        for ev in raw_events:
            events.append(TelemetryEvent(
                timestamp=ev.get("timestamp", datetime.now(timezone.utc).isoformat()),
                type=ev.get("type", "unknown"),
                source=ev.get("source", "investigation"),
                details=ev.get("details", {}),
            ))

        evidence_count = len(investigation_data.get("evidence", []))
        alert_count = len(investigation_data.get("alerts", []))
        title = investigation_data.get("title", "Untitled Investigation")
        description = investigation_data.get("description", "")

        if events:
            features = feature_extractor.extract_features(events)
            classifications = threat_classifier.classify(features)
            anomalies = anomaly_detector.detect_anomalies(events, features)
            severity_result = severity_scorer.calculate_severity(features, classifications, len(anomalies))

            summary = ai_summarizer.generate_summary(
                features=features,
                severity_score=severity_result.score,
                severity_level=severity_result.level,
                classifications=classifications,
                anomalies=anomalies,
                session_id=investigation_data.get("id", "investigation")
            )

            return AnalysisResponse(
                success=True,
                message="Investigation summary generated",
                data={
                    "executive_summary": summary.executive_summary,
                    "analyst_summary": summary.analyst_summary,
                    "key_findings": summary.key_findings,
                    "timeline_summary": summary.timeline_summary,
                    "recommendations": summary.recommendations,
                    "confidence": summary.confidence,
                    "severity_score": severity_result.score,
                    "severity_level": severity_result.level.value,
                    "total_events_analyzed": len(events),
                    "anomalies_detected": len(anomalies),
                }
            )
        else:
            # No events — generate metadata-based summary
            return AnalysisResponse(
                success=True,
                message="Investigation summary generated (metadata only)",
                data={
                    "executive_summary": f"Investigation '{title}' contains {evidence_count} evidence items and {alert_count} alerts. {description[:300] if description else 'No telemetry events available for deep analysis.'}",
                    "analyst_summary": f"This investigation currently has no telemetry events for automated analysis. Manual review of {evidence_count} evidence items is recommended.",
                    "key_findings": [
                        f"{evidence_count} evidence items attached",
                        f"{alert_count} alerts associated",
                        "No telemetry events available for automated behavioral analysis",
                    ],
                    "timeline_summary": "Timeline cannot be constructed without telemetry events.",
                    "recommendations": [
                        "Run sandbox analysis to generate telemetry events",
                        "Review attached evidence manually",
                        "Correlate alerts with external threat intelligence",
                    ],
                    "confidence": 0.3,
                    "total_events_analyzed": 0,
                    "anomalies_detected": 0,
                }
            )

    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


@app.post("/api/v1/report/executive", response_model=AnalysisResponse)
async def generate_executive_report(report_request: dict):
    """
    Generate an executive narrative report from forensic events.
    Converts raw JSON telemetry into human-readable prose with attack tree structure.
    """
    try:
        logger.info("Generating executive report")

        from app.modules.forensic_pipeline import forensic_pipeline

        events = report_request.get("events", [])
        investigation_title = report_request.get("title", "Forensic Investigation")
        investigation_id = report_request.get("investigation_id", "unknown")

        if not events:
            return AnalysisResponse(
                success=True,
                message="No events to report on",
                data={"narrative": "No telemetry events available for report generation.", "sections": []}
            )

        # Run pipeline
        result = forensic_pipeline.analyze(events)

        # Build narrative sections
        sections = []

        # Executive Summary
        severity_label = "Critical" if result.severity_score >= 80 else "High" if result.severity_score >= 60 else "Moderate" if result.severity_score >= 40 else "Low"
        exec_summary = (
            f"This report documents the forensic analysis of investigation '{investigation_title}'. "
            f"The analysis examined {len(events)} telemetry events and identified a {severity_label.lower()}-severity "
            f"{result.threat_classification.replace('_', ' ')} threat "
            f"with a confidence-weighted severity score of {result.severity_score:.1f}/100."
        )
        sections.append({"title": "Executive Summary", "content": exec_summary})

        # Attack Narrative
        if result.reconstruction_summary:
            sections.append({"title": "Attack Reconstruction", "content": result.reconstruction_summary})

        # Kill Chain
        if result.attack_chain:
            chain_text = "The attack progressed through the following kill-chain phases:\n"
            for i, link in enumerate(result.attack_chain, 1):
                techs = ", ".join(t.technique_name for t in link.techniques[:3])
                chain_text += f"  {i}. {link.phase.value.replace('_', ' ').title()} — {techs}\n"
            sections.append({"title": "Kill Chain Analysis", "content": chain_text})

        # MITRE Techniques
        if result.mitre_mapping:
            mitre_text = f"{len(result.mitre_mapping)} MITRE ATT&CK techniques were observed:\n"
            for hit in result.mitre_mapping[:10]:
                mitre_text += f"  • {hit.technique_id} ({hit.technique_name}) — {hit.tactic}, confidence {hit.confidence:.0%}\n"
            sections.append({"title": "MITRE ATT&CK Mapping", "content": mitre_text})

        # Anti-Forensics
        if result.anti_forensics_detected:
            af_text = (
                f"The threat actor employed anti-forensics measures (stealth rating: {result.stealth_rating}). "
                f"Detected indicators: {', '.join(result.anti_forensics_indicators)}."
            )
            sections.append({"title": "Anti-Forensics Detection", "content": af_text})

        # Prediction
        sections.append({"title": "Predicted Next Actions", "content": result.predicted_next_step})

        # Recommendations
        recommendations = [
            "Immediately isolate affected systems from the network.",
            "Preserve all forensic artifacts before remediation.",
            "Cross-reference identified IOCs with threat intelligence feeds.",
            "Implement detection rules for the identified MITRE techniques.",
            "Conduct a full scope assessment to identify additional compromised assets.",
        ]
        sections.append({"title": "Recommendations", "content": "\n".join(f"  {i+1}. {r}" for i, r in enumerate(recommendations))})

        # Full narrative
        full_narrative = "\n\n".join(f"## {s['title']}\n{s['content']}" for s in sections)

        return AnalysisResponse(
            success=True,
            message="Executive report generated",
            data={
                "narrative": full_narrative,
                "sections": sections,
                "metadata": {
                    "investigation_id": investigation_id,
                    "total_events": len(events),
                    "severity_score": result.severity_score,
                    "threat_classification": result.threat_classification,
                    "stealth_rating": result.stealth_rating,
                    "techniques_detected": len(result.mitre_mapping),
                    "kill_chain_phases": len(result.attack_chain),
                },
            }
        )

    except Exception as e:
        logger.error(f"Report generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        log_level="info"
    )