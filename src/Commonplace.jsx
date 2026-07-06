import { useState, useEffect, useRef, useCallback } from "react";
import { loadKey, saveKey } from "./supabase.js";

// ————————————————————————————————————————————
// COMMONPLACE — a private life ledger
// Today · Journal · Notes · Tasks · Calendar · Goals
// ————————————————————————————————————————————

const C = {
  ground: "#F2F1EB",
  surface: "#FBFAF7",
  ink: "#22242C",
  muted: "#6E7178",
  faint: "#9A9C9F",
  line: "#DEDCD2",
  accent: "#5B3F6B",
  accentSoft: "#ECE1EC",
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

const KEYS = {
  notes: "cp:notes",
  tasks: "cp:tasks",
  goals: "cp:goals",
  events: "cp:events",
  journal: "cp:journal",
  links: "cp:links",
  rituals: "cp:rituals",
  ritualState: "cp:ritualState",
  dayStart: "cp:dayStart",
};

// local date key, never UTC — a note written at 11pm belongs to today
const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
};

const fmtShort = (k) =>
  parseKey(k)
    .toLocaleDateString("en-US", { weekday: "short", month: "2-digit", day: "2-digit" })
    .toUpperCase()
    .replace(",", "")
    .replace(/\//g, ".");

const fmtLong = (k) =>
  parseKey(k).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

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
    body: "Everything here saves to your own database and syncs across devices.\n\nToday is the desk — quick capture drops a note here.\nJournal is the record of days. Notes is the commonplace book.\nTasks is the short game. Calendar and Goals are the long one.\n\nEdit or delete anything, including this.",
    created: Date.now(),
    updated: Date.now(),
  },
];

const SEED_LINKS = [
  { id: uid(), label: "Gmail", url: "https://mail.google.com" },
  { id: uid(), label: "D2L", url: "https://ocuonline.okcu.edu" },
];

// ————————————————————————————————————————————

export default function Commonplace({ userId, onSignOut }) {
  const [view, setView] = useState("today");
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [events, setEvents] = useState([]);
  const [journal, setJournal] = useState([]);
  const [links, setLinks] = useState([]);
  const [rituals, setRituals] = useState([]);
  const [ritualState, setRitualState] = useState({ date: "", done: [] });
  const [dayStart, setDayStart] = useState({ date: "", at: null });
  const [calendarFocus, setCalendarFocus] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [openNote, setOpenNote] = useState(null);

  useEffect(() => {
    (async () => {
      const [n, t, g, ev, j, l, r, rs, ds] = await Promise.all([
        loadKey(userId, KEYS.notes, null),
        loadKey(userId, KEYS.tasks, null),
        loadKey(userId, KEYS.goals, null),
        loadKey(userId, KEYS.events, null),
        loadKey(userId, KEYS.journal, null),
        loadKey(userId, KEYS.links, null),
        loadKey(userId, KEYS.rituals, null),
        loadKey(userId, KEYS.ritualState, null),
        loadKey(userId, KEYS.dayStart, null),
      ]);
      setNotes(n ?? SEED_NOTES);
      setTasks(t ?? []);
      setGoals(g ?? SEED_GOALS);
      setEvents(ev ?? []);
      setJournal(j ?? []);
      setLinks(l ?? SEED_LINKS);
      setRituals(r ?? []);
      setRitualState(rs ?? { date: "", done: [] });
      setDayStart(ds ?? { date: "", at: null });
      if (n === null) saveKey(userId, KEYS.notes, SEED_NOTES);
      if (g === null) saveKey(userId, KEYS.goals, SEED_GOALS);
      if (l === null) saveKey(userId, KEYS.links, SEED_LINKS);
      setLoaded(true);
    })();
  }, [userId]);

  const mk = (setter, key) =>
    useCallback(
      (next) => {
        setter(next);
        saveKey(userId, key, next);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [userId]
    );

  const updateNotes = mk(setNotes, KEYS.notes);
  const updateTasks = mk(setTasks, KEYS.tasks);
  const updateGoals = mk(setGoals, KEYS.goals);
  const updateEvents = mk(setEvents, KEYS.events);
  const updateJournal = mk(setJournal, KEYS.journal);
  const updateLinks = mk(setLinks, KEYS.links);
  const updateRituals = mk(setRituals, KEYS.rituals);
  const updateRitualState = mk(setRitualState, KEYS.ritualState);
  const updateDayStart = mk(setDayStart, KEYS.dayStart);

  const goToDate = (dstr) => {
    setCalendarFocus(dstr);
    setView("calendar");
  };

  const now = new Date();
  const dateStamp = now
    .toLocaleDateString("en-US", { weekday: "short", month: "2-digit", day: "2-digit", year: "numeric" })
    .toUpperCase()
    .replace(",", " ·")
    .replace(/\//g, ".");
  const openCount = tasks.filter((t) => !t.done).length;

  const editing = openNote ? notes.find((n) => n.id === openNote) : null;

  const exportAll = () => {
    const payload = {
      exported: new Date().toISOString(),
      notes, tasks, goals, events, journal, links, rituals, dayStart,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `commonplace-export-${dateKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.ground,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(34,36,44,0.09) 27px, rgba(34,36,44,0.09) 28px)`,
        color: C.ink, fontFamily: sans, fontSize: 15, lineHeight: 1.55,
      }}
    >
      <style>{FONT_CSS}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 40px" }}>
        <header style={{ paddingTop: "max(28px, env(safe-area-inset-top))", paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
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
              ["journal", "JOURNAL"],
              ["notes", "NOTES"],
              ["tasks", "TASKS"],
              ["calendar", "CALENDAR"],
              ["goals", "GOALS"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => { setView(id); if (id === "calendar") setCalendarFocus(null); }}
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
            tasks={tasks} notes={notes} goals={goals} events={events}
            links={links} updateLinks={updateLinks}
            rituals={rituals} updateRituals={updateRituals}
            ritualState={ritualState} updateRitualState={updateRitualState}
            dayStart={dayStart} updateDayStart={updateDayStart}
            onQuickNote={(body) => {
              const n = { id: uid(), title: "", body, created: Date.now(), updated: Date.now() };
              updateNotes([n, ...notes]);
            }}
            onToggleTask={(id) => updateTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))}
            openNote={(id) => setOpenNote(id)}
            goTo={setView}
            goToDate={goToDate}
          />
        ) : view === "journal" ? (
          <Journal journal={journal} update={updateJournal} />
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
        ) : view === "calendar" ? (
          <Calendar events={events} update={updateEvents} tasks={tasks} updateTasks={updateTasks} focusDate={calendarFocus} />
        ) : (
          <Goals goals={goals} update={updateGoals} />
        )}

        {!editing && loaded && (
          <footer style={{ marginTop: 48, paddingTop: 16, borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color: C.faint }}>A PRIVATE LEDGER</span>
            <button
              onClick={exportAll}
              style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", background: "none", border: "none", color: C.muted, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              EXPORT EVERYTHING
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

// ————————————————————————————————————————————
// TODAY
// ————————————————————————————————————————————

function Today({
  tasks, notes, goals, events,
  links, updateLinks, rituals, updateRituals, ritualState, updateRitualState,
  dayStart, updateDayStart,
  onQuickNote, onToggleTask, openNote, goTo, goToDate,
}) {
  const [capture, setCapture] = useState("");
  const [captured, setCaptured] = useState(false);
  const tk = dateKey();
  const open = tasks.filter((t) => !t.done && t.due !== tk).sort(byDue).slice(0, 5);
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
      <StartHere
        tasks={tasks} events={events} onToggleTask={onToggleTask}
        links={links} updateLinks={updateLinks}
        rituals={rituals} updateRituals={updateRituals}
        ritualState={ritualState} updateRitualState={updateRitualState}
        dayStart={dayStart} updateDayStart={updateDayStart}
        goToDate={goToDate}
      />

      {/* quick capture */}
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

      {/* open tasks (today's due items already live in Start Here) */}
      <Section title="ON THE DESK" action={open.length === 0 ? null : { label: "ALL TASKS →", fn: () => goTo("tasks") }}>
        {open.length === 0 ? (
          <Empty>Nothing open. Add tasks when the day fills up.</Empty>
        ) : (
          open.map((t) => <TaskRow key={t.id} task={t} onToggle={() => onToggleTask(t.id)} />)
        )}
      </Section>

      {/* now goals */}
      {nowGoals.length > 0 && (
        <Section title="IN PLAY" action={{ label: "ALL GOALS →", fn: () => goTo("goals") }}>
          {nowGoals.map((g) => (
            <div key={g.id} style={{ padding: "10px 2px", borderBottom: `1px solid ${C.line}`, fontFamily: serif, fontSize: 17 }}>
              {g.title}
            </div>
          ))}
        </Section>
      )}

      {/* recent notes */}
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
// START HERE — greeting, week strip, the begin-the-day ritual
// ————————————————————————————————————————————

function StartHere({
  tasks, events, onToggleTask,
  links, updateLinks, rituals, updateRituals, ritualState, updateRitualState,
  dayStart, updateDayStart, goToDate,
}) {
  const tk = dateKey();
  const started = dayStart.date === tk;
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [drafting, setDrafting] = useState(false);
  const [intentionDraft, setIntentionDraft] = useState("");

  // week strip, Sunday through Saturday, matching the month calendar's convention
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const week = Array.from({ length: 7 }, (_, i) => dateKey(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)));

  const hasItems = {};
  for (const e of events) hasItems[e.date] = true;
  for (const t of tasks) if (t.due && !t.done) hasItems[t.due] = true;

  const eventsToday = events.filter((e) => e.date === tk).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const dueToday = tasks.filter((t) => t.due === tk);

  const finalize = (text) => {
    updateDayStart({
      date: tk,
      at: started ? dayStart.at : Date.now(),
      intention: text.trim(),
    });
    setDrafting(false);
    setIntentionDraft("");
  };

  const openEditor = () => {
    setIntentionDraft(started ? dayStart.intention || "" : "");
    setDrafting(true);
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.accentSoft}`, borderRadius: 10, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 23, margin: 0 }}>
          {greeting}.
        </h2>
        {started && (
          <span style={{ fontFamily: mono, fontSize: 10, color: C.faint, letterSpacing: "0.08em" }}>
            STARTED {new Date(dayStart.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toUpperCase()}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
        {week.map((k) => {
          const d = parseKey(k);
          const isToday = k === tk;
          return (
            <button
              key={k}
              onClick={() => goToDate(k)}
              style={{
                flex: 1, padding: "8px 2px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${isToday ? C.accent : C.line}`,
                background: isToday ? C.accentSoft : "transparent",
                color: isToday ? C.accent : C.ink,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.05em", color: isToday ? C.accent : C.faint }}>
                {d.toLocaleDateString("en-US", { weekday: "narrow" })}
              </span>
              <span style={{ fontSize: 13.5, fontFamily: isToday ? mono : sans }}>{d.getDate()}</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: hasItems[k] ? (isToday ? C.accent : C.faint) : "transparent" }} />
            </button>
          );
        })}
      </div>

      {/* the threshold: not started, and not yet drafting an intention */}
      {!started && !drafting && (
        <button
          onClick={() => setDrafting(true)}
          style={{
            marginTop: 16, width: "100%", fontFamily: mono, fontSize: 12, letterSpacing: "0.12em",
            padding: "13px 16px", borderRadius: 8, cursor: "pointer",
            border: `1px solid ${C.accent}`, background: C.accent, color: C.surface,
          }}
        >
          BEGIN THE DAY
        </button>
      )}

      {/* setting or editing the intention */}
      {drafting && (
        <div style={{ marginTop: 16 }}>
          <MiniLabel>WHAT WILL TODAY BE?</MiniLabel>
          <input
            autoFocus
            value={intentionDraft}
            onChange={(e) => setIntentionDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && finalize(intentionDraft)}
            placeholder="One word, one line, or leave it blank"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.line}`,
              background: C.ground, fontSize: 15, fontFamily: serif, fontStyle: "italic", color: C.ink,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 10 }}>
            <button
              onClick={() => { setDrafting(false); setIntentionDraft(""); }}
              style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", background: "none", border: "none", color: C.faint, cursor: "pointer" }}
            >
              CANCEL
            </button>
            <SmallBtn onClick={() => finalize(intentionDraft)}>
              {started ? "Save" : intentionDraft.trim() ? "Begin" : "Skip & begin"}
            </SmallBtn>
          </div>
        </div>
      )}

      {/* settled: the day has begun */}
      {started && !drafting && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {dayStart.intention ? (
            <button
              onClick={openEditor}
              style={{
                textAlign: "left", background: "transparent", border: "none", cursor: "pointer",
                borderLeft: `2px solid ${C.accent}`, padding: "2px 0 2px 12px",
              }}
            >
              <p style={{ margin: 0, fontFamily: serif, fontStyle: "italic", fontSize: 16.5, color: C.ink }}>
                “{dayStart.intention}”
              </p>
            </button>
          ) : (
            <button
              onClick={openEditor}
              style={{ alignSelf: "flex-start", fontFamily: mono, fontSize: 10.5, letterSpacing: "0.08em", background: "none", border: "none", color: C.faint, cursor: "pointer" }}
            >
              + SET AN INTENTION FOR TODAY
            </button>
          )}

          {eventsToday.length > 0 && (
            <div>
              <MiniLabel>TODAY'S EVENTS</MiniLabel>
              {eventsToday.map((e) => (
                <div key={e.id} style={{ display: "flex", gap: 10, padding: "7px 0", fontSize: 14.5 }}>
                  <span style={{ fontFamily: mono, fontSize: 10.5, color: C.faint, minWidth: 64 }}>
                    {e.time ? fmtTime(e.time) : "ALL DAY"}
                  </span>
                  <span>{e.title}</span>
                </div>
              ))}
            </div>
          )}

          {dueToday.length > 0 && (
            <div>
              <MiniLabel>DUE TODAY</MiniLabel>
              {dueToday.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                  <button
                    onClick={() => onToggleTask(t.id)}
                    aria-label={t.done ? "Mark not done" : "Mark done"}
                    style={{
                      width: 17, height: 17, borderRadius: 5, flexShrink: 0, cursor: "pointer",
                      border: `1.5px solid ${t.done ? C.sage : C.faint}`,
                      background: t.done ? C.sage : "transparent",
                      color: C.surface, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {t.done ? "✓" : ""}
                  </button>
                  <span style={{ fontSize: 14.5, color: t.done ? C.faint : C.ink, textDecoration: t.done ? "line-through" : "none" }}>
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div>
            <MiniLabel>RITUALS</MiniLabel>
            <RitualList rituals={rituals} updateRituals={updateRituals} ritualState={ritualState} updateRitualState={updateRitualState} />
          </div>

          <div>
            <MiniLabel>LINKS</MiniLabel>
            <QuickLinks links={links} update={updateLinks} />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniLabel({ children }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color: C.muted, marginBottom: 4 }}>{children}</div>
  );
}

// ————————————————————————————————————————————
// QUICK LINKS
// ————————————————————————————————————————————

function QuickLinks({ links, update }) {
  const [managing, setManaging] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const add = () => {
    if (!label.trim() || !url.trim()) return;
    const u = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    update([...links, { id: uid(), label: label.trim(), url: u }]);
    setLabel("");
    setUrl("");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {links.map((l) => (
          <span key={l.id} style={{ display: "inline-flex", alignItems: "center" }}>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: mono, fontSize: 11, letterSpacing: "0.06em",
                padding: "6px 12px", borderRadius: 999, textDecoration: "none",
                border: `1px solid ${C.line}`, background: C.surface, color: C.ink,
              }}
            >
              {l.label} ↗
            </a>
            {managing && (
              <button
                onClick={() => update(links.filter((x) => x.id !== l.id))}
                aria-label={`Remove ${l.label}`}
                style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 13, padding: "0 6px 0 2px" }}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <button
          onClick={() => setManaging(!managing)}
          style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.08em", background: "none", border: "none", color: C.faint, cursor: "pointer", padding: "6px 4px" }}
        >
          {managing ? "DONE" : links.length === 0 ? "+ ADD LINKS" : "EDIT"}
        </button>
      </div>
      {managing && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <input
            value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label"
            style={{ flex: "1 1 90px", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, fontSize: 13, color: C.ink }}
          />
          <input
            value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL"
            onKeyDown={(e) => e.key === "Enter" && add()}
            style={{ flex: "2 1 140px", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, fontSize: 13, color: C.ink }}
          />
          <SmallBtn onClick={add}>Add</SmallBtn>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————
// RITUALS — daily, resets at midnight
// ————————————————————————————————————————————

function RitualList({ rituals, updateRituals, ritualState, updateRitualState }) {
  const [managing, setManaging] = useState(false);
  const [draft, setDraft] = useState("");
  const tk = dateKey();
  const done = ritualState.date === tk ? ritualState.done : [];

  const toggle = (id) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    updateRitualState({ date: tk, done: next });
  };

  const add = () => {
    if (!draft.trim()) return;
    updateRituals([...rituals, { id: uid(), title: draft.trim() }]);
    setDraft("");
  };

  return (
    <div>
      {rituals.length === 0 && !managing ? (
        <Empty>The small things you do daily. Tap edit to name them.</Empty>
      ) : (
        rituals.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0" }}>
            <button
              onClick={() => toggle(r.id)}
              aria-label={done.includes(r.id) ? "Mark not done" : "Mark done"}
              style={{
                width: 17, height: 17, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                border: `1.5px solid ${done.includes(r.id) ? C.sage : C.faint}`,
                background: done.includes(r.id) ? C.sage : "transparent",
                color: C.surface, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {done.includes(r.id) ? "✓" : ""}
            </button>
            <span style={{ flex: 1, fontSize: 14.5, color: done.includes(r.id) ? C.faint : C.ink }}>{r.title}</span>
            {managing && (
              <button
                onClick={() => updateRituals(rituals.filter((x) => x.id !== r.id))}
                aria-label="Delete ritual"
                style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 14, padding: "2px 4px" }}
              >
                ×
              </button>
            )}
          </div>
        ))
      )}
      {managing && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Name a daily ritual"
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.ground, fontSize: 13, color: C.ink }}
          />
          <SmallBtn onClick={add}>Add</SmallBtn>
        </div>
      )}
      <button
        onClick={() => setManaging(!managing)}
        style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", background: "none", border: "none", color: C.faint, cursor: "pointer", padding: "6px 0 0" }}
      >
        {managing ? "DONE" : "EDIT"}
      </button>
    </div>
  );
}

// ————————————————————————————————————————————
// JOURNAL — one entry per day
// ————————————————————————————————————————————

function Journal({ journal, update }) {
  const tk = dateKey();
  const [sel, setSel] = useState(tk);
  const entry = journal.find((e) => e.date === sel);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = "auto";
      bodyRef.current.style.height = Math.max(160, bodyRef.current.scrollHeight) + "px";
    }
  }, [entry?.body, sel]);

  const setBody = (body) => {
    if (entry) {
      update(journal.map((e) => (e.date === sel ? { ...e, body, updated: Date.now() } : e)));
    } else {
      update([{ id: uid(), date: sel, body, updated: Date.now() }, ...journal]);
    }
  };

  const past = journal
    .filter((e) => e.date !== sel && e.body.trim())
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 22, margin: 0 }}>
            {sel === tk ? "Today" : fmtLong(sel)}
          </h2>
          {sel !== tk && (
            <button
              onClick={() => setSel(tk)}
              style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", background: "none", border: "none", color: C.accent, cursor: "pointer" }}
            >
              ← BACK TO TODAY
            </button>
          )}
        </div>
        <div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint, margin: "2px 0 12px" }}>
          {sel === tk ? fmtLong(tk).toUpperCase() : "EDITING A PAST DAY"} · SAVED AUTOMATICALLY
        </div>
        <textarea
          ref={bodyRef}
          value={entry?.body || ""}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What was today, actually?"
          style={{ width: "100%", minHeight: 160, border: "none", background: "transparent", fontSize: 15.5, lineHeight: 1.7, color: C.ink, padding: 0 }}
        />
      </div>

      {past.length > 0 && (
        <Section title={`THE RECORD — ${past.length} ${past.length === 1 ? "DAY" : "DAYS"}`}>
          {past.map((e) => (
            <button
              key={e.id}
              onClick={() => setSel(e.date)}
              style={{
                display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10,
                padding: "13px 16px", marginBottom: 10, color: C.ink,
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint, marginBottom: 4 }}>{fmtShort(e.date)}</div>
              <p style={{ margin: 0, fontSize: 14, color: C.muted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {e.body}
              </p>
            </button>
          ))}
        </Section>
      )}
    </div>
  );
}

// ————————————————————————————————————————————
// CALENDAR — month grid + upcoming
// ————————————————————————————————————————————

function Calendar({ events, update, tasks, updateTasks, focusDate }) {
  const today = dateKey();
  const [cursor, setCursor] = useState(() => {
    const base = focusDate ? parseKey(focusDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [sel, setSel] = useState(focusDate || today);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const byDate = {};
  for (const e of events) byDate[e.date] = (byDate[e.date] || 0) + 1;
  for (const t of tasks) if (t.due && !t.done) byDate[t.due] = (byDate[t.due] || 0) + 1;

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const keyFor = (d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const add = () => {
    if (!title.trim()) return;
    update(
      [...events, { id: uid(), title: title.trim(), date: sel, time: time || null }]
    );
    setTitle("");
    setTime("");
  };

  const dayEvents = events
    .filter((e) => e.date === sel)
    .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));

  const dayTasks = tasks
    .filter((t) => t.due === sel)
    .sort((a, b) => Number(a.done) - Number(b.done));

  const upcoming = [
    ...events.filter((e) => e.date >= today).map((e) => ({ ...e, kind: "event" })),
    ...tasks.filter((t) => t.due && !t.done && t.due >= today).map((t) => ({ id: t.id, title: t.title, date: t.due, time: null, kind: "task" })),
  ]
    .sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")))
    .slice(0, 8);

  const cellSize = "calc((100% - 12px) / 7)";

  return (
    <div>
      {/* month header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setCursor(new Date(y, m - 1, 1))} aria-label="Previous month" style={navBtn}>‹</button>
        <h2 style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 22, margin: 0 }}>{monthLabel}</h2>
        <button onClick={() => setCursor(new Date(y, m + 1, 1))} aria-label="Next month" style={navBtn}>›</button>
      </div>

      {/* grid */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontFamily: mono, fontSize: 10, color: C.faint, letterSpacing: "0.1em", padding: "4px 0" }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const k = keyFor(d);
            const isSel = k === sel;
            const isToday = k === today;
            const has = byDate[k];
            return (
              <button
                key={k}
                onClick={() => setSel(k)}
                style={{
                  aspectRatio: "1", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${isSel ? C.accent : isToday ? C.faint : "transparent"}`,
                  background: isSel ? C.accentSoft : "transparent",
                  color: isSel ? C.accent : C.ink,
                  fontSize: 13.5, fontFamily: isToday || isSel ? mono : sans,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  padding: 0,
                }}
              >
                <span>{d}</span>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: has ? C.accent : "transparent" }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* selected day */}
      <Section title={sel === today ? "TODAY" : fmtShort(sel)}>
        {dayTasks.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px", borderBottom: `1px solid ${C.line}` }}>
            <button
              onClick={() => updateTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
              aria-label={t.done ? "Mark not done" : "Mark done"}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: "pointer",
                border: `1.5px solid ${t.done ? C.sage : C.faint}`,
                background: t.done ? C.sage : "transparent",
                color: C.surface, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {t.done ? "✓" : ""}
            </button>
            <span style={{ flex: 1, fontSize: 15, color: t.done ? C.faint : C.ink, textDecoration: t.done ? "line-through" : "none" }}>
              {t.title}
            </span>
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", color: C.faint }}>DUE</span>
          </div>
        ))}
        {dayEvents.length === 0 && dayTasks.length === 0 ? (
          <Empty>Nothing planned. Some of the best days aren't.</Empty>
        ) : (
          dayEvents.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "10px 2px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: mono, fontSize: 10.5, color: C.faint, whiteSpace: "nowrap", minWidth: 62 }}>
                {e.time ? fmtTime(e.time) : "ALL DAY"}
              </span>
              <span style={{ flex: 1, fontSize: 15 }}>{e.title}</span>
              <button
                onClick={() => update(events.filter((x) => x.id !== e.id))}
                aria-label="Delete event"
                style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 14, padding: "2px 4px" }}
              >
                ×
              </button>
            </div>
          ))
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={`Add to ${sel === today ? "today" : fmtShort(sel)}`}
            style={{ flex: "2 1 160px", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, fontSize: 14, color: C.ink }}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Time (optional)"
            style={{ flex: "1 1 90px", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, fontSize: 13, color: time ? C.ink : C.faint, fontFamily: mono }}
          />
          <SmallBtn onClick={add}>Add</SmallBtn>
        </div>
      </Section>

      {/* upcoming */}
      {upcoming.length > 0 && (
        <Section title="UPCOMING">
          {upcoming.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                setSel(e.date);
                const d = parseKey(e.date);
                setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
              style={{
                display: "flex", width: "100%", gap: 12, alignItems: "baseline", textAlign: "left",
                padding: "10px 2px", borderBottom: `1px solid ${C.line}`,
                background: "none", border: "none", borderBottomStyle: "solid", cursor: "pointer", color: C.ink,
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 10.5, color: e.date === today ? C.accent : C.faint, whiteSpace: "nowrap" }}>
                {e.date === today ? "TODAY" : fmtShort(e.date)}{e.time ? ` · ${fmtTime(e.time)}` : ""}
              </span>
              <span style={{ fontSize: 15, flex: 1 }}>{e.title}</span>
              {e.kind === "task" && (
                <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", color: C.faint, border: `1px solid ${C.line}`, borderRadius: 4, padding: "1px 5px" }}>TASK</span>
              )}
            </button>
          ))}
        </Section>
      )}
    </div>
  );
}

const navBtn = {
  fontFamily: mono, fontSize: 18, width: 36, height: 36, borderRadius: 999,
  border: `1px solid ${C.line}`, background: C.surface, color: C.ink, cursor: "pointer",
};

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
  const [due, setDue] = useState("");
  const open = tasks.filter((t) => !t.done).sort(byDue);
  const done = tasks.filter((t) => t.done);

  const add = () => {
    if (!draft.trim()) return;
    update([{ id: uid(), title: draft.trim(), done: false, due: due || null, created: Date.now() }, ...tasks]);
    setDraft("");
    setDue("");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task"
          style={{ flex: "2 1 160px", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, fontSize: 14, color: C.ink }}
        />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Due date (optional)"
          style={{ flex: "1 1 120px", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, fontSize: 13, color: due ? C.ink : C.faint, fontFamily: mono }}
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

const byDue = (a, b) => (a.due || "~").localeCompare(b.due || "~");

function TaskRow({ task, onToggle, onDelete }) {
  const tk = dateKey();
  const overdue = task.due && !task.done && task.due < tk;
  const dueToday = task.due === tk;
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
        {task.due && (
          <span style={{
            fontFamily: mono, fontSize: 10, letterSpacing: "0.06em", marginLeft: 8,
            color: task.done ? C.faint : overdue ? C.danger : dueToday ? C.accent : C.faint,
          }}>
            {overdue ? "OVERDUE · " : ""}{dueToday ? "TODAY" : fmtShort(task.due)}
          </span>
        )}
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
