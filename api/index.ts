import type { Request, Response } from 'express';
import { createApp } from '../server/app.js';

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: Request, res: Response) {
  if (!appPromise) appPromise = createApp();
  const app = await appPromise;
  
  const routedPath = req.query.__path;
  const path = Array.isArray(routedPath) ? routedPath.join('/') : String(routedPath ?? '');
  delete req.query.__path;
  const remainingQuery = new URLSearchParams(req.query as Record<string, string>).toString();
  req.url = `/api/${path}${remainingQuery ? `?${remainingQuery}` : ''}`;
  return app(req, res);
}

