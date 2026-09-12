import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "", size = 28 }: LogoProps) {
  return (
    <div
      className={`relative rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-[#d4af37]/50 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Victor Monogram Logo"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <circle cx="16" cy="16" r="16" fill="#FFFFFF" />
        <polygon points="7,10.5 25,10.5 16,26" fill="#08080A" />
      </svg>
    </div>
  );
}
