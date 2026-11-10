import type { SpinRecord } from '../../math/types.ts';
import type { RoundEnvelope } from '../../shared/protocol.ts';
import { audio } from '../audio/audio.ts';
import { anim, ease } from '../core/anim.ts';
import { money } from '../core/format.ts';
import { store } from '../core/store.ts';
import type { Stage } from './stage.ts';

const BIG_WIN_TIERS = [
  { title: 'BIG WIN', bets: 20 },
  { title: 'MEGA WIN', bets: 50 },
  { title: 'EPIC WIN', bets: 150 },
  { title: 'LEGENDARY WIN', bets: 1000 },
];

/**
 * Plays a finished round record back on the stage. It never makes a decision about the
 * outcome: every symbol, win and feature comes from the record.
 */
export class Presenter {
  private readonly stage: Stage;
  private shownWin = 0;

  constructor(stage: Stage) {
    this.stage = stage;
  }

  async playRound(env: RoundEnvelope): Promise<void> {
    const { stage } = this;
    const { record } = env;
    const game = store.get().game!;
    const coin = env.bet / game.coinsPerBet;
    // Returns at or below the stake are shown without any celebration.
    const celebrate = env.win > env.stake;
    const auto = store.get().autoplay !== null;
    this.shownWin = 0;
    store.set({ win: 0 });

    stage.grid.setTiles([], false);
    stage.setBoard(env.mode === 'buy' ? 'EXPRESS\nTICKET' : 'MIND\nTHE GAP', env.mode === 'buy' ? 'ALL ABOARD' : 'NEXT TRAIN: MIDNIGHT');
    await this.playSpin(record.base, coin, celebrate);

    if (record.free.length > 0) {
      const awarded = record.base.awarded;
      await stage.grid.celebrateScatters(record.base.scatters);
      await stage.trainIntro();
      audio.playMusic('bonus');
      audio.play('bonusStart');
      void stage.setBonusMood(true);
      store.set({ phase: 'bonus', bonus: { left: awarded, total: awarded, win: 0 } });
      stage.setBoard(`${awarded} FREE\nSPINS`, 'PLATFORMS STAY HAUNTED', 'MIDNIGHT TRAIN');
      await stage.banner('MIDNIGHT TRAIN', [
        { text: `${awarded} FREE SPINS`, size: 96 },
        { text: 'PHANTOM PLATFORMS STAY FOR THE WHOLE RIDE', size: 36, color: 0x8dffb5 },
        { text: 'AND GROW EVERY TIME THEY WIN', size: 36, color: 0x8dffb5 },
      ], { autoMs: auto ? 2600 : 7000, prompt: 'TAP TO BOARD' });

      let total = awarded, played = 0, bonusCoins = 0;
      for (const spin of record.free) {
        played++;
        store.set({ bonus: { left: total - played, total, win: bonusCoins * coin } });
        stage.setBoard(`SPIN ${played} / ${total}`, `BONUS WIN ${money(bonusCoins * coin)}`, 'MIDNIGHT TRAIN');
        await stage.grid.dropOut();
        stage.grid.setTiles(spin.tilesStart, true);
        await this.playSpin(spin, coin, true);
        bonusCoins += spin.coins;
        store.set({ bonus: { left: total - played, total, win: bonusCoins * coin } });
        if (spin.awarded > 0) {
          total += spin.awarded;
          audio.play('scatter', { rate: 1.3 });
          await stage.grid.celebrateScatters(spin.scatters);
          store.set({ bonus: { left: total - played, total, win: bonusCoins * coin } });
          await stage.toast(`+${spin.awarded} FREE SPINS`, 0x8dffb5);
        }
        await anim.wait(220);
      }

      audio.play('bonusEnd');
      const big = await this.celebrateTotal(env, true);
      if (!big) {
        await stage.banner(record.capped ? 'MAX WIN' : 'END OF THE LINE', [
          { text: 'TOTAL WIN', size: 44, color: 0x8dffb5 },
          { text: money(env.win), size: 110 },
        ], { autoMs: auto ? 2600 : 6000 });
      }
      audio.playMusic('base');
      void stage.setBonusMood(false);
      stage.grid.setTiles([], false);
      store.set({ bonus: null, win: env.win });
    } else {
      this.setWin(env.win);
      await this.celebrateTotal(env, false);
    }
    stage.setBoard('MIND\nTHE GAP', 'NEXT TRAIN: MIDNIGHT');
  }

  private async playSpin(spin: SpinRecord, coin: number, celebrate: boolean): Promise<void> {
    const { stage } = this;
    await stage.grid.dropIn(spin.grid, (on) => stage.graves.anticipate(on));
    let cascade = 0;
    for (const step of spin.steps) {
      switch (step.t) {
        case 'signs': {
          const top = Math.max(...step.signs.map((s) => s.mult));
          stage.setBoard(`PLATFORM\nx${top}`, 'PHANTOM PLATFORM');
          await stage.grid.signs(step);
          break;
        }
        case 'punch':
          stage.setBoard('TICKET\nPUNCH', 'WILDS INCOMING');
          await stage.grid.punch(step, () => stage.graves.punch());
          break;
        case 'win': {
          if (celebrate && cascade === 0) void stage.graves.nod();
          const target = this.shownWin + step.coins * coin;
          void this.countWin(target, 500);
          await stage.grid.win(step, coin, cascade, celebrate);
          cascade++;
          break;
        }
        case 'cascade':
          await stage.grid.cascade(step);
          break;
      }
    }
    await anim.wait(spin.steps.length ? 140 : 60);
  }

  private setWin(v: number): void {
    this.shownWin = v;
    store.set({ win: v });
  }

  private countWin(to: number, ms: number): Promise<void> {
    const from = this.shownWin;
    this.shownWin = to;
    return anim.run(ms, (t) => store.set({ win: Math.round(from + (to - from) * ease.outQuad(t)) }));
  }

  /** Big-win presentation for the whole round. Returns true if one was shown. */
  private async celebrateTotal(env: RoundEnvelope, afterBonus: boolean): Promise<boolean> {
    const bets = env.win / env.bet;
    const tiers = BIG_WIN_TIERS.filter((t) => bets >= t.bets).map((t) => ({ title: t.title, at: t.bets * env.bet }));
    if (env.win > env.stake && tiers.length > 0) {
      await this.stage.bigWin(tiers, env.win, (v) => money(Math.round(v)), env.record.capped);
      this.setWin(env.win);
      return true;
    }
    this.setWin(env.win);
    if (!afterBonus && env.win > env.stake) {
      if (bets >= 10) { audio.play('coin'); void this.stage.graves.cheer(700); await this.stage.toast('GREAT WIN', 0xffe9a8); }
      else if (bets >= 5) { audio.play('coin'); await this.stage.toast('NICE WIN'); }
    }
    return false;
  }
}
