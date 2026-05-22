// landing.jsx — Eudaimonia public landing (/)
// Stripe-derived system per DESIGN.md. Museum-wall voice per PRODUCT.md.
// Reuses the φ wordmark + atomic primitives established on the receipt page.

const CAUSES = [
{
  id: 'pcrf',
  tag: 'Urgent · Gaza',
  name: "Palestine Children's Relief Fund",
  ein: '95-4374418',
  mission: 'Medical aid, trauma care, and surgical missions for injured children across Gaza and the West Bank.',
  raised: '184,902',
  donors: '4,218',
  receipts: '4,180',
  swatch: '#c14040',
  swatch2: '#f5e9d4',
  photoCaption: 'photo · field clinic, rafah'
},
{
  id: 'wck',
  tag: 'Active · Ukraine, Sudan, Gaza',
  name: 'World Central Kitchen',
  ein: '27-1273172',
  mission: 'Hot meals on the ground within hours of any crisis — wherever cooks can stand up a kitchen.',
  raised: '92,418',
  donors: '2,107',
  receipts: '2,098',
  swatch: '#1c1e54',
  swatch2: '#665efd',
  photoCaption: 'photo · kitchen line, kharkiv'
},
{
  id: 'directrelief',
  tag: 'Recurring · Global',
  name: 'Direct Relief',
  ein: '95-1831116',
  mission: 'Medicine and supplies routed to community clinics in 90+ countries, including disaster response.',
  raised: '61,250',
  donors: '1,402',
  receipts: '1,388',
  swatch: '#0d253d',
  swatch2: '#9b6829',
  photoCaption: 'photo · supply pallet, los angeles'
}];


const LIVE_RECEIPTS = [
{ amount: '50.00', tx: '0xae12…91bc', org: "Palestine Children's Relief", when: '2s ago' },
{ amount: '25.00', tx: '0x77f0…42d9', org: 'World Central Kitchen', when: '14s ago' },
{ amount: '100.00', tx: '0x3a01…ce88', org: 'Direct Relief', when: '38s ago' },
{ amount: '10.00', tx: '0xd451…2fbb', org: "Palestine Children's Relief", when: '1m ago' },
{ amount: '500.00', tx: '0xb9c2…7783', org: 'World Central Kitchen', when: '2m ago' }];


const STEPS = [
{ n: 1, title: 'Pay', short: 'Card or Apple Pay', detail: 'Standard checkout. No wallet required. Donor never sees crypto.' },
{ n: 2, title: 'Convert', short: 'USDC on Base', detail: 'Fiat is minted to USDC stablecoin on Base L2. Sub-cent network fees, settled in seconds.' },
{ n: 3, title: 'Route', short: '1% to Eudaimonia', detail: 'A flat 1% platform fee is taken on-chain and visible in the receipt. Nothing else, ever.' },
{ n: 4, title: 'Deliver', short: "To charity's fund", detail: 'Remaining 99% is pushed directly to the charity\u2019s Endaoment Org Fund. No middle account.' },
{ n: 5, title: 'Publish', short: 'Public receipt', detail: 'A shareable receipt is published at eudaimonia.app/receipt/{tx} — immutable, infinitely verifiable.' }];


/* ---------------------------------------------------------------- Atoms */

function PhiMark({ size = 22, color = '#0d253d' }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 22 22" fill="none" aria-label="Eudaimonia">
      <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1" />
      <line x1="11" y1="3.5" x2="11" y2="18.5" stroke={color} strokeWidth="1" />
      <ellipse cx="11" cy="11" rx="4.2" ry="3.2" stroke={color} strokeWidth="1" fill="none" />
    </svg>);

}

function Wordmark({ size = 18, color = '#0d253d' }) {
  // Cycles between the wordmark and its Greek pronunciation as a quiet brand flourish.
  const [showIpa, setShowIpa] = React.useState(false);
  React.useEffect(() => {
    const timers = [];
    const loop = () => {
      timers.push(setTimeout(() => setShowIpa(true), 4800));
      timers.push(setTimeout(() => setShowIpa(false), 7600));
      timers.push(setTimeout(loop, 8400));
    };
    loop();
    return () => timers.forEach(clearTimeout);
  }, []);
  const stack = { gridArea: 'stack', whiteSpace: 'nowrap', color, transition: 'opacity .55s ease, transform .55s ease' };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color }}>
      <PhiMark size={size + 8} color={color} />
      <span style={{ display: 'inline-grid', gridTemplateAreas: '"stack"', alignItems: 'center', lineHeight: 1.1 }}>
        <span style={{
          ...stack,
          fontSize: size, fontWeight: 300, letterSpacing: '-0.25px',
          fontFeatureSettings: '"ss01"',
          opacity: showIpa ? 0 : 1,
          transform: showIpa ? 'translateY(-3px)' : 'translateY(0)'
        }}>Eudaimonia</span>
        <span style={{ ...{
            ...stack,
            fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
            fontSize: size * 0.76, fontWeight: 400, letterSpacing: '-0.3px',
            opacity: showIpa ? 1 : 0,
            transform: showIpa ? 'translateY(0)' : 'translateY(3px)'
          }, fontSize: "15px" }}>[eu̯dai̯moníaː]</span>
      </span>
    </div>);

}

function Num({ children, size = 14, weight = 300, color = '#0d253d', track = '-0.42px' }) {
  return (
    <span style={{
      fontSize: size, fontWeight: weight, color, letterSpacing: track,
      fontFeatureSettings: '"tnum","ss01"'
    }}>{children}</span>);

}

function Mono({ children, size = 13, color = '#0d253d' }) {
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
      fontSize: size, fontWeight: 400, color, letterSpacing: '-0.2px',
      fontFeatureSettings: '"tnum","ss01"'
    }}>{children}</span>);

}

function EyebrowLabel({ children, color = '#64748d' }) {
  return (
    <div style={{
      textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.12em',
      fontWeight: 400, color, fontFeatureSettings: '"ss01"'
    }}>{children}</div>);

}

function PillButton({ children, variant = 'primary', size = 'md', onClick, asLink = false, icon = null }) {
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '8px 16px', fontSize: 14 },
    lg: { padding: '11px 20px', fontSize: 15 }
  };
  const variants = {
    primary: { background: '#533afd', color: '#fff', border: '1px solid #533afd' },
    secondary: { background: '#fff', color: '#0d253d', border: '1px solid #e3e8ee' },
    dark: { background: '#0d253d', color: '#fff', border: '1px solid #0d253d' },
    ghost: { background: 'transparent', color: '#0d253d', border: '1px solid transparent' }
  };
  const [hover, setHover] = React.useState(false);
  const base = { ...sizes[size], ...variants[variant] };
  const lift = hover && variant === 'primary' ? { background: '#4434d4', borderColor: '#4434d4' } :
  hover && variant === 'secondary' ? { borderColor: '#0d253d' } :
  hover && variant === 'dark' ? { background: '#1c1e54', borderColor: '#1c1e54' } :
  hover && variant === 'ghost' ? { background: '#f6f9fc' } : {};
  const Tag = asLink ? 'a' : 'button';
  return (
    <Tag
      href={asLink ? '#' : undefined}
      onClick={(e) => {if (asLink) e.preventDefault();onClick && onClick(e);}}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...base, ...lift,
        appearance: 'none',
        fontFamily: 'inherit',
        fontWeight: 400,
        letterSpacing: '-0.1px',
        borderRadius: 9999,
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all .15s'
      }}>
      
      {children}{icon}
    </Tag>);

}

function StripedPlaceholder({ height = 220, caption, tint = '#f6f9fc', accent = '#e3e8ee' }) {
  // Subtle diagonal stripes — never an attempt at real imagery.
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height,
      background: `repeating-linear-gradient(135deg, ${tint} 0 14px, ${accent}40 14px 16px)`,
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid #e3e8ee'
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, transparent 40%, ${tint} 100%)`
      }} />
      <div style={{
        position: 'absolute', left: 14, bottom: 12,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 8px', background: '#fff',
        border: '1px solid #e3e8ee', borderRadius: 4
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 9999, background: accent
        }} />
        <Mono size={10} color="#64748d">{caption}</Mono>
      </div>
    </div>);

}

function ArrowRight({ size = 10, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2 }}>
      <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    </svg>);

}

/* -------------------------------------------------------------- Nav bar */

function NavBar() {
  return (
    <nav style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      zIndex: 10,
      padding: '24px 64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <PhiMark size={26} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {['Causes', 'How it works', 'Receipts', 'For nonprofits'].map((l) =>
        <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{
          color: '#0d253d', fontSize: 14, textDecoration: 'none',
          letterSpacing: '-0.1px'
        }}>{l}</a>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="#" onClick={(e) => e.preventDefault()} style={{
          color: '#0d253d', fontSize: 14, textDecoration: 'none', letterSpacing: '-0.1px'
        }}>Sign in</a>
        <PillButton variant="primary">Donate <ArrowRight color="#fff" /></PillButton>
      </div>
    </nav>);

}

/* ----------------------------------------------------------------- Hero */

function HeroMesh() {
  // Atmospheric backdrop — quieter than Stripe marketing; we want the museum
  // wall, not the trade-show booth. Layered radial washes, never solid.
  return (
    <div aria-hidden="true" style={{
      position: 'absolute',
      inset: '-160px -160px auto -160px',
      height: 720,
      background: `
        radial-gradient(55% 70% at 18% 25%, rgba(245,233,212,0.65), transparent 60%),
        radial-gradient(45% 65% at 78% 18%, rgba(249,107,238,0.14), transparent 60%),
        radial-gradient(55% 75% at 52% 38%, rgba(83,58,253,0.13), transparent 65%),
        radial-gradient(40% 60% at 92% 50%, rgba(234,34,97,0.08), transparent 60%)
      `,
      filter: 'blur(36px)',
      pointerEvents: 'none',
      zIndex: 0
    }} />);

}

function Hero({ heroCopy, showLiveStrip }) {
  const isQuestion = heroCopy === 'question';
  return (
    <section style={{
      position: 'relative',
      paddingTop: 152,
      paddingBottom: 80,
      paddingLeft: 64,
      paddingRight: 64,
      overflow: 'hidden'
    }}>
      <HeroMesh />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.25fr 0.85fr',
          gap: 64, alignItems: 'center'
        }}>
          {/* LEFT — H1 statement is the hero */}
          <div>
            <EyebrowLabel color="#0d253d">A donation platform · Base L2 · Endaoment-routed</EyebrowLabel>

            {isQuestion ? (
              <h1 style={{
                margin: '24px 0 0', fontSize: 88, fontWeight: 300,
                letterSpacing: '-2.6px', lineHeight: 1.02,
                color: '#0d253d', textWrap: 'pretty', fontFeatureSettings: '"ss01"'
              }}>
                Where did your last donation actually go?
              </h1>
            ) : (
              <h1 style={{
                margin: '24px 0 0', fontSize: 96, fontWeight: 300,
                letterSpacing: '-3px', lineHeight: 1.0,
                color: '#0d253d', textWrap: 'pretty', fontFeatureSettings: '"ss01"'
              }}>
                Give once.<br />
                See exactly{' '}
                <span style={{
                  backgroundImage: 'linear-gradient(transparent 70%, rgba(83,58,253,0.18) 70%, rgba(83,58,253,0.18) 92%, transparent 92%)'
                }}>where it goes.</span>
              </h1>
            )}

            {/* Inline rotating chip — the name as a living thing */}
            <div style={{
              marginTop: 36, display: 'inline-flex', alignItems: 'center',
              gap: 14, color: '#64748d', fontSize: 16,
              letterSpacing: '-0.1px', flexWrap: 'wrap'
            }}>
              <span>We call it</span>
              <span style={{
                display: 'inline-flex', alignItems: 'baseline',
                padding: '4px 12px',
                background: '#fff', border: '1px solid #e3e8ee', borderRadius: 9999,
                minWidth: 220, justifyContent: 'center', overflow: 'hidden'
              }}>
                <CycleWord />
              </span>
              <span>—</span>
              <span>so it pays back the trust it asks for.</span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 44, alignItems: 'center' }}>
              <PillButton variant="primary" size="lg">
                Choose a cause <ArrowRight color="#fff" />
              </PillButton>
              <PillButton variant="secondary" size="lg" asLink>
                See an example receipt <ArrowRight color="#0d253d" />
              </PillButton>
            </div>

            <div style={{
              marginTop: 32, display: 'flex', alignItems: 'center', gap: 18,
              color: '#64748d', fontSize: 13, letterSpacing: '-0.1px',
              fontFeatureSettings: '"tnum","ss01"'
            }}>
              <span>$1 minimum</span>
              <span style={{ width: 3, height: 3, borderRadius: 9999, background: '#a8c3de' }} />
              <span>Card · Apple Pay · Google Pay</span>
              <span style={{ width: 3, height: 3, borderRadius: 9999, background: '#a8c3de' }} />
              <span>501(c)(3) tax-deductible via Endaoment</span>
            </div>
          </div>

          {/* RIGHT — pronunciation / meanings card */}
          <MeaningsCard />
        </div>

        {/* Composited dashboard mockup — the brand's argument: "look at the actual product." */}
        <HeroReceiptMockup />

        {showLiveStrip && <LiveReceiptStrip />}
      </div>

      <style>{`
        @keyframes eud-face-in {
          0%   { opacity: 0; transform: translateY(8px); filter: blur(2px); }
          100% { opacity: 1; transform: translateY(0);   filter: blur(0); }
        }
        @keyframes eud-cycle-in {
          0%   { opacity: 0; transform: translateY(6px); }
          18%  { opacity: 1; transform: translateY(0); }
          82%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>
    </section>);

}

/* ------------ Hero · rotating meanings (Proposal C identity) -------- */

function MeaningsCard() {
  const faces = [
    { eyebrow: 'English',     big: 'Eudaimonia',         sub: 'A donation platform.', tone: '#0d253d' },
    { eyebrow: 'Greek',       big: '\u03B5\u1F50\u03B4\u03B1\u03B9\u03BC\u03BF\u03BD\u03AF\u03B1', sub: 'From \u03B5\u1F56 (eu, \u201Cgood\u201D) + \u03B4\u03B1\u03AF\u03BC\u03C9\u03BD (da\u00EDm\u014Dn, \u201Cspirit\u201D).', tone: '#0d253d', serif: true },
    { eyebrow: 'IPA',         big: '[eu\u032Fdai\u032Fmon\u00EDa\u02D0]', sub: 'A noun, spoken aloud.', tone: '#0d253d', mono: true },
    { eyebrow: 'Translation', big: 'Human flourishing.', sub: 'The good life that comes from doing right by others.', tone: '#533afd' }
  ];
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % faces.length), 2600);
    return () => clearInterval(id);
  }, [faces.length]);
  const c = faces[i];

  return (
    <div style={{
      background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16,
      boxShadow: '0 14px 40px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)',
      padding: 28, position: 'relative', overflow: 'hidden',
      minHeight: 340
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #f0f3f6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PhiMark size={18} />
          <Mono size={11} color="#64748d">/pronounce</Mono>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {faces.map((_, idx) => (
            <span key={idx} style={{
              width: idx === i ? 18 : 6, height: 6, borderRadius: 9999,
              background: idx === i ? '#533afd' : '#e3e8ee',
              transition: 'all .4s ease'
            }} />
          ))}
        </div>
      </div>

      {/* Animated face */}
      <div key={i} style={{ animation: 'eud-face-in .55s cubic-bezier(.2,.7,.2,1)' }}>
        <EyebrowLabel color="#533afd">{c.eyebrow}</EyebrowLabel>
        <div style={{
          marginTop: 14,
          fontSize: c.big.length > 18 ? 36 : 48,
          fontWeight: 300, letterSpacing: c.mono ? '-0.5px' : '-1.4px',
          color: c.tone, lineHeight: 1.05,
          fontFamily: c.mono
            ? '"JetBrains Mono", ui-monospace, Menlo, monospace'
            : c.serif
              ? 'Georgia, "Times New Roman", serif'
              : '"Inter", system-ui, sans-serif',
          fontFeatureSettings: '"ss01"',
          textWrap: 'pretty'
        }}>
          {c.big}
        </div>
        <p style={{
          margin: '18px 0 0', fontSize: 15, lineHeight: 1.5,
          color: '#64748d', letterSpacing: '-0.1px', maxWidth: 360
        }}>
          {c.sub}
        </p>
      </div>

      {/* Fixed footer — IPA always tucked underneath */}
      <div style={{
        position: 'absolute', left: 28, right: 28, bottom: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 14, borderTop: '1px solid #f0f3f6'
      }}>
        <Mono size={12} color="#64748d">[eu\u032Fdai\u032Fmon\u00EDa\u02D0]</Mono>
        <button style={{
          appearance: 'none', background: 'transparent',
          border: '1px solid #e3e8ee', borderRadius: 9999,
          padding: '5px 10px', fontSize: 11, color: '#0d253d',
          letterSpacing: '-0.1px', cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6
        }}>
          <SoundDotSmall /> hear it
        </button>
      </div>
    </div>
  );
}

function SoundDotSmall() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <circle cx="4.5" cy="4.5" r="4" fill="#533afd" />
      <path d="M3.5 3v3l2.5-1.5z" fill="#fff" />
    </svg>
  );
}

function CycleWord() {
  const words = [
    { text: 'Eudaimonia',             font: '"Inter", sans-serif',          size: 18, color: '#0d253d', track: '-0.3px' },
    { text: '\u03B5\u1F50\u03B4\u03B1\u03B9\u03BC\u03BF\u03BD\u03AF\u03B1', font: 'Georgia, serif', size: 18, color: '#0d253d', track: '-0.2px' },
    { text: '[eu\u032Fdai\u032Fmon\u00EDa\u02D0]', font: '"JetBrains Mono", monospace', size: 14, color: '#533afd', track: '-0.2px' },
    { text: 'human flourishing',      font: '"Inter", sans-serif',          size: 17, color: '#0d253d', track: '-0.2px', italic: true }
  ];
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % words.length), 2200);
    return () => clearInterval(id);
  }, [words.length]);
  const w = words[i];
  return (
    <span key={i} style={{
      display: 'inline-block',
      fontFamily: w.font, fontSize: w.size, color: w.color,
      letterSpacing: w.track, fontWeight: 400,
      fontStyle: w.italic ? 'italic' : 'normal',
      fontFeatureSettings: '"ss01"',
      animation: 'eud-cycle-in 2.2s ease both'
    }}>{w.text}</span>
  );
}

function HeroReceiptMockup() {
  // A small faux-product mock that mirrors the receipt page's vocabulary —
  // 5-stage tracker + tx hash strip. Not interactive; it's the depth medium.
  return (
    <div style={{
      marginTop: 64,
      background: '#fff',
      border: '1px solid #e3e8ee',
      borderRadius: 16,
      boxShadow: '0 8px 24px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)',
      overflow: 'hidden',
      maxWidth: 1080
    }}>
      {/* chrome */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #eef2f6',
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#fafbfc'
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 9999, background: '#e3e8ee' }} />
          <span style={{ width: 10, height: 10, borderRadius: 9999, background: '#e3e8ee' }} />
          <span style={{ width: 10, height: 10, borderRadius: 9999, background: '#e3e8ee' }} />
        </div>
        <Mono size={11} color="#64748d">eudaimonia.app/receipt/0xdc671195…7a78ed</Mono>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748d', letterSpacing: '-0.1px' }}>
          Verified · 15,041,902 confirmations
        </span>
      </div>

      {/* body */}
      <div style={{
        padding: '36px 40px',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        gap: 48,
        alignItems: 'center'
      }}>
        <div>
          <EyebrowLabel>Receipt · May 30, 2025</EyebrowLabel>
          <div style={{
            marginTop: 12,
            fontSize: 28, fontWeight: 300, letterSpacing: '-0.4px',
            color: '#0d253d', lineHeight: 1.15
          }}>
            Anonymous donor gave{' '}
            <Num size={28} weight={300} track="-0.4px">$1.00</Num>{' '}
            to Black Women in Blockchain Inc.
          </div>
          <div style={{
            marginTop: 14,
            fontSize: 13, color: '#64748d', letterSpacing: '-0.1px',
            fontFeatureSettings: '"tnum","ss01"'
          }}>
            Settled on Base · Endaoment Org Fund · EIN 87-1055621
          </div>

          <div style={{
            marginTop: 22,
            display: 'flex', gap: 24,
            fontSize: 12, color: '#273951',
            fontFeatureSettings: '"tnum","ss01"'
          }}>
            <div>
              <div style={{ color: '#64748d', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Donor paid</div>
              <Num size={18} track="-0.3px">$1.00</Num>
            </div>
            <div style={{ width: 1, background: '#e3e8ee' }} />
            <div>
              <div style={{ color: '#64748d', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Eudaimonia fee</div>
              <Num size={18} track="-0.3px" color="#64748d">$0.01</Num>
            </div>
            <div style={{ width: 1, background: '#e3e8ee' }} />
            <div>
              <div style={{ color: '#64748d', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Charity received</div>
              <Num size={18} track="-0.3px">$0.985</Num>
            </div>
          </div>
        </div>

        <MiniTracker />
      </div>
    </div>);

}

function MiniTracker() {
  const stages = [
  { label: 'Donated', t: '17:34:01' },
  { label: 'Converted', t: '17:34:02' },
  { label: 'Routed', t: '17:34:04' },
  { label: 'Settled', t: '17:34:07' }];

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8, position: 'relative'
      }}>
        <div aria-hidden="true" style={{
          position: 'absolute', top: 11, left: 'calc(12.5% + 6px)', right: 'calc(12.5% + 6px)',
          height: 1, background: '#533afd', opacity: 0.35
        }} />
        {stages.map((s) =>
        <div key={s.label} style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{
            width: 22, height: 22, borderRadius: 9999,
            border: '1px solid #533afd', background: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>
              <div style={{ width: 10, height: 10, borderRadius: 9999, background: '#533afd' }} />
            </div>
            <div style={{
            marginTop: 10, fontSize: 12, color: '#0d253d', letterSpacing: '-0.1px'
          }}>{s.label}</div>
            <div style={{
            marginTop: 2, fontSize: 10, color: '#64748d',
            fontFeatureSettings: '"tnum","ss01"'
          }}>{s.t}</div>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 22,
        padding: '12px 14px',
        background: '#f6f9fc',
        border: '1px solid #e3e8ee',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 9999, background: '#0052ff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 9999, background: '#fff' }} />
          </div>
          <Mono size={11} color="#0d253d">0xdc671195…7a78ed</Mono>
        </div>
        <a href="#" onClick={(e) => e.preventDefault()} style={{
          color: '#533afd', fontSize: 12, textDecoration: 'none', letterSpacing: '-0.1px'
        }}>Open on BaseScan <ArrowRight color="#533afd" /></a>
      </div>
    </div>);

}

/* ----------------------------------------------- Live receipts strip */

function LiveReceiptStrip() {
  return (
    <div style={{
      marginTop: 48,
      padding: '14px 20px',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(8px)',
      border: '1px solid #e3e8ee',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      overflow: 'hidden'
    }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          width: 7, height: 7, borderRadius: 9999, background: '#533afd',
          boxShadow: '0 0 0 4px rgba(83,58,253,0.12)'
        }} />
        <EyebrowLabel color="#0d253d">Live receipts</EyebrowLabel>
      </div>
      <div style={{
        display: 'flex', gap: 32, fontSize: 13, color: '#273951',
        letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"',
        overflow: 'hidden', whiteSpace: 'nowrap'
      }}>
        {LIVE_RECEIPTS.map((r, i) =>
        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Num size={13}>${r.amount}</Num>
            <span style={{ color: '#64748d' }}>to</span>
            <span>{r.org}</span>
            <Mono size={11} color="#64748d">{r.tx}</Mono>
            <span style={{ color: '#64748d' }}>· {r.when}</span>
          </div>
        )}
      </div>
    </div>);

}

/* ------------------------------------------------------- Causes section */

function CausesSection({ layout = 'image-top' }) {
  return (
    <section style={{ padding: '96px 64px', background: '#fff' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end', marginBottom: 40,
          gap: 32
        }}>
          <div>
            <EyebrowLabel>This week's causes</EyebrowLabel>
            <h2 style={{
              margin: '10px 0 0', fontSize: 44, fontWeight: 300,
              letterSpacing: '-0.96px', lineHeight: 1.05, color: '#0d253d',
              maxWidth: 720, textWrap: 'pretty'
            }}>
              A small list, refreshed weekly. We vet every charity through Endaoment and stake our reputation on the routing.
            </h2>
          </div>
          <a href="#" onClick={(e) => e.preventDefault()} style={{
            color: '#533afd', fontSize: 14, textDecoration: 'none',
            letterSpacing: '-0.1px', whiteSpace: 'nowrap'
          }}>How we choose causes <ArrowRight color="#533afd" /></a>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24
        }}>
          {CAUSES.map((c) =>
          <CauseCard key={c.id} cause={c} layout={layout} />
          )}
        </div>

        <div style={{
          marginTop: 24,
          padding: '14px 20px',
          background: '#f6f9fc',
          border: '1px solid #e3e8ee',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#273951', letterSpacing: '-0.1px' }}>
            <EyebrowLabel color="#0d253d">Note</EyebrowLabel>
            <span>
              Don't see a cause you support? Any 501(c)(3) with an Endaoment Org Fund can be donated to —{' '}
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#533afd', textDecoration: 'none' }}>search the directory</a>.
            </span>
          </div>
          <PillButton variant="secondary" size="sm" asLink>Browse all <ArrowRight /></PillButton>
        </div>
      </div>
    </section>);

}

function CauseCard({ cause, layout }) {
  const [hover, setHover] = React.useState(false);
  const isSide = layout === 'image-side';

  const photo =
  <StripedPlaceholder
    height={isSide ? 168 : 200}
    caption={cause.photoCaption}
    tint={cause.swatch2}
    accent={cause.swatch} />;



  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff',
        border: '1px solid #e3e8ee',
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all .18s',
        boxShadow: hover ?
        '0 8px 24px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)' :
        '0 1px 3px rgba(0,55,112,0.06)'
      }}>
      
      {!isSide && photo}
      <div style={{ display: 'flex', gap: 16, marginTop: isSide ? 0 : 20, flexDirection: isSide ? 'row' : 'column' }}>
        {isSide && <div style={{ flexShrink: 0, width: 168 }}>{photo}</div>}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'inline-flex', alignSelf: 'flex-start',
            padding: '3px 8px',
            background: '#eef0fe',
            color: '#4434d4',
            fontSize: 10, fontWeight: 400, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderRadius: 9999,
            marginBottom: 12
          }}>{cause.tag}</div>

          <div style={{
            fontSize: 22, fontWeight: 300, letterSpacing: '-0.22px',
            color: '#0d253d', lineHeight: 1.15, textWrap: 'pretty'
          }}>{cause.name}</div>

          <div style={{
            marginTop: 4, fontSize: 12, color: '#64748d',
            letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"'
          }}>EIN {cause.ein} · 501(c)(3)</div>

          <p style={{
            margin: '14px 0 0', fontSize: 14, fontWeight: 300, lineHeight: 1.5,
            color: '#273951', letterSpacing: '-0.1px', textWrap: 'pretty'
          }}>
            {cause.mission}
          </p>

          <div style={{
            marginTop: 'auto', paddingTop: 20,
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            borderTop: '1px dashed #e3e8ee',
            marginBottom: 18
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#64748d', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Routed</div>
              <Num size={16} weight={300} track="-0.3px">${cause.raised}</Num>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#64748d', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Donors</div>
              <Num size={16} weight={300} track="-0.3px">{cause.donors}</Num>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#64748d', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Receipts</div>
              <Num size={16} weight={300} track="-0.3px">{cause.receipts}</Num>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PillButton variant="primary">Donate <ArrowRight color="#fff" /></PillButton>
            <a href="#" onClick={(e) => e.preventDefault()} style={{
              color: '#0d253d', fontSize: 13, textDecoration: 'none',
              letterSpacing: '-0.1px', opacity: 0.7
            }}>View charity →</a>
          </div>
        </div>
      </div>
    </div>);

}

/* ---------------------------------------------- Cream interlude band */

function CreamBand() {
  return (
    <section style={{ background: '#fff', padding: '0 64px 96px' }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto',
        background: '#f5e9d4',
        borderRadius: 16,
        padding: '64px 56px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 56,
        alignItems: 'center'
      }}>
        <div>
          <EyebrowLabel color="#9b6829">The wedge</EyebrowLabel>
          <h2 style={{
            margin: '12px 0 0', fontSize: 42, fontWeight: 300,
            letterSpacing: '-0.84px', lineHeight: 1.08, color: '#0d253d',
            textWrap: 'pretty'
          }}>
            Every donation gets a receipt you can share, screenshot, and verify yourself.
          </h2>
          <p style={{
            margin: '20px 0 0', fontSize: 16, fontWeight: 300, lineHeight: 1.55,
            color: '#273951', maxWidth: 540, letterSpacing: '-0.1px'
          }}>
            The receipt isn't a PDF we email — it's a public page on Base. Anyone with the link can
            see exactly which contract held the funds and at what second they arrived. That is the
            only "crypto" you'll ever need to know.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <PillButton variant="dark">See an example receipt <ArrowRight color="#fff" /></PillButton>
            <PillButton variant="ghost" asLink>Read the fee policy <ArrowRight /></PillButton>
          </div>
        </div>

        {/* tiny inline mock — cream-band variant */}
        <CreamMockReceipt />
      </div>
    </section>);

}

function CreamMockReceipt() {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 8px 24px rgba(0,55,112,0.10), 0 2px 6px rgba(0,55,112,0.04)',
      border: '1px solid rgba(13,37,61,0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <Wordmark size={13} />
        <Mono size={11} color="#64748d">0xae12…91bc</Mono>
      </div>

      <div style={{ fontSize: 11, color: '#64748d', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Receipt
      </div>
      <div style={{
        marginTop: 8, fontSize: 22, fontWeight: 300, letterSpacing: '-0.22px',
        color: '#0d253d', lineHeight: 1.2
      }}>
        <Num size={22} track="-0.22px">$50.00</Num> to Palestine Children's Relief Fund.
      </div>
      <div style={{
        marginTop: 6, fontSize: 12, color: '#64748d',
        letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"'
      }}>
        Today · 2 seconds ago · settled on Base
      </div>

      <div style={{
        marginTop: 18, padding: '14px 0', borderTop: '1px dashed #e3e8ee', borderBottom: '1px dashed #e3e8ee',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, position: 'relative'
      }}>
        <div aria-hidden="true" style={{
          position: 'absolute', top: '50%', left: 'calc(12.5% + 4px)', right: 'calc(12.5% + 4px)',
          height: 1, background: '#533afd', opacity: 0.35
        }} />
        {['Paid', 'Converted', 'Routed', 'Delivered'].map((label) =>
        <div key={label} style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{
            width: 18, height: 18, borderRadius: 9999, background: '#fff',
            border: '1px solid #533afd', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>
              <div style={{ width: 8, height: 8, borderRadius: 9999, background: '#533afd' }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: '#273951', letterSpacing: '-0.1px' }}>{label}</div>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 14, display: 'flex', justifyContent: 'space-between',
        fontSize: 12, color: '#273951', fontFeatureSettings: '"tnum","ss01"'
      }}>
        <span><span style={{ color: '#64748d' }}>Donor paid</span> $50.00</span>
        <span><span style={{ color: '#64748d' }}>Eudaimonia fee</span> $0.50</span>
        <span><span style={{ color: '#64748d' }}>Charity</span> <strong style={{ fontWeight: 400 }}>$49.50</strong></span>
      </div>
    </div>);

}

/* ------------------------------------------------ How it works section */

function HowItWorks() {
  const [active, setActive] = React.useState(null);
  return (
    <section style={{ background: '#f6f9fc', padding: '96px 64px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
          <div>
            <EyebrowLabel>How it works</EyebrowLabel>
            <h2 style={{
              margin: '10px 0 0', fontSize: 36, fontWeight: 300,
              letterSpacing: '-0.72px', color: '#0d253d', maxWidth: 720, textWrap: 'pretty'
            }}>
              Five seconds. Five steps. Five rows in a public log.
            </h2>
          </div>
          <div style={{ fontSize: 13, color: '#64748d', letterSpacing: '-0.1px', textAlign: 'right', maxWidth: 320 }}>
            Hover any step to see what happens. Every step writes to Base — none of it lives on a Eudaimonia server.
          </div>
        </div>

        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8
        }}>
          <div aria-hidden="true" style={{
            position: 'absolute', top: 18, left: 'calc(10% + 8px)', right: 'calc(10% + 8px)',
            height: 1, background: '#533afd', opacity: 0.35, zIndex: 0
          }} />
          {STEPS.map((s, i) => {
            const isActive = active === i;
            return (
              <div
                key={s.n}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                style={{ cursor: 'default' }}>
                
                <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1, marginBottom: 22 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9999,
                    background: '#fff', border: '1px solid #533afd',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? '0 0 0 6px rgba(83,58,253,0.10)' : 'none',
                    transition: 'all .18s'
                  }}>
                    <Num size={13} weight={400} track="-0.2px" color="#533afd">{s.n}</Num>
                  </div>
                </div>
                <div style={{
                  background: isActive ? '#fff' : 'transparent',
                  border: isActive ? '1px solid #e3e8ee' : '1px solid transparent',
                  borderRadius: 12,
                  padding: 18,
                  transition: 'all .18s',
                  boxShadow: isActive ? '0 8px 24px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)' : 'none',
                  minHeight: 200
                }}>
                  <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-0.2px', color: '#0d253d' }}>{s.title}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#64748d', letterSpacing: '-0.1px' }}>{s.short}</div>
                  <p style={{
                    margin: '14px 0 0', fontSize: 13, fontWeight: 300, lineHeight: 1.5,
                    color: '#273951', letterSpacing: '-0.1px'
                  }}>{s.detail}</p>
                </div>
              </div>);

          })}
        </div>

        <div style={{
          marginTop: 36, display: 'flex', alignItems: 'center', gap: 16,
          padding: '14px 20px', background: '#fff', border: '1px solid #e3e8ee', borderRadius: 12,
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#273951', letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"' }}>
            <EyebrowLabel color="#0d253d">Fees, in plain sight</EyebrowLabel>
            <span><span style={{ color: '#64748d' }}>Eudaimonia</span> 1.0%</span>
            <span style={{ color: '#a8c3de' }}>·</span>
            <span><span style={{ color: '#64748d' }}>Endaoment</span> 1.5%</span>
            <span style={{ color: '#a8c3de' }}>·</span>
            <span><span style={{ color: '#64748d' }}>Card processing</span> ~2.9% + $0.30</span>
            <span style={{ color: '#a8c3de' }}>·</span>
            <span><span style={{ color: '#64748d' }}>Network</span> sub-cent</span>
          </div>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#533afd', fontSize: 13, textDecoration: 'none', letterSpacing: '-0.1px' }}>
            Full fee breakdown <ArrowRight color="#533afd" />
          </a>
        </div>
      </div>
    </section>);

}

/* ------------------------------------------------- Trust / authority strip */

function AuthorityStrip() {
  const items = [
  { label: 'Built on', value: 'Endaoment' },
  { label: 'Settles on', value: 'Base · Coinbase L2' },
  { label: 'Stablecoin', value: 'USDC · Circle' },
  { label: 'Payments', value: 'Stripe' },
  { label: 'Audits', value: 'Open source · Foundry' }];

  return (
    <section style={{ padding: '48px 64px', background: '#fff', borderTop: '1px solid #eef2f6', borderBottom: '1px solid #eef2f6' }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto',
        display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 24, alignItems: 'center'
      }}>
        {items.map((it, i) =>
        <div key={it.label} style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          borderLeft: i === 0 ? 'none' : '1px solid #eef2f6',
          paddingLeft: i === 0 ? 0 : 24
        }}>
            <EyebrowLabel>{it.label}</EyebrowLabel>
            <span style={{ fontSize: 15, fontWeight: 300, letterSpacing: '-0.15px', color: '#0d253d' }}>{it.value}</span>
          </div>
        )}
      </div>
    </section>);

}

/* ------------------------------------------------- Closing CTA section */

function ClosingCTA() {
  return (
    <section style={{ padding: '96px 64px', background: '#fff' }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto',
        background: '#0d253d',
        borderRadius: 16,
        padding: '72px 64px',
        color: '#fff',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 56,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* soft accent wash on dark surface */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: '-100px auto auto -120px',
          width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(83,58,253,0.4), transparent 70%)',
          filter: 'blur(30px)', pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative' }}>
          <EyebrowLabel color="#a8c3de">Give once</EyebrowLabel>
          <h2 style={{
            margin: '12px 0 0', fontSize: 48, fontWeight: 300,
            letterSpacing: '-0.96px', lineHeight: 1.05,
            color: '#fff', textWrap: 'pretty'
          }}>
            One dollar in.{' '}
            <span style={{
              backgroundImage: 'linear-gradient(transparent 68%, rgba(102,94,253,0.45) 68%, rgba(102,94,253,0.45) 92%, transparent 92%)'
            }}>One receipt out.</span>
          </h2>
          <p style={{
            margin: '20px 0 0', maxWidth: 480, fontSize: 16, fontWeight: 300, lineHeight: 1.55,
            color: '#c7d1de', letterSpacing: '-0.1px'
          }}>
            Pick a cause and send what you can. The receipt is published before you finish reading it.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <PillButton variant="primary" size="lg">Choose a cause <ArrowRight color="#fff" /></PillButton>
            <a href="#" onClick={(e) => e.preventDefault()} style={{
              color: '#fff', fontSize: 15, padding: '11px 16px', textDecoration: 'none', letterSpacing: '-0.1px',
              opacity: 0.85
            }}>See a receipt first <ArrowRight color="#fff" /></a>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <DarkReceiptMock />
        </div>
      </div>
    </section>);

}

function DarkReceiptMock() {
  return (
    <div style={{
      background: '#1c1e54',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: 22,
      boxShadow: '0 12px 36px rgba(0,0,0,0.25)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Wordmark size={12} color="#fff" />
        <Mono size={10} color="#a8c3de">0xb9c2…7783</Mono>
      </div>
      <EyebrowLabel color="#a8c3de">Receipt · just now</EyebrowLabel>
      <div style={{
        marginTop: 10, fontSize: 22, fontWeight: 300, letterSpacing: '-0.22px',
        color: '#fff', lineHeight: 1.2
      }}>
        <Num size={22} track="-0.22px" color="#fff">$500.00</Num> to World Central Kitchen.
      </div>
      <div style={{
        marginTop: 16, paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', gap: 18,
        fontSize: 11, color: '#c7d1de', letterSpacing: '-0.1px',
        fontFeatureSettings: '"tnum","ss01"'
      }}>
        <span><span style={{ color: '#a8c3de' }}>Fee</span> $5.00</span>
        <span><span style={{ color: '#a8c3de' }}>Charity</span> $495.00</span>
        <span style={{ marginLeft: 'auto', color: '#665efd' }}>Verify ↗</span>
      </div>
    </div>);

}

/* ----------------------------------------------------------------- Footer */

function Footer() {
  const cols = [
  { title: 'Product', links: ['Causes', 'How it works', 'Receipts', 'Pricing'] },
  { title: 'For nonprofits', links: ['Get listed', 'Endaoment Org Fund', 'Bulk receipts API'] },
  { title: 'Trust', links: ['Open source', 'Smart contracts', 'Security disclosures', 'Annual transparency'] },
  { title: 'Company', links: ['About', 'The name', 'Press', 'Contact'] }];

  return (
    <footer style={{ background: '#fff', padding: '72px 64px 48px', borderTop: '1px solid #eef2f6' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr repeat(4, 1fr)',
          gap: 40,
          marginBottom: 56
        }}>
          <div>
            <Wordmark size={15} />
            <p style={{
              margin: '16px 0 0', maxWidth: 280,
              fontSize: 13, fontWeight: 300, lineHeight: 1.55,
              color: '#64748d', letterSpacing: '-0.1px'
            }}>
              Eudaimonia (Greek <em style={{ fontStyle: 'italic' }}>φιλότιμο</em>): the sense of duty
              to do right by others. A transparent routing layer on Endaoment's decentralized philanthropy stack.
            </p>
          </div>
          {cols.map((c) =>
          <div key={c.title}>
              <EyebrowLabel>{c.title}</EyebrowLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {c.links.map((l) =>
              <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{
                fontSize: 13, color: '#273951', textDecoration: 'none', letterSpacing: '-0.1px'
              }}>{l}</a>
              )}
              </div>
            </div>
          )}
        </div>

        <div style={{
          paddingTop: 24, borderTop: '1px solid #eef2f6',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, color: '#64748d', letterSpacing: '-0.1px'
        }}>
          <div style={{ fontFeatureSettings: '"tnum","ss01"' }}>
            © 2026 Eudaimonia · Donations processed by Endaoment Inc. (EIN 84-3104578) · Tax-deductible to the extent allowed by law
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#64748d', textDecoration: 'none' }}>Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#64748d', textDecoration: 'none' }}>Terms</a>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#64748d', textDecoration: 'none' }}>Disclosures</a>
          </div>
        </div>
      </div>
    </footer>);

}

/* --------------------------------------------------------------- Page */

function EudaimoniaLanding({ heroCopy = 'statement', campaignLayout = 'image-top', showLiveStrip = true, showCreamBand = true }) {
  return (
    <div style={{
      background: '#fff',
      color: '#0d253d',
      fontFamily: '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
      fontWeight: 300,
      fontFeatureSettings: '"ss01"',
      WebkitFontSmoothing: 'antialiased',
      minHeight: '100%',
      position: 'relative'
    }}>
      <NavBar />
      <Hero heroCopy={heroCopy} showLiveStrip={showLiveStrip} />
      <AuthorityStrip />
      <CausesSection layout={campaignLayout} />
      {showCreamBand && <CreamBand />}
      <HowItWorks />
      <ClosingCTA />
      <Footer />
    </div>);

}

Object.assign(window, {
  EudaimoniaLanding,
  PhiMark, Wordmark, Num, Mono, EyebrowLabel,
  PillButton, StripedPlaceholder, ArrowRight
});