export enum IoCType {
  URL = 'url',
  DOMAIN = 'domain',
  IPV4 = 'ipv4',
  IPV6 = 'ipv6',
  MD5 = 'md5',
  SHA1 = 'sha1',
  SHA256 = 'sha256',
  EMAIL = 'email',
  FILE_PATH = 'file_path',
  REGISTRY_KEY = 'registry_key',
  POWERSHELL_COMMAND = 'powershell_command',
  MACRO_SIGNATURE = 'macro_signature',
  SUSPICIOUS_FILENAME = 'suspicious_filename',
  CVE = 'cve',
  MUTEX = 'mutex',
}

export interface ExtractedIOC {
  type: IoCType;
  value: string;
  context?: string;
  confidence: number; // 0.0 - 1.0
}

export interface ExtractionResult {
  iocs: ExtractedIOC[];
  totalCount: number;
  uniqueUrls: string[];
  uniqueDomains: string[];
  uniqueIps: string[];
  uniqueHashes: string[];
}
