import { Request, Response, NextFunction } from "express";

interface CacheEntry {
  body: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();

export function apiCache(ttlSeconds: number = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cached = memoryCache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < ttlSeconds * 1000) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached.body);
    }

    // Intercept res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, { body, timestamp: Date.now() });
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
}

export function clearApiCache() {
  memoryCache.clear();
}
