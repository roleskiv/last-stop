import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { GameError } from '../shared/protocol.ts';
import type { GameService } from './service.ts';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
};

const STATUS: Record<string, number> = {
  INSUFFICIENT_FUNDS: 402, INVALID_BET: 400, INVALID_REQUEST: 400, FEATURE_DISABLED: 403,
  SESSION_NOT_FOUND: 401, ROUND_NOT_FOUND: 404, TOO_FAST: 429, WALLET_ERROR: 502,
};

export interface HttpOptions {
  service: GameService;
  /** Resolve the operator's launch token to a player id. Return null to reject. */
  authenticate: (token: string) => Promise<string | null>;
  /** Origin allowed to call the API from a browser, or "*" for development. */
  allowOrigin: string;
  /** Directory with the built client, served at "/". Optional. */
  staticDir?: string;
}

/**
 * Minimal HTTP transport for the game service (no framework, no dependencies).
 *
 *   POST /api/session   { token }                         -> SessionResponse
 *   POST /api/play      { sessionId, requestId, bet, mode } -> PlayResponse
 *   POST /api/ack       { sessionId, roundId }            -> { ok: true }
 *   POST /api/history   { sessionId, limit }              -> RoundEnvelope[]
 *   GET  /api/health                                      -> { ok: true }
 */
export function createHttpServer(opts: HttpOptions): Server {
  const { service } = opts;
  const staticRoot = opts.staticDir ? resolve(opts.staticDir) : null;

  return createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', opts.allowOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
      if (url.pathname === '/api/health') return send(res, 200, { ok: true });
      if (url.pathname.startsWith('/api/')) {
        if (req.method !== 'POST') return send(res, 405, { error: { code: 'INVALID_REQUEST', message: 'Use POST' } });
        const body = await readJson(req);
        switch (url.pathname) {
          case '/api/session': {
            const playerId = await opts.authenticate(String(body.token ?? ''));
            if (!playerId) throw new GameError('SESSION_NOT_FOUND', 'Invalid launch token');
            return send(res, 200, await service.openSession(playerId));
          }
          case '/api/play':
            return send(res, 200, await service.play({
              sessionId: String(body.sessionId), requestId: String(body.requestId),
              bet: Number(body.bet), mode: body.mode as 'spin' | 'buy',
            }));
          case '/api/ack':
            await service.acknowledge(String(body.sessionId), String(body.roundId));
            return send(res, 200, { ok: true });
          case '/api/history':
            return send(res, 200, await service.history(String(body.sessionId), Number(body.limit)));
          default:
            return send(res, 404, { error: { code: 'INVALID_REQUEST', message: 'Unknown endpoint' } });
        }
      }
      if (staticRoot && req.method === 'GET') return serveStatic(staticRoot, url.pathname, res);
      send(res, 404, { error: { code: 'INVALID_REQUEST', message: 'Not found' } });
    } catch (err) {
      if (err instanceof GameError) return send(res, STATUS[err.code] ?? 400, { error: { code: err.code, message: err.message } });
      console.error(err);
      send(res, 500, { error: { code: 'INVALID_REQUEST', message: 'Internal error' } });
    }
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      // Answer an oversized body with a clean error, and cut off a sender that keeps going.
      if (size > 16 * 1024) {
        chunks.length = 0;
        reject(new GameError('INVALID_REQUEST', 'Request too large'));
        if (size > 1024 * 1024) req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (size > 16 * 1024) return;
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
        resolveBody(parsed as Record<string, unknown>);
      } catch {
        reject(new GameError('INVALID_REQUEST', 'Body must be JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(root: string, pathname: string, res: ServerResponse): void {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  let file = join(root, rel || 'index.html');
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': file.includes(`${join(root, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}
