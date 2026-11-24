import { gemini, cleanJson } from './_gemini.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { taskTitle } = req.body || {};
  if (!taskTitle || typeof taskTitle !== 'string' || taskTitle.length > 500) {
    return res.status(400).json({ error: 'Task title is required (max 500 chars)' });
  }

  const prompt = `You are an empathetic, practical ADHD coach helping a client break down an overwhelming task.
The task is: "${taskTitle}"
Break it down into 3 to 5 extremely tiny, low-friction micro-steps.
The first step must be so small and physical that it is impossible to fail (e.g. "Open the laptop", "Find a pen", "Stand up and walk to the sink").
Keep descriptions short, plain, action-oriented, and supportive.
Format the output as a valid JSON array of strings, like this: ["Step 1", "Step 2", "Step 3"].
Do not include any Markdown formatting, backticks, or comments. Output ONLY the raw JSON array.`;

  try {
    const text = await gemini(prompt);
    return res.json({ steps: JSON.parse(cleanJson(text)) });
  } catch (err: any) {
    console.error('AI Breakdown error:', err?.message);
    return res.json({
      steps: [
        'Find and gather what you need',
        'Start the first small part for just 2 minutes',
        'Do the next part',
        'Finish and celebrate!'
      ],
      warning: err?.message || 'AI unavailable'
    });
  }
}
