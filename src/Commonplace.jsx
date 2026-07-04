import { useState, useEffect, useRef, useCallback } from "react";
import { loadKey, saveKey } from "./supabase.js";

// ————————————————————————————————————————————
// COMMONPLACE — a private life ledger
// Notes · Tasks · Goals, synced through Supabase
// ————————————————————————————————————————————

const C = {
  ground: "#F2F1EB",
  surface: "#FBFAF7",
  ink: "#22242C",
  muted: "#6E7178",
  faint: "#9A9C9F",
  line: "#DEDCD2",
  accent: "#34509B",
  accentSoft: "#E4E8F3",
  sage: "#7C8471",
  danger: "#9B4A3A",
};

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
* { box-sizing: border-box; }
::selection { background: ${C.accentSoft}; }
input, textarea, button, select { font-family: inherit; }
input:focus-visible, textarea:focus-visible, button:focus-visible, select:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
textarea { resize: none; }
`;

const serif = "'Newsreader', Georgia, serif";
const sans = "'IBM Plex Sans', system-ui, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, monospace";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const KEYS = { notes: "cp:notes", tasks: "cp:tasks", goals: "cp:goals" };

const SEED_GOALS = [
  { id: uid(), title: "Yellowstone road trip — late July", horizon: "now", done: false },
  { id: uid(), title: "Home lab: dbt · Airflow · DuckDB · Docker", horizon: "next", done: false },
  { id: uid(), title: "Data engineering role out of undergrad", horizon: "next", done: false },
  { id: uid(), title: "Funded IS PhD", horizon: "later", done: false },
];

const SEED_NOTES = [
  {
    id: uid(),
    title: "How this works",
    body: "Everything here saves to your own database and syncs across devices.\n\nToday is the desk — quick capture drops a note here.\nNotes is the commonplace book — ideas, frameworks, threads worth keeping.\nTasks is the short game. Goals is the long one.\n\nEdit or delete anything, including this.",
    created: Date.now(),
    updated: Date.now(),
  },
];

// ————————————————————————————————————————————

export default function Commonplace({ userId, onSignOut }) {
  const [view, setView] = useState("today");
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [openNote, setOpenNote] = useState(null);

  useEffect(() => {
    (async () => {
      const [n, t, g] = await Promise.all([
        loadKey(userId, KEYS.notes, null),
        loadKey(userId, KEYS.tasks, null),
        loadKey(userId, KEYS.goals, null),
      ]);
      setNotes(n ?? SEED_NOTES);
      setTasks(t ?? []);
      setGoals(g ?? SEED_GOALS);
      if (n === null) saveKey(userId, KEYS.notes, SEED_NOTES);
      if (g === null) saveKey(userId, KEYS.goals, SEED_GOALS);
      setLoaded(true);
    })();
  }, [userId]);

  const updateNotes = useCallback((next) => { setNotes(next); saveKey(userId, KEYS.notes, next); }, [userId]);
  const updateTasks = useCallback((next) => { setTasks(next); saveKey(userId, KEYS.tasks, next); }, [userId]);
  const updateGoals = useCallback((next) => { setGoals(next); saveKey(userId, KEYS.goals, next); }, [userId]);

  const now = new Date();
  const dateStamp = now
    .toLocaleDateString("en-US", { weekday: "short", month: "2-digit", day: "2-digit", year: "numeric" })
    .toUpperCase()
    .replace(",", " ·")
    .replace(/\//g, ".");
  const openCount = tasks.filter((t) => !t.done).length;

  const editing = openNote ? notes.find((n) => n.id === openNote) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.ground, color: C.ink, fontFamily: sans, fontSize: 15, lineHeight: 1.55 }}>
      <style>{FONT_CSS}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 96px" }}>
        <header style={{ paddingTop: 28, paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", color: C.muted }}>
            <span>{dateStamp}</span>
            <span>
              {openCount} OPEN · {notes.length} {notes.length === 1 ? "NOTE" : "NOTES"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <h1 style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 34, margin: "6px 0 0", letterSpacing: "-0.01em" }}>
              Commonplace
            </h1>
            <button
              onClick={onSignOut}
              style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", background: "none", border: "none", color: C.faint, cursor: "pointer", paddingBottom: 6 }}
            >
              SIGN OUT
            </button>
          </div>
        </header>

        {!editing && (
          <nav style={{ display: "flex", gap: 4, padding: "14px 0 22px", flexWrap: "wrap" }}>
            {[
              ["today", "TODAY"],
              ["notes", "NOTES"],
              ["tasks", "TASKS"],
              ["goals", "GOALS"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                style={{
                  fontFamily: mono, fontSize: 11, letterSpacing: "0.1em",
                  padding: "7px 13px", borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${view === id ? C.accent : C.line}`,
                  background: view === id ? C.accent : "transparent",
                  color: view === id ? C.surface : C.muted,
                  transition: "all .15s ease",
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        {!loaded ? (
          <p style={{ fontFamily: mono, fontSize: 12, color: C.faint, paddingTop: 32 }}>OPENING THE LEDGER…</p>
        ) : editing ? (
          <NoteEditor
            note={editing}
            onChange={(patch) => updateNotes(notes.map((n) => (n.id === editing.id ? { ...n, ...patch, updated: Date.now() } : n)))}
            onDelete={() => { updateNotes(notes.filter((n) => n.id !== editing.id)); setOpenNote(null); }}
            onBack={() => setOpenNote(null)}
          />
        ) : view === "today" ? (
          <Today
            tasks={tasks} notes={notes} goals={goals}
            onQuickNote={(body) => {
              const n = { id: uid(), title: "", body, created: Date.now(), updated: Date.now() };
              updateNotes([n, ...notes]);
            }}
            onToggleTask={(id) => updateTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))}
            openNote={(id) => setOpenNote(id)}
            goTo={setView}
          />
        ) : view === "notes" ? (
          <Notes
            notes={notes}
            onNew={() => {
              const n = { id: uid(), title: "", body: "", created: Date.now(), updated: Date.now() };
              updateNotes([n, ...notes]);
              setOpenNote(n.id);
            }}
            onOpen={setOpenNote}
          />
        ) : view === "tasks" ? (
          <Tasks tasks={tasks} update={updateTasks} />
        ) : (
          <Goals goals={goals} update={updateGoals} />
        )}
      </div>
    </div>
  );
}

// ————————————————————————————————————————————
// TODAY
// ————————————————————————————————————————————

function Today({ tasks, notes, goals, onQuickNote, onToggleTask, openNote, goTo }) {
  const [capture, setCapture] = useState("");
  const [captured, setCaptured] = useState(false);
  const open = tasks.filter((t) => !t.done).slice(0, 5);
  const recent = notes.slice(0, 2);
  const nowGoals = goals.filter((g) => g.horizon === "now" && !g.done);

  const submit = () => {
    if (!capture.trim()) return;
    onQuickNote(capture.trim());
    setCapture("");
    setCaptured(true);
    setTimeout(() => setCaptured(false), 1800);
  };

  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
        <Label>QUICK CAPTURE</Label>
        <textarea
          rows={2}
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="A thought worth keeping…"
          style={{ width: "100%", border: "none", background: "transparent", fontSize: 15, lineHeight: 1.5, color: C.ink, marginTop: 8 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: C.sage }}>{captured ? "KEPT." : ""}</span>
          <SmallBtn onClick={submit}>Keep it</SmallBtn>
        </div>
      </div>

      <Section title="ON THE DESK" action={open.length === 0 ? null : { label: "ALL TASKS →", fn: () => goTo("tasks") }}>
        {open.length === 0 ? (
          <Empty>Nothing open. Add tasks when the day fills up.</Empty>
        ) : (
          open.map((t) => <TaskRow key={t.id} task={t} onToggle={() => onToggleTask(t.id)} />)
        )}
      </Section>

      {nowGoals.length > 0 && (
        <Section title="IN PLAY" action={{ label: "ALL GOALS →", fn: () => goTo("goals") }}>
          {nowGoals.map((g) => (
            <div key={g.id} style={{ padding: "10px 2px", borderBottom: `1px solid ${C.line}`, fontFamily: serif, fontSize: 17 }}>
              {g.title}
            </div>
          ))}
        </Section>
      )}

      <Section title="RECENTLY WRITTEN" action={{ label: "ALL NOTES →", fn: () => goTo("notes") }}>
        {recent.length === 0 ? (
          <Empty>The book is blank. First entry sets the tone.</Empty>
        ) : (
          recent.map((n) => <NoteCard key={n.id} note={n} onOpen={() => openNote(n.id)} />)
        )}
      </Section>
    </div>
  );
}

// ————————————————————————————————————————————
// NOTES
// ————————————————————————————————————————————

function Notes({ notes, onNew, onOpen }) {
  const [q, setQ] = useState("");
  const shown = notes
    .filter((n) => (n.title + " " + n.body).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.updated - a.updated);

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes"
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.line}`,
            background: C.surface, fontSize: 14, color: C.ink,
          }}
        />
        <SmallBtn onClick={onNew}>+ New note</SmallBtn>
      </div>
      <div style={{ marginTop: 18 }}>
        {shown.length === 0 ? (
          <Empty>{q ? "Nothing matches that." : "The book is blank. First entry sets the tone."}</Empty>
        ) : (
          shown.map((n) => <NoteCard key={n.id} note={n} onOpen={() => onOpen(n.id)} />)
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, onOpen }) {
  const stamp = new Date(note.updated).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <button
      onClick={onOpen}
      style={{
        display: "block", width: "100%", textAlign: "left", cursor: "pointer",
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10,
        padding: "14px 16px", marginBottom: 10, color: C.ink,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 500 }}>
          {note.title || firstLine(note.body) || "Untitled"}
        </span>
        <span style={{ fontFamily: mono, fontSize: 10.5, color: C.faint, whiteSpace: "nowrap" }}>{stamp.toUpperCase()}</span>
      </div>
      {note.body && (
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: C.muted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {note.title ? note.body : note.body.split("\n").slice(1).join(" ")}
        </p>
      )}
    </button>
  );
}

function firstLine(s) {
  return (s || "").split("\n")[0].slice(0, 60);
}

function NoteEditor({ note, onChange, onDelete, onBack }) {
  const [confirming, setConfirming] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = "auto";
      bodyRef.current.style.height = bodyRef.current.scrollHeight + "px";
    }
  }, [note.body]);

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onBack} style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", background: "none", border: "none", color: C.accent, cursor: "pointer", padding: "6px 0" }}>
          ← BACK
        </button>
        {confirming ? (
          <span style={{ fontFamily: mono, fontSize: 11 }}>
            <button onClick={onDelete} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", letterSpacing: "0.08em" }}>DELETE FOR GOOD</button>
            <button onClick={() => setConfirming(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginLeft: 12, letterSpacing: "0.08em" }}>KEEP</button>
          </span>
        ) : (
          <button onClick={() => setConfirming(true)} style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", background: "none", border: "none", color: C.faint, cursor: "pointer" }}>
            DELETE
          </button>
        )}
      </div>
      <input
        value={note.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Title"
        style={{ width: "100%", border: "none", background: "transparent", fontFamily: serif, fontSize: 26, fontWeight: 500, color: C.ink, padding: 0 }}
      />
      <div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint, margin: "4px 0 14px" }}>
        SAVED AUTOMATICALLY · {new Date(note.updated).toLocaleString()}
      </div>
      <textarea
        ref={bodyRef}
        value={note.body}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder="Write."
        style={{ width: "100%", minHeight: 240, border: "none", background: "transparent", fontSize: 15.5, lineHeight: 1.65, color: C.ink, padding: 0 }}
      />
    </div>
  );
}

// ————————————————————————————————————————————
// TASKS
// ————————————————————————————————————————————

function Tasks({ tasks, update }) {
  const [draft, setDraft] = useState("");
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const add = () => {
    if (!draft.trim()) return;
    update([{ id: uid(), title: draft.trim(), done: false, created: Date.now() }, ...tasks]);
    setDraft("");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, fontSize: 14, color: C.ink }}
        />
        <SmallBtn onClick={add}>Add</SmallBtn>
      </div>

      <Section title={`OPEN — ${open.length}`}>
        {open.length === 0 ? (
          <Empty>Clear desk.</Empty>
        ) : (
          open.map((t) => (
            <TaskRow key={t.id} task={t}
              onToggle={() => update(tasks.map((x) => (x.id === t.id ? { ...x, done: true } : x)))}
              onDelete={() => update(tasks.filter((x) => x.id !== t.id))}
            />
          ))
        )}
      </Section>

      {done.length > 0 && (
        <Section title={`DONE — ${done.length}`} action={{ label: "CLEAR DONE", fn: () => update(open) }}>
          {done.map((t) => (
            <TaskRow key={t.id} task={t}
              onToggle={() => update(tasks.map((x) => (x.id === t.id ? { ...x, done: false } : x)))}
              onDelete={() => update(tasks.filter((x) => x.id !== t.id))}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px", borderBottom: `1px solid ${C.line}` }}>
      <button
        onClick={onToggle}
        aria-label={task.done ? "Mark not done" : "Mark done"}
        style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: "pointer",
          border: `1.5px solid ${task.done ? C.sage : C.faint}`,
          background: task.done ? C.sage : "transparent",
          color: C.surface, fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {task.done ? "✓" : ""}
      </button>
      <span style={{ flex: 1, fontSize: 15, color: task.done ? C.faint : C.ink, textDecoration: task.done ? "line-through" : "none" }}>
        {task.title}
      </span>
      {onDelete && (
        <button onClick={onDelete} aria-label="Delete task" style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 14, padding: "2px 4px" }}>
          ×
        </button>
      )}
    </div>
  );
}

// ————————————————————————————————————————————
// GOALS
// ————————————————————————————————————————————

const HORIZONS = [
  ["now", "NOW"],
  ["next", "NEXT"],
  ["later", "LATER"],
];

function Goals({ goals, update }) {
  const [draft, setDraft] = useState("");
  const [horizon, setHorizon] = useState("now");

  const add = () => {
    if (!draft.trim()) return;
    update([...goals, { id: uid(), title: draft.trim(), horizon, done: false }]);
    setDraft("");
  };

  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Name the goal"
          style={{ width: "100%", border: "none", background: "transparent", fontSize: 15, color: C.ink, padding: "2px 0 10px" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {HORIZONS.map(([id, label]) => (
              <button key={id} onClick={() => setHorizon(id)}
                style={{
                  fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", padding: "5px 10px",
                  borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${horizon === id ? C.accent : C.line}`,
                  background: horizon === id ? C.accentSoft : "transparent",
                  color: horizon === id ? C.accent : C.muted,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <SmallBtn onClick={add}>Add</SmallBtn>
        </div>
      </div>

      {HORIZONS.map(([id, label]) => {
        const list = goals.filter((g) => g.horizon === id);
        if (list.length === 0) return null;
        return (
          <Section key={id} title={label}>
            {list.map((g) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 2px", borderBottom: `1px solid ${C.line}` }}>
                <button
                  onClick={() => update(goals.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)))}
                  aria-label={g.done ? "Mark not done" : "Mark done"}
                  style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                    border: `1.5px solid ${g.done ? C.sage : C.faint}`,
                    background: g.done ? C.sage : "transparent",
                    color: C.surface, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {g.done ? "✓" : ""}
                </button>
                <span style={{ flex: 1, fontFamily: serif, fontSize: 17.5, color: g.done ? C.faint : C.ink, textDecoration: g.done ? "line-through" : "none" }}>
                  {g.title}
                </span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <select
                    value={g.horizon}
                    onChange={(e) => update(goals.map((x) => (x.id === g.id ? { ...x, horizon: e.target.value } : x)))}
                    aria-label="Move to horizon"
                    style={{ fontFamily: mono, fontSize: 10, color: C.muted, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 6, padding: "3px 4px" }}
                  >
                    <option value="now">NOW</option>
                    <option value="next">NEXT</option>
                    <option value="later">LATER</option>
                  </select>
                  <button
                    onClick={() => update(goals.filter((x) => x.id !== g.id))}
                    aria-label="Delete goal"
                    style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 14, padding: "2px 4px" }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </Section>
        );
      })}
    </div>
  );
}

// ————————————————————————————————————————————
// shared bits
// ————————————————————————————————————————————

function Label({ children }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", color: C.muted }}>{children}</div>
  );
}

function Section({ title, action, children }) {
  return (
    <section style={{ marginTop: 30 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${C.ink}`, paddingBottom: 6, marginBottom: 6 }}>
        <Label>{title}</Label>
        {action && (
          <button onClick={action.fn} style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", background: "none", border: "none", color: C.accent, cursor: "pointer", padding: 0 }}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p style={{ fontFamily: serif, fontStyle: "italic", color: C.faint, fontSize: 15.5, padding: "10px 2px", margin: 0 }}>{children}</p>;
}

function SmallBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: mono, fontSize: 11, letterSpacing: "0.08em",
        padding: "8px 16px", borderRadius: 999, cursor: "pointer",
        border: `1px solid ${C.accent}`, background: C.accent, color: C.surface,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
