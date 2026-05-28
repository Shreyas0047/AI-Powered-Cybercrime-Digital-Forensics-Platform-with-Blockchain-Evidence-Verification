import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      const result = await login({ email: email.trim().toLowerCase(), password });
      if (!result) {
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('[LoginPage] Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4 relative overflow-hidden grain-overlay">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="mesh-orb mesh-orb-amber w-[600px] h-[600px] -top-[300px] -right-[200px]" />
        <div className="mesh-orb mesh-orb-violet w-[500px] h-[500px] -bottom-[250px] -left-[150px]" />
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
            className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-gradient-to-br from-[var(--accent-amber)] to-[var(--accent-rose)] shadow-2xl shadow-amber-500/20 mb-6 group"
          >
            <Shield className="w-10 h-10 text-[var(--surface-base)] transition-transform duration-500 group-hover:scale-110" />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight font-display text-[var(--text-primary)]">
            ForensicsAI
          </h1>
          <p className="overline mt-3">Enterprise Cyber Investigation Platform</p>
        </div>

        <div className="surface-elevated p-10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent-amber)] to-transparent opacity-50" />
          
          <h2 className="text-2xl font-semibold font-display text-[var(--text-primary)] mb-8">Welcome Back</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] ml-1">Email Identity</label>
              <Input
                type="email"
                placeholder="operator@forensics.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-5 h-5 text-[var(--text-tertiary)]" />}
                className="bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-primary)] h-12 rounded-xl focus:border-[var(--accent-amber)] transition-all"
                required
              />
            </div>

            <div className="space-y-1 relative">
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] ml-1">Access Key</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-5 h-5 text-[var(--text-tertiary)]" />}
                  className="bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-primary)] h-12 rounded-xl focus:border-[var(--accent-amber)] transition-all"
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

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-mono text-[var(--text-tertiary)] hover:text-[var(--accent-amber)] transition-colors uppercase tracking-wider"
              >
                Reset Access
              </Link>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-[var(--text-primary)] text-[var(--surface-base)] hover:bg-[var(--accent-amber)] hover:text-[var(--surface-base)] font-bold rounded-xl transition-all duration-300 shadow-lg shadow-black/20"
              loading={isLoading}
            >
              Authorize Session
            </Button>
          </form>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            New operative?{' '}
            <Link to="/register" className="text-[var(--accent-amber)] hover:underline underline-offset-4 transition-all">
              Request Credentials
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

export default LoginPage;

