// POST { text: string } -> { items: [{ title, due }] }
// due is "YYYY-MM-DD" or null. Runs server-side only — this is the one place
// GROQ_API_KEY is used, and it never reaches the browser.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "Missing syllabus text" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY not configured on the server" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are extracting graded assignments, projects, and exams from a college syllabus.

Today's date is ${today}. Use it to resolve any dates that omit a year.

Return ONLY a JSON array — no prose, no markdown code fences, nothing else.
Each item: {"title": string, "due": "YYYY-MM-DD" or null}.
Only include items that have an explicit or clearly inferable due date in the text.
Skip general policies, office hours, and anything without a specific date.
If you find nothing with dates, return [].

Syllabus text:
"""
${text}
"""`;

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
    const raw = data?.choices?.[0]?.message?.content || "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let items;
    try {
      items = JSON.parse(cleaned);
    } catch {
      items = [];
    }
    if (!Array.isArray(items)) items = [];

    // basic shape guard so junk never reaches the frontend
    items = items
      .filter((it) => it && typeof it.title === "string")
      .map((it) => ({
        title: it.title.slice(0, 200),
        due: typeof it.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(it.due) ? it.due : null,
      }));

    res.status(200).json({ items });
  } catch (err) {
    console.error("parse-syllabus error:", err);
    res.status(500).json({ error: "Failed to parse syllabus" });
  }
}
