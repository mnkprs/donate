// receipt-mobile.jsx — Philotimo receipt, mobile (390px width)
// Vertical Pizza Tracker; collapsed verification grid; same content, restacked.

function MobileHero() {
  return (
    <section style={{
      position: 'relative',
      padding: '64px 24px 48px',
      textAlign: 'left',
      overflow: 'hidden',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute',
        inset: '-120px -120px auto -120px',
        height: 380,
        background: 'radial-gradient(70% 70% at 30% 30%, rgba(245,233,212,0.6), transparent 60%), radial-gradient(60% 60% at 80% 20%, rgba(249,107,238,0.10), transparent 60%), radial-gradient(70% 70% at 60% 40%, rgba(83,58,253,0.12), transparent 65%)',
        filter: 'blur(28px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, marginBottom: 36 }}>
        <Wordmark size={14} />
        <Mono size={11} color="#64748d">0xdc67…78ed</Mono>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          background: '#fff',
          border: '1px solid #e3e8ee',
          borderRadius: 9999,
          marginBottom: 24,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: 9999, background: '#533afd',
            boxShadow: '0 0 0 3px rgba(83,58,253,0.12)',
          }} />
          <span style={{ fontSize: 11, color: '#0d253d', letterSpacing: '-0.1px' }}>
            Verified on-chain
          </span>
        </div>

        <h1 style={{
          margin: 0,
          fontSize: 34,
          fontWeight: 300,
          letterSpacing: '-0.85px',
          lineHeight: 1.1,
          color: '#0d253d',
          textWrap: 'pretty',
        }}>
          Anonymous donor gave{' '}
          <span style={{ fontFeatureSettings: '"tnum","ss01"' }}>$1.00</span>{' '}
          to{' '}
          <span style={{
            backgroundImage: 'linear-gradient(transparent 70%, rgba(83,58,253,0.18) 70%, rgba(83,58,253,0.18) 92%, transparent 92%)',
          }}>{RECEIPT_DATA.charity}</span>.
        </h1>

        <div style={{
          marginTop: 16,
          color: '#64748d',
          fontSize: 13,
          letterSpacing: '-0.1px',
          fontFeatureSettings: '"tnum","ss01"',
          lineHeight: 1.5,
        }}>
          {RECEIPT_DATA.date} · {RECEIPT_DATA.time}<br />
          Settled on {RECEIPT_DATA.network} · Verified on-chain
        </div>

        <div style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px 8px 8px',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #e3e8ee',
          borderRadius: 9999,
          width: 'fit-content',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 9999,
            background: 'linear-gradient(135deg, #1c1e54 0%, #533afd 100%)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10,
          }}>BW</div>
          <div>
            <div style={{ fontSize: 12, color: '#0d253d', letterSpacing: '-0.1px' }}>{RECEIPT_DATA.charity}</div>
            <div style={{ fontSize: 10, color: '#64748d', fontFeatureSettings: '"tnum","ss01"' }}>EIN {RECEIPT_DATA.ein}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileTracker() {
  return (
    <section style={{ padding: '16px 24px 48px' }}>
      <EyebrowLabel>The path</EyebrowLabel>
      <h2 style={{
        margin: '8px 0 28px',
        fontSize: 22, fontWeight: 300, letterSpacing: '-0.22px', color: '#0d253d',
      }}>Where the dollar went.</h2>

      <div style={{ position: 'relative' }}>
        {/* vertical line */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          left: 17,
          top: 12,
          bottom: 12,
          width: 1,
          background: 'rgba(83,58,253,0.25)',
        }} />

        {STAGES.map((s, i) => {
          const isInactive = s.inactive;
          return (
          <div key={s.n} style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr',
            gap: 16,
            paddingBottom: i === STAGES.length - 1 ? 0 : 24,
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9999,
                background: '#fff',
                border: isInactive ? '1px dashed #a8c3de' : `1px solid ${s.fee ? '#a8c3de' : '#533afd'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isInactive ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="#a8c3de" strokeWidth="1" strokeDasharray="2 2" />
                  </svg>
                ) : (
                  <div style={{
                    width: 14, height: 14, borderRadius: 9999,
                    background: s.fee ? '#1c1e54' : '#533afd',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.3 5.7L6.5 2.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: '#fff',
              border: isInactive ? '1px dashed #e3e8ee' : '1px solid #e3e8ee',
              borderRadius: 12,
              padding: 16,
              opacity: isInactive ? 0.78 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.1em', color: '#64748d' }}>0{s.n}</span>
                  <span style={{ fontSize: 16, fontWeight: 300, letterSpacing: '-0.2px', color: isInactive ? '#64748d' : '#0d253d' }}>{s.title}</span>
                </div>
                {isInactive ? (
                  <span style={{
                    fontSize: 9, fontWeight: 500, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: '#64748d',
                    border: '1px dashed #a8c3de', borderRadius: 9999, padding: '2px 6px',
                  }}>Future</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <Num size={16} weight={300} track="-0.3px" color={s.fee ? '#64748d' : '#0d253d'}>
                      {s.fee && '−'}{s.amount}
                    </Num>
                    <span style={{ fontSize: 10, color: '#64748d', letterSpacing: '0.05em' }}>{s.unit}</span>
                  </div>
                )}
              </div>
              {isInactive ? (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#64748d', letterSpacing: '-0.1px', fontStyle: 'italic' }}>
                  Future Philotimo donations will route a 1% fee here. No Philotimo fee was charged on this transaction.
                </p>
              ) : (
                <React.Fragment>
                  <div style={{ fontSize: 12, color: '#64748d', letterSpacing: '-0.1px', marginBottom: 10 }}>
                    {s.short}
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    paddingTop: 10, borderTop: '1px dashed #e3e8ee',
                    fontSize: 11, color: '#64748d',
                  }}>
                    <Mono size={11} color="#0d253d">{s.address}</Mono>
                    <VerifyLink label="↗" />
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

function MobileCharityCard() {
  return (
    <section style={{ padding: '0 24px 32px' }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e3e8ee',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,55,112,0.08)',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: 'linear-gradient(135deg, #1c1e54 0%, #533afd 100%)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 300,
          }}>BW</div>
          <div>
            <EyebrowLabel>Recipient</EyebrowLabel>
            <h3 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 300, letterSpacing: '-0.2px', color: '#0d253d' }}>
              {RECEIPT_DATA.charity}
            </h3>
            <div style={{ fontSize: 11, color: '#64748d', fontFeatureSettings: '"tnum","ss01"' }}>
              501(c)(3) · EIN {RECEIPT_DATA.ein}
            </div>
          </div>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.5, color: '#273951', letterSpacing: '-0.1px' }}>
          {RECEIPT_DATA.mission}
        </p>
        <a href="#" onClick={(e) => e.preventDefault()} style={{
          color: '#fff', background: '#533afd', fontSize: 13, padding: '8px 14px',
          borderRadius: 9999, textDecoration: 'none', display: 'inline-block',
        }}>Visit charity →</a>
      </div>
    </section>
  );
}

function MobileVerification() {
  return (
    <section style={{ padding: '0 24px 32px' }}>
      <div style={{ marginBottom: 12 }}><EyebrowLabel>Proof</EyebrowLabel></div>
      <div style={{
        background: '#fff', border: '1px solid #e3e8ee', borderRadius: 12,
      }}>
        <div style={{ padding: 18, borderBottom: '1px solid #e3e8ee' }}>
          <div style={{ fontSize: 10, color: '#64748d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Transaction hash
          </div>
          <div style={{ wordBreak: 'break-all', marginBottom: 10 }}>
            <Mono size={11} color="#0d253d">{RECEIPT_DATA.txid}</Mono>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <CopyButton value={RECEIPT_DATA.txid} />
            <VerifyLink label="Open on BaseScan ↗" />
          </div>
        </div>
        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Block
            </div>
            <Num size={18} weight={300}>{RECEIPT_DATA.block}</Num>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Network
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 9999, background: '#0052ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: 9999, background: '#fff' }} />
              </div>
              <span style={{ fontSize: 13, color: '#0d253d' }}>Base</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 12,
        background: '#f6f9fc',
        border: '1px solid #e3e8ee',
        borderRadius: 8,
        padding: 14,
        fontSize: 12, color: '#273951', fontFeatureSettings: '"tnum","ss01"',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748d' }}>Donor paid</span><span>$1.00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748d' }}>Endaoment fee (1.5%)</span><span>−$0.015</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748d' }}>Philotimo fee</span><span style={{ fontStyle: 'italic' }}>not active</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed #e3e8ee' }}>
          <span style={{ color: '#0d253d' }}>Charity received</span>
          <strong style={{ color: '#0d253d', fontWeight: 400 }}>$0.985</strong>
        </div>
      </div>
    </section>
  );
}

function MobileShare() {
  return (
    <section style={{ padding: '0 24px 32px' }}>
      <div style={{
        paddingTop: 24, borderTop: '1px solid #e3e8ee',
      }}>
        <div style={{ fontSize: 17, fontWeight: 300, letterSpacing: '-0.2px', color: '#0d253d' }}>Share this receipt</div>
        <div style={{ fontSize: 12, color: '#64748d', marginTop: 4, marginBottom: 14 }}>Anyone with the link can verify it.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={{ flex: 1, minWidth: 0, padding: '12px 14px', background: '#0d253d', color: '#fff', border: 'none', borderRadius: 9999, fontSize: 13, fontFamily: 'inherit' }}>Copy link</button>
          <button style={{ padding: '12px 14px', background: '#fff', color: '#0d253d', border: '1px solid #e3e8ee', borderRadius: 9999, fontSize: 13, fontFamily: 'inherit' }}>Twitter</button>
          <button style={{ padding: '12px 14px', background: '#fff', color: '#0d253d', border: '1px solid #e3e8ee', borderRadius: 9999, fontSize: 13, fontFamily: 'inherit' }}>WhatsApp</button>
        </div>
      </div>
    </section>
  );
}

function MobileFooter() {
  return (
    <footer style={{ padding: '24px 24px 48px' }}>
      <Wordmark size={12} color="#64748d" />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#533afd', textDecoration: 'none' }}>What is Philotimo? →</a>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#64748d', textDecoration: 'none' }}>How fees work</a>
      </div>
      <div style={{ marginTop: 18, fontSize: 11, color: '#64748d', lineHeight: 1.5 }}>
        Philotimo is a non-custodial donation router. Donations are processed through Endaoment Inc.
      </div>
    </footer>
  );
}

function PhilotimoReceiptMobile() {
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
      <MobileHero />
      <MobileTracker />
      <MobileCharityCard />
      <MobileVerification />
      <MobileShare />
      <MobileFooter />
    </div>
  );
}

Object.assign(window, { PhilotimoReceiptMobile });
