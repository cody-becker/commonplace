// POST { text: string, today: "YYYY-MM-DD", classes: [{id,name,code}] }
// -> { title, date, time, classId }
// date/time/classId are null when not determinable. classId is only ever
// one of the ids passed in — the model never invents one.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { text, today, classes } = req.body || {};
  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "Missing text" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY not configured on the server" });
    return;
  }

  const todayStr = typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)
    ? today
    : new Date().toISOString().slice(0, 10);
  const dow = new Date(`${todayStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });

  const classList = Array.isArray(classes) ? classes.slice(0, 30) : [];
  const classListText = classList.length
    ? classList.map((c) => `- id: ${c.id}, name: ${c.name || ""}, code: ${c.code || ""}`).join("\n")
    : "(the user has no classes yet)";

  const prompt = `You are parsing a short, casual note into a single calendar item.

Today is ${dow}, ${todayStr}. Resolve relative dates ("this friday", "tomorrow", "next week") against that.

The user's classes:
${classListText}

Return ONLY a JSON object — no prose, no markdown fences:
{"title": string, "date": "YYYY-MM-DD" or null, "time": "HH:MM" in 24-hour or null, "classId": string or null}

Rules:
- title: short and cleaned up (e.g. "Quiz" not "quiz in calc this friday")
- classId: match to one of the class ids above ONLY if the note clearly refers to that class; copy the id exactly; otherwise null
- date: null if you can't determine one — do not guess
- time: null unless a specific time is mentioned

Note: "${text}"`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      res.status(502).json({ error: "Upstream model error" });
      return;
    }

    const data = await groqRes.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let item;
    try {
      item = JSON.parse(cleaned);
    } catch {
      item = {};
    }
    if (typeof item !== "object" || item === null || Array.isArray(item)) item = {};

    const validClassIds = new Set(classList.map((c) => c.id));
    const out = {
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim().slice(0, 200) : text.slice(0, 200),
      date: typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : null,
      time: typeof item.time === "string" && /^\d{2}:\d{2}$/.test(item.time) ? item.time : null,
      classId: typeof item.classId === "string" && validClassIds.has(item.classId) ? item.classId : null,
    };

    res.status(200).json(out);
  } catch (err) {
    console.error("parse-quickadd error:", err);
    res.status(500).json({ error: "Failed to parse note" });
  }
}
