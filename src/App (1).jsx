import { useState, useEffect, useRef } from "react";
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
  danger: "#9B4A3A",
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
  const [phase, setPhase] = useState("email"); // "email" | "code"
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    if (phase === "code" && codeRef.current) codeRef.current.focus();
  }, [phase]);

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
    else setPhase("code");
  };

  const verify = async () => {
    if (code.trim().length < 6 || busy) return;
    setBusy(true);
    setErr("");
    let { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      // new/unconfirmed accounts get "signup"-type codes instead
      const retry = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "signup",
      });
      error = retry.error;
    }
    setBusy(false);
    if (error) setErr("That code didn't work. Use the newest email — requesting a new code kills old ones.");
    // success: onAuthStateChange flips the app over automatically
  };

  return (
    <Shell>
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", color: C.muted }}>
        PRIVATE LEDGER
      </div>
      <h1 style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 40, margin: "6px 0 28px", color: C.ink }}>
        Commonplace
      </h1>

      {phase === "email" ? (
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
            style={inputStyle}
          />
          <button onClick={send} disabled={busy} style={btnStyle(busy)}>
            {busy ? "SENDING…" : "Send me a code"}
          </button>
          {err && <p style={{ marginTop: 10, fontSize: 13, color: C.danger }}>{err}</p>}
          <p style={{ marginTop: 14, fontSize: 12.5, color: C.faint, lineHeight: 1.5 }}>
            No password. A 6-digit code lands in your inbox — type it here and you're in.
          </p>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", color: C.sage }}>CODE SENT</div>
          <p style={{ margin: "8px 0 12px", fontSize: 14.5, color: C.ink }}>
            Check <strong>{email}</strong> for a 6-digit code and enter it below.
          </p>
          <label htmlFor="code" style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", color: C.muted }}>
            CODE
          </label>
          <input
            id="code"
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            placeholder="000000"
            style={{ ...inputStyle, fontFamily: mono, fontSize: 22, letterSpacing: "0.35em", textAlign: "center" }}
          />
          <button onClick={verify} disabled={busy || code.length < 6} style={btnStyle(busy || code.length < 6)}>
            {busy ? "CHECKING…" : "Sign in"}
          </button>
          {err && <p style={{ marginTop: 10, fontSize: 13, color: C.danger }}>{err}</p>}
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            <button onClick={send} disabled={busy} style={linkBtn}>
              RESEND CODE
            </button>
            <button onClick={() => { setPhase("email"); setCode(""); setErr(""); }} style={linkBtn}>
              DIFFERENT EMAIL
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 8,
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${C.line}`,
  background: C.ground,
  fontSize: 15,
  color: C.ink,
  boxSizing: "border-box",
};

const btnStyle = (disabled) => ({
  marginTop: 12,
  fontFamily: mono,
  fontSize: 11,
  letterSpacing: "0.08em",
  padding: "10px 18px",
  borderRadius: 999,
  cursor: disabled ? "default" : "pointer",
  border: `1px solid ${C.accent}`,
  background: C.accent,
  color: C.surface,
  opacity: disabled ? 0.55 : 1,
});

const linkBtn = {
  fontFamily: mono,
  fontSize: 10.5,
  letterSpacing: "0.1em",
  background: "none",
  border: "none",
  color: C.muted,
  cursor: "pointer",
  padding: 0,
};

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.ground, fontFamily: sans }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "12vh 20px 40px" }}>{children}</div>
    </div>
  );
}
