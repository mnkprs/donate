// receipt.jsx — Eudaimonia public donation receipt
// Single page: Hero, Pizza Tracker, Charity card, Verification card, Share row, Footer.
// Original Eudaimonia identity (φ mark + Greek-rooted wordmark). Design tokens per DESIGN.md.

const RECEIPT_DATA = {
  donorShort: '0xe0adb1…7a097bb',
  charity: 'Black Women in Blockchain Inc',
  ein: '87-1055621',
  mission: 'Building economic mobility for Black women through blockchain literacy, fellowship, and on-chain career pathways.',
  amount: '1.00',
  amountUsdc: '1.001017',
  date: 'May 30, 2025',
  time: '5:34 PM UTC',
  network: 'Base',
  txid: '0xdc671195100031cab810c6c9ad6da7a1e43212f2bb3b0d9c0ece38ac0e7a78ed',
  txidShort: '0xdc67…78ed',
  block: '30,918,548',
  confirmations: '15,041,902',
  ethIn: '0.0000627',
  rate: '1 ETH = 15,975 USDC',
  platformFee: '0.01',
  endaomentFee: '0.015',
  orgFund: '0x10fd…a589',
  charityAddr: '0x10e9…eb82',
  donorFee: '0.00',
};

const STAGES = [
  {
    n: 1,
    title: 'Donated',
    short: 'Donor wallet sent funds',
    timestamp: '17:34:01 UTC',
    relative: 'May 30, 2025',
    amount: '0.0000627',
    unit: 'ETH',
    address: RECEIPT_DATA.donorShort,
    addressLabel: 'From',
    detail: 'Donor signed and broadcast the tx from their wallet. No personal data is stored; only the wallet hash.',
    contract: 'Wallet · EOA',
  },
  {
    n: 2,
    title: 'Converted',
    short: 'ETH → USDC via Uniswap V3',
    timestamp: '17:34:02 UTC',
    relative: '+1s',
    amount: '1.001017',
    unit: 'USDC',
    address: 'Uniswap V3 · 0.05% pool',
    addressLabel: 'Pool',
    detail: 'Swapped on the Base ETH/USDC 0.05% pool. Slippage settled at $0.00; rate locked at 1 ETH = 15,975 USDC.',
    contract: 'Uniswap V3 Router',
  },
  {
    n: 3,
    title: 'Routed',
    short: 'Through Endaoment · 1.5% fee taken',
    timestamp: '17:34:04 UTC',
    relative: '+2s',
    amount: '0.986017',
    unit: 'USDC',
    address: RECEIPT_DATA.orgFund,
    addressLabel: 'Contract',
    detail: 'OrgFundFactory routes donations to the recipient charity\u2019s Endaoment fund based on its EIN. Endaoment\u2019s 1.5% fee ($0.015) is taken on-chain at this step.',
    contract: 'Endaoment · OrgFundFactory',
    feeOnHover: { label: 'Endaoment fee', amount: '0.015', to: '0x5e8e…3b14' },
  },
  {
    n: 4,
    title: 'Eudaimonia fee',
    short: 'Future stage · not active for this tx',
    timestamp: '—',
    relative: 'inactive',
    amount: '0.00',
    unit: 'USDC',
    address: 'Not yet deployed',
    addressLabel: 'Status',
    detail: 'Future Eudaimonia donations will route through our 1% platform fee here. This receipt is for an existing Endaoment donation, so no Eudaimonia fee was charged.',
    contract: 'Eudaimonia · Treasury (future)',
    inactive: true,
  },
  {
    n: 5,
    title: 'Settled',
    short: 'Arrived at charity address',
    timestamp: '17:34:07 UTC',
    relative: '+3s',
    amount: '0.986017',
    unit: 'USDC',
    address: RECEIPT_DATA.charityAddr,
    addressLabel: 'Charity',
    detail: '15,041,902 confirmations. Final. The funds are spendable by the charity\u2019s multisig.',
    contract: 'Black Women in Blockchain · Fund',
    terminal: true,
  },
];

/* ----------------------------- Atoms ---------------------------------- */

function PhiMark({ size = 22, color = '#0d253d' }) {
  // Original Eudaimonia mark: stylized φ inside a thin circle, hand-set to feel
  // like a wall-label monogram rather than a logo lockup.
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
        fontSize: size,
        fontWeight: 300,
        letterSpacing: '-0.2px',
        fontFeatureSettings: '"ss01"',
        color,
      }}>Eudaimonia</span>
    </div>
  );
}

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = () => {
    try {
      navigator.clipboard.writeText(value);
    } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={onCopy}
      style={{
        appearance: 'none',
        border: '1px solid #e3e8ee',
        background: '#fff',
        color: '#0d253d',
        fontSize: 12,
        fontWeight: 400,
        fontFamily: 'inherit',
        letterSpacing: '-0.1px',
        padding: '4px 10px',
        borderRadius: 9999,
        cursor: 'pointer',
        transition: 'all .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0d253d'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e3e8ee'; }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

function VerifyLink({ label = 'Verify on BaseScan' }) {
  return (
    <a href="#" onClick={(e) => e.preventDefault()} style={{
      color: '#533afd',
      fontSize: 12,
      fontWeight: 400,
      textDecoration: 'none',
      letterSpacing: '-0.1px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
    }}>
      {label}
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path d="M2 7L7 2M7 2H3.2M7 2V5.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </a>
  );
}

function Mono({ children, size = 13, color = '#0d253d' }) {
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
      fontSize: size,
      fontWeight: 400,
      color,
      letterSpacing: '-0.2px',
      fontFeatureSettings: '"tnum","ss01"',
    }}>{children}</span>
  );
}

function Num({ children, size = 14, weight = 400, color = '#0d253d', track = '-0.42px' }) {
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

function EyebrowLabel({ children, color = '#64748d' }) {
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

/* ----------------------------- Hero ----------------------------------- */

function Hero({ data }) {
  return (
    <section style={{
      position: 'relative',
      paddingTop: 96,
      paddingBottom: 88,
      paddingLeft: 64,
      paddingRight: 64,
      textAlign: 'center',
      overflow: 'hidden',
    }}>
      {/* Subtle atmospheric wash — kept very quiet so the page reads "museum
          wall label", not "marketing hero". */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        inset: '-200px -200px auto -200px',
        height: 520,
        background: 'radial-gradient(60% 80% at 20% 30%, rgba(245,233,212,0.55), transparent 60%), radial-gradient(50% 70% at 80% 20%, rgba(249,107,238,0.10), transparent 60%), radial-gradient(60% 80% at 60% 40%, rgba(83,58,253,0.10), transparent 65%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{
        position: 'absolute',
        top: 32,
        left: 64,
        zIndex: 2,
      }}>
        <Wordmark size={15} />
      </div>

      <div style={{
        position: 'absolute',
        top: 32,
        right: 64,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <span style={{
          fontSize: 12,
          color: '#64748d',
          letterSpacing: '-0.1px',
        }}>Receipt</span>
        <Mono size={12} color="#64748d">{RECEIPT_DATA.txidShort}</Mono>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: '#fff',
          border: '1px solid #e3e8ee',
          borderRadius: 9999,
          marginBottom: 40,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 9999, background: '#533afd',
            boxShadow: '0 0 0 4px rgba(83,58,253,0.12)',
          }} />
          <span style={{ fontSize: 12, color: '#0d253d', letterSpacing: '-0.1px' }}>
            Verified on-chain · 15,041,902 confirmations
          </span>
        </div>

        <h1 style={{
          margin: 0,
          fontSize: 56,
          fontWeight: 300,
          letterSpacing: '-1.4px',
          lineHeight: 1.05,
          color: '#0d253d',
          textWrap: 'pretty',
        }}>
          Anonymous donor gave{' '}
          <span style={{
            fontFeatureSettings: '"tnum","ss01"',
            letterSpacing: '-1.4px',
            color: '#0d253d',
            fontWeight: 300,
          }}>${RECEIPT_DATA.amount}</span>{' '}
          to{' '}
          <span style={{
            fontWeight: 300,
            color: '#0d253d',
            backgroundImage: 'linear-gradient(transparent 68%, rgba(83,58,253,0.18) 68%, rgba(83,58,253,0.18) 92%, transparent 92%)',
          }}>{RECEIPT_DATA.charity}</span>.
        </h1>

        <div style={{
          marginTop: 24,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 18,
          color: '#64748d',
          fontSize: 15,
          letterSpacing: '-0.1px',
          fontFeatureSettings: '"tnum","ss01"',
        }}>
          <span>{RECEIPT_DATA.date}</span>
          <span style={{ width: 3, height: 3, borderRadius: 9999, background: '#a8c3de' }} />
          <span>Settled on {RECEIPT_DATA.network}</span>
          <span style={{ width: 3, height: 3, borderRadius: 9999, background: '#a8c3de' }} />
          <span>{RECEIPT_DATA.time}</span>
        </div>

        {/* charity anchor — small label + placeholder logo slot */}
        <div style={{
          marginTop: 56,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px 10px 12px',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #e3e8ee',
          borderRadius: 9999,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9999,
            background: 'linear-gradient(135deg, #1c1e54 0%, #533afd 100%)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 400, letterSpacing: '0.05em',
          }}>BW</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: '#0d253d', letterSpacing: '-0.1px' }}>{RECEIPT_DATA.charity}</div>
            <div style={{ fontSize: 11, color: '#64748d', letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"' }}>
              EIN {RECEIPT_DATA.ein} · 501(c)(3)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Pizza Tracker ---------------------------- */

function PizzaTracker({ variant = 'card' }) {
  const [active, setActive] = React.useState(null);
  const minimal = variant === 'minimal';

  return (
    <section style={{
      padding: '32px 64px 88px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 36,
      }}>
        <div>
          <EyebrowLabel>The path</EyebrowLabel>
          <h2 style={{
            margin: '8px 0 0',
            fontSize: 26,
            fontWeight: 300,
            letterSpacing: '-0.26px',
            color: '#0d253d',
          }}>Where the dollar went, step by step.</h2>
        </div>
        <div style={{ fontSize: 13, color: '#64748d', letterSpacing: '-0.1px' }}>
          Five stops · six seconds end-to-end · all final.
        </div>
      </div>

      {/* Track */}
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
      }}>
        {/* connecting line */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          top: 18,
          left: 'calc(10% + 8px)',
          right: 'calc(10% + 8px)',
          height: 1,
          background: 'linear-gradient(to right, #533afd 0%, #533afd 100%)',
          opacity: 0.35,
          zIndex: 0,
        }} />

        {STAGES.map((s, i) => {
          const isActive = active === i;
          const isFee = s.fee;
          const isInactive = s.inactive;
          return (
            <div
              key={s.n}
              onMouseEnter={() => !isInactive && setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{
                position: 'relative',
                paddingTop: 0,
                cursor: 'default',
              }}
            >
              {/* Node */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 1,
                marginBottom: 24,
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9999,
                  background: '#fff',
                  border: isInactive ? '1px dashed #a8c3de' : `1px solid ${isFee ? '#a8c3de' : '#533afd'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all .2s',
                  boxShadow: isActive ? '0 0 0 6px rgba(83,58,253,0.10)' : 'none',
                }}>
                  {isInactive ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="#a8c3de" strokeWidth="1" strokeDasharray="2 2" />
                    </svg>
                  ) : (
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: 9999,
                      background: isFee ? '#1c1e54' : '#533afd',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.3 5.7L6.5 2.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Card */}
              <div style={{
                background: minimal ? 'transparent' : (isActive ? '#fff' : '#fafbfc'),
                border: minimal ? 'none' : (isInactive ? '1px dashed #e3e8ee' : (isActive ? '1px solid #e3e8ee' : '1px solid #eef2f6')),
                borderRadius: 12,
                padding: minimal ? '0 16px' : 16,
                transition: 'all .18s',
                boxShadow: isActive && !minimal && !isInactive ? '0 8px 24px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)' : 'none',
                minHeight: 220,
                opacity: isInactive ? 0.72 : 1,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 6,
                  marginBottom: 4,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 400, letterSpacing: '0.1em',
                    color: '#64748d', fontVariantNumeric: 'tabular-nums',
                  }}>0{s.n}</span>
                  <span style={{
                    fontSize: 16, fontWeight: 300, letterSpacing: '-0.2px',
                    color: isInactive ? '#64748d' : '#0d253d',
                  }}>{s.title}</span>
                  {isInactive && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#64748d',
                      background: '#fff',
                      border: '1px dashed #a8c3de',
                      borderRadius: 9999,
                      padding: '2px 6px',
                    }}>Future</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#64748d', letterSpacing: '-0.1px', marginBottom: 14, minHeight: 36 }}>
                  {s.short}
                </div>

                {isInactive ? (
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: '#64748d',
                    letterSpacing: '-0.1px',
                    fontStyle: 'italic',
                  }}>
                    Future Eudaimonia donations will route a 1% platform fee here. This receipt is for an existing Endaoment donation, so no Eudaimonia fee was charged.
                  </p>
                ) : (
                  <React.Fragment>
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10,
                    }}>
                      <Num size={22} weight={300} track="-0.4px" color={isFee ? '#64748d' : '#0d253d'}>
                        {isFee && '−'}{s.amount}
                      </Num>
                      <span style={{ fontSize: 11, color: '#64748d', letterSpacing: '0.05em' }}>{s.unit}</span>
                    </div>

                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 6,
                      paddingTop: 10,
                      borderTop: '1px dashed #e3e8ee',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748d' }}>
                        <span>{s.addressLabel}</span>
                        <Mono size={11} color="#0d253d">{s.address}</Mono>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748d', fontFeatureSettings: '"tnum","ss01"' }}>
                        <span>{s.timestamp}</span>
                        <span>{s.relative}</span>
                      </div>
                      {s.feeOnHover && isActive && (
                        <div style={{
                          marginTop: 4,
                          padding: '6px 8px',
                          background: '#f6f9fc',
                          borderRadius: 6,
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: 11, color: '#273951',
                          fontFeatureSettings: '"tnum","ss01"',
                        }}>
                          <span style={{ color: '#64748d' }}>{s.feeOnHover.label} (1.5%)</span>
                          <span>−${s.feeOnHover.amount}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <VerifyLink label="Verify ↗" />
                    </div>
                  </React.Fragment>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------- Charity card ----------------------------- */

function CharityCard() {
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 64px 56px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '88px 1fr auto',
        gap: 28,
        alignItems: 'center',
        background: '#fff',
        border: '1px solid #e3e8ee',
        borderRadius: 12,
        padding: 32,
        boxShadow: '0 1px 3px rgba(0,55,112,0.08)',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: 12,
          background: 'linear-gradient(135deg, #1c1e54 0%, #533afd 100%)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 300, letterSpacing: '-0.4px',
        }}>BW</div>

        <div>
          <EyebrowLabel>Recipient</EyebrowLabel>
          <h3 style={{
            margin: '6px 0 4px',
            fontSize: 22, fontWeight: 300, letterSpacing: '-0.22px', color: '#0d253d',
          }}>{RECEIPT_DATA.charity}</h3>
          <div style={{ fontSize: 13, color: '#64748d', letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"', marginBottom: 10 }}>
            501(c)(3) · EIN {RECEIPT_DATA.ein} · Endaoment Org Fund
          </div>
          <p style={{
            margin: 0,
            fontSize: 15, fontWeight: 300, lineHeight: 1.45,
            color: '#273951', maxWidth: 580, letterSpacing: '-0.1px',
          }}>
            {RECEIPT_DATA.mission}
          </p>
        </div>

        <a href="#" onClick={(e) => e.preventDefault()} style={{
          color: '#fff',
          background: '#533afd',
          fontSize: 14,
          fontWeight: 400,
          padding: '8px 16px',
          borderRadius: 9999,
          textDecoration: 'none',
          letterSpacing: '-0.1px',
          whiteSpace: 'nowrap',
        }}>
          Visit charity →
        </a>
      </div>
    </section>
  );
}

/* ------------------------- Verification card -------------------------- */

function VerificationCard({ showFeeStrip = true }) {
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 64px 56px' }}>
      <div style={{ marginBottom: 16 }}>
        <EyebrowLabel>Proof</EyebrowLabel>
      </div>
      <div style={{
        background: '#fff',
        border: '1px solid #e3e8ee',
        borderRadius: 12,
        display: 'grid',
        gridTemplateColumns: '2.4fr 1fr 1fr',
      }}>
        <div style={{ padding: 28, borderRight: '1px solid #e3e8ee' }}>
          <div style={{ fontSize: 11, color: '#64748d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Transaction hash
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Mono size={13} color="#0d253d">{RECEIPT_DATA.txid}</Mono>
            <CopyButton value={RECEIPT_DATA.txid} />
          </div>
          <div style={{ marginTop: 12 }}>
            <VerifyLink label="Open on BaseScan ↗" />
          </div>
        </div>

        <div style={{ padding: 28, borderRight: '1px solid #e3e8ee' }}>
          <div style={{ fontSize: 11, color: '#64748d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Block
          </div>
          <Num size={22} weight={300} track="-0.3px">{RECEIPT_DATA.block}</Num>
          <div style={{ fontSize: 12, color: '#64748d', marginTop: 6, fontFeatureSettings: '"tnum","ss01"' }}>
            {RECEIPT_DATA.confirmations} confirmations · final
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <div style={{ fontSize: 11, color: '#64748d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Network
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9999,
              background: '#0052ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 12, height: 12, borderRadius: 9999, background: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#0d253d', letterSpacing: '-0.1px' }}>Base</div>
              <div style={{ fontSize: 11, color: '#64748d', letterSpacing: '-0.1px' }}>Ethereum L2</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fee disclosure strip — small, honest */}
      {showFeeStrip && (
      <div style={{
        marginTop: 18,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        background: '#f6f9fc',
        border: '1px solid #e3e8ee',
        borderRadius: 8,
        fontSize: 12,
        color: '#273951',
      }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', fontFeatureSettings: '"tnum","ss01"' }}>
          <span><span style={{ color: '#64748d' }}>Donor paid</span> $1.00</span>
          <span><span style={{ color: '#64748d' }}>Network fee</span> $0.00 (sponsored)</span>
          <span><span style={{ color: '#64748d' }}>Endaoment fee</span> $0.015 (1.5%)</span>
          <span><span style={{ color: '#64748d' }}>Eudaimonia fee</span> not active</span>
          <span style={{ paddingLeft: 16, borderLeft: '1px solid #e3e8ee' }}>
            <span style={{ color: '#64748d' }}>Charity received</span> <strong style={{ color: '#0d253d', fontWeight: 400 }}>$0.985</strong>
          </span>
        </div>
      </div>
      )}
    </section>
  );
}

/* ----------------------------- Share row ------------------------------ */

function ShareButton({ icon, label, primary }) {
  return (
    <button style={{
      appearance: 'none',
      border: primary ? 'none' : '1px solid #e3e8ee',
      background: primary ? '#0d253d' : '#fff',
      color: primary ? '#fff' : '#0d253d',
      fontSize: 14,
      fontWeight: 400,
      fontFamily: 'inherit',
      letterSpacing: '-0.1px',
      padding: '10px 18px',
      borderRadius: 9999,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'all .15s',
    }}>
      {icon}{label}
    </button>
  );
}

function ShareRow() {
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 64px 88px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '32px 0',
        borderTop: '1px solid #e3e8ee',
        borderBottom: '1px solid #e3e8ee',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.22px', color: '#0d253d' }}>Share this receipt</div>
          <div style={{ fontSize: 13, color: '#64748d', marginTop: 4, letterSpacing: '-0.1px' }}>
            Anyone with the link can verify it. We don\u2019t track who opens it.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <ShareButton primary label="Copy link" icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 8.5L8.5 5.5M6 3L7.5 1.5C8.5 0.5 10.1 0.5 11.1 1.5L12.5 2.9C13.5 3.9 13.5 5.5 12.5 6.5L11 8M8 11L6.5 12.5C5.5 13.5 3.9 13.5 2.9 12.5L1.5 11.1C0.5 10.1 0.5 8.5 1.5 7.5L3 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          } />
          <ShareButton label="Twitter" icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M10.5 1H12.7L8 6.4L13.5 13H9.2L5.8 8.6L1.9 13H-0.3L4.7 7.2L-0.5 1H3.9L7 5L10.5 1ZM9.7 11.7H10.9L3.4 2.2H2.1L9.7 11.7Z"/>
            </svg>
          } />
          <ShareButton label="WhatsApp" icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 0.5C3.4 0.5 0.5 3.4 0.5 7C0.5 8.2 0.8 9.3 1.4 10.3L0.5 13.5L3.8 12.6C4.7 13.1 5.8 13.4 7 13.4C10.6 13.4 13.5 10.5 13.5 6.9C13.5 3.3 10.6 0.5 7 0.5Z" stroke="currentColor" strokeWidth="1" />
              <path d="M4.5 4.5C4.5 4.5 5 4 5.5 4.5C6 5 6.2 5.5 6 6C5.8 6.5 5.5 6.5 5.8 7C6.1 7.5 6.5 7.9 7 8.2C7.5 8.5 7.5 8.2 8 8C8.5 7.8 9 8 9.5 8.5C10 9 9.5 9.5 9 9.7C8.5 9.9 7 9.5 5.5 8C4 6.5 4.3 5 4.5 4.5Z" fill="currentColor" />
            </svg>
          } />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Footer -------------------------------- */

function Footer() {
  return (
    <footer style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 64px 72px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#64748d',
        fontSize: 13,
        letterSpacing: '-0.1px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Wordmark size={13} color="#64748d" />
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#533afd', textDecoration: 'none' }}>What is Eudaimonia? →</a>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#64748d', textDecoration: 'none' }}>How fees work</a>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#64748d', textDecoration: 'none' }}>Contact</a>
        </div>
      </div>
      <div style={{
        marginTop: 18,
        fontSize: 11, color: '#64748d', letterSpacing: '-0.1px', maxWidth: 720, lineHeight: 1.5,
      }}>
        Eudaimonia is a non-custodial donation router. Donations are tax-deductible to the extent allowed by law,
        processed through Endaoment Inc. (EIN 84-3104578). This receipt is generated from on-chain data and is
        verifiable independently.
      </div>
    </footer>
  );
}

/* ----------------------------- Page ----------------------------------- */

function EudaimoniaReceipt({ trackerStyle = 'card', showFeeStrip = true }) {
  return (
    <div style={{
      background: '#ffffff',
      color: '#0d253d',
      fontFamily: '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
      fontWeight: 300,
      fontFeatureSettings: '"ss01"',
      WebkitFontSmoothing: 'antialiased',
      minHeight: '100%',
    }}>
      <Hero />
      <PizzaTracker variant={trackerStyle} />
      <CharityCard />
      <VerificationCard showFeeStrip={showFeeStrip} />
      <ShareRow />
      <Footer />
    </div>
  );
}

Object.assign(window, {
  EudaimoniaReceipt,
  PhiMark,
  Wordmark,
  RECEIPT_DATA,
  STAGES,
  Mono,
  Num,
  EyebrowLabel,
  CopyButton,
  VerifyLink,
});
