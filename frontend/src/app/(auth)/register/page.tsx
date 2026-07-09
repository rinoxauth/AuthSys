'use client';
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-base-url';
import { toast } from 'sonner';
import Link from 'next/link';
import Turnstile from '@/components/Turnstile';

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

  return (
    <div className={`w-full max-w-[400px] bg-[var(--card)] rounded-xl border border-white/5 p-8 flex flex-col gap-8 shadow-2xl transition-all duration-300 ${hasError ? 'animate-[shake_0.4s_cubic-bezier(.36,.07,.19,.97)_both] !border-[#ef4444] !shadow-[0_0_12px_rgba(239,68,68,0.2)]' : ''} ${isSuccess ? '!border-[#10b981] !shadow-[0_0_12px_rgba(16,185,129,0.3)]' : ''}`}>
      {/* Tab Switcher */}
      <div className="flex p-1 bg-[var(--background)] rounded-full border border-white/5 relative">
        <div className="absolute top-1 bottom-1 right-1 w-[calc(50%-4px)] bg-[var(--card)] rounded-full transition-all duration-300 ease-in-out" style={{ transform: 'translateX(0%)' }}></div>
        <Link href="/login" className="relative flex-1 py-2 text-[13.5px] font-medium leading-[1] text-center text-[#a1a1aa] z-10 transition-colors">Sign in</Link>
        <Link href="/register" className="relative flex-1 py-2 text-[13.5px] font-medium leading-[1] text-center text-[#ffffff] z-10 transition-colors">Sign up</Link>
      </div>

      {/* Header Section */}
      <header className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 bg-[var(--card)] border-[0.5px] border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
          <svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12C4 7.58172 7.58172 4 12 4M12 4C16.4183 4 20 7.58172 20 12M12 4V20M4 12C4 16.4183 7.58172 20 12 20M12 20C16.4183 20 20 16.4183 20 12" stroke="var(--primary)" strokeLinecap="round" strokeWidth="2"></path>
            <circle cx="12" cy="12" fill="var(--primary)" r="2"></circle>
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-[#ffffff]">Create Account</h1>
          <p className="text-[13.5px] font-normal leading-[20px] text-[#a1a1aa]">Join AuthSys today</p>
        </div>
      </header>

      {/* Sign Up Form Content */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-2">
          <label className="text-[10.5px] font-medium leading-[16px] tracking-[0.07em] text-[#a1a1aa] uppercase">Email</label>
          <div className="relative group rounded-lg border border-white/5 bg-[var(--card)] transition-all duration-200 focus-within:border-[var(--primary)] focus-within:shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_13%,transparent)]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-[20px] group-focus-within:text-[var(--primary)] transition-colors">mail</span>
            <input 
              id="email"
              type="email" 
              placeholder="name@example.com"
              className="w-full h-[42px] bg-transparent border-none pl-10 pr-4 text-[13.5px] focus:ring-0 text-[#ffffff] placeholder:text-[#3f3f46] outline-none"
              value={formData.email}
              onChange={(e) => handleInputChange(e, 'email')}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10.5px] font-medium leading-[16px] tracking-[0.07em] text-[#a1a1aa] uppercase">Username</label>
          <div className="relative group rounded-lg border border-white/5 bg-[var(--card)] transition-all duration-200 focus-within:border-[var(--primary)] focus-within:shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_13%,transparent)]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-[20px] group-focus-within:text-[var(--primary)] transition-colors">person</span>
            <input 
              id="username"
              type="text" 
              placeholder="johndoe"
              className="w-full h-[42px] bg-transparent border-none pl-10 pr-4 text-[13.5px] focus:ring-0 text-[#ffffff] placeholder:text-[#3f3f46] outline-none"
              value={formData.username}
              onChange={(e) => handleInputChange(e, 'username')}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10.5px] font-medium leading-[16px] tracking-[0.07em] text-[#a1a1aa] uppercase">Password</label>
          <div className="relative group rounded-lg border border-white/5 bg-[var(--card)] transition-all duration-200 focus-within:border-[var(--primary)] focus-within:shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_13%,transparent)]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-[20px] group-focus-within:text-[var(--primary)] transition-colors">lock</span>
            <input 
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full h-[42px] bg-transparent border-none pl-10 pr-12 text-[13.5px] focus:ring-0 text-[#ffffff] placeholder:text-[#3f3f46] outline-none"
              value={formData.password}
              onChange={(e) => handleInputChange(e, 'password')}
              required
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#ffffff] transition-colors flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10.5px] font-medium leading-[16px] tracking-[0.07em] text-[#a1a1aa] uppercase">Confirm Password</label>
          <div className="relative group rounded-lg border border-white/5 bg-[var(--card)] transition-all duration-200 focus-within:border-[var(--primary)] focus-within:shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_13%,transparent)]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-[20px] group-focus-within:text-[var(--primary)] transition-colors">lock_clock</span>
            <input 
              id="confirm_password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full h-[42px] bg-transparent border-none pl-10 pr-12 text-[13.5px] focus:ring-0 text-[#ffffff] placeholder:text-[#3f3f46] outline-none"
              value={formData.confirm_password}
              onChange={(e) => handleInputChange(e, 'confirm_password')}
              required
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#ffffff] transition-colors flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <div className="py-1">
          <Turnstile onVerify={(token) => setTurnstileToken(token)} />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || isSuccess}
          className={`w-full h-[42px] text-[13.5px] font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]
            ${isSuccess 
              ? 'bg-[#10b981] text-[#064e3b]' 
              : 'bg-[var(--primary)] hover:bg-[var(--primary)] text-black shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_20%,transparent)] hover:shadow-[0_6px_16px_color-mix(in_srgb,var(--primary)_30%,transparent)]'
            }`}
        >
          {isSuccess ? (
            <><span className="material-symbols-outlined text-[20px]">check_circle</span> Registered</>
          ) : isSubmitting ? (
            <><span className="material-symbols-outlined text-[20px] animate-spin">sync</span> Validating...</>
          ) : (
            <>Create Account <span className="material-symbols-outlined text-[20px]">person_add</span></>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="h-[1px] flex-grow bg-white/5"></div>
          <span className="text-[10.5px] font-medium leading-[16px] tracking-[0.07em] text-[#a1a1aa] uppercase whitespace-nowrap">OR CONTINUE WITH</span>
          <div className="h-[1px] flex-grow bg-white/5"></div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <button onClick={() => handleSocialSignIn('google')} type="button" className="h-[42px] bg-[var(--card)] border border-white/5 hover:border-white/20 rounded-lg flex items-center justify-center transition-all group">
            <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          </button>
          <button onClick={() => handleSocialSignIn('discord')} type="button" className="h-[42px] bg-[var(--card)] border border-white/5 hover:border-white/20 rounded-lg flex items-center justify-center transition-all group">
            <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" fill="#5865F2" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.078.078 0 0 0 .084-.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.086 2.157 2.419c0 1.334-.947 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.086 2.157 2.419c0 1.334-.946 2.419-2.157 2.419z"/></svg>
          </button>
          <button onClick={() => handleSocialSignIn('azure')} type="button" className="h-[42px] bg-[var(--card)] border border-white/5 hover:border-white/20 rounded-lg flex items-center justify-center transition-all group">
            <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>
          </button>
          <button onClick={() => handleSocialSignIn('github')} type="button" className="h-[42px] bg-[var(--card)] border border-white/5 hover:border-white/20 rounded-lg flex items-center justify-center transition-all group">
            <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" fill="#FFFFFF" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489c.5.092.682-.217.682-.482c0-.237-.008-.866-.013-1.7c-2.782.603-3.369-1.341-3.369-1.341c-.454-1.152-1.11-1.459-1.11-1.459c-.908-.62.069-.608.069-.608c1.003.07 1.531 1.03 1.531 1.03c.892 1.529 2.341 1.087 2.91.832c.092-.647.35-1.088.636-1.338c-2.22-.253-4.555-1.11-4.555-4.943c0-1.091.39-1.984 1.029-2.683c-.103-.253-.446-1.27.098-2.647c0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025c.546 1.377.203 2.394.1 2.647c.64.699 1.028 1.592 1.028 2.683c0 3.842-2.339 4.687-4.566 4.935c.359.309.678.92.678 1.855c0 1.338-.012 2.419-.012 2.747c0 .268.18.58.688.482C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
          </button>
        </div>
      </form>
    </div>
  );
}