// screen-processing.jsx — Live processing screen.
// Donor returns from Stripe hosted onramp; we render the 5-stage tracker
// live. Settlement usually completes within 6–12 seconds.

const PROCESSING_DATA = {
  amount: '5.00',
  charity: 'Palestine Children\u2019s Relief Fund',
  charityShort: 'PCRF',
  charityInitials: 'PC',
  ein: '95-4374797',
  donorEmail: 'm***@protonmail.com',
  sessionId: 'cs_live_a1b2c3d4',
  startedAt: '5:34:01 PM UTC · May 21, 2026',
};

function ProcessingHero({ data, currentStage, isDesktop }) {
  return (
    <div style={{
      position: 'relative',
      paddingTop: isDesktop ? 88 : 64,
      paddingBottom: isDesktop ? 56 : 32,
      paddingLeft: isDesktop ? 64 : 24,
      paddingRight: isDesktop ? 64 : 24,
      textAlign: isDesktop ? 'center' : 'left',
      overflow: 'hidden',
    }}>
      <GradientMesh height={isDesktop ? 520 : 380} />

      {/* nav */}
      <div style={{
        position: 'absolute',
        top: isDesktop ? 28 : 20,
        left: isDesktop ? 64 : 24,
        right: isDesktop ? 64 : 24,
        zIndex: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Wordmark size={isDesktop ? 15 : 13} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 11, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid var(--color-hairline)',
            backdropFilter: 'blur(6px)',
            borderRadius: 9999,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: 9999, background: 'var(--color-iris)',
              boxShadow: '0 0 0 3px rgba(83,58,253,0.18)',
              animation: 'euda-dot-pulse 1.2s ease-in-out infinite',
            }} />
            <span style={{ color: 'var(--color-ink)' }}>Settling on Base</span>
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: 'var(--color-canvas)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 9999,
          marginBottom: isDesktop ? 32 : 20,
        }}>
          <EyebrowLabel color="var(--color-iris-press)">In progress · Step {currentStage} of 5</EyebrowLabel>
        </div>

        <h1 style={{
          margin: 0,
          fontSize: isDesktop ? 48 : 30,
          fontWeight: 300,
          letterSpacing: isDesktop ? '-0.96px' : '-0.6px',
          lineHeight: 1.05,
          color: 'var(--color-ink)',
          textWrap: 'pretty',
        }}>
          Your{' '}
          <span style={{ fontFeatureSettings: '"tnum","ss01"' }}>${data.amount}</span>{' '}
          is on its way to{' '}
          <span style={{
            fontWeight: 300,
            backgroundImage: 'linear-gradient(transparent 68%, rgba(83,58,253,0.18) 68%, rgba(83,58,253,0.18) 92%, transparent 92%)',
          }}>{data.charity}</span>.
        </h1>

        <div style={{
          marginTop: isDesktop ? 22 : 16,
          display: 'flex',
          justifyContent: isDesktop ? 'center' : 'flex-start',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: isDesktop ? 18 : 10,
          color: 'var(--color-ink-mute)',
          fontSize: isDesktop ? 15 : 13,
          letterSpacing: '-0.1px',
          fontFeatureSettings: '"tnum","ss01"',
        }}>
          <span>Started {data.startedAt}</span>
          <span style={{ width: 3, height: 3, borderRadius: 9999, background: 'var(--color-steel)' }} />
          <span>Usually 6–12 seconds</span>
          <span style={{ width: 3, height: 3, borderRadius: 9999, background: 'var(--color-steel)' }} />
          <span>You can close this tab</span>
        </div>

        {/* charity anchor chip */}
        <div style={{
          marginTop: isDesktop ? 40 : 24,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px 10px 12px',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 9999,
        }}>
          <CharityAvatar initials={data.charityInitials} size={28} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: 'var(--color-ink)', letterSpacing: '-0.1px' }}>{data.charity}</div>
            <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"' }}>
              EIN {data.ein} · 501(c)(3)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackerSection({ stages, isDesktop }) {
  return (
    <section style={{
      padding: isDesktop ? '24px 64px 64px' : '8px 24px 32px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: isDesktop ? 32 : 18,
        flexDirection: isDesktop ? 'row' : 'column',
        gap: isDesktop ? 0 : 6,
      }}>
        <div>
          <EyebrowLabel>The path</EyebrowLabel>
          <h2 style={{
            margin: '8px 0 0',
            fontSize: isDesktop ? 26 : 20,
            fontWeight: 300,
            letterSpacing: '-0.26px',
            color: 'var(--color-ink)',
          }}>Where your dollar is, right now.</h2>
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--color-ink-mute)',
          letterSpacing: '-0.1px',
        }}>
          Live · refreshing on-chain
        </div>
      </div>

      {isDesktop ? <LiveTrackerHorizontal stages={stages} /> : <LiveTrackerVertical stages={stages} />}
    </section>
  );
}

function StayInformedCard({ isDesktop }) {
  return (
    <section style={{
      padding: isDesktop ? '0 64px 56px' : '0 24px 32px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{
        background: 'var(--color-canvas-cream)',
        borderRadius: 12,
        padding: isDesktop ? 28 : 22,
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        alignItems: isDesktop ? 'center' : 'flex-start',
        justifyContent: 'space-between',
        gap: isDesktop ? 24 : 18,
      }}>
        <div style={{ maxWidth: 620 }}>
          <EyebrowLabel color="var(--color-ink-secondary)">If you have to go</EyebrowLabel>
          <h3 style={{
            margin: '8px 0 6px',
            fontSize: isDesktop ? 22 : 18,
            fontWeight: 300,
            letterSpacing: '-0.22px',
            color: 'var(--color-ink)',
          }}>We\u2019ll email you the receipt when it\u2019s ready.</h3>
          <p style={{
            margin: 0,
            fontSize: isDesktop ? 14 : 13,
            color: 'var(--color-ink-secondary)',
            letterSpacing: '-0.1px',
            lineHeight: 1.5,
          }}>
            Closing this tab won\u2019t cancel the donation. The receipt finishes settling on-chain
            either way. We\u2019ll send it to <strong style={{ color: 'var(--color-ink)', fontWeight: 400 }}>{PROCESSING_DATA.donorEmail}</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <PillButton variant="ghost" size={isDesktop ? 'md' : 'sm'}>Resend link</PillButton>
          <PillButton variant="dark" size={isDesktop ? 'md' : 'sm'}>Got it</PillButton>
        </div>
      </div>
    </section>
  );
}

function SkeletonReceiptPreview({ isDesktop }) {
  return (
    <section style={{
      padding: isDesktop ? '0 64px 88px' : '0 24px 56px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: 16 }}>
        <EyebrowLabel>Coming up</EyebrowLabel>
        <h3 style={{
          margin: '8px 0 0',
          fontSize: isDesktop ? 22 : 18,
          fontWeight: 300,
          letterSpacing: '-0.22px',
          color: 'var(--color-ink)',
        }}>Your shareable receipt.</h3>
      </div>

      <div style={{
        background: 'var(--color-canvas)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 12,
        padding: isDesktop ? 32 : 22,
        display: 'grid',
        gridTemplateColumns: isDesktop ? '2.4fr 1fr 1fr' : '1fr',
        gap: isDesktop ? 0 : 18,
      }}>
        <div style={{
          paddingRight: isDesktop ? 32 : 0,
          borderRight: isDesktop ? '1px solid var(--color-hairline)' : 'none',
          borderBottom: isDesktop ? 'none' : '1px solid var(--color-hairline)',
          paddingBottom: isDesktop ? 0 : 18,
        }}>
          <div style={{
            fontSize: 11, color: 'var(--color-ink-mute)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
          }}>Transaction hash</div>
          <div style={{
            display: 'flex', gap: 4, alignItems: 'center',
          }}>
            <div style={{
              height: 14, width: '70%', borderRadius: 4,
              background: 'var(--color-hairline-soft)',
              animation: 'euda-skel 1.6s ease-in-out infinite',
            }} />
          </div>
          <div style={{
            marginTop: 12,
            fontSize: 12, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px',
          }}>Receipt URL appears once published</div>
        </div>

        <div style={{
          padding: isDesktop ? '0 32px' : 0,
          borderRight: isDesktop ? '1px solid var(--color-hairline)' : 'none',
          borderBottom: isDesktop ? 'none' : '1px solid var(--color-hairline)',
          paddingBottom: isDesktop ? 0 : 18,
        }}>
          <div style={{
            fontSize: 11, color: 'var(--color-ink-mute)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
          }}>Block</div>
          <div style={{
            height: 22, width: 96, borderRadius: 4,
            background: 'var(--color-hairline-soft)',
            animation: 'euda-skel 1.6s ease-in-out infinite',
          }} />
          <div style={{
            marginTop: 6, fontSize: 12, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px',
          }}>Awaiting confirmations</div>
        </div>

        <div style={{ paddingLeft: isDesktop ? 32 : 0 }}>
          <div style={{
            fontSize: 11, color: 'var(--color-ink-mute)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
          }}>Network</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BaseMark size={28} />
            <div>
              <div style={{ fontSize: 14, color: 'var(--color-ink)', letterSpacing: '-0.1px' }}>Base</div>
              <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px' }}>Ethereum L2</div>
            </div>
          </div>
        </div>
      </div>

      {/* fee disclosure strip — already known pre-settlement */}
      {isDesktop && (
        <div style={{
          marginTop: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          background: 'var(--color-canvas-soft)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--color-ink-secondary)',
        }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center', fontFeatureSettings: '"tnum","ss01"' }}>
            <span><span style={{ color: 'var(--color-ink-mute)' }}>Donor paid</span> $5.00</span>
            <span><span style={{ color: 'var(--color-ink-mute)' }}>Eudaimonia fee</span> $0.05 (1%)</span>
            <span><span style={{ color: 'var(--color-ink-mute)' }}>Endaoment fee</span> $0.07 (1.5%)</span>
            <span style={{ paddingLeft: 16, borderLeft: '1px solid var(--color-hairline)' }}>
              <span style={{ color: 'var(--color-ink-mute)' }}>Charity will receive</span>{' '}
              <strong style={{ color: 'var(--color-ink)', fontWeight: 400 }}>$4.876</strong>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function ProcessingFooter({ isDesktop }) {
  return (
    <footer style={{
      maxWidth: 1240, margin: '0 auto',
      padding: isDesktop ? '24px 64px 56px' : '16px 24px 40px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'var(--color-ink-mute)',
        fontSize: 13,
        letterSpacing: '-0.1px',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Wordmark size={12} color="var(--color-ink-mute)" />
        </div>
        <div style={{ display: 'flex', gap: 18, fontSize: 12 }}>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--color-iris)', textDecoration: 'none' }}>What is Eudaimonia?</a>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--color-ink-mute)', textDecoration: 'none' }}>Contact</a>
        </div>
      </div>
      <div style={{
        marginTop: 12,
        fontSize: 11, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px',
        maxWidth: 720, lineHeight: 1.5,
      }}>
        Session <Mono size={11} color="var(--color-ink-mute)">{PROCESSING_DATA.sessionId}</Mono> ·
        Eudaimonia is a non-custodial donation router. Your funds move on-chain through immutable contracts.
      </div>
    </footer>
  );
}

function ProcessingScreen({ stages, currentStage, isDesktop }) {
  return (
    <div style={{
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontFeatureSettings: '"ss01"',
      minHeight: '100%',
    }}>
      <ProcessingHero data={PROCESSING_DATA} currentStage={currentStage} isDesktop={isDesktop} />
      <TrackerSection stages={stages} isDesktop={isDesktop} />
      <StayInformedCard isDesktop={isDesktop} />
      <SkeletonReceiptPreview isDesktop={isDesktop} />
      <ProcessingFooter isDesktop={isDesktop} />
    </div>
  );
}

Object.assign(window, { ProcessingScreen, PROCESSING_DATA });
