// atoms.jsx — Eudaimonia shared brand atoms.
// Tokens come from colors_and_type.css. Components use inline styles to keep
// each screen self-contained inside its artboard.

function PhiMark({ size = 22, color = 'var(--color-ink)' }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 22 22" fill="none" aria-label="Eudaimonia">
      <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1" />
      <line x1="11" y1="3.5" x2="11" y2="18.5" stroke={color} strokeWidth="1" />
      <ellipse cx="11" cy="11" rx="4.2" ry="3.2" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  );
}

function Wordmark({ size = 16, color = 'var(--color-ink)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
      <PhiMark size={size + 6} color={color} />
      <span style={{
        fontSize: size,
        fontWeight: 300,
        letterSpacing: '-0.2px',
        fontFeatureSettings: '"ss01"',
        color,
      }}>Eudaimonia</span>
    </div>
  );
}

function EyebrowLabel({ children, color = 'var(--color-ink-mute)' }) {
  return (
    <div style={{
      textTransform: 'uppercase',
      fontSize: 10,
      letterSpacing: '0.12em',
      fontWeight: 400,
      color,
      fontFeatureSettings: '"ss01"',
    }}>{children}</div>
  );
}

function Mono({ children, size = 13, color = 'var(--color-ink)' }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: size,
      fontWeight: 400,
      color,
      letterSpacing: '-0.2px',
      fontFeatureSettings: '"tnum","ss01"',
    }}>{children}</span>
  );
}

function Num({ children, size = 14, weight = 400, color = 'var(--color-ink)', track = '-0.42px' }) {
  return (
    <span style={{
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing: track,
      fontFeatureSettings: '"tnum","ss01"',
    }}>{children}</span>
  );
}

function PillButton({ children, variant = 'primary', size = 'md', icon, onClick, style }) {
  const palettes = {
    primary: { bg: 'var(--color-iris)', fg: 'var(--color-on-primary)', border: 'transparent' },
    dark:    { bg: 'var(--color-ink)', fg: 'var(--color-on-primary)', border: 'transparent' },
    ghost:   { bg: 'var(--color-canvas)', fg: 'var(--color-ink)', border: 'var(--color-hairline)' },
    outline: { bg: 'var(--color-canvas)', fg: 'var(--color-iris)', border: 'var(--color-iris)' },
  };
  const p = palettes[variant];
  const pad = size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 22px' : '10px 18px';
  const fs = size === 'sm' ? 13 : size === 'lg' ? 15 : 14;
  return (
    <button
      onClick={onClick}
      style={{
        appearance: 'none',
        background: p.bg,
        color: p.fg,
        border: `1px solid ${p.border}`,
        fontSize: fs,
        fontWeight: 400,
        fontFamily: 'inherit',
        letterSpacing: '-0.1px',
        padding: pad,
        borderRadius: 9999,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all .15s',
        ...style,
      }}>
      {children}
      {icon}
    </button>
  );
}

function ArrowRight({ size = 10, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function CopyChip({ value, label = 'Copy' }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = () => {
    try { navigator.clipboard.writeText(value); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={onCopy}
      style={{
        appearance: 'none',
        border: '1px solid var(--color-hairline)',
        background: 'var(--color-canvas)',
        color: 'var(--color-ink)',
        fontSize: 12,
        fontWeight: 400,
        fontFamily: 'inherit',
        letterSpacing: '-0.1px',
        padding: '4px 10px',
        borderRadius: 9999,
        cursor: 'pointer',
        transition: 'all .15s',
      }}>
      {copied ? 'Copied' : label}
    </button>
  );
}

function VerifyLink({ label = 'Verify on BaseScan', disabled = false }) {
  return (
    <a href="#" onClick={(e) => e.preventDefault()} style={{
      color: disabled ? 'var(--color-ink-mute)' : 'var(--color-iris)',
      fontSize: 12,
      fontWeight: 400,
      textDecoration: 'none',
      letterSpacing: '-0.1px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      opacity: disabled ? 0.5 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}>
      {label}
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path d="M2 7L7 2M7 2H3.2M7 2V5.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </a>
  );
}

function BaseMark({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 9999,
      background: '#0052ff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{ width: size * 0.42, height: size * 0.42, borderRadius: 9999, background: '#fff' }} />
    </div>
  );
}

// Gradient mesh — atmospheric backdrop, top-third of marketing surfaces.
function GradientMesh({ height = 520, opacity = 1 }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute',
      inset: '-200px -200px auto -200px',
      height,
      background: 'radial-gradient(60% 80% at 20% 30%, rgba(245,233,212,0.55), transparent 60%), radial-gradient(50% 70% at 80% 20%, rgba(249,107,238,0.10), transparent 60%), radial-gradient(60% 80% at 60% 40%, rgba(83,58,253,0.10), transparent 65%)',
      filter: 'blur(40px)',
      pointerEvents: 'none',
      zIndex: 0,
      opacity,
    }} />
  );
}

// Charity logo placeholder — gradient square with initials.
function CharityAvatar({ initials = 'BW', size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size <= 32 ? 9999 : 12,
      background: 'linear-gradient(135deg, #1c1e54 0%, #533afd 100%)',
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size <= 32 ? 11 : size * 0.32,
      fontWeight: 400, letterSpacing: '0.05em',
      flexShrink: 0,
    }}>{initials}</div>
  );
}

Object.assign(window, {
  PhiMark, Wordmark, EyebrowLabel, Mono, Num,
  PillButton, ArrowRight, CopyChip, VerifyLink,
  BaseMark, GradientMesh, CharityAvatar,
});
