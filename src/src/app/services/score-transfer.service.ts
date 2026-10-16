import { Injectable, inject } from '@angular/core';
import { Game, GameV2, Gift, GiftInput, Player } from '../models/game';
import { DerivedGameState } from '../models/transfer-snapshot';
import { GameService } from './game.service';
import { ScoringService } from './scoring.service';

const MAX_QR_PAYLOAD_LENGTH = 2400;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class ScoreTransferService {
  private readonly gameService = inject(GameService);
  private readonly scoringService = inject(ScoringService);

  serialize(game: Game | GameV2): string {
    if (!('gifts' in game)) return JSON.stringify({ version: 1, game }, null, 2);
    if (game.legacy) return JSON.stringify({ version: 1, game: this.toLegacyGame(game) }, null, 2);
    this.requireValidV2Game(game);
    return JSON.stringify({ version: 2, game, derived: this.deriveState(game) }, null, 2);
  }

  parse(raw: string): Game | GameV2 {
    let payload: { version?: number; game?: unknown; derived?: unknown };
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      throw new Error('Deze back-up is geen geldige JSON.');
    }
    if (!payload || typeof payload !== 'object') throw new Error('Deze back-up is ongeldig of wordt niet ondersteund.');
    try {
      if (payload.version === 1 && this.hasOnlyKeys(payload, ['version', 'game'])
        && this.gameService.isValidGame(payload.game)) return payload.game;
      if (payload.version === 2 && this.hasOnlyKeys(payload, ['version', 'game', 'derived'])
        && this.isV2Game(payload.game) && this.isDerivedState(payload.derived, payload.game)) return payload.game;
    } catch {
      throw new Error('Deze back-up is ongeldig of wordt niet ondersteund.');
    }
    throw new Error('Deze back-up is ongeldig of wordt niet ondersteund.');
  }

  async createQrImage(game: Game | GameV2): Promise<string> {
    const payload = this.serialize(game);
    if (payload.length > MAX_QR_PAYLOAD_LENGTH) {
      throw new Error('Deze scorekaart past niet in een QR-code. Download een back-upbestand.');
    }
    const QRCode = await import('qrcode');
    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'L',
      margin: 2,
      width: 280,
    });
  }

  copyWithNewIds(game: GameV2): GameV2 {
    const playerIds = new Map(game.players.map((player) => [player.id, crypto.randomUUID()]));
    const remapPlayerId = (id: string): string => playerIds.get(id) ?? id;
    return {
      ...game,
      id: crypto.randomUUID(),
      players: game.players.map((player) => ({ ...player, id: remapPlayerId(player.id) })),
      gifts: game.gifts.map((gift) => ({
        ...gift,
        id: crypto.randomUUID(),
        dealerId: remapPlayerId(gift.dealerId),
        input: this.remapInput(gift.input, remapPlayerId),
        scoreChanges: Object.fromEntries(Object.entries(gift.scoreChanges).map(([id, score]) => [remapPlayerId(id), score])),
      })),
    };
  }

  private requireValidV2Game(game: GameV2): void {
    if (!this.isV2GameShape(game)) throw new Error('Ongeldige v2-scorekaart.');
  }

  private isV2Game(value: unknown): value is GameV2 {
    return !!value && typeof value === 'object' && 'gifts' in value && this.isV2GameShape(value as GameV2);
  }

  private isV2GameShape(game: GameV2): boolean {
    const isLegacy = game.legacy === true;
    if (typeof game.legacy !== 'boolean'
      || !this.hasOnlyKeys(game, ['id', 'name', 'players', 'startingScore', 'rulesSnapshot', 'gifts', 'legacy', 'createdAt', 'updatedAt'])
      || (game.startingScore !== undefined && game.startingScore !== 0 && game.startingScore !== 100)
      || !UUID_PATTERN.test(game.id) || typeof game.name !== 'string' || !game.name.trim()
      || !Array.isArray(game.players) || game.players.length < 4 || game.players.length > (isLegacy ? 7 : 5)
      || !Array.isArray(game.gifts) || (isLegacy ? game.rulesSnapshot !== null : !this.isRulesSnapshot(game.rulesSnapshot))
      || !this.isDate(game.createdAt) || !this.isDate(game.updatedAt)) return false;

    if (game.players.some((player) => !this.isPlayer(player))
      || new Set(game.players.map((player) => player.id)).size !== game.players.length
      || new Set(game.players.map((player) => player.name.trim().toLocaleLowerCase('nl-NL'))).size !== game.players.length) return false;
    if (!isLegacy && game.gifts.length > (game.players.length === 4 ? 12 : 15)) return false;

    const playerIds = new Set(game.players.map((player) => player.id));
    const giftIds = new Set<string>();
    return game.gifts.every((gift, index) => {
      if (!this.isGift(gift, game, playerIds) || giftIds.has(gift.id)
        || (!isLegacy && gift.dealerId !== game.players[index % game.players.length].id)) return false;
      giftIds.add(gift.id);
      return true;
    });
  }

  private isPlayer(value: unknown): value is Player {
    if (!value || typeof value !== 'object') return false;
    const player = value as Player;
    return this.hasOnlyKeys(player, ['id', 'name']) && UUID_PATTERN.test(player.id)
      && typeof player.name === 'string' && !!player.name.trim();
  }

  private isRulesSnapshot(value: GameV2['rulesSnapshot']): boolean {
    if (!value || !this.hasOnlyKeys(value, ['systemId', 'name', 'revision', 'kind', 'verification', 'values'])
      || !UUID_PATTERN.test(value.systemId) || !value.name.trim() || !Number.isSafeInteger(value.revision) || value.revision < 1
      || !['source-preset', 'custom'].includes(value.kind) || !['unverified', 'confirmed'].includes(value.verification)) return false;
    const values = value.values;
    if (!values || typeof values !== 'object' || !this.hasOnlyKeys(values, ['rikAfrik', 'soloContracts', 'twoPlayerMiserie', 'verzaking'])
      || !Array.isArray(values.rikAfrik) || values.rikAfrik.length !== 14 || !values.rikAfrik.every(Number.isSafeInteger)
      || !values.soloContracts || !this.hasOnlyKeys(values.soloContracts, ['abondance', 'miserieOne', 'miserieOpen', 'thirteenTricks', 'soloSlim'])
      || Object.keys(values.soloContracts).length !== 5
      || Object.values(values.soloContracts).some((amount) => !Number.isSafeInteger(amount) || amount < 3 || amount % 3 !== 0)
      || !Number.isSafeInteger(values.twoPlayerMiserie) || values.twoPlayerMiserie < 1) return false;
    return values.verzaking === null || (!!values.verzaking
      && this.hasOnlyKeys(values.verzaking, ['mode']) && values.verzaking.mode === 'manual-only');
  }

  private isGift(value: unknown, game: GameV2, playerIds: ReadonlySet<string>): value is Gift {
    if (!value || typeof value !== 'object') return false;
    const gift = value as Gift;
    if (!this.hasOnlyKeys(gift, ['id', 'dealerId', 'input', 'scoreChanges', 'entryMode', 'manualNote'])
      || (gift.manualNote !== undefined && typeof gift.manualNote !== 'string')
      || !UUID_PATTERN.test(gift.id) || !playerIds.has(gift.dealerId)
      || !['automatic', 'manual', 'legacy-manual'].includes(gift.entryMode)
      || !gift.scoreChanges || typeof gift.scoreChanges !== 'object' || Array.isArray(gift.scoreChanges)
      || Object.keys(gift.scoreChanges).some((id) => !UUID_PATTERN.test(id) || !playerIds.has(id))
      || Object.values(gift.scoreChanges).some((score) => !Number.isSafeInteger(score))) return false;
    if (game.legacy) return gift.entryMode === 'legacy-manual' && gift.input === null;
    if (Object.keys(gift.scoreChanges).length !== game.players.length
      || game.players.some((player) => !(player.id in gift.scoreChanges))) return false;
    if (game.players.length === 5 && gift.scoreChanges[gift.dealerId] !== 0) return false;
    if (gift.entryMode === 'legacy-manual') return false;
    if (gift.entryMode === 'manual') return gift.input === null
      || (this.isGiftInput(gift.input, playerIds) && (gift.input.contract === 'manual' || gift.input.contract === 'verzaking'));
    if (!gift.input || !this.isGiftInput(gift.input, playerIds) || gift.input.contract === 'manual' || gift.input.contract === 'verzaking') return false;
    try {
      const expected = this.scoringService.calculate(game, gift.dealerId, gift.input);
      return JSON.stringify(this.sortedRecord(expected)) === JSON.stringify(this.sortedRecord(gift.scoreChanges));
    } catch {
      return false;
    }
  }

  private isGiftInput(value: unknown, playerIds: ReadonlySet<string>): value is GiftInput {
    if (!value || typeof value !== 'object' || typeof (value as { contract?: unknown }).contract !== 'string') return false;
    const input = value as Record<string, unknown>;
    switch (input['contract']) {
      case 'rik-afrik':
      case 'troel':
        return this.hasOnlyKeys(input, ['contract', 'rikkerIds', 'tricksTakenByRikkers'])
          && Array.isArray(input['rikkerIds']) && input['rikkerIds'].length === 2
          && new Set(input['rikkerIds']).size === 2 && input['rikkerIds'].every((id) => typeof id === 'string' && playerIds.has(id))
          && Number.isSafeInteger(input['tricksTakenByRikkers'])
          && (input['tricksTakenByRikkers'] as number) >= 0 && (input['tricksTakenByRikkers'] as number) <= 13;
      case 'abondance':
      case 'miserie-one':
      case 'miserie-open':
      case '13-slagen':
      case 'solo-slim':
        return this.hasOnlyKeys(input, ['contract', 'soloistId', 'success'])
          && typeof input['soloistId'] === 'string' && playerIds.has(input['soloistId']) && typeof input['success'] === 'boolean';
      case 'miserie-two':
        return this.hasOnlyKeys(input, ['contract', 'miseriePlayerIds', 'successes'])
          && Array.isArray(input['miseriePlayerIds']) && input['miseriePlayerIds'].length === 2
          && new Set(input['miseriePlayerIds']).size === 2
          && input['miseriePlayerIds'].every((id) => typeof id === 'string' && playerIds.has(id))
          && Array.isArray(input['successes']) && input['successes'].length === 2
          && input['successes'].every((success) => typeof success === 'boolean');
      case 'verzaking':
        return this.hasOnlyKeys(input, ['contract', 'mode']) && input['mode'] === 'manual-only';
      case 'manual':
        return this.hasOnlyKeys(input, ['contract']);
      default:
        return false;
    }
  }

  private isDerivedState(value: unknown, game: GameV2): value is DerivedGameState {
    if (!value || typeof value !== 'object') return false;
    const derived = value as DerivedGameState;
    if (!this.hasOnlyKeys(derived, ['totals', 'recordedGifts', 'giftLimit', 'nextDealerId'])) return false;
    const expected = this.deriveState(game);
    const actualTotals = derived.totals;
    return !!actualTotals && typeof actualTotals === 'object'
      && JSON.stringify(this.sortedRecord(actualTotals)) === JSON.stringify(this.sortedRecord(expected.totals))
      && derived.recordedGifts === expected.recordedGifts
      && derived.giftLimit === expected.giftLimit
      && derived.nextDealerId === expected.nextDealerId;
  }

  private deriveState(game: GameV2): DerivedGameState {
    return {
      totals: this.gameService.getTotals(game),
      recordedGifts: game.gifts.length,
      giftLimit: this.gameService.getGiftLimit(game),
      nextDealerId: this.gameService.getNextGiftDealerId(game),
    };
  }

  private remapInput(input: GiftInput | null, remap: (id: string) => string): GiftInput | null {
    if (!input) return null;
    switch (input.contract) {
      case 'rik-afrik':
      case 'troel':
        return { ...input, rikkerIds: input.rikkerIds.map(remap) as [string, string] };
      case 'abondance':
      case 'miserie-one':
      case 'miserie-open':
      case '13-slagen':
      case 'solo-slim':
        return { ...input, soloistId: remap(input.soloistId) };
      case 'miserie-two':
        return { ...input, miseriePlayerIds: input.miseriePlayerIds.map(remap) as [string, string] };
      case 'verzaking':
      case 'manual':
        return { ...input };
    }
  }

  private sortedRecord(values: Record<string, number>): Record<string, number> {
    return Object.fromEntries(Object.entries(values).sort(([left], [right]) => left.localeCompare(right)));
  }

  private isDate(value: string): boolean {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
  }

  private toLegacyGame(game: GameV2): Game {
    return {
      id: game.id,
      name: game.name,
      players: game.players.map((player) => ({ ...player })),
      rounds: game.gifts.map((gift) => ({ id: gift.id, dealerId: gift.dealerId, scores: { ...gift.scoreChanges } })),
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }

  private hasOnlyKeys(value: object, allowed: readonly string[]): boolean {
    return Object.keys(value).every((key) => allowed.includes(key));
  }
}