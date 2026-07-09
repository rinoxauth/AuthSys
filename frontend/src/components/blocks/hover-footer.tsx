"use client";
import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Shield,
  MessageCircle,
  Share2,
} from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "@/components/ui/hover-footer";

export function HoverFooter({ email, phone, address, paragraph, onSupportOpen }: any) {
  // Footer link data
  const footerLinks = [
    {
      title: "Products",
      links: [
        { label: "License Manager", href: "#" },
        { label: "HWID Locking", href: "#" },
        { label: "AI Agent", href: "#" },
        { label: "Analytics", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "SDK Downloads", href: "/sdks" },
        { label: "API Reference", href: "#" },
        {
          label: "Live Chat",
          href: "/contact",
          pulse: true,
        },
      ],
    },
  ];

  // Contact info data
  const contactInfo = [
    {
      icon: <Mail size={18} className="text-[var(--primary)]" />,
      text: email || "rinoxauth@gmail.com",
      href: email ? `mailto:${email}` : "mailto:support@authsys.com",
    },
    {
      icon: <Phone size={18} className="text-[var(--primary)]" />,
      text: phone || "+880 1917 797839",
      href: phone ? `tel:${phone.replace(/\D/g, '')}` : "tel:+18001234567",
    },
    {
      icon: <MapPin size={18} className="text-[var(--primary)]" />,
      text: address || "Address: Khulna, Bangladesh",
    },
  ];

  // Social media icons
  const socialLinks = [
    { icon: <MessageCircle size={20} />, label: "Discord", href: "#" },
    { icon: <Share2 size={20} />, label: "Community", href: "#" },
    { icon: <Globe size={20} />, label: "Website", href: "#" },
  ];

  return (
    <footer className="relative mt-20 border-t border-white/10 bg-[var(--background)] overflow-hidden">
      {/* Top highlight glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-[var(--primary)]/50 to-transparent shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_50%,transparent)]" />
      
      <div className="max-w-7xl mx-auto px-8 py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand section */}
          <div className="flex flex-col space-y-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-[var(--primary)]" />
              <span className="text-white text-xl font-bold tracking-tight">AuthSys</span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-[240px]">
              {paragraph || "The modern standard for software authentication, license management, and AI-powered threat protection."}
            </p>
            <div className="flex space-x-4">
              {socialLinks.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="w-8 h-8 rounded-full bg-[var(--card)] border border-white/10 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)]/50 transition-all"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-[var(--foreground)] text-sm font-bold uppercase tracking-widest mb-6">
                {section.title}
              </h4>
              <ul className="space-y-4">
                {section.links.map((link: any) => (
                  <li key={link.label} className="flex items-center gap-2">
                    <a
                      href={link.href}
                      onClick={(e) => {
                        if (link.onClick) {
                          e.preventDefault();
                          link.onClick();
                        }
                      }}
                      className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                    >
                      {link.label}
                    </a>
                    {link.pulse && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse shadow-[0_0_8px_#34d399]"></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 className="text-[var(--foreground)] text-sm font-bold uppercase tracking-widest mb-6">
              Contact
            </h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-sm text-[var(--muted-foreground)]">
                  <span className="opacity-70 text-[var(--primary)]">{item.icon}</span>
                  {item.href ? (
                    <a href={item.href} className="hover:text-[var(--primary)] transition-colors">{item.text}</a>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[var(--muted-foreground)]">
            &copy; {new Date().getFullYear()} AuthSys. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Privacy Policy</a>
            <a href="/terms" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Terms of Service</a>
            <a href="/cookies" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Cookie Policy</a>
          </div>
        </div>
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}
