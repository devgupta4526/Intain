import type { Request, Response } from 'express';
import { createApp } from '../server/app.js';

const app = createApp();

export default function handler(req: Request, res: Response) {
  const routedPath = req.query.__path;
  const path = Array.isArray(routedPath) ? routedPath.join('/') : String(routedPath ?? '');
  delete req.query.__path;
  const remainingQuery = new URLSearchParams(req.query as Record<string, string>).toString();
  req.url = `/api/${path}${remainingQuery ? `?${remainingQuery}` : ''}`;
  return app(req, res);
}

