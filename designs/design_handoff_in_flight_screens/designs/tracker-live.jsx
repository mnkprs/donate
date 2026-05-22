// tracker-live.jsx — The in-flight Pizza Tracker.
// Five stages: Paid → Converted → Routed → Delivered → Published.
// Each stage is one of: 'done' | 'active' | 'queued' | 'failed'.
//
// Layouts:
//   <LiveTracker stages={...} layout="horizontal" />   — desktop, 5-column grid
//   <LiveTracker stages={...} layout="vertical" />     — mobile, vertical timeline

const LIVE_STAGES_TEMPLATE = [
  {
    n: 1,
    key: 'paid',
    title: 'Paid',
    short: 'Card charged · Stripe',
    amount: '5.00',
    unit: 'USD',
    contract: 'Stripe Payments',
    address: 'pi_3OqK…7Yz9',
    addressLabel: 'Charge ID',
    timestamp: '17:34:01 UTC',
    relative: 'just now',
    detail: 'Card authorization completed. Funds reserved on the issuer side; on-ramp begins immediately.',
  },
  {
    n: 2,
    key: 'converted',
    title: 'Converted',
    short: 'USD → USDC via Stripe Onramp',
    amount: '5.000000',
    unit: 'USDC',
    contract: 'Stripe Crypto Onramp',
    address: '0xa9d1…f7b2',
    addressLabel: 'Settle to',
    timestamp: '17:34:04 UTC',
    relative: '+3s',
    detail: 'Fiat minted to USDC on Base L2 at 1:1. Settlement is atomic — no slippage.',
  },
  {
    n: 3,
    key: 'routed',
    title: 'Routed',
    short: 'Eudaimonia · 1% fee taken on-chain',
    amount: '4.950000',
    unit: 'USDC',
    contract: 'TransparentDonationRouter',
    address: '0x10fd…a589',
    addressLabel: 'Router',
    timestamp: '17:34:06 UTC',
    relative: '+5s',
    detail: 'Our router contract splits 1% to Eudaimonia\u2019s treasury and forwards 99% to the charity\u2019s Endaoment Org Fund.',
    feeOnHover: { label: 'Eudaimonia fee', amount: '0.05', to: '0xe3…tre4' },
  },
  {
    n: 4,
    key: 'delivered',
    title: 'Delivered',
    short: 'Arrived at charity\u2019s Endaoment fund',
    amount: '4.875750',
    unit: 'USDC',
    contract: 'Endaoment · OrgFund',
    address: '0x10e9…eb82',
    addressLabel: 'Charity',
    timestamp: '17:34:08 UTC',
    relative: '+7s',
    detail: 'Endaoment\u2019s 1.5% fee ($0.07425) is taken at this step; the remainder is spendable by the charity\u2019s multisig.',
    feeOnHover: { label: 'Endaoment fee', amount: '0.07425', to: '0x5e8e…3b14' },
  },
  {
    n: 5,
    key: 'published',
    title: 'Published',
    short: 'Public receipt live · sharable forever',
    amount: '—',
    unit: '',
    contract: 'eudaimonia.app',
    address: '/receipt/0xdc67…78ed',
    addressLabel: 'Receipt URL',
    timestamp: '17:34:09 UTC',
    relative: '+8s',
    detail: 'Your receipt is now public at eudaimonia.app/receipt/{tx}. Anyone with the link can verify it.',
  },
];

// Builds a stages array where stages 1..currentStage are 'done', currentStage+1 is 'active',
// rest are 'queued'. If failedAt is set, that stage is 'failed' and the rest stay 'queued'.
function buildLiveStages({ currentStage = 2, failedAt = null }) {
  return LIVE_STAGES_TEMPLATE.map((s, i) => {
    const idx = i + 1;
    let state = 'queued';
    if (failedAt && idx === failedAt) state = 'failed';
    else if (failedAt && idx < failedAt) state = 'done';
    else if (!failedAt && idx < currentStage) state = 'done';
    else if (!failedAt && idx === currentStage) state = 'active';
    return { ...s, state };
  });
}

function StageNode({ state, n, size = 36 }) {
  const isDone = state === 'done';
  const isActive = state === 'active';
  const isFailed = state === 'failed';
  const isQueued = state === 'queued';

  const ringColor = isDone ? 'var(--color-iris)'
    : isActive ? 'var(--color-iris)'
    : isFailed ? 'var(--color-urgent)'
    : 'var(--color-steel)';
  const fillColor = isDone ? 'var(--color-iris)'
    : isActive ? 'var(--color-canvas)'
    : isFailed ? 'var(--color-urgent)'
    : 'var(--color-canvas)';

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 9999,
      background: 'var(--color-canvas)',
      border: isQueued ? `1px dashed ${ringColor}` : `1px solid ${ringColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      transition: 'all .2s',
      boxShadow: isActive ? '0 0 0 6px rgba(83,58,253,0.10)' : 'none',
      flexShrink: 0,
    }}>
      {isDone && (
        <div style={{
          width: size * 0.4, height: size * 0.4, borderRadius: 9999,
          background: fillColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={size * 0.22} height={size * 0.22} viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3.3 5.7L6.5 2.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      {isActive && (
        <React.Fragment>
          <span style={{
            position: 'absolute',
            inset: 6,
            borderRadius: 9999,
            border: '1px solid var(--color-iris)',
            opacity: 0.4,
            animation: 'euda-pulse 1.6s ease-out infinite',
          }} />
          <span style={{
            width: size * 0.32, height: size * 0.32, borderRadius: 9999,
            background: 'var(--color-iris)',
          }} />
        </React.Fragment>
      )}
      {isFailed && (
        <div style={{
          width: size * 0.4, height: size * 0.4, borderRadius: 9999,
          background: fillColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={size * 0.22} height={size * 0.22} viewBox="0 0 8 8" fill="none">
            <path d="M2 2L6 6M6 2L2 6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      )}
      {isQueued && (
        <span style={{
          fontSize: 11,
          fontWeight: 400,
          color: 'var(--color-ink-mute)',
          fontFeatureSettings: '"tnum","ss01"',
          letterSpacing: '-0.1px',
        }}>{n}</span>
      )}
    </div>
  );
}

function StatusPill({ state }) {
  const map = {
    done:    { bg: 'var(--color-iris-bg)', fg: 'var(--color-iris-press)', label: 'Done',     dot: 'var(--color-iris)' },
    active:  { bg: 'var(--color-iris-bg)', fg: 'var(--color-iris-press)', label: 'In progress', dot: 'var(--color-iris)', pulse: true },
    queued:  { bg: 'var(--color-canvas)',  fg: 'var(--color-ink-mute)',   label: 'Queued',   dot: 'var(--color-steel)',   border: 'var(--color-hairline)' },
    failed:  { bg: '#fbecec',              fg: 'var(--color-urgent)',     label: 'Failed',   dot: 'var(--color-urgent)' },
  };
  const m = map[state];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px 3px 7px',
      background: m.bg,
      color: m.fg,
      border: m.border ? `1px solid ${m.border}` : 'none',
      borderRadius: 9999,
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      fontFeatureSettings: '"ss01"',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: 9999, background: m.dot,
        boxShadow: m.pulse ? '0 0 0 3px rgba(83,58,253,0.18)' : 'none',
        animation: m.pulse ? 'euda-dot-pulse 1.2s ease-in-out infinite' : 'none',
      }} />
      {m.label}
    </span>
  );
}

// Horizontal (desktop) — 5-column grid, one card per stage
function LiveTrackerHorizontal({ stages }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* connecting line — full-track gray */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        top: 18,
        left: 'calc(10% + 8px)',
        right: 'calc(10% + 8px)',
        height: 1,
        background: 'var(--color-hairline)',
        zIndex: 0,
      }} />
      {/* progress overlay — iris from start up through done stages */}
      <ProgressOverlay stages={stages} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, position: 'relative', zIndex: 1 }}>
        {stages.map((s, i) => (
          <StageCardHorizontal key={s.n} stage={s} />
        ))}
      </div>
    </div>
  );
}

function ProgressOverlay({ stages }) {
  // We want the iris line to go from the first node up to the *active* node
  // (or up to the last 'done' if there's no active).
  const lastDoneIdx = stages.reduce((acc, s, i) => s.state === 'done' ? i : acc, -1);
  const activeIdx = stages.findIndex(s => s.state === 'active');
  const failedIdx = stages.findIndex(s => s.state === 'failed');
  const endIdx = failedIdx >= 0 ? failedIdx
    : activeIdx >= 0 ? activeIdx
    : lastDoneIdx;
  if (endIdx <= 0) return null;
  // Each cell is 20% wide; node sits at cell center (10%).
  const startPct = 10;
  const endPct = 10 + endIdx * 20;
  const color = failedIdx >= 0 ? 'var(--color-urgent)' : 'var(--color-iris)';
  return (
    <div aria-hidden="true" style={{
      position: 'absolute',
      top: 18,
      left: `calc(${startPct}% + 8px)`,
      width: `calc(${endPct - startPct}% - 16px)`,
      height: 1,
      background: color,
      zIndex: 0,
    }} />
  );
}

function StageCardHorizontal({ stage }) {
  const s = stage;
  const isDone = s.state === 'done';
  const isActive = s.state === 'active';
  const isQueued = s.state === 'queued';
  const isFailed = s.state === 'failed';
  const visible = isDone || isActive || isFailed;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22, position: 'relative', zIndex: 1 }}>
        <StageNode state={s.state} n={s.n} />
      </div>

      <div style={{
        background: isActive ? 'var(--color-canvas)' : isQueued ? 'transparent' : 'var(--color-canvas)',
        border: isQueued
          ? '1px dashed var(--color-hairline)'
          : isFailed
            ? '1px solid #f4cfcf'
            : isActive
              ? '1px solid var(--color-hairline)'
              : '1px solid var(--color-hairline-soft)',
        borderRadius: 12,
        padding: 16,
        transition: 'all .18s',
        boxShadow: isActive ? 'var(--shadow-2)' : 'none',
        minHeight: 192,
        opacity: isQueued ? 0.78 : 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <span style={{
            fontSize: 10, fontWeight: 400, letterSpacing: '0.1em',
            color: 'var(--color-ink-mute)', fontFeatureSettings: '"tnum","ss01"',
          }}>0{s.n}</span>
          <span style={{
            fontSize: 16, fontWeight: 300, letterSpacing: '-0.2px',
            color: isQueued ? 'var(--color-ink-mute)' : 'var(--color-ink)',
          }}>{s.title}</span>
          <span style={{ marginLeft: 'auto' }}><StatusPill state={s.state} /></span>
        </div>

        <div style={{
          fontSize: 12,
          color: 'var(--color-ink-mute)',
          letterSpacing: '-0.1px',
          marginBottom: 14,
          minHeight: 34,
          lineHeight: 1.4,
        }}>{s.short}</div>

        {visible ? (
          <React.Fragment>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
              {s.amount !== '—' ? (
                <Num size={22} weight={300} track="-0.4px" color="var(--color-ink)">{s.amount}</Num>
              ) : (
                <span style={{ fontSize: 22, fontWeight: 300, color: 'var(--color-ink-mute)', letterSpacing: '-0.4px' }}>—</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--color-ink-mute)', letterSpacing: '0.05em' }}>{s.unit}</span>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              paddingTop: 10, borderTop: '1px dashed var(--color-hairline)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-ink-mute)' }}>
                <span>{s.addressLabel}</span>
                <Mono size={11} color="var(--color-ink)">{s.address}</Mono>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: 'var(--color-ink-mute)',
                fontFeatureSettings: '"tnum","ss01"',
              }}>
                <span>{isActive ? 'Pending\u2026' : s.timestamp}</span>
                <span>{isActive ? <ActiveCounter /> : s.relative}</span>
              </div>
            </div>

            {isDone && (
              <div style={{ marginTop: 12 }}>
                <VerifyLink label="Verify ↗" />
              </div>
            )}
            {isFailed && (
              <div style={{
                marginTop: 10,
                padding: '8px 10px',
                background: '#fbecec',
                border: '1px solid #f4cfcf',
                borderRadius: 6,
                fontSize: 11,
                color: 'var(--color-urgent)',
                letterSpacing: '-0.1px',
                lineHeight: 1.4,
              }}>
                {s.failureReason || 'This step did not complete.'}
              </div>
            )}
          </React.Fragment>
        ) : (
          <div style={{
            paddingTop: 10,
            borderTop: '1px dashed var(--color-hairline)',
            fontSize: 11,
            color: 'var(--color-ink-mute)',
            letterSpacing: '-0.1px',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}>
            Waits for the previous step to settle on-chain.
          </div>
        )}
      </div>
    </div>
  );
}

// Vertical (mobile) — stacked timeline with left rail
function LiveTrackerVertical({ stages }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 4 }}>
      {stages.map((s, i) => (
        <StageRowVertical key={s.n} stage={s} isLast={i === stages.length - 1} />
      ))}
    </div>
  );
}

function StageRowVertical({ stage, isLast }) {
  const s = stage;
  const isDone = s.state === 'done';
  const isActive = s.state === 'active';
  const isQueued = s.state === 'queued';
  const isFailed = s.state === 'failed';
  const visible = isDone || isActive || isFailed;

  const railColor = isDone ? 'var(--color-iris)'
    : isFailed ? 'var(--color-urgent)'
    : 'var(--color-hairline)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 14, position: 'relative' }}>
      {/* node + rail */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <StageNode state={s.state} n={s.n} size={32} />
        {!isLast && (
          <div style={{
            flex: 1,
            width: 1,
            background: isQueued ? 'var(--color-hairline)' : railColor,
            opacity: isQueued ? 1 : 1,
            marginTop: 4,
            marginBottom: 4,
            minHeight: 28,
            borderLeft: isQueued ? '1px dashed var(--color-hairline)' : 'none',
          }} />
        )}
      </div>

      <div style={{
        paddingBottom: 22,
        background: 'transparent',
      }}>
        <div style={{
          background: isActive ? 'var(--color-canvas)' : isQueued ? 'transparent' : 'var(--color-canvas)',
          border: isQueued
            ? '1px dashed var(--color-hairline)'
            : isFailed
              ? '1px solid #f4cfcf'
              : '1px solid var(--color-hairline)',
          borderRadius: 12,
          padding: 14,
          boxShadow: isActive ? 'var(--shadow-1)' : 'none',
          opacity: isQueued ? 0.78 : 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{
              fontSize: 10, fontWeight: 400, letterSpacing: '0.1em',
              color: 'var(--color-ink-mute)', fontFeatureSettings: '"tnum","ss01"',
            }}>0{s.n}</span>
            <span style={{
              fontSize: 15, fontWeight: 300, letterSpacing: '-0.15px',
              color: isQueued ? 'var(--color-ink-mute)' : 'var(--color-ink)',
            }}>{s.title}</span>
            <span style={{ marginLeft: 'auto' }}><StatusPill state={s.state} /></span>
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--color-ink-mute)',
            letterSpacing: '-0.1px',
            lineHeight: 1.4,
            marginBottom: visible ? 10 : 0,
          }}>{s.short}</div>

          {visible && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              paddingTop: 8,
              borderTop: '1px dashed var(--color-hairline)',
            }}>
              <div>
                {s.amount !== '—' && (
                  <span>
                    <Num size={16} weight={300} color="var(--color-ink)">{s.amount}</Num>{' '}
                    <span style={{ fontSize: 10, color: 'var(--color-ink-mute)', letterSpacing: '0.05em' }}>{s.unit}</span>
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 11, color: 'var(--color-ink-mute)',
                fontFeatureSettings: '"tnum","ss01"',
              }}>
                {isActive ? <span><ActiveCounter /> · pending…</span> : isDone ? <VerifyLink label="Verify ↗" /> : s.timestamp}
              </div>
            </div>
          )}
          {isFailed && s.failureReason && (
            <div style={{
              marginTop: 10,
              padding: '8px 10px',
              background: '#fbecec',
              border: '1px solid #f4cfcf',
              borderRadius: 6,
              fontSize: 11,
              color: 'var(--color-urgent)',
              letterSpacing: '-0.1px',
              lineHeight: 1.4,
            }}>{s.failureReason}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActiveCounter() {
  // A tiny live-looking elapsed seconds counter — purely cosmetic.
  const [t, setT] = React.useState(2);
  React.useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{`+${t}s`}</span>;
}

// Keyframes for the pulsing ring on the active node.
function TrackerStyles() {
  return (
    <style>{`
      @keyframes euda-pulse {
        0%   { transform: scale(1);   opacity: 0.5; }
        70%  { transform: scale(1.6); opacity: 0;   }
        100% { transform: scale(1.6); opacity: 0;   }
      }
      @keyframes euda-dot-pulse {
        0%, 100% { box-shadow: 0 0 0 2px rgba(83,58,253,0.20); }
        50%      { box-shadow: 0 0 0 5px rgba(83,58,253,0.06); }
      }
      @keyframes euda-skel {
        0%, 100% { opacity: 0.55; }
        50%      { opacity: 1; }
      }
    `}</style>
  );
}

Object.assign(window, {
  LIVE_STAGES_TEMPLATE,
  buildLiveStages,
  LiveTrackerHorizontal,
  LiveTrackerVertical,
  StageNode,
  StatusPill,
  TrackerStyles,
});
