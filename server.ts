import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiApp from './api/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API routes live in api/index.ts (single source, also used as the Vercel serverless entry).
const app = express();
app.use(apiApp);

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
