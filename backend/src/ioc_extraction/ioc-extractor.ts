import { ExtractedIOC, ExtractionResult, IoCType } from './types';

export class IocExtractionService {
  // URL regex - matches http/https/ftp URLs
  private readonly URL_PATTERN = /https?:\/\/[^\s'"<>(){}|\\^`[\]]+(?:\/[^\s'"<>(){}|\\^`[\]]*)?/gi;
  
  // Domain regex
  private readonly DOMAIN_PATTERN = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/gi;
  
  // IPv4 regex
  private readonly IPV4_PATTERN = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
  
  // MD5 regex
  private readonly MD5_PATTERN = /\b[a-fA-F0-9]{32}\b/g;
  
  // SHA1 regex
  private readonly SHA1_PATTERN = /\b[a-fA-F0-9]{40}\b/g;
  
  // SHA256 regex
  private readonly SHA256_PATTERN = /\b[a-fA-F0-9]{64}\b/g;
  
  // Email regex
  private readonly EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  
  // CVE pattern
  private readonly CVE_PATTERN = /\bCVE-\d{4}-\d{4,7}\b/gi;
  
  // PowerShell command patterns
  private readonly POWERSHELL_PATTERNS = [
    /(?:Invoke-Expression|IEX|Invoke-Command|Invoke-WebRequest|iwr|curl|wget)\s*[^\s]*/gi,
    /(?:FromBase64String|DownloadString|DownloadFile|Start-Process|New-Object)\s*[^\s]*/gi,
    /(?:powershell|pwsh)\s+(?:-EncodedCommand|-Command|-E|-C)\s+/gi,
  ];
  
  // Suspicious filename patterns
  private readonly SUSPICIOUS_FILENAME_PATTERNS = [
    /\b(?:trojan|backdoor|keylog|ransom|crypt|malware|exploit|shellcode|dropper|downloader|payload|rat|stealer)\b/gi,
    /\b(?:\.ps1|\.vbs|\.vbe|\.js|\.jse|\.wsf|\.wsh|\.hta|\.scr|\.pif|\.com|\.bat|\.cmd|\.jar)\s*$/gim,
  ];

  // Registry key patterns
  private readonly REGISTRY_PATTERN = /[A-Z]+\\[A-Za-z0-9_\\]+(?:[A-Za-z0-9_]+)/g;
  
  extractAll(text: string, context?: string): ExtractionResult {
    const iocs: ExtractedIOC[] = [];
    
    // URLs
    const urls = this.matchUnique(this.URL_PATTERN, text);
    urls.forEach(u => iocs.push({ type: IoCType.URL, value: u, context, confidence: this.getUrlConfidence(u) }));
    
    // Domains (filter out pure IPs and common domains)
    const domains = [...new Set(Array.from(text.matchAll(this.DOMAIN_PATTERN), m => m[0].toLowerCase()))]
      .filter(d => !d.match(this.IPV4_PATTERN) && !this.isCommonDomain(d));
    domains.forEach(d => iocs.push({ type: IoCType.DOMAIN, value: d, context, confidence: 0.7 }));
    
    // IPv4
    const ips = this.matchUnique(this.IPV4_PATTERN, text).filter(ip => !this.isPrivateIp(ip));
    ips.forEach(ip => iocs.push({ type: IoCType.IPV4, value: ip, context, confidence: 0.8 }));
    
    // Hashes - deduplicate by checking which pattern matched
    const allHex = text.match(/\b[a-fA-F0-9]{32,64}\b/g) || [];
    const md5Set = new Set<string>();
    const sha1Set = new Set<string>();
    const sha256Set = new Set<string>();
    for (const h of allHex) {
      if (h.length === 32 && !md5Set.has(h)) { md5Set.add(h); iocs.push({ type: IoCType.MD5, value: h, context, confidence: 0.9 }); }
      else if (h.length === 40 && !sha1Set.has(h)) { sha1Set.add(h); iocs.push({ type: IoCType.SHA1, value: h, context, confidence: 0.9 }); }
      else if (h.length === 64 && !sha256Set.has(h)) { sha256Set.add(h); iocs.push({ type: IoCType.SHA256, value: h, context, confidence: 0.9 }); }
    }
    
    // Emails
    this.matchUnique(this.EMAIL_PATTERN, text).forEach(e => iocs.push({ type: IoCType.EMAIL, value: e.toLowerCase(), context, confidence: 0.8 }));
    
    // CVEs
    this.matchUnique(this.CVE_PATTERN, text).forEach(c => iocs.push({ type: IoCType.CVE, value: c.toUpperCase(), context, confidence: 0.9 }));
    
    // PowerShell commands
    for (const pattern of this.POWERSHELL_PATTERNS) {
      this.matchUnique(pattern, text).forEach(cmd => iocs.push({ type: IoCType.POWERSHELL_COMMAND, value: cmd.trim(), context, confidence: 0.8 }));
    }
    
    // Registry keys
    this.matchUnique(this.REGISTRY_PATTERN, text)
      .filter(r => r.length > 15 && r.includes('\\'))
      .forEach(r => iocs.push({ type: IoCType.REGISTRY_KEY, value: r, context, confidence: 0.6 }));
    
    return {
      iocs,
      totalCount: iocs.length,
      uniqueUrls: urls,
      uniqueDomains: domains,
      uniqueIps: ips,
      uniqueHashes: [...md5Set, ...sha1Set, ...sha256Set],
    };
  }
  
  extractFromText(text: string, source?: string): ExtractionResult {
    return this.extractAll(text, source);
  }
  
  private matchUnique(pattern: RegExp, text: string): string[] {
    return [...new Set(Array.from(text.matchAll(pattern), m => m[0]))];
  }
  
  private getUrlConfidence(url: string): number {
    const lower = url.toLowerCase();
    let confidence = 0.6;
    if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(lower)) confidence += 0.2;
    if (lower.includes('login') || lower.includes('signin') || lower.includes('account')) confidence += 0.15;
    if (lower.includes('download') || lower.includes('update')) confidence += 0.1;
    if (/[A-Za-z0-9]*\.(?:tk|ml|ga|cf|gq|xyz|top|club|online|site|stream)/.test(lower)) confidence += 0.1;
    if (lower.includes('%') || lower.includes('\\x')) confidence += 0.1;
    return Math.min(confidence, 1.0);
  }
  
  private isCommonDomain(domain: string): boolean {
    const common = new Set([
      'google.com', 'facebook.com', 'youtube.com', 'twitter.com', 'instagram.com',
      'linkedin.com', 'microsoft.com', 'apple.com', 'amazon.com', 'github.com',
      'stackoverflow.com', 'reddit.com', 'wikipedia.org', 'whatsapp.com',
    ]);
    return common.has(domain);
  }
  
  private isPrivateIp(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    return false;
  }
}

export const iocExtractionService = new IocExtractionService();
export default iocExtractionService;
