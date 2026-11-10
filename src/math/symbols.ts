/** Symbol ids, grid geometry and display names. Shared by engine, server and client. */
export const COLS = 6;
export const ROWS = 5;
export const CELLS = COLS * ROWS;

export const TOKEN = 0;
export const TICKET = 1;
export const LANTERN = 2;
export const KEY = 3;
export const WATCH = 4;
export const PIGEON = 5;
export const PASSENGER = 6;
export const RATKING = 7;
export const WILD = 8;
export const SCATTER = 9;
export const SIGN = 10;
export const PUNCH = 11;

export const SYMBOL_COUNT = 12;
/** Symbols with id below this value pay in clusters. */
export const PAYING_COUNT = 8;

export const SYMBOL_KEYS = [
  'token', 'ticket', 'lantern', 'key', 'watch', 'pigeon', 'passenger', 'ratking',
  'wild', 'scatter', 'sign', 'punch',
] as const;

export const SYMBOL_NAMES = [
  'Subway Token', 'Ticket Stub', 'Station Lantern', 'Rusted Key', 'Pocket Watch',
  'Ghost Pigeon', 'Phantom Passenger', 'Tunnel Rat King',
  'Conductor Graves (Wild)', 'Midnight Train (Scatter)', 'Platform Sign', 'Ticket Punch',
] as const;

/** Grid cells are stored column-major: pos = col * ROWS + row, row 0 is the top row. */
export const posOf = (col: number, row: number): number => col * ROWS + row;
export const colOf = (pos: number): number => (pos / ROWS) | 0;
export const rowOf = (pos: number): number => pos % ROWS;
