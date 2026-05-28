"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfAnalyzer = void 0;
class PdfAnalyzer {
    analyze(pdfText, filename) {
        const findings = [];
        const suspiciousScripts = [];
        const embeddedUrls = [];
        const text = pdfText || '';
        // Embedded JavaScript detection
        const jsPatterns = [
            /\/JavaScript\s*<</gi, /\/JS\s*<</gi, /\/S\s*\/JavaScript/gi,
            /app\.alert\s*\(/gi, /app\.exec\s*\(/gi, /app\.execMenuItem\s*\(/gi,
            /this\.print\s*\{/gi, /this\.exportAsText\s*\(/gi,
        ];
        for (const p of jsPatterns) {
            if (p.test(text)) {
                findings.push({
                    type: 'embedded_javascript', severity: 'high',
                    description: `PDF contains embedded JavaScript (matched: ${p.source})`, score: 20,
                });
                break;
            }
        }
        // Launch Actions detection
        if (/Launch\s*<</i.test(text) || /\/F\s*\(.*\.(exe|bat|cmd|ps1|vbs|js|scr|hta)/i.test(text)) {
            findings.push({
                type: 'suspicious_launch_action', severity: 'critical',
                description: 'PDF contains launch actions that could execute external programs', score: 35,
            });
        }
        // OpenAction / AA (Additional Action) detection
        if (/\/OpenAction\s*<</i.test(text) || /\/AA\s*<</i.test(text)) {
            findings.push({
                type: 'auto_action', severity: 'high',
                description: 'PDF has auto-execute actions (OpenAction / AdditionalAction)', score: 25,
            });
        }
        // Embedded files
        if (/\/EmbeddedFiles\s*<</i.test(text) || (/\/Type\s*\/EmbeddedFile/i.test(text) && /\/F\s*\(/i.test(text))) {
            findings.push({
                type: 'embedded_file', severity: 'high',
                description: 'PDF contains embedded file attachments', score: 20,
            });
        }
        // Suspicious URLs
        const urlPattern = /https?:\/\/[^\s'"<>(){}|\\^`[\]]+(?:\/[^\s'"<>(){}|\\^`[\]]*)?/gi;
        const urls = [...new Set(Array.from(text.matchAll(urlPattern), m => m[0]))];
        embeddedUrls.push(...urls);
        // Suspicious URL patterns
        const suspiciousUrlPatterns = [/login/i, /signin/i, /update/i, /download/i, /secure/i, /bank/i, /paypal/i, /verify/i];
        for (const url of urls) {
            for (const pat of suspiciousUrlPatterns) {
                if (pat.test(url)) {
                    findings.push({
                        type: 'suspicious_embedded_url', severity: 'medium',
                        description: `Suspicious URL in PDF: ${url.substring(0, 100)}`, score: 10,
                    });
                    break;
                }
            }
        }
        // Obfuscated content detection
        if ((text.match(/%[0-9A-Fa-f]{2}/g) || []).length > 20) {
            findings.push({
                type: 'obfuscated_content', severity: 'high',
                description: 'PDF contains heavily obfuscated/encoded content', score: 20,
            });
        }
        // Malformed structure detection
        if (/\/Filter\s*\/FlateDecode/i.test(text) && !/\/Length\s*\d+/i.test(text)) {
            findings.push({
                type: 'malformed_structure', severity: 'medium',
                description: 'PDF has potentially malformed stream structure', score: 10,
            });
        }
        // Suspicious annotations
        if (/\/Type\s*\/Annot/i.test(text) && /\/Subtype\s*\/(Screen|Movie|Sound|FileAttachment)/i.test(text)) {
            findings.push({
                type: 'suspicious_annotation', severity: 'high',
                description: 'PDF contains suspicious annotations (Screen/Movie/Sound/FileAttachment)', score: 15,
            });
        }
        // Suspicious scripts extraction
        const scriptPatterns = [
            /(?:var|let|const)\s+\w+\s*=\s*['"][^'"]*['"]\s*[;,]?\s*(?:\.split|\.fromCharCode|eval)/gi,
            /eval\s*\(\s*[a-zA-Z]/gi,
            /unescape\s*\(/gi,
            /String\.fromCharCode/gi,
        ];
        for (const p of scriptPatterns) {
            const matches = text.match(p);
            if (matches) {
                suspiciousScripts.push(...matches);
            }
        }
        // Phishing indicators
        const phishingPatterns = [
            /verify\s+(?:your\s+)?account/i, /confirm\s+(?:your\s+)?identity/i,
            /security\s+(?:update|alert)/i, /unauthorized\s+(?:access|login)/i,
            /suspicious\s+activity/i, /click\s+here\s+to\s+verify/i,
        ];
        for (const p of phishingPatterns) {
            if (p.test(text)) {
                findings.push({
                    type: 'phishing_indicator', severity: 'medium',
                    description: `Phishing language detected: "${p.source}"`, score: 8,
                });
                break;
            }
        }
        return { findings, suspiciousScripts, embeddedUrls, extractedText: text };
    }
}
exports.PdfAnalyzer = PdfAnalyzer;
//# sourceMappingURL=pdf-analyzer.js.map