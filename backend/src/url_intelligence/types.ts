export interface UrlAnalysisResult {
  url: string;
  normalized_url: string;
  parsed: ParsedUrl;
  phishing_probability: number;
  risk_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  indicators: PhishingIndicator[];
  domain_intel: DomainIntel;
  redirect_analysis: RedirectAnalysis;
  extracted_iocs: ExtractedIoCInfo[];
  heuristics_triggered: string[];
  predicted_threat: string;
  confidence: number;
  summary: string;
}

export interface ParsedUrl {
  protocol: string;
  hostname: string;
  port: string;
  path: string;
  query: string;
  fragment: string;
  tld: string;
  subdomain: string;
  is_ip_based: boolean;
  has_port: boolean;
  has_query: boolean;
  query_params: Record<string, string>;
}

export interface PhishingIndicator {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  score: number;
}

export interface DomainIntel {
  domain: string;
  registration_info: DomainRegistrationInfo;
  suspicious_tld: boolean;
  age_days: number;
  known_legitimate: boolean;
  known_malicious: boolean;
}

export interface DomainRegistrationInfo {
  registrar: string;
  created_date: string;
  expires_date: string;
  updated_date: string;
}

export interface RedirectAnalysis {
  chain_length: number;
  has_redirect: boolean;
  redirects: string[];
  suspicious_redirect_chain: boolean;
}

export interface ExtractedIoCInfo {
  type: string;
  value: string;
}
