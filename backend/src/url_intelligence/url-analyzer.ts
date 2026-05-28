import { UrlAnalysisResult, ParsedUrl, PhishingIndicator, DomainIntel, RedirectAnalysis, ExtractedIoCInfo } from './types';

export class UrlIntelligenceService {
  // Suspicious TLDs commonly used in phishing
  private readonly SUSPICIOUS_TLDS = new Set([
    'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'club', 'online', 'site',
    'stream', 'trade', 'webcam', 'download', 'bid', 'win', 'review', 'date',
    'science', 'accountant', 'loan', 'men', 'mom', 'rest', 'mobi', 'pw',
  ]);

  // Known legitimate domains whitelist
  private readonly KNOWN_LEGITIMATE = new Set([
    'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'linkedin.com', 'microsoft.com', 'apple.com', 'amazon.com', 'github.com',
    'stackoverflow.com', 'wikipedia.org', 'reddit.com', 'whatsapp.com',
    'telegram.org', 'discord.com', 'slack.com', 'zoom.us', 'teams.microsoft.com',
  ]);

  // Suspicious keywords in login pages
  private readonly LOGIN_KEYWORDS = [
    'login', 'signin', 'sign-in', 'logon', 'auth', 'authenticate',
    'verify', 'verification', 'confirm', 'account', 'secure', 'webscr',
    'banking', 'onlinebanking', 'ebanking', 'netbanking',
  ];

  // Suspicious query parameters
  private readonly SUSPICIOUS_QUERY_PARAMS = [
    'token', 'auth', 'password', 'passwd', 'secret', 'key', 'apikey',
    'apikey', 'code', 'access', 'ref', 'redirect', 'url', 'next',
    'continue', 'return', 'callback',
  ];

  private readonly SUSPICIOUS_CCTLDS = new Set([
    'su', 'kp', 'ir', 'cu', 'sy', 'af', 'iq', 'ly', 'sd', 'ye',
  ]);

  // Homoglyph character mappings for detection
  private readonly HOMOGLYPHS: Record<string, string> = {
    '0': 'o', '1': 'l', '2': 'z', '3': 'e', '4': 'a', '5': 's',
    '6': 'g', '7': 't', '8': 'b', '9': 'g',
  };

  async analyzeUrl(url: string): Promise<UrlAnalysisResult> {
    const normalized = this.normalizeUrl(url);
    const parsed = this.parseUrl(normalized);
    const indicators: PhishingIndicator[] = [];
    const heuristics: string[] = [];

    // Run all heuristic checks
    indicators.push(...this.checkIpBasedUrl(parsed, heuristics));
    indicators.push(...this.checkSuspiciousTld(parsed, heuristics));
    indicators.push(...this.checkLoginKeywords(parsed, heuristics));
    indicators.push(...this.checkExcessiveEncoding(normalized, heuristics));
    indicators.push(...this.checkHomoglyphAttack(parsed, heuristics));
    indicators.push(...this.checkSuspiciousPort(parsed, heuristics));
    indicators.push(...this.checkLongUrl(normalized, heuristics));
    indicators.push(...this.checkSuspiciousQueryParams(parsed, heuristics));
    indicators.push(...this.checkSubdomainHeuristics(parsed, heuristics));
    indicators.push(...this.checkCredentialHarvesting(parsed, heuristics));
    indicators.push(...this.checkPathTraversal(parsed, heuristics));
    indicators.push(...this.checkBrandInDomain(parsed, heuristics));

    // Calculate scores
    const totalScore = indicators.reduce((s, i) => s + i.score, 0);
    const phishingProbability = Math.min(totalScore / 100, 1.0);
    const riskScore = Math.min(totalScore, 100);

    // Determine threat classification
    const predictedThreat = this.classifyThreat(phishingProbability, riskScore, indicators);
    const confidence = Math.min(0.5 + phishingProbability * 0.4, 0.95);

    const domainIntel = this.analyzeDomain(parsed);
    const redirectAnalysis: RedirectAnalysis = {
      chain_length: 0,
      has_redirect: false,
      redirects: [],
      suspicious_redirect_chain: false,
    };

    const iocs: ExtractedIoCInfo[] = [
      { type: 'url', value: normalized },
      { type: 'domain', value: parsed.hostname },
    ];
    if (parsed.is_ip_based) {
      iocs.push({ type: 'ip', value: parsed.hostname });
    }

    const riskLevel = riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : riskScore >= 10 ? 'low' : 'unknown';

    return {
      url,
      normalized_url: normalized,
      parsed,
      phishing_probability: Math.round(phishingProbability * 100) / 100,
      risk_score: riskScore,
      risk_level: riskLevel,
      indicators,
      domain_intel: domainIntel,
      redirect_analysis: redirectAnalysis,
      extracted_iocs: iocs,
      heuristics_triggered: heuristics,
      predicted_threat: predictedThreat,
      confidence: Math.round(confidence * 100) / 100,
      summary: this.generateSummary(normalized, riskLevel, phishingProbability, heuristics),
    };
  }

  private normalizeUrl(url: string): string {
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
    }
    return url;
  }

  private parseUrl(url: string): ParsedUrl {
    try {
      const u = new URL(url);
      const hostParts = u.hostname.split('.');
      const tld = hostParts.length > 1 ? hostParts[hostParts.length - 1].toLowerCase() : '';
      const subdomain = hostParts.length > 2 ? hostParts.slice(0, -2).join('.') : '';

      const queryParams: Record<string, string> = {};
      u.searchParams.forEach((v, k) => { queryParams[k] = v; });

      return {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        query: u.search,
        fragment: u.hash,
        tld,
        subdomain,
        is_ip_based: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(u.hostname),
        has_port: !!u.port,
        has_query: !!u.search,
        query_params: queryParams,
      };
    } catch {
      return {
        protocol: '', hostname: url, port: '', path: '', query: '',
        fragment: '', tld: '', subdomain: '', is_ip_based: false,
        has_port: false, has_query: false, query_params: {},
      };
    }
  }

  private checkIpBasedUrl(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    if (!parsed.is_ip_based) return [];
    heuristics.push('ip_based_url');
    return [{ type: 'ip_based_url', severity: 'high', description: 'URL uses raw IP address instead of domain name', score: 25 }];
  }

  private checkSuspiciousTld(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    const results: PhishingIndicator[] = [];
    if (this.SUSPICIOUS_TLDS.has(parsed.tld)) {
      heuristics.push('suspicious_tld');
      results.push({ type: 'suspicious_tld', severity: 'high', description: `Suspicious TLD: .${parsed.tld}`, score: 20 });
    }
    if (this.SUSPICIOUS_CCTLDS.has(parsed.tld)) {
      heuristics.push('high_risk_cctld');
      results.push({ type: 'high_risk_cctld', severity: 'high', description: `High-risk country code TLD: .${parsed.tld}`, score: 15 });
    }
    return results;
  }

  private checkLoginKeywords(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    const results: PhishingIndicator[] = [];
    const fullUrl = `${parsed.hostname}${parsed.path}${parsed.query}`.toLowerCase();
    for (const kw of this.LOGIN_KEYWORDS) {
      if (fullUrl.includes(kw)) {
        heuristics.push('login_keywords');
        results.push({ type: 'login_keywords', severity: 'high', description: `Contains login-related keyword: "${kw}"`, score: 15 });
        break;
      }
    }
    return results;
  }

  private checkExcessiveEncoding(url: string, heuristics: string[]): PhishingIndicator[] {
    const results: PhishingIndicator[] = [];
    const encodedCount = (url.match(/%[0-9A-Fa-f]{2}/g) || []).length;
    if (encodedCount > 5) {
      heuristics.push('excessive_encoding');
      results.push({ type: 'excessive_encoding', severity: 'medium', description: `Excessive URL encoding (${encodedCount} occurrences)`, score: 10 });
    }
    if (url.includes('\\x') || /%00|%01|%ff/i.test(url)) {
      heuristics.push('encoded_payload');
      results.push({ type: 'encoded_payload', severity: 'high', description: 'Contains encoded payload indicators', score: 20 });
    }
    return results;
  }

  private checkHomoglyphAttack(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    const hostname = parsed.hostname.toLowerCase();
    for (const [digit, letter] of Object.entries(this.HOMOGLYPHS)) {
      if (hostname.includes(digit)) {
        const possibleLegit = hostname.replace(new RegExp(digit, 'g'), letter);
        if (this.KNOWN_LEGITIMATE.has(possibleLegit) || this.KNOWN_LEGITIMATE.has(possibleLegit + '.com')) {
          heuristics.push('homoglyph_attack');
          return [{ type: 'homoglyph_attack', severity: 'high', description: `Possible homoglyph attack: "${hostname}" resembles "${possibleLegit}"`, score: 25 }];
        }
      }
    }
    return [];
  }

  private checkSuspiciousPort(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    if (!parsed.has_port) return [];
    const port = parseInt(parsed.port);
    if (port !== 80 && port !== 443) {
      heuristics.push('non_standard_port');
      return [{ type: 'non_standard_port', severity: 'medium', description: `Non-standard port: ${port}`, score: 10 }];
    }
    return [];
  }

  private checkLongUrl(url: string, heuristics: string[]): PhishingIndicator[] {
    if (url.length > 100) {
      heuristics.push('long_url');
      return [{ type: 'long_url', severity: 'low', description: `Unusually long URL (${url.length} characters)`, score: 5 }];
    }
    return [];
  }

  private checkSuspiciousQueryParams(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    const results: PhishingIndicator[] = [];
    for (const key of Object.keys(parsed.query_params)) {
      if (this.SUSPICIOUS_QUERY_PARAMS.includes(key.toLowerCase())) {
        heuristics.push('suspicious_query_params');
        results.push({ type: 'suspicious_query_params', severity: 'medium', description: `Suspicious query parameter: "${key}"`, score: 10 });
        break;
      }
    }
    return results;
  }

  private checkSubdomainHeuristics(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    const results: PhishingIndicator[] = [];
    if (parsed.subdomain && parsed.subdomain.split('.').length > 2) {
      heuristics.push('excessive_subdomains');
      results.push({ type: 'excessive_subdomains', severity: 'medium', description: `Excessive subdomain depth: "${parsed.subdomain}"`, score: 8 });
    }
    const subdomainParts = parsed.subdomain.split('.');
    if (subdomainParts.length > 0) {
      for (const kw of this.LOGIN_KEYWORDS) {
        if (subdomainParts.some(p => p.includes(kw))) {
          heuristics.push('brand_in_subdomain');
          results.push({ type: 'brand_in_subdomain', severity: 'high', description: `Brand/keyword in subdomain may indicate typosquatting`, score: 15 });
          break;
        }
      }
    }
    return results;
  }

  private checkCredentialHarvesting(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    const results: PhishingIndicator[] = [];
    const path = parsed.path.toLowerCase();
    if (/password|credential|secret|passwd|pwd|token/i.test(path)) {
      heuristics.push('credential_harvesting_path');
      results.push({ type: 'credential_harvesting_path', severity: 'critical', description: 'Path suggests credential harvesting', score: 30 });
    }
    return results;
  }

  private checkPathTraversal(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    if (parsed.path.includes('..') || parsed.path.includes('%2e%2e')) {
      heuristics.push('path_traversal');
      return [{ type: 'path_traversal', severity: 'high', description: 'Path traversal detected', score: 20 }];
    }
    return [];
  }

  private checkBrandInDomain(parsed: ParsedUrl, heuristics: string[]): PhishingIndicator[] {
    const hostname = parsed.hostname.toLowerCase();
    const brands = ['google', 'facebook', 'microsoft', 'apple', 'amazon', 'paypal', 'netflix', 'instagram', 'linkedin', 'twitter', 'whatsapp', 'telegram'];
    for (const brand of brands) {
      if (hostname.includes(brand) && !this.KNOWN_LEGITIMATE.has(hostname)) {
        const domainParts = hostname.split('.');
        const registered = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : hostname;
        if (registered !== brand + '.com' && registered !== brand + '.org') {
          heuristics.push('brand_in_domain');
          return [{ type: 'brand_in_domain', severity: 'high', description: `Domain contains brand "${brand}" but is not official`, score: 20 }];
        }
      }
    }
    return [];
  }

  private analyzeDomain(parsed: ParsedUrl): DomainIntel {
    return {
      domain: parsed.hostname,
      registration_info: { registrar: '', created_date: '', expires_date: '', updated_date: '' },
      suspicious_tld: this.SUSPICIOUS_TLDS.has(parsed.tld),
      age_days: 0,
      known_legitimate: this.KNOWN_LEGITIMATE.has(parsed.hostname.toLowerCase()),
      known_malicious: false,
    };
  }

  private classifyThreat(phishingProb: number, riskScore: number, indicators: PhishingIndicator[]): string {
    if (phishingProb >= 0.8) return 'phishing-url';
    if (riskScore >= 60 && indicators.some(i => i.type === 'credential_harvesting_path')) return 'credential-harvesting';
    if (riskScore >= 50) return 'suspicious-url';
    if (phishingProb >= 0.4) return 'potentially-unwanted';
    return 'benign';
  }

  private generateSummary(url: string, riskLevel: string, probability: number, heuristics: string[]): string {
    const base = `URL analysis of "${url.substring(0, 80)}"`;
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return `${base}: ${heuristics.length} phishing indicators detected (probability: ${Math.round(probability * 100)}%)`;
    }
    if (riskLevel === 'medium') {
      return `${base}: ${heuristics.length} suspicious signals found`;
    }
    return `${base}: No significant threats detected`;
  }
}

export const urlIntelligenceService = new UrlIntelligenceService();
export default urlIntelligenceService;
