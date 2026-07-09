"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import emailjs from "@emailjs/browser";
import { 
  X, 
  Send, 
  MessageSquare, 
  Loader2, 
  CheckCircle2, 
  Mail, 
  User, 
  FileText,
  LifeBuoy
} from "lucide-react";
import { toast } from "sonner";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SERVICE_ID = "service_0fipnst";
const TEMPLATE_ID = "template_k6aq2hs";
const PUBLIC_KEY = "paASe-BeBARA5RmC-";

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    setLoading(true);
    try {
      await emailjs.sendForm(
        SERVICE_ID,
        TEMPLATE_ID,
        formRef.current,
        PUBLIC_KEY
      );
      setSent(true);
      toast.success("Message sent successfully!");
      setTimeout(() => {
        onClose();
        setSent(false);
      }, 3000);
    } catch (error) {
      console.error("EmailJS Error:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, y: 20, x: "-50%" }}
            className="fixed left-1/2 bottom-10 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-[95%] max-w-[500px] z-[151] outline-none"
          >
            <div className="bg-[var(--card)] border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
              {/* Header */}
              <div className="bg-gradient-to-r from-[var(--primary)]/20 to-transparent p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20">
                    <LifeBuoy className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Support Center</h2>
                    <p className="text-xs text-[var(--muted-foreground)]">We typically reply within a few hours</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[var(--muted-foreground)] hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-8">
                {sent ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-[var(--primary)]" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                    <p className="text-[var(--muted-foreground)]">Thank you for reaching out. Our team will contact you at your email address shortly.</p>
                  </motion.div>
                ) : (
                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] flex items-center gap-2">
                        <User className="w-3 h-3" /> Full Name
                      </label>
                      <input 
                        required
                        name="from_name"
                        type="text" 
                        placeholder="John Doe"
                        className="w-full bg-[var(--card)] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] flex items-center gap-2">
                        <Mail className="w-3 h-3" /> Email Address
                      </label>
                      <input 
                        required
                        name="reply_to"
                        type="email" 
                        placeholder="john@example.com"
                        className="w-full bg-[var(--card)] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] flex items-center gap-2">
                        <FileText className="w-3 h-3" /> Message
                      </label>
                      <textarea 
                        required
                        name="message"
                        rows={4}
                        placeholder="How can we help you?"
                        className="w-full bg-[var(--card)] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--primary)]/50 transition-colors resize-none"
                      />
                    </div>

                    <button 
                      disabled={loading}
                      type="submit"
                      className="w-full h-12 bg-[var(--primary)] hover:bg-[var(--primary)] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_20px_color-mix(in_srgb,var(--primary)_20%,transparent)] active:scale-95"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Decorative Glow */}
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[var(--primary)]/10 blur-[60px] rounded-full pointer-events-none" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
