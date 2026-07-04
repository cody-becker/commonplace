import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import Commonplace from "./Commonplace.jsx";

const C = {
  ground: "#F2F1EB",
  surface: "#FBFAF7",
  ink: "#22242C",
  muted: "#6E7178",
  faint: "#9A9C9F",
  line: "#DEDCD2",
  accent: "#34509B",
  sage: "#7C8471",
};
const serif = "'Newsreader', Georgia, serif";
const sans = "'IBM Plex Sans', system-ui, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, monospace";

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <Shell>
        <p style={{ fontFamily: mono, fontSize: 12, color: C.faint }}>OPENING THE LEDGER…</p>
      </Shell>
    );
  }

  if (!session) return <SignIn />;

  return (
    <Commonplace
      userId={session.user.id}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <Shell>
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", color: C.muted }}>
        PRIVATE LEDGER
      </div>
      <h1 style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 40, margin: "6px 0 28px", color: C.ink }}>
        Commonplace
      </h1>

      {sent ? (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", color: C.sage }}>LINK SENT</div>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: C.ink }}>
            Check <strong>{email}</strong> for a sign-in link. Open it on this device and you're in.
          </p>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
          <label htmlFor="email" style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", color: C.muted }}>
            EMAIL
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="you@example.com"
            autoComplete="email"
            style={{
              display: "block", width: "100%", marginTop: 8, padding: "10px 12px",
              borderRadius: 8, border: `1px solid ${C.line}`, background: C.ground,
              fontSize: 15, color: C.ink, boxSizing: "border-box",
            }}
          />
          <button
            onClick={send}
            disabled={busy}
            style={{
              marginTop: 12, fontFamily: mono, fontSize: 11, letterSpacing: "0.08em",
              padding: "10px 18px", borderRadius: 999, cursor: "pointer",
              border: `1px solid ${C.accent}`, background: C.accent, color: C.surface,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "SENDING…" : "Send sign-in link"}
          </button>
          {err && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#9B4A3A" }}>{err}</p>
          )}
          <p style={{ marginTop: 14, fontSize: 12.5, color: C.faint, lineHeight: 1.5 }}>
            No password. A one-time link lands in your inbox; the same email works on every device.
          </p>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.ground, fontFamily: sans }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "12vh 20px 40px" }}>{children}</div>
    </div>
  );
}
