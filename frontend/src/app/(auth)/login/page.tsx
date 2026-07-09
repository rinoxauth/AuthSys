'use client';
import { useState, ChangeEvent, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-base-url';
import { toast } from 'sonner';
import Link from 'next/link';
import Turnstile from '@/components/Turnstile';
import { motion } from 'framer-motion';

function LoginBanner() {
  const searchParams = useSearchParams();
  const [banner, setBanner] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setBanner({ type: 'success', message: 'Account created successfully! Please sign in.' });
      const url = new URL(window.location.href);
      url.searchParams.delete('registered');
      window.history.replaceState({}, '', url.toString());
    } else if (searchParams.get('exists') === 'true') {
      setBanner({ type: 'info', message: 'Account already exists. Please sign in.' });
      const url = new URL(window.location.href);
      url.searchParams.delete('exists');
      window.history.replaceState({}, '', url.toString());
    }
    const t = setTimeout(() => setShowBanner(false), 6000);
    return () => clearTimeout(t);
  }, [searchParams]);

  if (!banner || !showBanner) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
        banner.type === 'success'
          ? 'bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]'
          : 'bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#7C3AED]'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">
        {banner.type === 'success' ? 'check_circle' : 'info'}
      </span>
      {banner.message}
    </motion.div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      router.push('/dashboard');
    }
  }, [token, router]);

  const [authMode, setAuthMode] = useState<'standard' | 'license'>('standard');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    licenseKey: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);

      const formBody = new FormData();
      if (authMode === 'standard') {
        formBody.append('username', formData.username);
        formBody.append('password', formData.password);
      } else {
        formBody.append('license_key', formData.licenseKey);
      }
      if (turnstileToken) formBody.append('turnstile_token', turnstileToken as string);
      formBody.append('remember_me', rememberMe ? 'true' : 'false');

      const endpoint = authMode === 'license' ? '/developer/auth/login-license' : '/developer/auth/login';
      const res = await api.post(endpoint, formBody);
      const accessToken = res.data.access_token as string;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
      }
      const { setToken, setUser } = useAuthStore.getState();
      setToken(accessToken);
      const userRes = await api.get('/developer/auth/me');
      setUser(userRes.data);
      setIsSuccess(true);
      toast.success('Logged in successfully');
      router.replace('/dashboard');
    } catch (err: any) {
      setHasError(true);
      setTimeout(() => setHasError(false), 400);
      setIsSubmitting(false);
      toast.error(err.response?.data?.detail || 'Invalid credentials');
    }
  };

  const handleSocialSignIn = (provider: string) => {
    const baseUrl = getApiBaseUrl().replace('/api/v1', '');
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

  const [showPassword, setShowPassword] = useState(false);

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
            <p className="text-lg text-[#A1A1AA] leading-relaxed">Advanced authentication system with license key support and real-time threat detection.</p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3 pt-4">
            {[
              { icon: 'shield', label: 'Secure Authentication' },
              { icon: 'key', label: 'License Key Support' },
              { icon: 'security', label: 'Real-time Protection' },
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

      {/* Right Side - Login Form */}
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
              <h1 className="text-2xl font-bold text-[#FAFAFA]">Welcome back</h1>
              <p className="text-sm text-[#A1A1AA]">Sign in to your AuthSys account</p>
            </motion.div>

            {/* Auth Mode Tabs */}
            <motion.div variants={itemVariants} className="flex gap-2 p-1 bg-[#18181C] rounded-lg border border-[#27272F]">
              <button
                onClick={() => { setAuthMode('standard'); setFormData({ ...formData, licenseKey: '' }); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  authMode === 'standard'
                    ? 'bg-[#7C3AED] text-[#FAFAFA]'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => { setAuthMode('license'); setFormData({ ...formData, username: '', password: '' }); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  authMode === 'license'
                    ? 'bg-[#7C3AED] text-[#FAFAFA]'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                License Key
              </button>
            </motion.div>

            <Suspense fallback={null}>
              <LoginBanner />
            </Suspense>

            {/* Form */}
            <motion.form
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              onSubmit={handleSubmit}
              className={`space-y-4 transition-all duration-300 ${hasError ? 'animate-[shake_0.4s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}
            >
              {authMode === 'standard' ? (
                <>
                  {/* Username/Email */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Email or Username</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[20px] group-focus-within:text-[#7C3AED] transition-colors">person</span>
                      <input
                        name="username"
                        type="text"
                        placeholder="name@example.com"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full h-11 bg-[#18181C] border border-[#27272F] rounded-lg pl-10 pr-4 text-sm text-[#FAFAFA] placeholder:text-[#707888] focus:border-[#7C3AED] focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </motion.div>

                  {/* Password */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Password</label>
                      <Link href="/forgot-password" className="text-xs font-medium text-[#7C3AED] hover:text-[#8B5CF6] transition-colors">
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[20px] group-focus-within:text-[#7C3AED] transition-colors">lock</span>
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
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
                </>
              ) : (
                /* License Key Input */
                <motion.div variants={itemVariants} className="space-y-2">
                  <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">License Key</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[20px] group-focus-within:text-[#7C3AED] transition-colors">card_giftcard</span>
                    <input
                      name="licenseKey"
                      type="text"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      value={formData.licenseKey}
                      onChange={handleInputChange}
                      className="w-full h-11 bg-[#18181C] border border-[#27272F] rounded-lg pl-10 pr-4 text-sm text-[#FAFAFA] placeholder:text-[#707888] focus:border-[#7C3AED] focus:outline-none transition-colors font-mono"
                      required
                    />
                  </div>
                </motion.div>
              )}

              {/* Remember Me */}
              <motion.div variants={itemVariants} className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#18181C] border border-[#27272F] text-[#7C3AED] cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-[#A1A1AA] cursor-pointer">
                  Keep me signed in
                </label>
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
                    <><span className="material-symbols-outlined">check_circle</span> Success</>
                  ) : isSubmitting ? (
                    <><span className="material-symbols-outlined animate-spin">sync</span> Signing in...</>
                  ) : (
                    <>Sign in <span className="material-symbols-outlined">arrow_forward</span></>
                  )}
                </button>
              </motion.div>

              {authMode === 'standard' && (
                <>
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
                </>
              )}
            </motion.form>

            {/* Sign Up Link */}
            <motion.div variants={itemVariants} className="text-center pt-2">
              <p className="text-sm text-[#A1A1AA]">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-[#7C3AED] hover:text-[#8B5CF6] font-medium transition-colors">
                  Sign up
                </Link>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
