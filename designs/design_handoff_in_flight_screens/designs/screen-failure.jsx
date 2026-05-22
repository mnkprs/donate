// screen-failure.jsx — Failure / interrupted donation screen.
// Reassuring + diagnostic: shows which stage of the tracker broke, what
// happened to the money, and how to recover.

const FAILURE_DATA = {
  amount: '5.00',
  charity: 'Palestine Children\u2019s Relief Fund',
  charityInitials: 'PC',
  ein: '95-4374797',
  donorEmail: 'm***@protonmail.com',
  sessionId: 'cs_live_a1b2c3d4',
  attemptedAt: '5:34:01 PM UTC · May 21, 2026',
};

const FAILURE_OUTCOMES = {
  card_declined: {
    failedAt: 1,
    pillLabel: 'Card declined',
    heroLead: 'wasn\u2019t charged',
    heroExplain: 'Your bank declined the authorization.',
    moneyStatus: 'Nothing has moved. Your account was not charged.',
    moneySubcopy: 'Card authorizations that don\u2019t complete clear from your statement within 1\u20133 business days. No on-chain transactions occurred.',
    stageReason: 'Issuer returned: do_not_honor (60). Often a fraud flag on small international charges.',
    primaryCta: 'Try a different card',
    secondaryCta: 'Use Apple Pay',
    diagnostic: 'Stripe error: card_declined · decline_code: do_not_honor',
    refundCopy: null,
  },
  kyc_failed: {
    failedAt: 2,
    pillLabel: 'Verification didn\u2019t complete',
    heroLead: 'is paused',
    heroExplain: 'The on-ramp couldn\u2019t verify your identity.',
    moneyStatus: 'Your card was charged. A refund is on its way back automatically.',
    moneySubcopy: 'Stripe holds the funds until verification clears. Since it didn\u2019t, the authorization will be reversed and the charge will drop off your statement within 5\u20137 business days.',
    stageReason: 'Stripe Crypto Onramp couldn\u2019t complete KYC. This is required for any fiat-to-crypto settlement.',
    primaryCta: 'Restart verification',
    secondaryCta: 'Email me when reversed',
    diagnostic: 'Stripe event: crypto_onramp_session.failed · reason: kyc_required',
    refundCopy: 'Refund initiated automatically — no action needed.',
  },
  onchain_revert: {
    failedAt: 3,
    pillLabel: 'On-chain step reverted',
    heroLead: 'is being refunded',
    heroExplain: 'A routing transaction reverted before reaching the charity.',
    moneyStatus: 'Your USDC is being returned to the on-ramp. The fiat refund follows automatically.',
    moneySubcopy: 'The router contract is reentrancy-guarded; a revert here means no partial settlement is possible. The receipt for the refund itself will be public on Base.',
    stageReason: 'TransparentDonationRouter call reverted. Likely cause: charity Endaoment fund temporarily paused for review.',
    primaryCta: 'Send to a different charity',
    secondaryCta: 'Notify me when refunded',
    diagnostic: 'Tx 0xd9c1\u20264f8a · reverted at OrgFundFactory.donate · gas used 84,213',
    refundCopy: 'Refund tx pending on Base. Reverts cannot leave funds stuck.',
  },
  network_timeout: {
    failedAt: 2,
    pillLabel: 'Network timeout',
    heroLead: 'is still pending',
    heroExplain: 'We lost the connection mid-settlement.',
    moneyStatus: 'The on-chain side may still complete on its own. We\u2019re monitoring.',
    moneySubcopy: 'Base settlements are atomic — they either complete or revert. Either way, you\u2019ll get a final receipt or a refund. Nothing can get stuck in the middle.',
    stageReason: 'No webhook event received from Stripe within 60 seconds. The transaction may still settle.',
    primaryCta: 'Refresh status',
    secondaryCta: 'Email me when settled',
    diagnostic: 'Last event: crypto_onramp_session.created · 47s ago',
    refundCopy: null,
  },
};

function FailureHero({ data, outcome, isDesktop }) {
  const o = FAILURE_OUTCOMES[outcome];
  return (
    <div style={{
      position: 'relative',
      paddingTop: isDesktop ? 88 : 64,
      paddingBottom: isDesktop ? 48 : 28,
      paddingLeft: isDesktop ? 64 : 24,
      paddingRight: isDesktop ? 64 : 24,
      textAlign: isDesktop ? 'center' : 'left',
      overflow: 'hidden',
    }}>
      <GradientMesh height={isDesktop ? 520 : 380} opacity={0.55} />

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
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid #f4cfcf',
          backdropFilter: 'blur(6px)',
          borderRadius: 9999,
          fontSize: 11,
          color: 'var(--color-urgent)',
          letterSpacing: '-0.1px',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 9999, background: 'var(--color-urgent)' }} />
          {o.pillLabel}
        </span>
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
          <EyebrowLabel color="var(--color-urgent)">Interrupted at step {o.failedAt} of 5</EyebrowLabel>
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
          to{' '}
          <span style={{
            backgroundImage: 'linear-gradient(transparent 68%, rgba(83,58,253,0.18) 68%, rgba(83,58,253,0.18) 92%, transparent 92%)',
          }}>{data.charity}</span>{' '}
          {o.heroLead}.
        </h1>

        <div style={{
          marginTop: isDesktop ? 22 : 14,
          fontSize: isDesktop ? 18 : 15,
          color: 'var(--color-ink-secondary)',
          letterSpacing: '-0.1px',
          fontWeight: 300,
        }}>
          {o.heroExplain}
        </div>

        <div style={{
          marginTop: isDesktop ? 30 : 22,
          display: 'flex',
          justifyContent: isDesktop ? 'center' : 'flex-start',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <PillButton variant="primary" size={isDesktop ? 'lg' : 'md'} icon={<ArrowRight color="#fff" />}>
            {o.primaryCta}
          </PillButton>
          <PillButton variant="ghost" size={isDesktop ? 'lg' : 'md'}>
            {o.secondaryCta}
          </PillButton>
        </div>
      </div>
    </div>
  );
}

function MoneyStatusCard({ outcome, isDesktop }) {
  const o = FAILURE_OUTCOMES[outcome];
  return (
    <section style={{
      padding: isDesktop ? '8px 64px 32px' : '4px 24px 20px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{
        background: 'var(--color-canvas)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 12,
        padding: isDesktop ? 28 : 22,
        boxShadow: 'var(--shadow-1)',
        display: 'grid',
        gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
        gap: isDesktop ? 36 : 18,
      }}>
        <div>
          <EyebrowLabel>Where your money is</EyebrowLabel>
          <h3 style={{
            margin: '8px 0 8px',
            fontSize: isDesktop ? 22 : 18,
            fontWeight: 300,
            letterSpacing: '-0.22px',
            color: 'var(--color-ink)',
          }}>{o.moneyStatus}</h3>
          <p style={{
            margin: 0,
            fontSize: isDesktop ? 14 : 13,
            color: 'var(--color-ink-secondary)',
            letterSpacing: '-0.1px',
            lineHeight: 1.5,
          }}>{o.moneySubcopy}</p>
          {o.refundCopy && (
            <div style={{
              marginTop: 14,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px',
              background: 'var(--color-iris-bg)',
              borderRadius: 9999,
              fontSize: 12,
              color: 'var(--color-iris-press)',
              letterSpacing: '-0.1px',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: 9999,
                background: 'var(--color-iris)',
                boxShadow: '0 0 0 3px rgba(83,58,253,0.18)',
                animation: 'euda-dot-pulse 1.4s ease-in-out infinite',
              }} />
              {o.refundCopy}
            </div>
          )}
        </div>

        <div style={{
          background: 'var(--color-canvas-soft)',
          borderRadius: 8,
          padding: isDesktop ? 22 : 16,
          fontFeatureSettings: '"tnum","ss01"',
        }}>
          <EyebrowLabel>Receipt summary</EyebrowLabel>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Attempted', value: `$${FAILURE_DATA.amount}` },
              { label: 'Charity', value: 'PCRF' },
              { label: 'Started', value: '17:34:01 UTC' },
              { label: 'Stopped at', value: `Step ${o.failedAt} · ${LIVE_STAGES_TEMPLATE[o.failedAt - 1].title}` },
            ].map((row) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 13, color: 'var(--color-ink-secondary)',
                letterSpacing: '-0.1px',
              }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>{row.label}</span>
                <span style={{ color: 'var(--color-ink)' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FailureTrackerSection({ stages, outcome, isDesktop }) {
  const o = FAILURE_OUTCOMES[outcome];
  // Inject failureReason into the failed stage.
  const stagesWithReason = stages.map(s => s.state === 'failed' ? { ...s, failureReason: o.stageReason } : s);
  return (
    <section style={{
      padding: isDesktop ? '24px 64px 56px' : '8px 24px 32px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: isDesktop ? 32 : 20 }}>
        <EyebrowLabel>The path</EyebrowLabel>
        <h2 style={{
          margin: '8px 0 0',
          fontSize: isDesktop ? 26 : 20,
          fontWeight: 300,
          letterSpacing: '-0.26px',
          color: 'var(--color-ink)',
        }}>Exactly where it stopped.</h2>
      </div>

      {isDesktop ? <LiveTrackerHorizontal stages={stagesWithReason} /> : <LiveTrackerVertical stages={stagesWithReason} />}
    </section>
  );
}

function DiagnosticCard({ outcome, isDesktop }) {
  const o = FAILURE_OUTCOMES[outcome];
  return (
    <section style={{
      padding: isDesktop ? '0 64px 56px' : '0 24px 32px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{
        background: 'var(--color-ink)',
        color: 'var(--color-on-primary)',
        borderRadius: 12,
        padding: isDesktop ? 28 : 22,
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        gap: isDesktop ? 36 : 18,
        alignItems: isDesktop ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: 1 }}>
          <EyebrowLabel color="rgba(255,255,255,0.5)">For the curious</EyebrowLabel>
          <h3 style={{
            margin: '8px 0 8px',
            fontSize: isDesktop ? 20 : 17,
            fontWeight: 300,
            letterSpacing: '-0.2px',
            color: 'var(--color-on-primary)',
          }}>Diagnostic</h3>
          <p style={{
            margin: 0,
            fontSize: isDesktop ? 13 : 12,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '-0.1px',
            lineHeight: 1.5,
            maxWidth: 480,
          }}>
            The raw event from our pipeline. If you contact support, paste this — it tells us exactly what happened
            without any back-and-forth.
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 8,
          padding: isDesktop ? '14px 18px' : '12px 14px',
          fontFamily: 'var(--font-mono)',
          fontSize: isDesktop ? 12 : 11,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: '-0.2px',
          fontFeatureSettings: '"tnum","ss01"',
          minWidth: isDesktop ? 360 : 'auto',
          width: isDesktop ? 'auto' : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}>
          <span>{o.diagnostic}</span>
          <CopyChip value={o.diagnostic} label="Copy" />
        </div>
      </div>
    </section>
  );
}

function HelpStrip({ isDesktop }) {
  return (
    <section style={{
      padding: isDesktop ? '0 64px 88px' : '0 24px 56px',
      maxWidth: 1240,
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isDesktop ? '24px 0' : '20px 0',
        borderTop: '1px solid var(--color-hairline)',
        borderBottom: '1px solid var(--color-hairline)',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h4 style={{
            margin: 0,
            fontSize: isDesktop ? 18 : 16,
            fontWeight: 300,
            letterSpacing: '-0.15px',
            color: 'var(--color-ink)',
          }}>Need a human?</h4>
          <div style={{
            marginTop: 4, fontSize: 13, color: 'var(--color-ink-mute)', letterSpacing: '-0.1px',
          }}>
            We answer within 24h. Reference session {' '}
            <Mono size={12} color="var(--color-ink)">{FAILURE_DATA.sessionId}</Mono>.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <PillButton variant="ghost" size="md">Email support</PillButton>
          <PillButton variant="outline" size="md">Read FAQ</PillButton>
        </div>
      </div>
    </section>
  );
}

function FailureScreen({ outcome, isDesktop }) {
  const o = FAILURE_OUTCOMES[outcome];
  const stages = buildLiveStages({ currentStage: o.failedAt, failedAt: o.failedAt });
  return (
    <div style={{
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontFeatureSettings: '"ss01"',
      minHeight: '100%',
    }}>
      <FailureHero data={FAILURE_DATA} outcome={outcome} isDesktop={isDesktop} />
      <MoneyStatusCard outcome={outcome} isDesktop={isDesktop} />
      <FailureTrackerSection stages={stages} outcome={outcome} isDesktop={isDesktop} />
      <DiagnosticCard outcome={outcome} isDesktop={isDesktop} />
      <HelpStrip isDesktop={isDesktop} />
    </div>
  );
}

Object.assign(window, { FailureScreen, FAILURE_OUTCOMES, FAILURE_DATA });
