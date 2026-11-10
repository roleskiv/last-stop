import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { SeededRng } from '../src/math/rng.ts';
import { createHttpServer } from '../src/server/http.ts';
import { GameService } from '../src/server/service.ts';
import { DemoWallet, MemoryKeyValue } from '../src/server/wallet.ts';
import { OPERATOR_PROFILES } from '../src/shared/operator.ts';

let server: Server;
let base = '';
const post = async (path: string, body: unknown) => {
  const res = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: res.status, json: await res.json() as any };
};

beforeAll(async () => {
  const store = new MemoryKeyValue();
  const service = new GameService({ operator: OPERATOR_PROFILES.demo, store, wallet: new DemoWallet(store, 100000), rng: new SeededRng('http') });
  server = createHttpServer({ service, allowOrigin: 'https://casino.example', authenticate: async (t) => (t.startsWith('good-') ? t.slice(5) : null) });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => { server.close(() => r()); }));

describe('reference RGS over HTTP', () => {
  it('runs a full session: launch, play, acknowledge, history', async () => {
    const session = await post('/api/session', { token: 'good-alice' });
    expect(session.status).toBe(200);
    expect(session.json.balance).toBe(100000);
    expect(session.json.game.mathId).toBe('LS2-96');
    const sessionId = session.json.sessionId;
    const play = await post('/api/play', { sessionId, requestId: 'req-00000001', bet: 100, mode: 'spin' });
    expect(play.status).toBe(200);
    expect(play.json.round.balanceAfter).toBe(100000 - 100 + play.json.round.win);
    const again = await post('/api/play', { sessionId, requestId: 'req-00000001', bet: 100, mode: 'spin' });
    expect(again.json.round.roundId).toBe(play.json.round.roundId);
    expect((await post('/api/ack', { sessionId, roundId: play.json.round.roundId })).json).toEqual({ ok: true });
    const history = await post('/api/history', { sessionId, limit: 10 });
    expect(history.json).toHaveLength(1);
    expect(history.json[0].acknowledged).toBe(true);
  });

  it('maps errors to status codes and never leaks internals', async () => {
    expect((await post('/api/session', { token: 'bad' })).status).toBe(401);
    const { json } = await post('/api/session', { token: 'good-bob' });
    const bad = await post('/api/play', { sessionId: json.sessionId, requestId: 'req-00000002', bet: 7, mode: 'spin' });
    expect(bad.status).toBe(400);
    expect(bad.json.error.code).toBe('INVALID_BET');
    expect((await post('/api/play', { sessionId: 'nope', requestId: 'req-00000003', bet: 100, mode: 'spin' })).status).toBe(401);
    expect((await post('/api/play', 'not json')).status).toBe(400);
    expect((await post('/api/nothing', {})).status).toBe(404);
    expect((await post('/api/session', { token: 'x'.repeat(20000) })).status).toBe(400);
    const get = await fetch(base + '/api/play');
    expect(get.status).toBe(405);
  });

  it('answers health checks and sets security headers', async () => {
    const res = await fetch(base + '/api/health');
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('access-control-allow-origin')).toBe('https://casino.example');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
