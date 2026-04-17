import React from "react";

const posts = [
  {
    slug: "production-mcp-server",
    title: "Building a production-grade MCP server",
    date: "2025-04-01",
    excerpt:
      "The Model Context Protocol unlocks direct agent-to-UI communication — but hardening a server for production means handling auth, rate-limits, and schema drift. We walk through the 11 data tools and 9 UI control tools we ship in Forge and the lessons learned.",
  },
  {
    slug: "deterministic-ai-replay",
    title: "Deterministic AI replay: JSONL traces explained",
    date: "2025-03-15",
    excerpt:
      "Reproducing a bug in an AI agent session used to mean 'run it again and hope'. Forge's JSONL trace format captures every event, model call, and tool invocation so you can replay any session byte-for-byte. Here is how we designed the format and the replay engine.",
  },
  {
    slug: "25-themes-schema-first",
    title: "25 themes in 25 minutes: schema-first design",
    date: "2025-03-01",
    excerpt:
      "Most editors treat themes as afterthoughts — a JSON blob that half-works with the terminal and half-works with the editor. We defined a single Zod schema that drives xterm.js, CodeMirror, and the Tauri window chrome simultaneously, then generated 25 validated palettes.",
  },
  {
    slug: "open-core-licensing",
    title: "Open core licensing: why we chose MIT + AGPL",
    date: "2025-02-15",
    excerpt:
      "We wanted contributors to own their apps and CLI tools outright (MIT) while keeping the cloud backend protected from cloud-provider cloning (AGPL). This post explains the boundary, what it means for self-hosters, and when a commercial license is actually required.",
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function Blog() {
  return (
    <>
      <style>{`
        .blog-page { padding: 72px 0 96px; }
        .blog-page h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 12px; }
        .blog-intro { color: #aaa; margin-bottom: 56px; }
        .post-list { display: flex; flex-direction: column; gap: 32px; }
        .post-card { background: #111; border: 1px solid var(--border); border-radius: 10px; padding: 28px 32px; }
        .post-date { font-size: 0.8rem; color: #666; margin-bottom: 8px; font-family: monospace; }
        .post-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 12px; color: var(--fg); }
        .post-excerpt { color: #aaa; font-size: 0.9rem; line-height: 1.65; margin-bottom: 16px; }
        .post-read-more { font-size: 0.875rem; font-weight: 600; color: var(--accent); }
      `}</style>
      <div className="container blog-page">
        <h1>Blog</h1>
        <p className="blog-intro">Engineering notes from the Forge team.</p>
        <div className="post-list">
          {posts.map((post) => (
            <article key={post.slug} className="post-card">
              <div className="post-date">{formatDate(post.date)}</div>
              <h2 className="post-title">{post.title}</h2>
              <p className="post-excerpt">{post.excerpt}</p>
              <a href={`/blog/${post.slug}`} className="post-read-more">Read more →</a>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
