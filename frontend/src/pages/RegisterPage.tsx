import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const PASSWORD_ERROR = 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character';

type Step = 'role' | 'email' | 'otp' | 'password';
type RegistrationRole = 'analyst' | 'admin';

interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    user: { id: string; email: string; role: string };
    tokens: { accessToken: string; refreshToken: string };
  };
}

interface VerifyOtpResponse {
  verified: boolean;
  role: RegistrationRole;
  emailVerificationToken: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuthState = useAuthStore.setState;
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<RegistrationRole | ''>('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');

  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  const clearError = useCallback(() => setError(''), []);

  const startOtpCooldown = () => {
    setOtpCooldown(30);
    const interval = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRoleSelect = (selectedRole: RegistrationRole) => {
    setRole(selectedRole);
    setOtp('');
    setEmailVerificationToken('');
    clearError();
    setSuccess('');
    setStep('email');
  };

  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!role) {
      setError('Please choose a role before requesting an OTP');
      return;
    }

    setLoading(true);
    clearError();
    setSuccess('');
    setOtp('');
    setEmailVerificationToken('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await api.post<{ success: boolean; message: string; data?: { devOtp?: string } }>('/auth/send-otp', {
        email: normalizedEmail,
        role,
      });

      if (response.success) {
        setEmail(normalizedEmail);
        setStep('otp');
        setSuccess('OTP sent to your email. Check your inbox.');
        startOtpCooldown();
        if (response.data?.devOtp) {
          setSuccess(`[DEV MODE] OTP: ${response.data.devOtp}`);
        }
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Could not reach the server. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpCooldown > 0) return;
    await handleSendOTP();
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    clearError();

    try {
      const response = await api.post<VerifyOtpResponse>('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp,
      });

      if (response.success && response.data?.verified && response.data.emailVerificationToken) {
        setEmailVerificationToken(response.data.emailVerificationToken);
        setStep('password');
        setSuccess('Email verified. Set your name and password to finish creating your account.');
      } else {
        setError(response.message || 'Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not verify OTP. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!role) {
      setError('Please choose a role before registering');
      return;
    }
    if (!emailVerificationToken) {
      setError('Please verify your email before creating your account.');
      return;
    }
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }
    if (!lastName.trim()) {
      setError('Please enter your last name');
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError(PASSWORD_ERROR);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    clearError();

    try {
      const response = await api.post<RegisterResponse>('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        role: role === 'analyst' ? 'forensic_analyst' : 'admin',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailVerificationToken,
      });

      if (response.success && response.data) {
        localStorage.setItem('accessToken', response.data.tokens.accessToken);
        if (response.data.tokens.refreshToken) {
          localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        }
        setAuthState({
          user: response.data.user as any,
          token: response.data.tokens.accessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        navigate('/dashboard');
      } else {
        setError(response.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4 relative overflow-hidden grain-overlay">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="mesh-orb mesh-orb-violet w-[600px] h-[600px] -top-[300px] -left-[200px]" />
        <div className="mesh-orb mesh-orb-amber w-[500px] h-[500px] -bottom-[250px] -right-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cobalt)] shadow-2xl shadow-violet-500/20 mb-6 group"
          >
            <Shield className="w-10 h-10 text-[var(--surface-base)] transition-transform duration-500 group-hover:scale-110" />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight font-display text-[var(--text-primary)]">ForensicsAI</h1>
          <p className="overline mt-3">Enterprise Cyber Investigation Platform</p>
        </div>

        <div className="surface-elevated p-10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent-violet)] to-transparent opacity-50" />
          
          {step === 'role' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-2xl font-semibold font-display text-[var(--text-primary)] mb-8">Create Identity</h2>
              <div className="space-y-4">
                <button
                  onClick={() => handleRoleSelect('analyst')}
                  className="w-full p-6 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-2xl hover:border-[var(--accent-cobalt)] hover:bg-[var(--accent-cobalt)]/5 transition-all text-left group/btn"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-[var(--text-primary)]">Analyst</div>
                    <User className="w-5 h-5 text-[var(--text-tertiary)] group-hover/btn:text-[var(--accent-cobalt)] transition-colors" />
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">Investigate digital evidence and intelligence</div>
                </button>
                <button
                  onClick={() => handleRoleSelect('admin')}
                  className="w-full p-6 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-2xl hover:border-[var(--accent-violet)] hover:bg-[var(--accent-violet)]/5 transition-all text-left group/btn"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-[var(--text-primary)]">Administrator</div>
                    <Shield className="w-5 h-5 text-[var(--text-tertiary)] group-hover/btn:text-[var(--accent-violet)] transition-colors" />
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">Full sovereign system control and user governance</div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'email' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setStep('role')} className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  &lt; Back
                </button>
                <h2 className="text-2xl font-semibold font-display text-[var(--text-primary)]">Identity Verification</h2>
              </div>
              
              <div className="p-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl text-xs font-mono tracking-wider">
                REGISTERING AS: <span className="text-[var(--accent-violet)] uppercase">{role}</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] ml-1">Email Endpoint</label>
                <Input
                  type="email"
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setOtp('');
                    setEmailVerificationToken('');
                  }}
                  leftIcon={<Mail className="w-5 h-5 text-[var(--text-tertiary)]" />}
                  className="bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-primary)] h-12 rounded-xl focus:border-[var(--accent-violet)] transition-all"
                  required
                />
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </motion.div>
              )}

              <Button 
                onClick={handleSendOTP} 
                className="w-full h-12 bg-[var(--text-primary)] text-[var(--surface-base)] hover:bg-[var(--accent-violet)] hover:text-[var(--surface-base)] font-bold rounded-xl transition-all"
                loading={loading}
              >
                Request Access Code
              </Button>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setStep('email')} className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  &lt; Back
                </button>
                <h2 className="text-2xl font-semibold font-display text-[var(--text-primary)]">Verify Code</h2>
              </div>

              <div className="p-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl text-xs font-mono tracking-wider">
                CHALLENGE SENT TO: <span className="text-[var(--accent-violet)]">{email}</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] ml-1">Access Token</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-primary)] text-center text-xl tracking-[0.5em] font-mono h-14 rounded-xl focus:border-[var(--accent-violet)] transition-all"
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}
              
              <Button 
                onClick={handleVerifyOTP} 
                className="w-full h-12 bg-[var(--text-primary)] text-[var(--surface-base)] hover:bg-[var(--accent-violet)] hover:text-[var(--surface-base)] font-bold rounded-xl transition-all"
                loading={loading}
              >
                Validate Challenge
              </Button>

              <button
                onClick={handleResendOTP}
                disabled={otpCooldown > 0 || loading}
                className="w-full text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--accent-violet)] disabled:opacity-50 transition-colors"
              >
                {otpCooldown > 0 ? `Retry in ${otpCooldown}s` : 'Request New Code'}
              </button>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setStep('otp')} className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  &lt; Back
                </button>
                <h2 className="text-2xl font-semibold font-display text-[var(--text-primary)]">Finalize Identity</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] ml-1">Given Name</label>
                  <Input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-primary)] h-12 rounded-xl transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] ml-1">Surname</label>
                  <Input
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-primary)] h-12 rounded-xl transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] ml-1">Secret Access Key</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-5 h-5 text-[var(--text-tertiary)]" />}
                    className="bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-primary)] h-12 rounded-xl focus:border-[var(--accent-violet)] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] ml-1">Confirm Secret</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="w-5 h-5 text-[var(--text-tertiary)]" />}
                  className="bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-primary)] h-12 rounded-xl focus:border-[var(--accent-violet)] transition-all"
                  required
                />
              </div>

              {error && (
                <motion.div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400">
                  {error}
                </motion.div>
              )}

              <Button 
                onClick={handleRegister} 
                className="w-full h-12 bg-[var(--text-primary)] text-[var(--surface-base)] hover:bg-[var(--accent-violet)] hover:text-[var(--surface-base)] font-bold rounded-xl transition-all shadow-lg shadow-black/20"
                loading={loading}
              >
                Establish Identity
              </Button>
            </motion.div>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Existing operative?{' '}
            <Link to="/login" className="text-[var(--accent-violet)] hover:underline underline-offset-4 transition-all">
              Initialize Authorization
            </Link>
          </p>
          
          <div className="flex items-center gap-3 text-[var(--text-disabled)]">
            <div className="h-px w-8 bg-[var(--border-subtle)]" />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase">Security Level: EAL7+</span>
            <div className="h-px w-8 bg-[var(--border-subtle)]" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default RegisterPage;


