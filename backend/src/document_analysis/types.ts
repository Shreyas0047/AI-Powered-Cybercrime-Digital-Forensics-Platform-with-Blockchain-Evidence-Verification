export interface DocumentAnalysisResult {
  filename: string;
  file_size: number;
  file_type: 'pdf' | 'docx';
  threat_score: number;
  threat_level: 'critical' | 'high' | 'medium' | 'low' | 'safe' | 'unknown';
  confidence: number;
  predicted_threat: string;
  findings: DocumentFinding[];
  macro_risk?: MacroRisk;
  extracted_text: string;
  text_length: number;
  embedded_urls: string[];
  suspicious_scripts: string[];
  ioc_count: number;
  mitre_techniques: string[];
  summary: string;
}

export interface DocumentFinding {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  score: number;
}

export interface MacroRisk {
  has_macros: boolean;
  macro_count: number;
  auto_execute: boolean;
  suspicious_strings: string[];
  risk_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
}
