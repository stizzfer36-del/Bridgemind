import React from "react";

type Plan = "Free" | "Pro" | "Enterprise";

const PLAN_DETAILS: Record<Plan, { desc: string; color: string; badge: string }> = {
  Free:       { desc: "Local-only, no account required.",                  color: "#888",    badge: "#1a1a1a" },
  Pro:        { desc: "$20/mo — API access, cloud sync, priority support.", color: "#7c3aed", badge: "#1e0a3c" },
  Enterprise: { desc: "Custom — SSO, SLA, dedicated support.",             color: "#22c55e", badge: "#052e16" },
};

interface UsageMeter {
  label: string;
  value: number;
  max: number;
  unit: string;
  displayValue: string;
  displayMax: string;
}

const USAGE_METERS: UsageMeter[] = [
  { label: "API calls this month", value: 142, max: 500,  unit: "calls", displayValue: "142",   displayMax: "500 (Free limit)" },
  { label: "Storage used",         value: 0.8, max: 5,    unit: "GB",    displayValue: "0.8 GB", displayMax: "5 GB" },
  { label: "Active agents",        value: 3,   max: 5,    unit: "agents",displayValue: "3",      displayMax: "5" },
];

// In a real app this would come from the session/API; hardcoded to Free for the current MVP state.
const currentPlan: Plan = "Free";

export default function Billing() {
  const planInfo = PLAN_DETAILS[currentPlan];

  return (
    <>
      <style>{`
        .billing-page { padding: 32px 40px 80px; }
        .billing-page h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 32px; }
        .plan-card { background: #111; border: 1px solid var(--border); border-radius: 12px; padding: 28px 32px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
        .plan-left { display: flex; flex-direction: column; gap: 8px; }
        .plan-label { font-size: 0.75rem; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
        .plan-name { font-size: 1.8rem; font-weight: 800; }
        .plan-desc { color: #aaa; font-size: 0.9rem; }
        .plan-badge { display: inline-block; padding: 3px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; border: 1px solid; }
        .usage-section h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; }
        .meter { background: #111; border: 1px solid var(--border); border-radius: 10px; padding: 20px 24px; margin-bottom: 14px; }
        .meter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .meter-label { font-size: 0.875rem; font-weight: 600; }
        .meter-value { font-size: 0.8rem; color: #666; font-family: monospace; }
        .meter-track { height: 6px; background: #1a1a1a; border-radius: 3px; overflow: hidden; }
        .meter-fill { height: 100%; border-radius: 3px; background: var(--accent); transition: width .3s ease; }
        .upgrade-section { margin-top: 40px; background: linear-gradient(135deg, #1e0a3c, #0a0a1a); border: 1px solid #7c3aed55; border-radius: 12px; padding: 32px; text-align: center; }
        .upgrade-section h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 10px; }
        .upgrade-section p { color: #aaa; font-size: 0.9rem; margin-bottom: 24px; }
        .upgrade-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      `}</style>
      <div className="billing-page">
        <h1>Billing</h1>

        <div className="plan-card">
          <div className="plan-left">
            <span className="plan-label">Current plan</span>
            <span className="plan-name" style={{ color: planInfo.color }}>{currentPlan}</span>
            <span className="plan-desc">{planInfo.desc}</span>
          </div>
          <span
            className="plan-badge"
            style={{ color: planInfo.color, borderColor: planInfo.color + "55", background: planInfo.badge }}
          >
            {currentPlan === "Free" ? "Active" : "Active — renews monthly"}
          </span>
        </div>

        <section className="usage-section">
          <h2>Usage this month</h2>
          {USAGE_METERS.map((m) => {
            const pct = Math.min(100, (m.value / m.max) * 100);
            const fillColor = pct > 85 ? "#f87171" : pct > 65 ? "#facc15" : "var(--accent)";
            return (
              <div key={m.label} className="meter">
                <div className="meter-header">
                  <span className="meter-label">{m.label}</span>
                  <span className="meter-value">{m.displayValue} / {m.displayMax}</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${pct}%`, background: fillColor }} />
                </div>
              </div>
            );
          })}
        </section>

        {currentPlan === "Free" && (
          <div className="upgrade-section">
            <h2>Unlock the full Forge experience</h2>
            <p>Upgrade to Pro for API access, cloud sync, bench leaderboard, and priority support — just $20/mo.</p>
            <div className="upgrade-ctas">
              <a href="#contact" className="btn btn-primary">Upgrade to Pro — $20/mo</a>
              <a href="/pricing" className="btn btn-outline">Compare plans</a>
            </div>
          </div>
        )}

        {currentPlan === "Pro" && (
          <div className="upgrade-section">
            <h2>Need more for your team?</h2>
            <p>Enterprise adds SSO, self-host license, SLA, and a dedicated support channel.</p>
            <div className="upgrade-ctas">
              <a href="mailto:enterprise@forge.sh" className="btn btn-primary">Contact sales</a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
