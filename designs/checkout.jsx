// checkout.jsx — Eudaimonia fiat checkout (/donate/[campaignId])
// Two-column split: form (left) + sticky order summary (right).
// Stripe-derived system per DESIGN.md. Museum wall-label voice per PRODUCT.md.
// Reuses the φ wordmark + atomic primitives from landing.jsx / receipt.jsx.

const CAMPAIGNS = {
  pcrf: {
    id: 'pcrf',
    tag: 'Urgent · Gaza',
    name: "Palestine Children's Relief Fund",
    short: "Palestine Children's Relief",
    ein: '95-4374418',
    mission: 'Medical aid, trauma care, and surgical missions for injured children across Gaza and the West Bank.',
    fund: '0x10e9…eb82',
    swatch: '#c14040',
    swatch2: '#f5e9d4',
    initials: 'PC',
    photoCaption: 'photo · field clinic, rafah',
  },
  wck: {
    id: 'wck',
    tag: 'Active · Ukraine · Sudan · Gaza',
    name: 'World Central Kitchen',
    short: 'World Central Kitchen',
    ein: '27-1273172',
    mission: 'Hot meals on the ground within hours of any crisis — wherever cooks can stand up a kitchen.',
    fund: '0x44a2…ce19',
    swatch: '#1c1e54',
    swatch2: '#665efd',
    initials: 'WC',
    photoCaption: 'photo · kitchen line, kharkiv',
  },
};

const PRESETS = [25, 50, 100];

/* ----------------------------------------------------------- Atoms */

function FieldLabel({ children, hint }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginBottom: 6,
    }}>
      <label style={{
        fontSize: 12, color: '#0d253d', letterSpacing: '-0.1px', fontWeight: 400,
      }}>{children}</label>
      {hint && (
        <span style={{ fontSize: 11, color: '#64748d', letterSpacing: '-0.1px' }}>{hint}</span>
      )}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', autoComplete, prefix, suffix, monoFont, inputRef }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: '#fff',
      border: `1px solid ${focus ? '#533afd' : '#a8c3de'}`,
      borderRadius: 6,
      transition: 'border-color .15s, box-shadow .15s',
      boxShadow: focus ? '0 0 0 3px rgba(83,58,253,0.12)' : 'none',
      overflow: 'hidden',
    }}>
      {prefix && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 12px', color: '#64748d',
          fontSize: 15, fontWeight: 300, letterSpacing: '-0.1px',
          borderRight: '1px solid #eef2f6',
          fontFeatureSettings: '"tnum","ss01"',
        }}>{prefix}</div>
      )}
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          flex: 1,
          appearance: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          padding: '10px 12px',
          fontFamily: monoFont
            ? '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace'
            : 'inherit',
          fontWeight: 300,
          fontSize: 15,
          letterSpacing: monoFont ? '-0.2px' : '-0.1px',
          color: '#0d253d',
          fontFeatureSettings: '"tnum","ss01"',
          width: '100%',
          minWidth: 0,
        }}
      />
      {suffix && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 12px', color: '#64748d',
          fontSize: 13, fontWeight: 300, letterSpacing: '-0.1px',
          borderLeft: '1px solid #eef2f6',
        }}>{suffix}</div>
      )}
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      placeholder={placeholder}
      style={{
        width: '100%',
        appearance: 'none',
        background: '#fff',
        border: `1px solid ${focus ? '#533afd' : '#a8c3de'}`,
        boxShadow: focus ? '0 0 0 3px rgba(83,58,253,0.12)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
        borderRadius: 6,
        padding: '10px 12px',
        fontFamily: 'inherit',
        fontWeight: 300,
        fontSize: 15,
        letterSpacing: '-0.1px',
        color: '#0d253d',
        outline: 'none',
        resize: 'vertical',
        fontFeatureSettings: '"ss01"',
      }}
    />
  );
}

function AmountChip({ value, active, currency, onClick, disabled }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1,
        appearance: 'none',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        padding: '14px 10px',
        background: active ? '#0d253d' : (hover && !disabled ? '#f6f9fc' : '#fff'),
        color: active ? '#fff' : '#0d253d',
        border: '1px solid',
        borderColor: active ? '#0d253d' : '#e3e8ee',
        borderRadius: 8,
        fontSize: 20,
        fontWeight: 300,
        letterSpacing: '-0.3px',
        fontFeatureSettings: '"tnum","ss01"',
        transition: 'all .15s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {currency}<Num inherit>{value}</Num>
    </button>
  );
}

function Num({ children, size, weight = 300, color, track, inherit }) {
  if (inherit) {
    return <span style={{ fontFeatureSettings: '"tnum","ss01"' }}>{children}</span>;
  }
  return (
    <span style={{
      fontSize: size, fontWeight: weight, color,
      letterSpacing: track || '-0.42px',
      fontFeatureSettings: '"tnum","ss01"',
    }}>{children}</span>
  );
}

function Mono({ children, size = 12, color = '#0d253d' }) {
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
      fontSize: size, fontWeight: 400, color, letterSpacing: '-0.2px',
      fontFeatureSettings: '"tnum","ss01"',
    }}>{children}</span>
  );
}

function EyebrowLabel({ children, color = '#64748d' }) {
  return (
    <div style={{
      textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.12em',
      fontWeight: 400, color, fontFeatureSettings: '"ss01"',
    }}>{children}</div>
  );
}

function ArrowRight({ size = 10, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2 }}>
      <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function ArrowLeft({ size = 10, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" style={{ marginRight: 4 }}>
      <path d="M8 2L2 8M2 8H6.5M2 8V3.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon({ size = 11, color = '#64748d' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke={color} strokeWidth="1" />
      <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke={color} strokeWidth="1" />
    </svg>
  );
}

/* ----------------------------------------------------- Skeleton pulse */
// Strictly NO spinners. A flat 1px line pulses opacity 0.4 → 1.0 → 0.4.
// Skeleton bars do the same. The whole right rail goes to skeleton on processing.

function Pulse({ width = '100%', height = 12, radius = 3, delay = 0, dark = false }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: dark ? 'rgba(255,255,255,0.12)' : '#eef2f6',
      animation: `philPulse 1.6s ease-in-out ${delay}s infinite`,
    }} />
  );
}

/* ----------------------------------------------------------- Wordmark */

function PhiMark({ size = 22, color = '#0d253d' }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 22 22" fill="none" aria-label="Eudaimonia">
      <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1" />
      <line x1="11" y1="3.5" x2="11" y2="18.5" stroke={color} strokeWidth="1" />
      <ellipse cx="11" cy="11" rx="4.2" ry="3.2" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  );
}

function Wordmark({ size = 16, color = '#0d253d' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
      <PhiMark size={size + 6} color={color} />
      <span style={{
        fontSize: size, fontWeight: 300, letterSpacing: '-0.2px',
        fontFeatureSettings: '"ss01"', color,
      }}>Eudaimonia</span>
    </div>
  );
}

/* --------------------------------------------------------------- Nav */

function NavBar() {
  return (
    <nav style={{
      padding: '20px 64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid #eef2f6',
      background: '#fff',
      position: 'relative', zIndex: 5,
    }}>
      <Wordmark size={15} />
      <a href="#" onClick={(e) => e.preventDefault()} style={{
        display: 'inline-flex', alignItems: 'center',
        color: '#64748d', fontSize: 13, textDecoration: 'none', letterSpacing: '-0.1px',
      }}>
        <ArrowLeft color="#64748d" /> Back to causes
      </a>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '5px 10px', background: '#f6f9fc',
        border: '1px solid #e3e8ee', borderRadius: 9999,
        fontSize: 12, color: '#64748d', letterSpacing: '-0.1px',
      }}>
        <LockIcon /> <span>Secure checkout · Stripe</span>
      </div>
    </nav>
  );
}

/* --------------------------------------------------- Backdrop wash */

function CheckoutMesh() {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute',
      inset: '-160px -160px auto -160px',
      height: 520,
      background: `
        radial-gradient(50% 70% at 15% 20%, rgba(245,233,212,0.55), transparent 60%),
        radial-gradient(45% 60% at 82% 12%, rgba(249,107,238,0.10), transparent 60%),
        radial-gradient(55% 75% at 55% 30%, rgba(83,58,253,0.10), transparent 65%)
      `,
      filter: 'blur(40px)',
      pointerEvents: 'none',
      zIndex: 0,
    }} />
  );
}

/* ----------------------------------------------- Campaign summary */

function CampaignSummary({ campaign, density = 'comfortable' }) {
  const compact = density === 'compact';
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e3e8ee',
      borderRadius: 12,
      padding: compact ? 20 : 24,
      display: 'flex', alignItems: 'center', gap: compact ? 14 : 18,
      boxShadow: '0 1px 3px rgba(0,55,112,0.06)',
    }}>
      <div style={{
        width: compact ? 48 : 56, height: compact ? 48 : 56,
        borderRadius: 8,
        background: `linear-gradient(135deg, ${campaign.swatch} 0%, ${campaign.swatch2} 100%)`,
        color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 300, letterSpacing: '-0.2px',
        flexShrink: 0,
      }}>{campaign.initials}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '2px 8px',
          background: '#eef0fe',
          color: '#4434d4',
          fontSize: 9.5, fontWeight: 400, letterSpacing: '0.1em',
          textTransform: 'uppercase',
          borderRadius: 9999,
          marginBottom: 8,
        }}>{campaign.tag}</div>
        <div style={{
          fontSize: 18, fontWeight: 300, letterSpacing: '-0.2px',
          color: '#0d253d', lineHeight: 1.2, textWrap: 'pretty',
        }}>{campaign.name}</div>
        <div style={{
          marginTop: 4, fontSize: 12, color: '#64748d',
          letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"',
        }}>EIN {campaign.ein} · 501(c)(3) via Endaoment</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- Amount selector */

function AmountSelector({ amount, setAmount, customMode, setCustomMode, currency, disabled }) {
  const customRef = React.useRef(null);
  const customInputRef = React.useRef(null);

  React.useEffect(() => {
    if (customMode && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customMode]);

  return (
    <div>
      <FieldLabel hint="Choose a preset or set a custom amount">
        Donation amount
      </FieldLabel>
      <div style={{ display: 'flex', gap: 8 }}>
        {PRESETS.map((p) => (
          <AmountChip
            key={p}
            value={p}
            currency={currency}
            active={!customMode && Number(amount) === p}
            onClick={() => { setCustomMode(false); setAmount(String(p)); }}
            disabled={disabled}
          />
        ))}
        <button
          type="button"
          onClick={() => { setCustomMode(true); setAmount(''); }}
          disabled={disabled}
          ref={customRef}
          style={{
            flex: 1,
            appearance: 'none',
            cursor: disabled ? 'default' : 'pointer',
            fontFamily: 'inherit',
            padding: '14px 10px',
            background: customMode ? '#0d253d' : '#fff',
            color: customMode ? '#fff' : '#0d253d',
            border: '1px solid',
            borderColor: customMode ? '#0d253d' : '#e3e8ee',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 300,
            letterSpacing: '-0.1px',
            transition: 'all .15s',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          Custom
        </button>
      </div>

      {customMode && (
        <div style={{ marginTop: 10 }}>
          <TextInput
            value={amount}
            onChange={(v) => setAmount(v.replace(/[^\d.]/g, ''))}
            placeholder="0.00"
            prefix={currency}
            inputRef={customInputRef}
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------- Order summary */

function OrderSummaryRow({ label, sub, value, mute, strong, currency }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16,
      padding: '10px 0',
    }}>
      <div>
        <div style={{
          fontSize: 13, color: mute ? '#64748d' : '#0d253d',
          letterSpacing: '-0.1px', fontWeight: 300,
        }}>{label}</div>
        {sub && (
          <div style={{
            marginTop: 2, fontSize: 11, color: '#64748d',
            letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"',
          }}>{sub}</div>
        )}
      </div>
      <Num
        size={strong ? 17 : 14}
        weight={300}
        track={strong ? '-0.3px' : '-0.42px'}
        color={mute ? '#64748d' : '#0d253d'}
      >
        {currency}{value}
      </Num>
    </div>
  );
}

function OrderSummary({ amount, coverFees, currency, processing }) {
  // Math is illustrative — production replaces with server-quoted breakdown.
  const gross = Number(amount) || 0;
  const eudaimoniaFee = +(gross * 0.01).toFixed(2);
  const endaomentFee = +(gross * 0.015).toFixed(2);
  // Card processing approx: 2.9% + 0.30 — disclosed in plain sight per the brand.
  const cardFee = gross > 0 ? +(gross * 0.029 + 0.30).toFixed(2) : 0;

  const baseTotal = coverFees ? +(gross + eudaimoniaFee + cardFee).toFixed(2) : gross;
  const netOnChain = +(gross - eudaimoniaFee - endaomentFee).toFixed(2);

  const fmt = (n) => n.toFixed(2);

  return (
    <aside style={{
      background: '#fff',
      border: '1px solid #e3e8ee',
      borderRadius: 12,
      overflow: 'hidden',
      position: 'sticky', top: 24,
      boxShadow: '0 8px 24px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)',
    }}>
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid #eef2f6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <EyebrowLabel>Order summary</EyebrowLabel>
        <Mono size={11} color="#64748d">draft · /donate/{('pcrf').padEnd(4, '_')}</Mono>
      </div>

      <div style={{ padding: '8px 24px 4px' }}>
        {processing ? (
          <SummarySkeleton />
        ) : (
          <React.Fragment>
            <OrderSummaryRow
              label="Gross donation"
              sub="Amount you intend to give"
              value={fmt(gross)}
              currency={currency}
            />
            <div style={{ borderTop: '1px dashed #e3e8ee' }} />
            <OrderSummaryRow
              label="Eudaimonia routing fee"
              sub="1.00% · taken on-chain, visible in receipt"
              value={fmt(eudaimoniaFee)}
              mute
              currency={currency}
            />
            <OrderSummaryRow
              label="Endaoment fee"
              sub="1.50% · charitable infrastructure"
              value={fmt(endaomentFee)}
              mute
              currency={currency}
            />
            {coverFees && (
              <OrderSummaryRow
                label="Card processing"
                sub="2.90% + €0.30 · covered by you"
                value={fmt(cardFee)}
                mute
                currency={currency}
              />
            )}
            <div style={{ borderTop: '1px dashed #e3e8ee' }} />
            <div style={{
              padding: '16px 0 14px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              gap: 16,
              background: 'linear-gradient(180deg, rgba(83,58,253,0.05), rgba(83,58,253,0.0))',
              borderRadius: 8,
              margin: '8px -10px',
              padding: '14px 10px',
            }}>
              <div>
                <div style={{
                  fontSize: 13, color: '#0d253d', fontWeight: 400,
                  letterSpacing: '-0.1px',
                }}>Net to charity (on-chain)</div>
                <div style={{
                  marginTop: 2, fontSize: 11, color: '#533afd',
                  letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"',
                }}>USDC · Base · Endaoment Org Fund</div>
              </div>
              <Num size={26} weight={300} track="-0.4px" color="#0d253d">
                {currency}{fmt(netOnChain > 0 ? netOnChain : 0)}
              </Num>
            </div>
          </React.Fragment>
        )}
      </div>

      <div style={{
        padding: '16px 24px',
        background: '#f6f9fc',
        borderTop: '1px solid #eef2f6',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <div style={{
            fontSize: 13, color: '#0d253d', letterSpacing: '-0.1px', fontWeight: 400,
          }}>You pay today</div>
          <div style={{
            marginTop: 2, fontSize: 11, color: '#64748d', letterSpacing: '-0.1px',
          }}>Card or Apple Pay · {currency} charged once</div>
        </div>
        {processing ? (
          <Pulse width={92} height={22} radius={4} />
        ) : (
          <Num size={22} weight={300} track="-0.4px">
            {currency}{fmt(baseTotal)}
          </Num>
        )}
      </div>
    </aside>
  );
}

function SummarySkeleton() {
  // Subtle, unmistakably non-final. Three rows + a hero row.
  return (
    <div style={{ padding: '8px 0 12px' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', borderBottom: i < 2 ? '1px dashed #e3e8ee' : 'none',
          gap: 16,
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Pulse width={i === 0 ? 140 : 180} height={11} delay={i * 0.12} />
            <Pulse width={i === 0 ? 200 : 160} height={9} delay={i * 0.12 + 0.05} />
          </div>
          <Pulse width={64} height={14} delay={i * 0.12 + 0.08} />
        </div>
      ))}
      <div style={{
        marginTop: 8,
        padding: '14px 10px',
        background: 'linear-gradient(180deg, rgba(83,58,253,0.05), rgba(83,58,253,0.0))',
        borderRadius: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Pulse width={160} height={12} delay={0.4} />
          <Pulse width={210} height={9} delay={0.45} />
        </div>
        <Pulse width={86} height={22} radius={4} delay={0.5} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Processing strip */
// Shimmer rail under the CTA — replaces the forbidden spinner.

function ProcessingStrip({ phase }) {
  // phase 0..3
  const stages = ['Authorizing card', 'Minting USDC on Base', 'Routing through Eudaimonia', 'Almost there'];
  return (
    <div style={{
      marginTop: 14,
      padding: '12px 14px',
      background: '#f6f9fc',
      border: '1px solid #e3e8ee',
      borderRadius: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 12, color: '#0d253d', letterSpacing: '-0.1px',
        }}>{stages[phase] || stages[stages.length - 1]}</span>
        <Mono size={11} color="#64748d">tx draft · pending</Mono>
      </div>
      {/* 4 dashes — one fills at a time */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 9999,
            background: i <= phase ? '#533afd' : '#e3e8ee',
            opacity: i === phase ? 1 : (i < phase ? 0.5 : 1),
            transition: 'background .25s, opacity .25s',
            animation: i === phase ? 'philDash 1.0s ease-in-out infinite' : 'none',
          }} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Page */

function CheckoutPage({
  campaignId = 'pcrf',
  state = 'default',          // 'default' | 'processing'
  currency = '€',
  showNote = true,
  coverFees = false,
  layout = 'split',           // 'split' | 'centered'
}) {
  const campaign = CAMPAIGNS[campaignId] || CAMPAIGNS.pcrf;

  const [amount, setAmount] = React.useState('50');
  const [customMode, setCustomMode] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [note, setNote] = React.useState('');
  const [phase, setPhase] = React.useState(0);

  const processing = state === 'processing';

  // Cycle processing phases while in that state
  React.useEffect(() => {
    if (!processing) { setPhase(0); return; }
    setPhase(0);
    const id = setInterval(() => setPhase((p) => (p + 1) % 4), 1100);
    return () => clearInterval(id);
  }, [processing]);

  const grossNumber = Number(amount) || 0;

  const formSide = (
    <div style={{
      background: '#fff',
      border: '1px solid #e3e8ee',
      borderRadius: 12,
      padding: 28,
      display: 'flex', flexDirection: 'column', gap: 22,
      boxShadow: '0 1px 3px rgba(0,55,112,0.06)',
    }}>
      <div>
        <EyebrowLabel>Donate to</EyebrowLabel>
        <h1 style={{
          margin: '6px 0 0', fontSize: 30, fontWeight: 300,
          letterSpacing: '-0.6px', lineHeight: 1.1, color: '#0d253d',
          textWrap: 'pretty',
        }}>
          {campaign.short}
        </h1>
        <p style={{
          margin: '8px 0 0', fontSize: 14, lineHeight: 1.5,
          color: '#64748d', letterSpacing: '-0.1px', maxWidth: 520,
          fontWeight: 300,
        }}>
          {campaign.mission}
        </p>
      </div>

      <div style={{ borderTop: '1px solid #eef2f6' }} />

      <AmountSelector
        amount={amount}
        setAmount={setAmount}
        customMode={customMode}
        setCustomMode={setCustomMode}
        currency={currency}
        disabled={processing}
      />

      <div>
        <FieldLabel hint="For your receipt link">Email</FieldLabel>
        <TextInput
          value={email}
          onChange={setEmail}
          placeholder="you@somewhere.org"
          type="email"
          autoComplete="email"
        />
        <div style={{
          marginTop: 6, fontSize: 11, color: '#64748d', letterSpacing: '-0.1px',
        }}>
          We send one email with your public receipt link. No newsletters, ever.
        </div>
      </div>

      {showNote && (
        <div>
          <FieldLabel hint="Optional · shown on the public receipt">
            Leave a note
          </FieldLabel>
          <TextArea
            value={note}
            onChange={setNote}
            placeholder="For my grandmother, who taught me what eudaimonia means."
          />
        </div>
      )}

      <div style={{ borderTop: '1px solid #eef2f6' }} />

      {/* CTA */}
      <button
        type="button"
        disabled={processing || grossNumber <= 0}
        style={{
          appearance: 'none',
          width: '100%',
          background: processing
            ? '#1c1e54'
            : (grossNumber > 0 ? '#533afd' : '#a8c3de'),
          color: '#fff',
          border: 'none',
          borderRadius: 9999,
          padding: '14px 22px',
          fontFamily: 'inherit',
          fontSize: 15,
          fontWeight: 400,
          letterSpacing: '-0.1px',
          cursor: processing || grossNumber <= 0 ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background .15s',
          opacity: grossNumber <= 0 && !processing ? 0.85 : 1,
        }}
      >
        {processing ? (
          <React.Fragment>
            Processing payment
            <span style={{
              display: 'inline-flex', gap: 3, marginLeft: 6,
              alignItems: 'center',
            }}>
              <span style={{
                width: 3, height: 3, borderRadius: 9999, background: '#fff',
                animation: 'philDot 1.2s ease-in-out 0s infinite',
              }} />
              <span style={{
                width: 3, height: 3, borderRadius: 9999, background: '#fff',
                animation: 'philDot 1.2s ease-in-out 0.15s infinite',
              }} />
              <span style={{
                width: 3, height: 3, borderRadius: 9999, background: '#fff',
                animation: 'philDot 1.2s ease-in-out 0.3s infinite',
              }} />
            </span>
          </React.Fragment>
        ) : (
          <React.Fragment>
            Continue to payment
            <ArrowRight color="#fff" />
          </React.Fragment>
        )}
      </button>

      {processing && <ProcessingStrip phase={phase} />}

      {/* Methods + trust */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          fontSize: 11, color: '#64748d', letterSpacing: '-0.1px',
        }}>
          <LockIcon /> <span>Card · Apple Pay · Google Pay</span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, color: '#64748d', letterSpacing: '-0.1px',
        }}>
          <span>Processed by</span>
          <span style={{
            padding: '2px 8px', borderRadius: 4, background: '#0d253d',
            color: '#fff', fontSize: 10, letterSpacing: '0.02em',
            fontWeight: 400,
          }}>stripe</span>
          <span style={{ width: 3, height: 3, borderRadius: 9999, background: '#a8c3de' }} />
          <span>Routed via Endaoment</span>
        </div>
      </div>
    </div>
  );

  const summarySide = (
    <OrderSummary
      amount={amount}
      coverFees={coverFees}
      currency={currency}
      processing={processing}
    />
  );

  return (
    <div style={{
      background: '#fff',
      color: '#0d253d',
      fontFamily: '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
      fontWeight: 300,
      fontFeatureSettings: '"ss01"',
      WebkitFontSmoothing: 'antialiased',
      minHeight: '100%',
      position: 'relative',
    }}>
      {/* Animations: pulse + dash + dot. Defined inline so they ship with the component. */}
      <style>{`
        @keyframes philPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        @keyframes philDash {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        @keyframes philDot {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-1px); }
        }
      `}</style>

      <NavBar />

      <section style={{
        position: 'relative',
        padding: '64px 64px 96px',
        overflow: 'hidden',
      }}>
        <CheckoutMesh />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1120, margin: '0 auto',
        }}>
          {/* Eyebrow header */}
          <div style={{ marginBottom: 28 }}>
            <EyebrowLabel>Checkout · Step 1 of 2</EyebrowLabel>
            <div style={{
              marginTop: 8,
              display: 'flex', alignItems: 'center', gap: 12,
              fontSize: 13, color: '#64748d', letterSpacing: '-0.1px',
            }}>
              <span style={{
                fontSize: 22, fontWeight: 300, letterSpacing: '-0.22px',
                color: '#0d253d',
              }}>Your donation</span>
              <span style={{ width: 28, height: 1, background: '#a8c3de' }} />
              <span style={{ color: '#a8c3de' }}>Payment</span>
              <span style={{ width: 28, height: 1, background: '#a8c3de' }} />
              <span style={{ color: '#a8c3de' }}>Receipt</span>
            </div>
          </div>

          {/* Campaign summary card sits above the split */}
          <div style={{ marginBottom: 24 }}>
            <CampaignSummary campaign={campaign} />
          </div>

          {/* Split */}
          {layout === 'centered' ? (
            <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {formSide}
              {summarySide}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
              gap: 32,
              alignItems: 'flex-start',
            }}>
              <div>{formSide}</div>
              <div>{summarySide}</div>
            </div>
          )}

          {/* Footnote */}
          <div style={{
            marginTop: 32,
            padding: '16px 20px',
            background: '#fff',
            border: '1px solid #e3e8ee',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#64748d', letterSpacing: '-0.1px' }}>
              <EyebrowLabel color="#0d253d">In plain sight</EyebrowLabel>
              <span>
                The 1% Eudaimonia fee is taken on-chain and is visible in your public receipt. The 1.5% Endaoment
                fee covers the charitable infrastructure. We never custody your funds.
              </span>
            </div>
            <a href="#" onClick={(e) => e.preventDefault()} style={{
              color: '#533afd', fontSize: 12, textDecoration: 'none', letterSpacing: '-0.1px',
              whiteSpace: 'nowrap',
            }}>
              Read the fee policy <ArrowRight color="#533afd" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, {
  CheckoutPage,
  CAMPAIGNS,
});
