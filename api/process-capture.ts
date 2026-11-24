import { gemini, cleanJson } from './_gemini.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || text.length > 5000) {
    return res.status(400).json({ error: 'Text is required (max 5000 chars)' });
  }

  const prompt = `You are an ADHD organizer. The user has brain-dumped a messy, raw thought or voice note.
Their raw capture is: "${text}"
Your job is to clean it up and structure it.
Determine if it is best as:
1. "task" (an actionable todo item)
2. "routine" (a repeated habit)
3. "note" (just info)

Return a valid JSON object with these exact keys:
- type: "task" | "routine" | "note"
- title: a clean, concise, action-oriented title (e.g. "Call Dr. Smith" instead of "call dr smith about meds monday")
- description: a short description of any details (optional)
- subtasks: a JSON array of 2-3 tiny next action steps if it is a task, or empty array if not.

Do not include any Markdown formatting, backticks, or comments. Output ONLY the raw JSON object.`;

  try {
    const out = await gemini(prompt);
    return res.json(JSON.parse(cleanJson(out) || '{}'));
  } catch (err: any) {
    console.error('AI Process Capture error:', err?.message);
    return res.json({ type: 'task', title: text, description: '', subtasks: [], warning: err?.message || 'AI unavailable' });
  }
}
