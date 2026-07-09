'use client';
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-base-url';
import { toast } from 'sonner';
import Link from 'next/link';
import Turnstile from '@/components/Turnstile';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      router.push('/dashboard');
    }
  }, [token, router]);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirm_password: '',
  });

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    name: keyof typeof formData
  ) => {
    const value = event.target.value;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      setHasError(true);
      setTimeout(() => setHasError(false), 400);
      return;
    }

    try {
      setIsSubmitting(true);

      if (!turnstileToken) {
        toast.error('Please complete the security check');
        setHasError(true);
        setTimeout(() => setHasError(false), 400);
        setIsSubmitting(false);
        return;
      }
      await api.post('/developer/auth/register', {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        turnstile_token: turnstileToken,
      });

      setIsSuccess(true);
      toast.success('Account created! Check your email for verification.');
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 1500);
    } catch (err: any) {
      setHasError(true);
      setTimeout(() => setHasError(false), 400);
      setIsSubmitting(false);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string' && detail.toLowerCase().includes('already registered')) {
        toast.info('Account already exists! Redirecting to sign in...');
        setTimeout(() => {
          router.push('/login?exists=true');
        }, 1000);
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || 'Registration failed');
      } else {
        toast.error(err.message || 'Registration failed');
      }
    }
  };

  const handleSocialSignIn = (provider: string) => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const providers: Record<string, string> = {
      google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&state=google`,
      github: `https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=user:email&state=github`,
      discord: `https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email&state=discord`,
      azure: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'common'}/oauth2/v2.0/authorize?client_id=${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&state=azure`,
    };
    const url = providers[provider];
    if (url) window.location.href = url;
    else toast.error('Social login is not configured yet.');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-screen">
      {/* Left Side - Visual Identity */}
      <motion.div 
        className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-[#7C3AED]/10 via-[#09090B] to-[#09090B] relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#7C3AED]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 text-center space-y-8">
          {/* Logo */}
          <motion.div 
            className="flex justify-center"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] flex items-center justify-center shadow-2xl shadow-[#7C3AED]/20">
              <span className="text-5xl font-bold text-white">λ</span>
            </div>
          </motion.div>

          {/* Text */}
          <div className="space-y-4 max-w-sm">
            <h2 className="text-4xl font-bold text-white tracking-tight">RinoxAuth</h2>
            <p className="text-lg text-[#A1A1AA] leading-relaxed">Join our security-first authentication platform and get access to advanced features.</p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3 pt-4">
            {[
              { icon: 'check', label: 'Instant Setup' },
              { icon: 'bolt', label: 'Ultra Fast' },
              { icon: 'lock', label: 'Secure' },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                className="flex items-center gap-3 text-[#A1A1AA]"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <span className="material-symbols-outlined text-[#7C3AED]">{feature.icon}</span>
                <span>{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right Side - Register Form */}
      <motion.div
        className="flex items-center justify-center p-6 lg:p-12 bg-[#09090B]"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-full max-w-md">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-2xl font-bold text-[#FAFAFA]">Create account</h1>
              <p className="text-sm text-[#A1A1AA]">Join AuthSys and start securing your applications</p>
            </motion.div>

            <Suspense fallback={null}>
              {/* Success Banner - if needed */}
            </Suspense>

            {/* Form */}
            <motion.form
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              onSubmit={handleSubmit}
              className={`space-y-4 transition-all duration-300 ${hasError ? 'animate-[shake_0.4s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}
            >
              {/* Email */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Email</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[20px] group-focus-within:text-[#7C3AED] transition-colors">mail</span>
                  <input
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange(e, 'email')}
                    className="w-full h-11 bg-[#18181C] border border-[#27272F] rounded-lg pl-10 pr-4 text-sm text-[#FAFAFA] placeholder:text-[#707888] focus:border-[#7C3AED] focus:outline-none transition-colors"
                    required
                  />
                </div>
              </motion.div>

              {/* Username */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Username</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[20px] group-focus-within:text-[#7C3AED] transition-colors">person</span>
                  <input
                    name="username"
                    type="text"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e) => handleInputChange(e, 'username')}
                    className="w-full h-11 bg-[#18181C] border border-[#27272F] rounded-lg pl-10 pr-4 text-sm text-[#FAFAFA] placeholder:text-[#707888] focus:border-[#7C3AED] focus:outline-none transition-colors"
                    required
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[20px] group-focus-within:text-[#7C3AED] transition-colors">lock</span>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange(e, 'password')}
                    className="w-full h-11 bg-[#18181C] border border-[#27272F] rounded-lg pl-10 pr-12 text-sm text-[#FAFAFA] placeholder:text-[#707888] focus:border-[#7C3AED] focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </motion.div>

              {/* Confirm Password */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Confirm Password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[20px] group-focus-within:text-[#7C3AED] transition-colors">verified_user</span>
                  <input
                    name="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirm_password}
                    onChange={(e) => handleInputChange(e, 'confirm_password')}
                    className="w-full h-11 bg-[#18181C] border border-[#27272F] rounded-lg pl-10 pr-12 text-sm text-[#FAFAFA] placeholder:text-[#707888] focus:border-[#7C3AED] focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </motion.div>

              {/* Turnstile */}
              <motion.div variants={itemVariants}>
                <Turnstile onVerify={(token) => setTurnstileToken(token)} />
              </motion.div>

              {/* Submit Button */}
              <motion.div variants={itemVariants}>
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className={`w-full h-11 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                    isSuccess
                      ? 'bg-[#22C55E] text-[#09090B]'
                      : 'bg-[#7C3AED] hover:bg-[#8B5CF6] text-[#FAFAFA] shadow-lg shadow-[#7C3AED]/20 hover:shadow-[#7C3AED]/40 active:scale-95'
                  }`}
                >
                  {isSuccess ? (
                    <><span className="material-symbols-outlined">check_circle</span> Account Created</>
                  ) : isSubmitting ? (
                    <><span className="material-symbols-outlined animate-spin">sync</span> Creating account...</>
                  ) : (
                    <>Create Account <span className="material-symbols-outlined">arrow_forward</span></>
                  )}
                </button>
              </motion.div>

              {/* Divider */}
              <motion.div variants={itemVariants} className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#27272F]"></div>
                <span className="text-xs font-medium text-[#707888] uppercase">Or continue with</span>
                <div className="h-px flex-1 bg-[#27272F]"></div>
              </motion.div>

              {/* Social Buttons */}
              <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2">
                {[
                  { provider: 'google', icon: 'g' },
                  { provider: 'github', icon: '⚙' },
                  { provider: 'discord', icon: '◇' },
                  { provider: 'azure', icon: '■' },
                ].map(({ provider, icon }) => (
                  <button
                    key={provider}
                    onClick={() => handleSocialSignIn(provider)}
                    type="button"
                    className="h-11 bg-[#18181C] hover:bg-[#27272F] border border-[#27272F] hover:border-[#7C3AED]/30 rounded-lg flex items-center justify-center transition-all"
                  >
                    <span className="text-sm font-semibold text-[#FAFAFA]">{icon}</span>
                  </button>
                ))}
              </motion.div>
            </motion.form>

            {/* Sign In Link */}
            <motion.div variants={itemVariants} className="text-center pt-2">
              <p className="text-sm text-[#A1A1AA]">
                Already have an account?{' '}
                <Link href="/login" className="text-[#7C3AED] hover:text-[#8B5CF6] font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

import { Suspense } from 'react';
