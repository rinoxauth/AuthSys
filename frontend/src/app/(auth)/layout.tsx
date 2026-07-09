'use client';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] selection:bg-[#7C3AED]/30 font-sans overflow-hidden">
      <style jsx global>{`
        @keyframes shake { 
          10%, 90% { transform: translate3d(-1px, 0, 0); } 
          20%, 80% { transform: translate3d(2px, 0, 0); } 
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 
          40%, 60% { transform: translate3d(4px, 0, 0); } 
        }
      `}</style>
      {children}
    </div>
  );
}
