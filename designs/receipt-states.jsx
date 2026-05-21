// receipt-states.jsx — OG share image, Invalid state, Loading state

/* ------------------------- Open Graph (1200x630) -------------------------- */

function EudaimoniaOG() {
  return (
    <div style={{
      width: 1200, height: 630,
      background: '#ffffff',
      color: '#0d253d',
      fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
      fontWeight: 300,
      fontFeatureSettings: '"ss01"',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* atmospheric wash, top */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        inset: '-200px -200px 50% -200px',
        background: 'radial-gradient(50% 80% at 15% 30%, rgba(245,233,212,0.7), transparent 60%), radial-gradient(40% 70% at 80% 20%, rgba(249,107,238,0.15), transparent 60%), radial-gradient(55% 80% at 55% 50%, rgba(83,58,253,0.16), transparent 65%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', padding: '56px 72px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark size={22} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px',
          background: '#fff',
          border: '1px solid #e3e8ee',
          borderRadius: 9999,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 9999, background: '#533afd', boxShadow: '0 0 0 4px rgba(83,58,253,0.12)' }} />
          <span style={{ fontSize: 14, color: '#0d253d' }}>Verified on-chain</span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', padding: '0 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: '#64748d', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 22 }}>
          Donation receipt · May 30, 2025
        </div>
        <h1 style={{
          margin: 0,
          fontSize: 72,
          fontWeight: 300,
          letterSpacing: '-2px',
          lineHeight: 1.02,
          color: '#0d253d',
          maxWidth: 1000,
        }}>
          Anonymous donor gave{' '}
          <span style={{ fontFeatureSettings: '"tnum","ss01"' }}>$1.00</span>{' '}
          to{' '}
          <span style={{
            backgroundImage: 'linear-gradient(transparent 70%, rgba(83,58,253,0.22) 70%, rgba(83,58,253,0.22) 92%, transparent 92%)',
          }}>Black Women in Blockchain</span>.
        </h1>

        {/* mini-tracker */}
        <div style={{
          marginTop: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}>
          {STAGES.map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 9999,
                  background: s.inactive ? 'transparent' : '#533afd',
                  border: s.inactive ? '1.5px dashed #a8c3de' : 'none',
                }} />
                <div style={{
                  fontSize: 13,
                  color: s.inactive ? '#64748d' : '#0d253d',
                  letterSpacing: '-0.1px',
                  fontStyle: s.inactive ? 'italic' : 'normal',
                }}>{s.inactive ? 'Future' : s.title}</div>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ flex: '1 1 0', height: 1, background: 'rgba(83,58,253,0.30)', marginTop: -22 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{
        position: 'relative',
        padding: '0 72px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        <div style={{ fontSize: 16, color: '#64748d', letterSpacing: '-0.15px', fontFeatureSettings: '"tnum","ss01"' }}>
          Settled on Base · Block 30,918,548 · 15M+ confirmations
        </div>
        <div style={{
          fontSize: 14, color: '#64748d', letterSpacing: '-0.1px',
        }}>
          eudaimonia.app/receipt/0xdc67…78ed
        </div>
      </div>
    </div>
  );
}

/* ------------------------ Invalid TxID state -------------------------- */

function EudaimoniaInvalid() {
  return (
    <div style={{
      background: '#ffffff',
      color: '#0d253d',
      fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
      fontWeight: 300,
      fontFeatureSettings: '"ss01"',
      minHeight: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute',
        inset: '-200px -200px auto -200px',
        height: 480,
        background: 'radial-gradient(60% 80% at 50% 30%, rgba(246,249,252,0.9), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'absolute', top: 32, left: 64, zIndex: 2 }}>
        <Wordmark size={15} />
      </div>
      <div style={{ position: 'absolute', top: 32, right: 64, zIndex: 2 }}>
        <Mono size={12} color="#64748d">/receipt/0xnothing</Mono>
      </div>

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 720,
        margin: '0 auto',
        padding: '180px 64px 96px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: '#fff',
          border: '1px solid #e3e8ee',
          borderRadius: 9999,
          marginBottom: 36,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#a8c3de' }} />
          <span style={{ fontSize: 12, color: '#64748d', letterSpacing: '-0.1px' }}>No transaction found</span>
        </div>

        <h1 style={{
          margin: 0,
          fontSize: 48,
          fontWeight: 300,
          letterSpacing: '-1.2px',
          lineHeight: 1.08,
          color: '#0d253d',
          textWrap: 'pretty',
        }}>
          This receipt doesn\u2019t lead anywhere yet.
        </h1>

        <p style={{
          marginTop: 20,
          fontSize: 16,
          lineHeight: 1.55,
          color: '#64748d',
          letterSpacing: '-0.1px',
          maxWidth: 560,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          We couldn\u2019t find a Base transaction matching the hash in this URL.
          That usually means it was mistyped, truncated when copied, or doesn\u2019t exist on chain.
        </p>

        <div style={{
          marginTop: 36,
          background: '#fff',
          border: '1px solid #e3e8ee',
          borderRadius: 12,
          padding: '20px 24px',
          textAlign: 'left',
          maxWidth: 560,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          <div style={{ fontSize: 10, color: '#64748d', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            What we tried to look up
          </div>
          <Mono size={13} color="#0d253d">0xnothing</Mono>
          <div style={{ fontSize: 12, color: '#64748d', marginTop: 8, letterSpacing: '-0.1px' }}>
            A valid Base transaction hash is 66 characters long and starts with <Mono size={12} color="#64748d">0x</Mono>.
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <a href="#" onClick={(e) => e.preventDefault()} style={{
            background: '#533afd', color: '#fff', fontSize: 14,
            padding: '10px 18px', borderRadius: 9999, textDecoration: 'none', letterSpacing: '-0.1px',
          }}>Search on BaseScan</a>
          <a href="#" onClick={(e) => e.preventDefault()} style={{
            background: '#fff', color: '#0d253d',
            border: '1px solid #e3e8ee', fontSize: 14,
            padding: '10px 18px', borderRadius: 9999, textDecoration: 'none', letterSpacing: '-0.1px',
          }}>What is Eudaimonia?</a>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Loading state ---------------------------- */

const SHIMMER_CSS = `
@keyframes phi-shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.phi-skel {
  background: linear-gradient(90deg, #eef2f6 0%, #f6f9fc 50%, #eef2f6 100%);
  background-size: 800px 100%;
  animation: phi-shimmer 1.6s linear infinite;
  border-radius: 6px;
}
`;

function EudaimoniaLoading() {
  return (
    <div style={{
      background: '#ffffff',
      color: '#0d253d',
      fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
      fontWeight: 300,
      minHeight: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{SHIMMER_CSS}</style>

      <div aria-hidden="true" style={{
        position: 'absolute',
        inset: '-200px -200px auto -200px',
        height: 460,
        background: 'radial-gradient(60% 80% at 20% 30%, rgba(245,233,212,0.4), transparent 60%), radial-gradient(60% 80% at 60% 40%, rgba(83,58,253,0.06), transparent 65%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'absolute', top: 32, left: 64, zIndex: 2 }}>
        <Wordmark size={15} />
      </div>

      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '128px 64px 56px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          background: '#fff',
          border: '1px solid #e3e8ee',
          borderRadius: 9999,
          marginBottom: 40,
        }}>
          <span className="phi-skel" style={{ width: 6, height: 6, borderRadius: 9999 }} />
          <span style={{ fontSize: 12, color: '#64748d', letterSpacing: '-0.1px' }}>Reading the chain…</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div className="phi-skel" style={{ width: 760, height: 48, borderRadius: 8 }} />
          <div className="phi-skel" style={{ width: 540, height: 48, borderRadius: 8 }} />
          <div className="phi-skel" style={{ width: 280, height: 20, marginTop: 8, borderRadius: 6 }} />
        </div>

        <div style={{ marginTop: 56, display: 'inline-flex', alignItems: 'center', gap: 12, padding: '10px 16px 10px 12px', background: 'rgba(255,255,255,0.7)', border: '1px solid #e3e8ee', borderRadius: 9999 }}>
          <div className="phi-skel" style={{ width: 28, height: 28, borderRadius: 9999 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="phi-skel" style={{ width: 180, height: 12 }} />
            <div className="phi-skel" style={{ width: 110, height: 10 }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 64px 64px' }}>
        <div style={{ marginBottom: 28 }}>
          <div className="phi-skel" style={{ width: 80, height: 10, marginBottom: 12 }} />
          <div className="phi-skel" style={{ width: 360, height: 24 }} />
        </div>

        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
        }}>
          <div aria-hidden="true" style={{
            position: 'absolute', top: 18, left: 'calc(10% + 8px)', right: 'calc(10% + 8px)',
            height: 1, background: '#e3e8ee', zIndex: 0,
          }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, position: 'relative', zIndex: 1 }}>
                <div className="phi-skel" style={{ width: 36, height: 36, borderRadius: 9999, background: '#eef2f6' }} />
              </div>
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="phi-skel" style={{ width: '60%', height: 12 }} />
                <div className="phi-skel" style={{ width: '80%', height: 10 }} />
                <div className="phi-skel" style={{ width: '50%', height: 22, marginTop: 10 }} />
                <div className="phi-skel" style={{ width: '100%', height: 32, marginTop: 12, borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 56, fontSize: 12, color: '#64748d', letterSpacing: '-0.1px', textAlign: 'center' }}>
          Fetching on-chain data from Base · Block ~30,918,548
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  EudaimoniaOG,
  EudaimoniaInvalid,
  EudaimoniaLoading,
});
