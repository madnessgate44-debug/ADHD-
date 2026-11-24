// Shared Gemini REST helper for the trial backend.
// Key lives ONLY in the GEMINI_API_KEY server-side env var; never in the bundle.
// Quota-aware: the Gemini free tier shares 20 requests/day project-wide, so this
// function enforces a small best-effort daily cap per warm instance and surfaces
// quota exhaustion honestly (throw -> caller returns labeled offline fallback).
const MODEL = 'gemini-2.5-flash';
const DAILY_CAP = 10; // headroom under the shared 20 RPD free-tier allowance
let dayStamp = '';
let dayCount = 0;

export async function gemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('AI backend not configured');

  const today = new Date().toISOString().slice(0, 10);
  if (dayStamp !== today) { dayStamp = today; dayCount = 0; }
  if (dayCount >= DAILY_CAP) {
    const err: any = new Error('Daily AI trial limit reached - showing standard offline steps');
    err.status = 429;
    throw err;
  }
  dayCount++;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!resp.ok) {
    const err: any = new Error(
      resp.status === 429
        ? 'AI quota is temporarily exhausted - showing standard offline steps'
        : `AI request failed (${resp.status})`
    );
    err.status = resp.status;
    throw err;
  }
  const data: any = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => p?.text ?? '').join('');
}

export function cleanJson(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}
