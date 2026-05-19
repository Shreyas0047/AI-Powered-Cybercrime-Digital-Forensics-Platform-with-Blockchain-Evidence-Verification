import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

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
  const [otp, setOtp] = useState('');
  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validatePassword = (pwd: string): boolean => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(pwd);
  };

  const mapRoleForRegistration = (selectedRole: RegistrationRole) => {
    return selectedRole === 'analyst' ? 'forensic_analyst' : 'admin';
  };

  const handleRoleSelect = (selectedRole: RegistrationRole) => {
    setRole(selectedRole);
    setOtp('');
    setEmailVerificationToken('');
    setError('');
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
    setError('');
    setSuccess('');
    setOtp('');
    setEmailVerificationToken('');

    try {
      const response = await api.post<{ success: boolean; message: string }>('/auth/send-otp', {
        email,
        role,
      });

      if (response.success) {
        setStep('otp');
        setSuccess('OTP sent to your email. Check your inbox.');
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to send OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post<VerifyOtpResponse>('/auth/verify-otp', {
        email,
        otp,
      });

      if (response.success && response.data?.verified && response.data.emailVerificationToken) {
        setEmailVerificationToken(response.data.emailVerificationToken);
        setStep('password');
        setSuccess('Email verified. Set a password to finish creating your account.');
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to verify OTP');
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
    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post<RegisterResponse>('/auth/register', {
        email,
        password,
        role: mapRoleForRegistration(role),
        firstName: email.split('@')[0],
        lastName: 'User',
        emailVerificationToken,
      });

      if (response.success && response.data) {
        localStorage.setItem('token', response.data.tokens.accessToken);
        localStorage.setItem('accessToken', response.data.tokens.accessToken);
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setAuthState({
          user: response.data.user as any,
          token: response.data.tokens.accessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        navigate('/dashboard');
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-xl shadow-cyan-500/30 mb-4"
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">ForensicsAI</h1>
          <p className="text-slate-400 mt-2">Enterprise Cyber Investigation Platform</p>
        </div>

        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-8">
          {step === 'role' && (
            <>
              <h2 className="text-xl font-semibold text-white mb-6">Create Account</h2>
              <div className="space-y-4">
                <button
                  onClick={() => handleRoleSelect('analyst')}
                  className="w-full p-4 border-2 border-slate-800 rounded-xl hover:border-cyan-500 hover:bg-cyan-500/10 transition-all text-left"
                >
                  <div className="font-medium text-white">Analyst</div>
                  <div className="text-sm text-slate-400">Investigate evidence and manage alerts</div>
                </button>
                <button
                  onClick={() => handleRoleSelect('admin')}
                  className="w-full p-4 border-2 border-slate-800 rounded-xl hover:border-violet-500 hover:bg-violet-500/10 transition-all text-left"
                >
                  <div className="font-medium text-white">Administrator</div>
                  <div className="text-sm text-slate-400">Full system access and user management</div>
                </button>
              </div>
            </>
          )}

          {step === 'email' && (
            <>
              <div className="flex items-center mb-6">
                <button onClick={() => setStep('role')} className="text-slate-400 hover:text-white">
                  Back
                </button>
                <h2 className="text-xl font-semibold text-white ml-4">Enter Email</h2>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300">
                  Registering as: <span className="font-medium capitalize">{role}</span>
                </div>
                <Input
                  type="email"
                  label="Email Address"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setOtp('');
                    setEmailVerificationToken('');
                  }}
                  leftIcon={<Mail className="w-5 h-5" />}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  required
                />
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-900/30 border border-emerald-800/50 rounded-lg text-sm text-emerald-400 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {success}
                  </motion.div>
                )}
                <Button onClick={handleSendOTP} className="w-full" loading={loading}>
                  Send OTP
                </Button>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="flex items-center mb-6">
                <button onClick={() => setStep('email')} className="text-slate-400 hover:text-white">
                  Back
                </button>
                <h2 className="text-xl font-semibold text-white ml-4">Verify OTP</h2>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300">
                  OTP sent to: <span className="font-medium">{email}</span>
                </div>
                <Input
                  type="text"
                  label="Enter 6-digit OTP"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  maxLength={6}
                  required
                />
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-900/30 border border-emerald-800/50 rounded-lg text-sm text-emerald-400 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {success}
                  </motion.div>
                )}
                <Button onClick={handleVerifyOTP} className="w-full" loading={loading}>
                  Verify OTP
                </Button>
                <button
                  onClick={handleSendOTP}
                  className="w-full text-sm text-slate-400 hover:text-cyan-400"
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="flex items-center mb-6">
                <button onClick={() => setStep('otp')} className="text-slate-400 hover:text-white">
                  Back
                </button>
                <h2 className="text-xl font-semibold text-white ml-4">Set Password</h2>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-emerald-900/30 border border-emerald-800/50 rounded-lg text-sm text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Email verified
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    placeholder="Min 8 chars, upper, lower, number, special"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-5 h-5" />}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="w-5 h-5" />}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  required
                />
                <div className="text-xs text-slate-400">
                  Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character
                </div>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
                <Button onClick={handleRegister} className="w-full" loading={loading}>
                  Create Account
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300">
            Sign in
          </Link>
        </p>

        <p className="text-center text-sm text-slate-500 mt-6">
          2024 ForensicsAI Platform. Enterprise Edition.
        </p>
      </motion.div>
    </div>
  );
}

export default RegisterPage;
