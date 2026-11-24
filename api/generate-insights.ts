import { gemini, cleanJson } from './_gemini.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { events, profile } = req.body || {};
  // Bound payload size: events JSON is truncated below; reject oversized bodies outright.
  if (JSON.stringify(req.body || {}).length > 20000) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  const prompt = `You are a supportive, insightful ADHD coach.
Analyze the client's recent behavioral logs and generate a 2-3 sentence personalized, encouraging, and highly actionable success pattern or insight.
The client's ADHD profile is: "${JSON.stringify(profile)}"
Their recent logged events: ${JSON.stringify(events || []).slice(0, 3000)}

Look for:
- Focus session completion rates
- Times of day they completed tasks
- Success of task breakdowns
- Rescue My Day frequency
- Routine consistency

Provide a warm, non-judgmental, specific insight (e.g. "You finish tasks 40% more often when broken into 3 steps or fewer!" or "Morning focus blocks seem to be your superpower; try scheduling hard tasks before 11am.").
Format the output as a valid JSON object:
{ "insight": "your text here" }
Do not include any Markdown backticks.`;

  try {
    const out = await gemini(prompt);
    return res.json(JSON.parse(cleanJson(out) || '{}'));
  } catch (err: any) {
    console.error('AI Insights error:', err?.message);
    return res.json({
      insight: 'You are doing great! Keep using the planner and focus timers to build personalized insights about your productivity patterns.',
      warning: err?.message || 'AI unavailable'
    });
  }
}
