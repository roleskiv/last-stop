/**
 * Reference game server.
 *
 *   npm run server                       # demo wallet, profile "demo", port 8787
 *   PROFILE=uk PORT=9000 npm run server
 *
 * This is the integration point for an operator platform: replace `DemoWallet` with an
 * adapter for the platform wallet, `FileKeyValue` with a database, and `authenticate`
 * with the platform's launch-token validation. The game service itself does not change.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CryptoRng } from '../math/rng.ts';
import { getOperator } from '../shared/operator.ts';
import { createHttpServer } from './http.ts';
import { GameService } from './service.ts';
import { DemoWallet, type KeyValue } from './wallet.ts';

/** Small durable key-value store: one JSON file, written atomically. */
class FileKeyValue implements KeyValue {
  private readonly file: string;
  private data: Record<string, string> = {};
  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, 'store.json');
    if (existsSync(this.file)) this.data = JSON.parse(readFileSync(this.file, 'utf8'));
  }
  get(key: string): string | null { return this.data[key] ?? null; }
  set(key: string, value: string): void {
    this.data[key] = value;
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.file);
  }
}

const operator = getOperator(process.env.PROFILE);
const store = new FileKeyValue(process.env.DATA_DIR ?? '.rgs-data');
const service = new GameService({
  operator, store, rng: new CryptoRng(), wallet: new DemoWallet(store, operator.demoBalance),
});
const port = Number(process.env.PORT ?? 8787);

createHttpServer({
  service,
  allowOrigin: process.env.ALLOW_ORIGIN ?? '*',
  staticDir: existsSync('dist') ? 'dist' : undefined,
  // Demo authentication: the token is the player id. A real platform validates a signed launch token.
  authenticate: async (token) => (/^[\w.:-]{1,64}$/.test(token) ? token : null),
}).listen(port, () => {
  console.log(`LAST STOP game server: http://localhost:${port}  profile=${operator.profile} math=${operator.mathId}`);
});
