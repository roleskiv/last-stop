/**
 * Symbol definitions. IDs are small integers so the math engine can run
 * millions of rounds quickly; everything visual is looked up through
 * `SYMBOLS[id]` and the asset registry (src/assets/assetManifest.ts).
 */
export const Sym = {
  TOKEN: 0,
  TICKET: 1,
  LANTERN: 2,
  KEY: 3,
  WATCH: 4,
  PIGEON: 5,
  PASSENGER: 6,
  RAT_KING: 7,
  WILD: 8,
  SCATTER: 9,
  SIGN: 10,
  PUNCH: 11,
} as const;

export type SymbolId = (typeof Sym)[keyof typeof Sym];
export type SymbolTier = 'low' | 'premium' | 'special';

export interface SymbolDef {
  id: SymbolId;
  key: string;
  name: string;
  tier: SymbolTier;
  description: string;
  /** Dominant glow colour used for win effects and particles. */
  glow: number;
}

export const SYMBOLS: Record<SymbolId, SymbolDef> = {
  [Sym.TOKEN]: { id: Sym.TOKEN, key: 'token', name: 'Subway Token', tier: 'low', glow: 0x5ef2d6, description: 'Old brass transit coin with glowing teal markings.' },
  [Sym.TICKET]: { id: Sym.TICKET, key: 'ticket', name: 'Ticket Stub', tier: 'low', glow: 0xf0b45e, description: 'Torn vintage ticket with punched holes.' },
  [Sym.LANTERN]: { id: Sym.LANTERN, key: 'lantern', name: 'Station Lantern', tier: 'low', glow: 0x8dffb5, description: 'Antique lantern holding a floating green flame.' },
  [Sym.KEY]: { id: Sym.KEY, key: 'key', name: 'Rusted Key', tier: 'low', glow: 0x5ef2d6, description: 'Iron maintenance key with glowing scratches.' },
  [Sym.WATCH]: { id: Sym.WATCH, key: 'watch', name: 'Pocket Watch', tier: 'low', glow: 0xd7b15a, description: 'Brass watch stopped at midnight.' },
  [Sym.PIGEON]: { id: Sym.PIGEON, key: 'pigeon', name: 'Ghost Pigeon', tier: 'premium', glow: 0xc7fff1, description: 'Cute but eerie spectral subway pigeon.' },
  [Sym.PASSENGER]: { id: Sym.PASSENGER, key: 'passenger', name: 'Phantom Passenger', tier: 'premium', glow: 0x9b86c9, description: 'Shadowy commuter with a vintage suitcase.' },
  [Sym.RAT_KING]: { id: Sym.RAT_KING, key: 'ratking', name: 'Tunnel Rat King', tier: 'premium', glow: 0xd7b15a, description: 'Mischievous rat wearing a crooked golden crown.' },
  [Sym.WILD]: { id: Sym.WILD, key: 'wild', name: 'Conductor Graves Wild', tier: 'special', glow: 0x5ef2d6, description: 'Substitutes for every regular symbol.' },
  [Sym.SCATTER]: { id: Sym.SCATTER, key: 'scatter', name: 'Midnight Train Scatter', tier: 'special', glow: 0x8dffb5, description: '3 or more trigger the Midnight Train free spins.' },
  [Sym.SIGN]: { id: Sym.SIGN, key: 'sign', name: 'Haunted Platform Sign', tier: 'special', glow: 0x5ef2d6, description: 'Haunts its tile for the Phantom Platforms feature.' },
  [Sym.PUNCH]: { id: Sym.PUNCH, key: 'punch', name: 'Ticket Punch', tier: 'special', glow: 0xd7b15a, description: 'Punches a regular symbol into a Wild.' },
};

export const REGULAR_SYMBOLS: readonly SymbolId[] = [
  Sym.TOKEN, Sym.TICKET, Sym.LANTERN, Sym.KEY, Sym.WATCH, Sym.PIGEON, Sym.PASSENGER, Sym.RAT_KING,
];
export const LOW_SYMBOLS: readonly SymbolId[] = [Sym.TOKEN, Sym.TICKET, Sym.LANTERN, Sym.KEY, Sym.WATCH];
export const PREMIUM_SYMBOLS: readonly SymbolId[] = [Sym.PIGEON, Sym.PASSENGER, Sym.RAT_KING];
export const ALL_SYMBOLS: readonly SymbolId[] = Object.values(Sym) as SymbolId[];

export const isRegular = (s: SymbolId): boolean => s <= Sym.RAT_KING;
