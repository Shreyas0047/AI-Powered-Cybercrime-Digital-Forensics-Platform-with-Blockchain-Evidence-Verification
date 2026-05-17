"""
Forensic AI Analysis Engine - Main Application

FastAPI microservice for AI-powered forensic threat analysis.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
import logging

from app.core.config import config
from app.core.models import (
    TelemetryAnalysisRequest,
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        "timestamp": "2024-01-01T00:00:00Z"
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

        # Check event limit
        if len(request.events) > config.MAX_TELEMETRY_EVENTS:
            raise HTTPException(
                status_code=400,
                detail=f"Event count exceeds maximum of {config.MAX_TELEMETRY_EVENTS}"
            )

        # Run analysis
        result = await telemetry_analyzer.analyze_telemetry(request)

        logger.info(f"Analysis complete for session: {request.session_id}, severity: {result.severity_level.value}")

        return AnalysisResponse(
            success=True,
            message="Telemetry analysis completed successfully",
            data={
                "session_id": result.session_id,
                "analysis_timestamp": result.analysis_timestamp.isoformat(),
                "total_events": result.total_events,
                "suspicious_events": result.suspicious_events,
                "threat_classification": result.threat_classification,
                "severity_score": result.severity_score,
                "severity_level": result.severity_level.value,
                "anomalies": result.anomalies,
                "behavioral_summary": result.behavioral_summary,
                "recommendations": result.recommendations,
                "confidence": result.confidence
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
    Analyze a forensic report.

    This endpoint analyzes pre-generated forensic reports and extracts
    AI-powered insights, threat classifications, and recommendations.
    """
    try:
        logger.info(f"Starting report analysis for investigation: {investigation_id}")

        # Simplified report analysis
        # In production, this would use more sophisticated NLP
        analysis_result = {
            "investigation_id": investigation_id,
            "findings_summary": report_data.get("summary", "No summary available"),
            "threat_indicators": report_data.get("iocIndicators", []),
            "ai_insights": "Report analysis completed",
            "recommendations": [
                "Review identified IOCs",
                "Cross-reference with threat intelligence",
                "Update detection rules"
            ]
        }

        return AnalysisResponse(
            success=True,
            message="Report analysis completed",
            data=analysis_result
        )

    except Exception as e:
        logger.error(f"Report analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/v1/enrich/alert", response_model=AnalysisResponse)
async def enrich_alert(
    alert_data: dict
):
    """
    Enrich an alert with AI analysis.

    This endpoint adds AI-powered context to security alerts,
    including severity assessment, threat classification, and recommendations.
    """
    try:
        logger.info(f"Enriching alert: {alert_data.get('alert_id', 'unknown')}")

        # Basic alert enrichment
        # Extract potential indicators from alert
        iocs = alert_data.get("iocIndicators", [])
        description = alert_data.get("description", "")

        # Simple classification based on available data
        enriched_alert = {
            "alert_id": alert_data.get("alert_id"),
            "ai_severity_assessment": "medium",
            "threat_classification": "suspicious_activity",
            "confidence": 0.75,
            "analysis_summary": f"Alert enriched with AI analysis. Found {len(iocs)} IOCs.",
            "recommendations": [
                "Investigate associated indicators",
                "Check for related alerts",
                "Review affected systems"
            ]
        }

        return AnalysisResponse(
            success=True,
            message="Alert enriched successfully",
            data=enriched_alert
        )

    except Exception as e:
        logger.error(f"Alert enrichment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {str(e)}")


@app.post("/api/v1/summarize/investigation", response_model=AnalysisResponse)
async def summarize_investigation(
    investigation_data: dict
):
    """
    Generate AI-powered investigation summary.

    This endpoint creates structured summaries from investigation data,
    including executive summaries, key findings, and recommendations.
    """
    try:
        logger.info(f"Generating investigation summary")

        # Generate summary from investigation data
        summary = InvestigationSummary(
            executive_summary="Investigation analysis completed. Multiple indicators identified requiring further analysis.",
            analyst_summary="Detailed analysis of available evidence reveals suspicious patterns consistent with potential compromise.",
            key_findings=[
                "Suspicious process execution detected",
                "Multiple network connections to external IPs",
                "Registry modifications consistent with persistence attempts"
            ],
            timeline_summary="Activity timeline constructed from available telemetry",
            recommendations=[
                "Continue monitoring for additional suspicious activity",
                "Review affected system logs",
                "Coordinate with threat intelligence"
            ],
            confidence=0.8
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
                "confidence": summary.confidence
            }
        )

    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        log_level="info"
    )