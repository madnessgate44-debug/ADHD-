import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Lazy-initialize Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// 1. AI Task Breakdown Endpoint
app.post('/api/breakdown', async (req, res) => {
  try {
    const { taskTitle } = req.body;
    if (!taskTitle || typeof taskTitle !== 'string') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const ai = getAiClient();
    const prompt = `You are an empathetic, practical ADHD coach helping a client break down an overwhelming task.
The task is: "${taskTitle}"
Break it down into 3 to 5 extremely tiny, low-friction micro-steps.
The first step must be so small and physical that it is impossible to fail (e.g. "Open the laptop", "Find a pen", "Stand up and walk to the sink").
Keep descriptions short, plain, action-oriented, and supportive.
Format the output as a valid JSON array of strings, like this: ["Step 1", "Step 2", "Step 3"].
Do not include any Markdown formatting, backticks, or comments. Output ONLY the raw JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    // Clean up any JSON markdown wrap if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const steps = JSON.parse(cleanText);
    res.json({ steps });
  } catch (err: any) {
    console.error('AI Breakdown error:', err);
    // Return supportive defaults if AI fails or key is missing
    res.json({
      steps: [
        'Find and gather what you need',
        'Start the first small part for just 2 minutes',
        'Do the next part',
        'Finish and celebrate!'
      ],
      warning: err.message
    });
  }
});

// 2. AI Capture Process Endpoint
app.post('/api/process-capture', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const ai = getAiClient();
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const cleanText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
    const parsed = JSON.parse(cleanText);
    res.json(parsed);
  } catch (err: any) {
    console.error('AI Process Capture error:', err);
    // Simple fallback
    res.json({
      type: 'task',
      title: text,
      description: '',
      subtasks: [],
      warning: err.message
    });
  }
});

// 3. AI Insights Summary Endpoint
app.post('/api/generate-insights', async (req, res) => {
  try {
    const { events, profile } = req.body;
    
    const ai = getAiClient();
    const prompt = `You are a supportive, insightful ADHD coach (Hisham Lansari's coaching style).
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const cleanText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
    const parsed = JSON.parse(cleanText);
    res.json(parsed);
  } catch (err: any) {
    console.error('AI Insights error:', err);
    res.json({
      insight: 'You are doing great! Keep using the planner and focus timers to build personalized insights about your productivity patterns.',
      warning: err.message
    });
  }
});

// Serve frontend using Vite Dev Server in development or static index.html in production
let isProd = process.env.NODE_ENV === 'production' || process.env.VITE_PROD === 'true';

if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const port = process.env.PORT || 3000;
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
