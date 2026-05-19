"use strict";
/**
 * Email OTP Service
 * Handles registration email verification through SMTP.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTP = sendOTP;
exports.verifyOTP = verifyOTP;
exports.consumeEmailVerification = consumeEmailVerification;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const models_1 = require("../models");
const logger_1 = __importDefault(require("../config/logger"));
const OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_TOKEN_TTL_SECONDS = 15 * 60;
const MAX_VERIFY_ATTEMPTS = 5;
const pendingOtps = new Map();
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function normalizeRole(role) {
    if (role === 'analyst' || role === 'admin') {
        return role;
    }
    if (role === 'forensic_analyst') {
        return 'analyst';
    }
    return null;
}
function requiredEnv(key) {
    const value = process.env[key]?.trim();
    if (!value) {
        throw new Error(`${key} is required for SMTP email verification`);
    }
    return value;
}
function optionalNumberEnv(key, defaultValue) {
    const value = process.env[key]?.trim();
    if (!value) {
        return defaultValue;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        throw new Error(`${key} must be a valid number`);
    }
    return parsed;
}
function optionalBoolEnv(key, defaultValue) {
    const value = process.env[key]?.trim().toLowerCase();
    if (!value) {
        return defaultValue;
    }
    return ['1', 'true', 'yes', 'on'].includes(value);
}
function hashOtp(otp) {
    return crypto_1.default.createHash('sha256').update(otp).digest('hex');
}
function emailVerificationSecret() {
    return process.env.JWT_SECRET || requiredEnv('JWT_REFRESH_SECRET');
}
function createEmailVerificationToken(email, role) {
    const payload = {
        email,
        role,
        purpose: 'email_verification',
    };
    return jsonwebtoken_1.default.sign(payload, emailVerificationSecret(), {
        expiresIn: EMAIL_VERIFICATION_TOKEN_TTL_SECONDS,
        issuer: 'forensics-platform',
        audience: 'registration',
    });
}
function verifyEmailVerificationToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, emailVerificationSecret(), {
            issuer: 'forensics-platform',
            audience: 'registration',
        });
        if (decoded.purpose !== 'email_verification') {
            return null;
        }
        return decoded;
    }
    catch {
        return null;
    }
}
function createTransporter() {
    const host = requiredEnv('SMTP_HOST');
    const port = optionalNumberEnv('SMTP_PORT', 587);
    const secure = optionalBoolEnv('SMTP_SECURE', port === 465);
    const user = requiredEnv('SMTP_USER');
    const pass = requiredEnv('SMTP_PASS');
    return nodemailer_1.default.createTransport({
        host,
        port,
        secure,
        requireTLS: !secure,
        auth: { user, pass },
    });
}
function fromAddress() {
    const smtpFrom = process.env.SMTP_FROM?.trim() || requiredEnv('SMTP_USER');
    return smtpFrom.includes('<') ? smtpFrom : `ForensicsAI <${smtpFrom}>`;
}
function otpEmailHtml(otp, role) {
    const roleName = role === 'admin' ? 'Administrator' : 'Analyst';
    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #0891b2;">ForensicsAI Email Verification</h2>
      <p>Your ${roleName} registration verification code is:</p>
      <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0891b2;">
        ${otp}
      </div>
      <p style="color: #475569; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="color: #94a3b8; font-size: 12px;">If you did not request this, you can ignore this email.</p>
    </div>
  `;
}
function cleanupExpiredRecords() {
    const now = Date.now();
    for (const [email, record] of pendingOtps.entries()) {
        if (record.expiresAt <= now) {
            pendingOtps.delete(email);
        }
    }
}
async function sendOTP(email, roleInput) {
    cleanupExpiredRecords();
    const normalizedEmail = normalizeEmail(email);
    const role = normalizeRole(roleInput);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { success: false, message: 'Please enter a valid email address' };
    }
    if (!role) {
        return { success: false, message: 'Invalid role. Must be analyst or admin' };
    }
    const existingUser = await models_1.User.findOne({ email: normalizedEmail });
    if (existingUser) {
        return { success: false, message: 'Email already registered' };
    }
    const otp = crypto_1.default.randomInt(100000, 1000000).toString();
    const transporter = createTransporter();
    try {
        await transporter.verify();
        await transporter.sendMail({
            from: fromAddress(),
            to: normalizedEmail,
            subject: 'ForensicsAI verification code',
            text: `Your ForensicsAI verification code is ${otp}. It expires in 10 minutes.`,
            html: otpEmailHtml(otp, role),
        });
        pendingOtps.set(normalizedEmail, {
            codeHash: hashOtp(otp),
            role,
            expiresAt: Date.now() + OTP_TTL_MS,
            attempts: 0,
        });
        logger_1.default.info(`Email OTP sent to ${normalizedEmail}`);
        return { success: true, message: 'OTP sent to your email' };
    }
    catch (error) {
        logger_1.default.error({
            message: `Email OTP send failed for ${normalizedEmail}`,
            error: error?.message,
            code: error?.code,
            command: error?.command,
            responseCode: error?.responseCode,
        });
        return {
            success: false,
            message: `Unable to send OTP email: ${error?.message || 'SMTP delivery failed'}`,
        };
    }
}
function verifyOTP(email, otp) {
    cleanupExpiredRecords();
    const normalizedEmail = normalizeEmail(email);
    const record = pendingOtps.get(normalizedEmail);
    if (!record) {
        return { success: false, message: 'No active OTP found. Please request a new code.' };
    }
    if (!/^\d{6}$/.test(otp)) {
        return { success: false, message: 'OTP must be a 6-digit code.' };
    }
    if (record.expiresAt <= Date.now()) {
        pendingOtps.delete(normalizedEmail);
        return { success: false, message: 'OTP expired. Please request a new code.' };
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        pendingOtps.delete(normalizedEmail);
        return { success: false, message: 'Too many incorrect attempts. Please request a new code.' };
    }
    if (record.codeHash !== hashOtp(otp)) {
        record.attempts += 1;
        pendingOtps.set(normalizedEmail, record);
        return { success: false, message: 'Invalid OTP. Please try again.' };
    }
    pendingOtps.delete(normalizedEmail);
    return {
        success: true,
        message: 'Email verified successfully',
        data: {
            verified: true,
            role: record.role,
            emailVerificationToken: createEmailVerificationToken(normalizedEmail, record.role),
        },
    };
}
function consumeEmailVerification(email, roleInput, token) {
    cleanupExpiredRecords();
    const normalizedEmail = normalizeEmail(email);
    const role = normalizeRole(roleInput);
    if (!role) {
        return { success: false, message: 'Invalid role. Must be analyst or admin' };
    }
    if (!token) {
        return { success: false, message: 'Email is not verified. Please complete OTP verification first.' };
    }
    const decoded = verifyEmailVerificationToken(token);
    if (!decoded) {
        return { success: false, message: 'Email verification expired or invalid. Please verify again.' };
    }
    if (decoded.email !== normalizedEmail) {
        return { success: false, message: 'Verified email does not match registration email.' };
    }
    if (decoded.role !== role) {
        return { success: false, message: 'Verified role does not match registration role.' };
    }
    return { success: true, message: 'Email verification accepted' };
}
setInterval(cleanupExpiredRecords, 60 * 1000).unref();
//# sourceMappingURL=otp.service.js.map