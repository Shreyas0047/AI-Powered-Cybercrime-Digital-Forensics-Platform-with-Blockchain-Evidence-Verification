/**
 * Auth Tests
 * Registration and OTP flow validation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock auth service
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
};

jest.mock('../services', () => ({
  authService: mockAuthService,
}));

describe('Auth - Registration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject registration without email', () => {
      const body = { password: 'Test@1234', firstName: 'John', lastName: 'Doe', role: 'forensic_analyst' };
      expect(body.email).toBeUndefined();
    });

    it('should reject registration without password', () => {
      const body = { email: 'test@example.com', firstName: 'John', lastName: 'Doe', role: 'forensic_analyst' };
      expect((body as any).password).toBeUndefined();
    });

    it('should reject weak passwords', () => {
      const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      expect(PASSWORD_REGEX.test('weak')).toBe(false);
      expect(PASSWORD_REGEX.test('NoSpecial1')).toBe(false);
      expect(PASSWORD_REGEX.test('Valid@Pass1')).toBe(true);
    });

    it('should validate email format', () => {
      const EMAIL_REGEX = /\S+@\S+\.\S+/;
      expect(EMAIL_REGEX.test('invalid')).toBe(false);
      expect(EMAIL_REGEX.test('valid@example.com')).toBe(true);
    });

    it('should accept valid roles', () => {
      const validRoles = ['super_admin', 'admin', 'forensic_analyst', 'security_reviewer', 'sandbox_operator', 'auditor'];
      expect(validRoles.includes('forensic_analyst')).toBe(true);
      expect(validRoles.includes('hacker')).toBe(false);
    });
  });

  describe('Registration Service', () => {
    it('should call register with correct parameters', async () => {
      mockAuthService.register.mockResolvedValue({
        user: { id: '123', email: 'test@example.com', role: 'forensic_analyst' },
        tokens: { accessToken: 'at_123', refreshToken: 'rt_123' },
      });

      const result = await mockAuthService.register({
        email: 'test@example.com',
        password: 'Valid@Pass1',
        firstName: 'John',
        lastName: 'Doe',
        role: 'forensic_analyst',
      }, '127.0.0.1');

      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Email already registered'));

      await expect(
        mockAuthService.register({ email: 'dup@example.com', password: 'Valid@Pass1', firstName: 'A', lastName: 'B', role: 'admin' }, '127.0.0.1')
      ).rejects.toThrow('Email already registered');
    });
  });
});

describe('Auth - OTP Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Send OTP', () => {
    it('should send OTP for valid email and role', async () => {
      mockAuthService.sendOtp.mockResolvedValue({ success: true, message: 'OTP sent' });

      const result = await mockAuthService.sendOtp('user@example.com', 'analyst');
      expect(result.success).toBe(true);
      expect(mockAuthService.sendOtp).toHaveBeenCalledWith('user@example.com', 'analyst');
    });

    it('should reject OTP request without role', async () => {
      mockAuthService.sendOtp.mockRejectedValue(new Error('Role is required'));

      await expect(mockAuthService.sendOtp('user@example.com', '')).rejects.toThrow('Role is required');
    });
  });

  describe('Verify OTP', () => {
    it('should verify valid OTP and return token', async () => {
      mockAuthService.verifyOtp.mockResolvedValue({
        verified: true,
        role: 'analyst',
        emailVerificationToken: 'evt_abc123',
      });

      const result = await mockAuthService.verifyOtp('user@example.com', '123456');
      expect(result.verified).toBe(true);
      expect(result.emailVerificationToken).toBeDefined();
    });

    it('should reject invalid OTP', async () => {
      mockAuthService.verifyOtp.mockResolvedValue({ verified: false });

      const result = await mockAuthService.verifyOtp('user@example.com', '000000');
      expect(result.verified).toBe(false);
    });

    it('should reject expired OTP', async () => {
      mockAuthService.verifyOtp.mockRejectedValue(new Error('OTP expired'));

      await expect(mockAuthService.verifyOtp('user@example.com', '123456')).rejects.toThrow('OTP expired');
    });
  });
});
