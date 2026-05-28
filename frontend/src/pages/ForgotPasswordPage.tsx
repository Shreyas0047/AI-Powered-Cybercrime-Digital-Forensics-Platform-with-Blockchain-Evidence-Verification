import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';

type Step = 'email' | 'otp' | 'password' | 'success';

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const clearError = useCallback(() => setError(null), []);

  const startCooldown = () => {
    setCooldown(30);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.forgotPassword(email);
      if (response.success) {
        startCooldown();
        setStep('otp');
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Something went wrong. Please try again.';
      setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    clearError();
    setIsLoading(true);
    try {
      const response = await api.forgotPassword(email);
      if (response.success) {
        startCooldown();
        setError(null);
      } else {
        setError(response.message || 'Failed to resend OTP');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.verifyResetOtp(email, otp);
      if (response.success && response.data?.passwordResetToken) {
        setPasswordResetToken(response.data.passwordResetToken);
        setStep('password');
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Invalid OTP. Please try again.';
      setError(msg || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordResetToken) {
      setError('Session expired. Please start over.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.resetPassword(email, password, confirmPassword, passwordResetToken);
      if (response.success) {
        setStep('success');
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to reset password. Please try again.';
      setError(msg || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const stepVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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
            <Shield className="w-8 h-8 text-slate-900" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900">ForensicsAI</h1>
          <p className="text-slate-500 mt-2">Reset your password</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.div
                key="email"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Forgot Password?</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Enter your registered email address and we'll send you a verification code.
                </p>

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <Input
                    type="email"
                    label="Email Address"
                    placeholder="analyst@forensics.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-5 h-5" />}
                    error={error || undefined}
                    required
                    fullWidth
                  />

                  <Button type="submit" className="w-full" loading={isLoading}>
                    Send Verification Code
                  </Button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                  <Link to="/login" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                  </Link>
                </p>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div
                key="otp"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Verify OTP</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Enter the 6-digit code sent to <span className="text-slate-900 font-medium">{email}</span>
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <Input
                    type="text"
                    label="Verification Code"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    leftIcon={<KeyRound className="w-5 h-5" />}
                    error={error || undefined}
                    maxLength={6}
                    required
                    fullWidth
                  />

                  <Button type="submit" className="w-full" loading={isLoading}>
                    Verify Code
                  </Button>
                </form>

                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || isLoading}
                    className="text-sm text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>

                <p className="text-center text-sm text-slate-500 mt-4">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setError(null); }}
                    className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Change email
                  </button>
                </p>
              </motion.div>
            )}

            {step === 'password' && (
              <motion.div
                key="password"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Set New Password</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Create a new password for your account.
                </p>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      label="New Password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftIcon={<Lock className="w-5 h-5" />}
                      error={error || undefined}
                      required
                      fullWidth
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-9 text-slate-500 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      label="Confirm Password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={<Lock className="w-5 h-5" />}
                      required
                      fullWidth
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-9 text-slate-500 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">
                    Password must be at least 8 characters with uppercase, lowercase, a number, and a special character.
                  </p>

                  <Button type="submit" className="w-full" loading={isLoading}>
                    Reset Password
                  </Button>
                </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-4"
                >
                  <CheckCircle className="w-8 h-8" />
                </motion.div>

                <h2 className="text-xl font-semibold text-slate-900 mb-2">Password Reset!</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>

                <Button className="w-full" onClick={handleBackToLogin}>
                  Back to Login
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300">
            Back to Login
          </Link>
        </p>

        <p className="text-center text-sm text-slate-500 mt-6">
          &copy; 2024 ForensicsAI Platform. Enterprise Edition.
        </p>
      </motion.div>
    </div>
  );
}

export default ForgotPasswordPage;

