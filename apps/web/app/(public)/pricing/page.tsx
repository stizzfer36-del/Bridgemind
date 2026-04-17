import React from "react";

const tiers = [
  {
    name: "Free",
    price: "$0/mo",
    cta: "Download",
    ctaHref: "/download",
    highlight: false,
    desc: "Local-only, no account required. Full ADE power on your machine.",
  },
  {
    name: "Pro",
    price: "$20/mo",
    cta: "Upgrade to Pro",
    ctaHref: "#contact",
    highlight: true,
    desc: "API access, cloud sync, bench leaderboard, priority support.",
  },
  {
    name: "Enterprise",
    price: "Contact",
    cta: "Talk to us",
    ctaHref: "mailto:enterprise@forge.sh",
    highlight: false,
    desc: "SSO, self-host license, SLA, dedicated support channel.",
  },
];

const features = [
  { label: "Local ADE + MCP",        free: true,  pro: true,  ent: true  },
  { label: "25 themes",              free: true,  pro: true,  ent: true  },
  { label: "All CLI commands",       free: true,  pro: true,  ent: true  },
  { label: "SQLite-backed projects", free: true,  pro: true,  ent: true  },
  { label: "REST API access",        free: false, pro: true,  ent: true  },
  { label: "Cloud sync",             free: false, pro: true,  ent: true  },
  { label: "Bench leaderboard",      free: false, pro: true,  ent: true  },
  { label: "Priority support",       free: false, pro: true,  ent: true  },
  { label: "Team workspaces",        free: false, pro: false, ent: true  },
  { label: "SSO / SAML",            free: false, pro: false, ent: true  },
  { label: "Self-host license",      free: false, pro: false, ent: true  },
  { label: "SLA + dedicated support",free: false, pro: false, ent: true  },
];

const faqs = [
  {
    q: "What does 'open core' mean?",
    a: "The desktop app, CLI, and MCP tools are MIT-licensed. The cloud sync and API backend are AGPL. You can self-host everything; a commercial license is required only when distributing as SaaS.",
  },
  {
    q: "Can I self-host the backend?",
    a: "Yes. The AGPL backend is fully open. Deploy it on your own infra. Enterprise adds a proprietary self-host license with an SLA and support contract.",
  },
  {
    q: "What data does Forge collect?",
    a: "On the Free plan, nothing leaves your machine. On Pro and Enterprise, only project metadata and usage counters are synced. No code, no prompts, no traces are uploaded without explicit opt-in.",
  },
  {
    q: "How do I upgrade or downgrade?",
    a: "Click 'Upgrade to Pro' above. Billing is monthly, no contracts. Cancel anytime from your dashboard — your data stays accessible in local SQLite.",
  },
];

const Check = () => <span style={{ color: "#22c55e" }}>✓</span>;
const Cross = () => <span style={{ color: "#555" }}>—</span>;

export default function Pricing() {
  return (
    <>
      <style>{`
        .pricing-page { padding: 72px 0 96px; }
        .pricing-page h1 { text-align: center; font-size: 2.5rem; font-weight: 800; margin-bottom: 12px; }
        .pricing-sub { text-align: center; color: #aaa; margin-bottom: 56px; }
        .tier-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-bottom: 72px; }
        @media(max-width:768px){.tier-grid{grid-template-columns:1fr;}}
        .tier-card { background: #111; border: 1px solid var(--border); border-radius: 12px; padding: 32px; display: flex; flex-direction: column; gap: 16px; }
        .tier-card.highlight { border-color: var(--accent); }
        .tier-name { font-size: 1.1rem; font-weight: 700; }
        .tier-price { font-size: 2rem; font-weight: 800; }
        .tier-desc { color: #aaa; font-size: 0.9rem; flex: 1; }
        .tier-cta { display: block; text-align: center; padding: 10px; border-radius: 6px; font-weight: 600; }
        .tier-cta.primary { background: var(--accent); color: #fff; }
        .tier-cta.secondary { border: 1px solid var(--border); color: var(--fg); }
        .compare-table { width: 100%; border-collapse: collapse; margin-bottom: 72px; font-size: 0.9rem; }
        .compare-table th { padding: 12px 16px; text-align: center; border-bottom: 1px solid var(--border); color: #aaa; font-weight: 600; }
        .compare-table th:first-child { text-align: left; }
        .compare-table td { padding: 12px 16px; text-align: center; border-bottom: 1px solid #181818; }
        .compare-table td:first-child { text-align: left; color: #ccc; }
        .faq-section h2 { font-size: 1.6rem; font-weight: 700; margin-bottom: 32px; }
        .faq-item { border-top: 1px solid var(--border); padding: 24px 0; }
        .faq-item h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 10px; }
        .faq-item p { color: #aaa; font-size: 0.9rem; line-height: 1.6; }
      `}</style>
      <div className="container pricing-page">
        <h1>Simple, honest pricing</h1>
        <p className="pricing-sub">Start free. Upgrade when you need the cloud.</p>

        <div className="tier-grid">
          {tiers.map((t) => (
            <div key={t.name} className={`tier-card${t.highlight ? " highlight" : ""}`}>
              <div className="tier-name">{t.name}</div>
              <div className="tier-price">{t.price}</div>
              <div className="tier-desc">{t.desc}</div>
              <a href={t.ctaHref} className={`tier-cta ${t.highlight ? "primary" : "secondary"}`}>{t.cta}</a>
            </div>
          ))}
        </div>

        <table className="compare-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Free</th>
              <th>Pro</th>
              <th>Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.label}>
                <td>{f.label}</td>
                <td>{f.free ? <Check /> : <Cross />}</td>
                <td>{f.pro ? <Check /> : <Cross />}</td>
                <td>{f.ent ? <Check /> : <Cross />}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="faq-section">
          <h2>Frequently asked questions</h2>
          {faqs.map((faq) => (
            <div key={faq.q} className="faq-item">
              <h3>{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
