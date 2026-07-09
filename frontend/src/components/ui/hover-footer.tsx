"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const TextHoverEffect = ({
  text,
  duration = 0,
  className,
}: {
  text: string;
  duration?: number;
  automatic?: boolean;
  className?: string;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={cn("select-none uppercase cursor-pointer", className)}
    >
      <defs>
        <linearGradient
          id="textGradient"
          gradientUnits="userSpaceOnUse"
          cx="50%"
          cy="50%"
          r="25%"
        >
          {hovered && (
            <>
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="20%" stopColor="#ef4444" />
              <stop offset="40%" stopColor="#8b5cf6" />
              <stop offset="60%" stopColor="#06b6d4" />
              <stop offset="80%" stopColor="#10b981" />
              <stop offset="100%" stopColor="var(--primary)" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="revealMask"
          gradientUnits="userSpaceOnUse"
          r="22%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>

        <filter id="glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feComposite in="blur" in2="SourceGraphic" operator="over" />
        </filter>

        <mask id="textMask">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)" />
        </mask>
      </defs>

      {/* Outline layer (fades in on hover) */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.25"
        className="fill-transparent stroke-neutral-300/40 font-[helvetica] text-7xl font-bold dark:stroke-neutral-600/50"
        style={{
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {text}
      </text>

      {/* Animated draw-on stroke */}
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.25"
        className="fill-transparent font-[helvetica] text-7xl font-bold"
        style={{ stroke: 'var(--primary)' }}
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000, opacity: 0.6 }}
        animate={{ strokeDashoffset: 0, strokeDasharray: 1000, opacity: 0.9 }}
        transition={{ duration: 4, ease: "easeInOut" }}
      >
        {text}
      </motion.text>

      {/* Color reveal layer (follows cursor) */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="url(#textGradient)"
        strokeWidth="0.25"
        mask="url(#textMask)"
        className="fill-transparent font-[helvetica] text-7xl font-bold"
        filter={hovered ? "url(#glow)" : undefined}
      >
        {text}
      </text>
    </svg>
  );
};

export const FooterBackgroundGradient = () => {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        background: [
          "radial-gradient(ellipse 80% 60% at 50% 100%, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 60%)",
          "radial-gradient(ellipse 100% 80% at 50% 120%, color-mix(in srgb, var(--primary) 6%, transparent) 0%, transparent 50%)",
        ].join(", "),
      }}
    />
  );
};