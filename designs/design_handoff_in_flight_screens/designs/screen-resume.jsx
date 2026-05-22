// screen-resume.jsx — Session resume / "come back later" screen.
// Donor lands here from an email "Check status" link, or by refreshing the
// processing tab. Shows current status; promotes the receipt if settled.

const RESUME_DATA = {
  amount: '5.00',
  charity: 'Palestine Children\u2019s Relief Fund',
  charityShort: 'PCRF',
  charityInitials: 'PC',
  ein: '95-4374797',
  donorEmail: 'm***@protonmail.com',
  sessionId: 'cs_live_a1b2c3d4',
  startedAt: '5:34:01 PM UTC · May 21, 2026',
  startedRelative: '2 min ago',
  receiptUrl: '/receipt/0xdc671195100031cab810c6c9ad6da7a1e43212f2bb3b0d9c0ece38ac0e7a78ed',
  receiptUrlShort: 'eudaimonia.app/receipt/0xdc67…78ed',
  txidShort: '0xdc67…78ed',
};

const RESUME_STATUS = {
  settling: {
    eyebrow: 'Still settling',
    pillBg: 'var(--color-iris-bg)', pillFg: 'var(--color-iris-press)', pillDot: 'var(--color-iris)', pillPulse: true,
    pillLabel: 'In progress',
    title: 'Your donation is still on its way.',
    subtitle: 'You can leave again \u2014 we keep going either way. The receipt page will publish itself when the on-chain settlement clears.',
    primaryCta: 'Refresh status',
    secondaryCta: 'Email me when done',
  },
  settled: {
    eyebrow: 'Settled',
    pillBg: 'var(--color-iris-bg)', pillFg: 'var(--color-iris-press)', pillDot: 'var(--color-iris)',
    pillLabel: 'Done · final',
    title: 'Your receipt is live.',
    subtitle: 'All five stages settled on-chain. The page is public and infinitely shareable.',
    primaryCta: 'Open receipt',
    secondaryCta: 'Copy link',
  },
  failed: {
    eyebrow: 'Interrupted',
    pillBg: '#fbecec', pillFg: 'var(--color-urgent)', pillDot: 'var(--color-urgent)',
    pillLabel: 'Needs attention',
    title: 'Your donation didn\u2019t complete.',
    subtitle: 'A step on the route was interrupted. No funds are stuck \u2014 a refund is in motion, or you can retry now.',
    primaryCta: 'See what happened',
    secondaryCta: 'Email support',
  },
};

function ResumeHero({ status, isDesktop }) {
  const s = RESUME_STATUS[status];
  return (
    <div style={{
      position: 'relative',
      paddingTop: isDesktop ? 80 : 56,
      paddingBottom: isDesktop ? 32 : 20,
      paddingLeft: isDesktop ? 64 : 24,
      paddingRight: isDesktop ? 64 : 24,
      overflow: 'hidden',
    }}>
      <GradientMesh height={isDesktop ? 420 : 320} opacity={0.85} />

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
          fontSize: 11, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px',
        }}>
          Session <Mono size={11} color="var(--color-ink-mute)">{RESUME_DATA.sessionId}</Mono>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 11px 5px 9px',
          background: s.pillBg,
          borderRadius: 9999,
          marginBottom: isDesktop ? 28 : 18,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 9999, background: s.pillDot,
            boxShadow: s.pillPulse ? '0 0 0 3px rgba(83,58,253,0.18)' : 'none',
            animation: s.pillPulse ? 'euda-dot-pulse 1.2s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: s.pillFg,
          }}>{s.pillLabel}</span>
        </div>

        <h1 style={{
          margin: 0,
          fontSize: isDesktop ? 48 : 30,
          fontWeight: 300,
          letterSpacing: isDesktop ? '-0.96px' : '-0.6px',
          lineHeight: 1.06,
          color: 'var(--color-ink)',
          textWrap: 'pretty',
          maxWidth: 760,
        }}>{s.title}</h1>

        <p style={{
          margin: isDesktop ? '20px 0 0' : '14px 0 0',
          fontSize: isDesktop ? 17 : 15,
          fontWeight: 300,
          color: 'var(--color-ink-secondary)',
          letterSpacing: '-0.1px',
          lineHeight: 1.45,
          maxWidth: 640,
        }}>{s.subtitle}</p>
      </div>
    </div>
  );
}

function SessionSummaryRow({ status, isDesktop }) {
  return (
    <section style={{
      padding: isDesktop ? '20px 64px 24px' : '12px 24px 18px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{
        background: 'var(--color-canvas)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 12,
        padding: isDesktop ? '20px 28px' : 18,
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'auto 1fr auto auto auto' : '1fr',
        gap: isDesktop ? 28 : 14,
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CharityAvatar initials={RESUME_DATA.charityInitials} size={40} />
          <div>
            <div style={{ fontSize: 14, color: 'var(--color-ink)', letterSpacing: '-0.1px' }}>{RESUME_DATA.charity}</div>
            <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px', fontFeatureSettings: '"tnum","ss01"' }}>
              EIN {RESUME_DATA.ein}
            </div>
          </div>
        </div>

        {!isDesktop && <div style={{ height: 1, background: 'var(--color-hairline)' }} />}

        <div style={{
          display: isDesktop ? 'flex' : 'grid',
          gridTemplateColumns: isDesktop ? 'none' : '1fr 1fr',
          gap: isDesktop ? 28 : 14,
          alignItems: 'baseline',
          fontFeatureSettings: '"tnum","ss01"',
        }}>
          <ResumeMeta label="Amount" value={`$${RESUME_DATA.amount}`} />
          {isDesktop && <ResumeDot />}
          <ResumeMeta label="Started" value={RESUME_DATA.startedRelative} sub={RESUME_DATA.startedAt} />
          {isDesktop && <ResumeDot />}
          <ResumeMeta label={status === 'settled' ? 'Receipt' : 'Status'} value={status === 'settled' ? RESUME_DATA.txidShort : RESUME_STATUS[status].pillLabel} mono={status === 'settled'} />
        </div>

        {isDesktop && <div />}
        {isDesktop && (
          <div style={{ display: 'flex', gap: 10 }}>
            <PillButton variant="ghost" size="sm">{RESUME_STATUS[status].secondaryCta}</PillButton>
            <PillButton variant="primary" size="sm" icon={<ArrowRight color="#fff" />}>{RESUME_STATUS[status].primaryCta}</PillButton>
          </div>
        )}
      </div>

      {!isDesktop && (
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <PillButton variant="primary" size="md" style={{ flex: 1, justifyContent: 'center' }} icon={<ArrowRight color="#fff" />}>{RESUME_STATUS[status].primaryCta}</PillButton>
          <PillButton variant="ghost" size="md" style={{ flex: 1, justifyContent: 'center' }}>{RESUME_STATUS[status].secondaryCta}</PillButton>
        </div>
      )}
    </section>
  );
}

function ResumeMeta({ label, value, sub, mono }) {
  return (
    <div>
      <div style={{
        fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--color-ink-mute)', marginBottom: 4, fontFeatureSettings: '"ss01"',
      }}>{label}</div>
      <div style={{
        fontSize: 14,
        color: 'var(--color-ink)',
        letterSpacing: '-0.1px',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

function ResumeDot() {
  return <span style={{ width: 3, height: 3, borderRadius: 9999, background: 'var(--color-steel)' }} />;
}

function ResumeTracker({ status, isDesktop }) {
  const stages = status === 'failed'
    ? buildLiveStages({ currentStage: 3, failedAt: 3 })
    : status === 'settled'
      ? buildLiveStages({ currentStage: 6 })   // 6 = all done
      : buildLiveStages({ currentStage: 3 });  // settling on stage 3

  return (
    <section style={{
      padding: isDesktop ? '8px 64px 40px' : '8px 24px 28px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: isDesktop ? 24 : 18 }}>
        <EyebrowLabel>The path</EyebrowLabel>
        <h2 style={{
          margin: '8px 0 0',
          fontSize: isDesktop ? 22 : 18,
          fontWeight: 300,
          letterSpacing: '-0.22px',
          color: 'var(--color-ink)',
        }}>{status === 'settled' ? 'Final · all five stops verified.' : status === 'failed' ? 'Where the route paused.' : 'Where the route stands.'}</h2>
      </div>

      {isDesktop ? <LiveTrackerHorizontal stages={stages} /> : <LiveTrackerVertical stages={stages} />}
    </section>
  );
}

function SettledReceiptCallout({ isDesktop }) {
  return (
    <section style={{
      padding: isDesktop ? '24px 64px 64px' : '12px 24px 40px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{
        background: 'var(--color-ink)',
        color: 'var(--color-on-primary)',
        borderRadius: 16,
        padding: isDesktop ? '36px 40px' : '28px 24px',
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        gap: isDesktop ? 32 : 22,
        alignItems: isDesktop ? 'center' : 'flex-start',
        justifyContent: 'space-between',
      }}>
        <div style={{ maxWidth: 620 }}>
          <EyebrowLabel color="rgba(255,255,255,0.5)">Public receipt</EyebrowLabel>
          <h3 style={{
            margin: '10px 0 8px',
            fontSize: isDesktop ? 28 : 22,
            fontWeight: 300,
            letterSpacing: '-0.28px',
            color: 'var(--color-on-primary)',
          }}>It\u2019s live. Anyone with the link can verify it.</h3>
          <div style={{
            marginTop: 12,
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 9999,
            fontFamily: 'var(--font-mono)',
            fontSize: isDesktop ? 13 : 12,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '-0.2px',
            fontFeatureSettings: '"tnum","ss01"',
          }}>
            {RESUME_DATA.receiptUrlShort}
            <CopyChip value={RESUME_DATA.receiptUrl} label="Copy" />
          </div>
        </div>
        <PillButton variant="primary" size="lg" icon={<ArrowRight color="#fff" />}>Open receipt</PillButton>
      </div>
    </section>
  );
}

function NotifyCard({ status, isDesktop }) {
  if (status === 'settled') return null;
  return (
    <section style={{
      padding: isDesktop ? '0 64px 64px' : '0 24px 40px',
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
        gap: isDesktop ? 24 : 16,
      }}>
        <div style={{ maxWidth: 580 }}>
          <EyebrowLabel color="var(--color-ink-secondary)">Drop-in receipt</EyebrowLabel>
          <h3 style={{
            margin: '8px 0 6px',
            fontSize: isDesktop ? 20 : 17,
            fontWeight: 300,
            letterSpacing: '-0.2px',
            color: 'var(--color-ink)',
          }}>We\u2019ll send the receipt to your inbox the moment it\u2019s live.</h3>
          <p style={{
            margin: 0,
            fontSize: isDesktop ? 14 : 13,
            color: 'var(--color-ink-secondary)',
            letterSpacing: '-0.1px',
            lineHeight: 1.5,
          }}>
            Sending to <strong style={{ color: 'var(--color-ink)', fontWeight: 400 }}>{RESUME_DATA.donorEmail}</strong>.
            One-time only \u2014 we don\u2019t add you to a list.
          </p>
        </div>
        <PillButton variant="dark" size={isDesktop ? 'md' : 'md'}>Send me the receipt</PillButton>
      </div>
    </section>
  );
}

function ResumeFooter({ isDesktop }) {
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
        <Wordmark size={12} color="var(--color-ink-mute)" />
        <div style={{ display: 'flex', gap: 18, fontSize: 12 }}>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--color-iris)', textDecoration: 'none' }}>What is Eudaimonia?</a>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--color-ink-mute)', textDecoration: 'none' }}>Contact</a>
        </div>
      </div>
    </footer>
  );
}

function ResumeScreen({ status, isDesktop }) {
  return (
    <div style={{
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontFeatureSettings: '"ss01"',
      minHeight: '100%',
    }}>
      <ResumeHero status={status} isDesktop={isDesktop} />
      <SessionSummaryRow status={status} isDesktop={isDesktop} />
      <ResumeTracker status={status} isDesktop={isDesktop} />
      {status === 'settled' && <SettledReceiptCallout isDesktop={isDesktop} />}
      {status !== 'settled' && <NotifyCard status={status} isDesktop={isDesktop} />}
      <ResumeFooter isDesktop={isDesktop} />
    </div>
  );
}

Object.assign(window, { ResumeScreen, RESUME_STATUS, RESUME_DATA });
