/** Inline SVG icons for the HUD (no emoji, no external files). */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const SpinIcon = () => (
  <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
    <path d="M38 24a14 14 0 1 1-4.1-9.9" {...P} strokeWidth={4.5} />
    <path d="M36 6v9h-9" {...P} strokeWidth={4.5} />
  </svg>
);
export const StopIcon = () => (
  <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
    <rect x="15" y="15" width="18" height="18" rx="3" fill="currentColor" />
  </svg>
);
export const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M12 5v14M5 12h14" {...P} strokeWidth={3} /></svg>
);
export const MinusIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M5 12h14" {...P} strokeWidth={3} /></svg>
);
export const AutoIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6" {...P} />
    <path d="M18 3v4h-4M6 21v-4h4" {...P} />
  </svg>
);
export const TurboIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M13 2 4 14h7l-1 8 9-12h-7z" {...P} /></svg>
);
export const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <circle cx="12" cy="12" r="3.2" {...P} />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" {...P} />
  </svg>
);
export const InfoIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <circle cx="12" cy="12" r="9" {...P} />
    <path d="M12 11v6M12 7.5v.5" {...P} strokeWidth={2.8} />
  </svg>
);
export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M6 6l12 12M18 6 6 18" {...P} strokeWidth={2.8} /></svg>
);
export const SoundIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <path d="M4 9h4l5-4v14l-5-4H4z" {...P} />
    {muted ? <path d="M17 9l5 6M22 9l-5 6" {...P} /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" {...P} />}
  </svg>
);
export const SkipIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path d="M5 5l8 7-8 7zM13 5l8 7-8 7z" fill="currentColor" /></svg>
);
