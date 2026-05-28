"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocxAnalyzer = void 0;
class DocxAnalyzer {
    analyze(docxText, filename) {
        const findings = [];
        const suspiciousScripts = [];
        const embeddedUrls = [];
        const text = docxText || '';
        // VBA Macro detection
        const hasMacro = /vbaProject|_VBA_PROJECT_CUR|Attribut|Attribute\s+VB_Name|Begin\s+VB_Name|Module\s+|Sub\s+|End\s+Sub|Function\s+|End\s+Function/i.test(text);
        const macroMatches = text.match(/Sub\s+\w+|Function\s+\w+|Module\s+\w+/gi);
        const autoMacro = /Auto_Open|AutoOpen|Auto_Exec|Document_Open|Workbook_Open|AutoExec|AutoExit/i.test(text);
        // Suspicious VBA patterns
        const suspiciousVbaStrings = [];
        const vbaSuspiciousPatterns = [
            { pattern: /Shell\s*\(/gi, desc: 'Shell execution in macros' },
            { pattern: /CreateObject\s*\(/gi, desc: 'CreateObject used to instantiate external objects' },
            { pattern: /WScript\.Shell|WScriptShell/i, desc: 'WScript.Shell access for command execution' },
            { pattern: /ADODB\.Stream/i, desc: 'ADODB.Stream for file download operations' },
            { pattern: /URLDownloadToFile|URLMoniker/i, desc: 'URL download function to fetch remote payloads' },
            { pattern: /WinHttp|XMLHTTP|ServerXMLHTTP/i, desc: 'HTTP request objects for C2 communication' },
            { pattern: /Base64|FromBase64|Base64Decode/i, desc: 'Base64 encoding/decoding - possible obfuscation' },
            { pattern: /(?:Write|CreateTextFile|SaveToFile)\s+/i, desc: 'File write operations for dropping payloads' },
            { pattern: /powershell|pwsh|cmd\.exe/i, desc: 'PowerShell or cmd execution' },
            { pattern: /(?:RegRead|RegWrite|DeleteSetting|SaveSetting)/i, desc: 'Registry persistence operations' },
            { pattern: /(?:EncodedCommand|-E\s+|FromBase64String)/i, desc: 'Encoded PowerShell commands' },
            { pattern: /Chr\s*\(\s*(?:\d{1,3}\s*,?\s*){4,}/gi, desc: 'Chr() obfuscation with multiple character codes' },
            { pattern: /(?:DownloadFile|DownloadData|DownloadString)/i, desc: 'Download function for payload retrieval' },
            { pattern: /(?:Schedule|TaskScheduler|schtasks)/i, desc: 'Scheduled task creation for persistence' },
            { pattern: /(?:SpecialFolders|GetSpecialFolder|AppDataFolder)/i, desc: 'Accessing special folders for payload placement' },
        ];
        for (const { pattern, desc } of vbaSuspiciousPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                findings.push({
                    type: 'suspicious_vba', severity: 'high',
                    description: `${desc} (matched: ${matches.length}x)`, score: 15,
                });
                suspiciousVbaStrings.push(...matches.map(m => m.substring(0, 100)));
            }
        }
        if (hasMacro) {
            findings.push({
                type: 'vba_macro_detected', severity: 'high',
                description: `Document contains VBA macros (${macroMatches?.length || 0} procedures)`, score: 20,
            });
        }
        if (autoMacro) {
            findings.push({
                type: 'auto_exec_macro', severity: 'critical',
                description: 'Document has auto-execute macros (Auto_Open/AutoExec)', score: 35,
            });
        }
        // External template detection
        if (/<w:attachedTemplate/i.test(text) && /https?:\/\//i.test(text)) {
            findings.push({
                type: 'external_template', severity: 'high',
                description: 'Document references external templates (possible template injection)', score: 20,
            });
        }
        // DDE / Field code exploits
        if (/DDEAUTO|DDE|FIELD_CODE/i.test(text) && /(?:cmd|powershell|wscript|mshta)\s/i.test(text)) {
            findings.push({
                type: 'dde_exploit', severity: 'critical',
                description: 'DDE/DDEAUTO field codes with command execution', score: 35,
            });
        }
        // OLE / Embedded objects
        if (/<w:object|<o:OLEObject|<w:embed/i.test(text)) {
            findings.push({
                type: 'ole_embedded_object', severity: 'medium',
                description: 'Document contains OLE embedded objects', score: 8,
            });
        }
        // Encoded content
        if ((text.match(/[A-Za-z0-9+\/]{100,}={0,2}/g) || []).length > 0) {
            findings.push({
                type: 'encoded_payload', severity: 'high',
                description: 'Large base64-encoded blobs detected (possible embedded payload)', score: 18,
            });
        }
        // External relationships
        const urlPattern = /https?:\/\/[^\s'"<>{}|\\^`[\]]+(?:\/[^\s'"<>{}|\\^`[\]]*)?/gi;
        const urls = [...new Set(Array.from(text.matchAll(urlPattern), m => m[0]))];
        embeddedUrls.push(...urls);
        // Epilogue / Footer exploits
        if (/EpsExec|PostScript|epilogue/i.test(text)) {
            findings.push({
                type: 'eps_exploit', severity: 'critical',
                description: 'PostScript/Epilogue execution detected (EPS exploit)', score: 35,
            });
        }
        const macroRisk = {
            has_macros: hasMacro,
            macro_count: macroMatches?.length || 0,
            auto_execute: autoMacro,
            suspicious_strings: suspiciousVbaStrings,
            risk_score: this.calculateMacroRiskScore(hasMacro, autoMacro, suspiciousVbaStrings.length),
            risk_level: hasMacro ? (autoMacro ? 'critical' : suspiciousVbaStrings.length > 3 ? 'high' : 'medium') : 'low',
        };
        // Non-macro suspicious scripts (PowerShell in body text)
        const psPattern = /(?:powershell|pwsh)\s+(?:-EncodedCommand|-Command|-E|-C)\s+/gi;
        const psMatches = text.match(psPattern);
        if (psMatches) {
            findings.push({
                type: 'powershell_in_document', severity: 'high',
                description: `PowerShell commands in document body (${psMatches.length} occurrences)`, score: 18,
            });
        }
        return { findings, macroRisk, suspiciousScripts, embeddedUrls, extractedText: text };
    }
    calculateMacroRiskScore(hasMacro, autoExec, suspiciousCount) {
        let score = 0;
        if (hasMacro)
            score += 20;
        if (autoExec)
            score += 35;
        score += Math.min(suspiciousCount * 8, 40);
        return Math.min(score, 100);
    }
}
exports.DocxAnalyzer = DocxAnalyzer;
//# sourceMappingURL=docx-analyzer.js.map