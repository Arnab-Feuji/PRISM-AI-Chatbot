import React from 'react';

/**
 * PRISM brand mark — medical AI chatbot: prism refraction + clinical pulse + dialogue.
 */
export default function PRISMLogo({ size = 48, className = '', showGlow = false }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {showGlow && (
        <div
          className="absolute inset-0 rounded-2xl bg-[var(--accent)]/25 blur-xl scale-110"
          style={{ width: size, height: size }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
        role="img"
        aria-label="PRISM medical AI assistant"
      >
        <defs>
          <linearGradient id={`${id}-g1`} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent, #EC4899)" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id={`${id}-g2`} x1="20" y1="18" x2="48" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Outer prism frame */}
        <path
          d="M32 4L54 18V46L32 60L10 46V18L32 4Z"
          stroke={`url(#${id}-g1)`}
          strokeWidth="2.2"
          fill="rgba(255,255,255,0.04)"
        />
        <path d="M32 12L46 22V42L32 52L18 42V22L32 12Z" fill={`url(#${id}-g1)`} fillOpacity="0.18" />

        {/* Chat bubble — patient dialogue */}
        <path
          d="M22 26c0-4.4 3.6-8 8-8h4c4.4 0 8 3.6 8 8v6c0 4.4-3.6 8-8 8h-2l-4 4v-4h-2c-4.4 0-8-3.6-8-8v-6z"
          fill={`url(#${id}-g2)`}
          fillOpacity="0.92"
        />

        {/* ECG pulse inside bubble */}
        <path
          d="M26 31h3l2-4 2 8 2-5 2 3h5"
          stroke={`url(#${id}-g1)`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* AI node — retrieval intelligence */}
        <circle cx="46" cy="20" r="3.5" fill={`url(#${id}-g1)`} />
        <circle cx="46" cy="20" r="1.2" fill="#fff" fillOpacity="0.9" />
        <path d="M46 23.5v4M42.5 26.5h7" stroke={`url(#${id}-g1)`} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      </svg>
    </div>
  );
}

export function PRISMBrand({ logoSize = 40, showTagline = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <PRISMLogo size={logoSize} showGlow />
      <div className="text-left min-w-0">
        <div className="text-lg font-black tracking-tight leading-none text-[var(--text-main)]">PRISM</div>
        {showTagline && (
          <div className="text-[9px] font-semibold text-[var(--text-dim)] uppercase tracking-[0.12em] leading-tight mt-0.5 truncate">
            Medical AI · RAG Clinical Assistant
          </div>
        )}
      </div>
    </div>
  );
}
