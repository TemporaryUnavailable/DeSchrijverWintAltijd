import { Injectable } from '@angular/core';
import { GameV2, GiftInput, Player } from '../models/game';
import { RulesSnapshot, SoloContract } from '../models/scoring-system';

const SOLO_VALUE_KEYS: Record<Extract<GiftInput, { soloistId: string }>['contract'], SoloContract> = {
  abondance: 'abondance',
  'miserie-one': 'miserieOne',
  'miserie-open': 'miserieOpen',
  '13-slagen': 'thirteenTricks',
  'solo-slim': 'soloSlim',
};

@Injectable({ providedIn: 'root' })
export class ScoringService {
  calculate(game: GameV2, dealerId: string, input: GiftInput): Record<string, number> {
    const snapshot = game.rulesSnapshot;
    if (!snapshot || game.legacy || game.players.length < 4 || game.players.length > 5) {
      throw new Error('Deze scorekaart is alleen geschikt voor handmatige invoer.');
    }
    if (snapshot.kind === 'source-preset' && snapshot.verification !== 'confirmed') {
      throw new Error('Bevestig eerst de bronwaarden; gebruik handmatige invoer.');
    }
    if (!game.players.some((player) => player.id === dealerId)) throw new Error('Dealer hoort niet bij deze scorekaart.');

    const sittingOut = game.players.length === 5 ? dealerId : null;
    const activePlayers = game.players.filter((player) => player.id !== sittingOut);
    const changes = Object.fromEntries(game.players.map((player) => [player.id, 0]));

    switch (input.contract) {
      case 'rik-afrik':
      case 'troel':
        this.scoreRikAfrik(snapshot, activePlayers, input, changes);
        break;
      case 'abondance':
      case 'miserie-one':
      case 'miserie-open':
      case '13-slagen':
      case 'solo-slim':
        this.scoreSolo(snapshot, activePlayers, input, changes);
        break;
      case 'miserie-two':
        this.scoreTwoPlayerMiserie(snapshot, activePlayers, input, changes);
        break;
      case 'verzaking':
      case 'manual':
        throw new Error('Voor deze invoer zijn handmatige scorewijzigingen nodig.');
    }

    this.validateConservation(activePlayers, changes);
    if (sittingOut) changes[sittingOut] = 0;
    return changes;
  }

  private scoreRikAfrik(
    snapshot: RulesSnapshot,
    activePlayers: readonly Player[],
    input: Extract<GiftInput, { rikkerIds: [string, string] }>,
    changes: Record<string, number>,
  ): void {
    this.requireFourActive(activePlayers);
    if (!Number.isSafeInteger(input.tricksTakenByRikkers) || input.tricksTakenByRikkers < 0 || input.tricksTakenByRikkers > 13) {
      throw new Error('Het aantal slagen moet een geheel getal van 0 tot en met 13 zijn.');
    }
    if (input.rikkerIds.length !== 2 || input.rikkerIds[0] === input.rikkerIds[1]
      || input.rikkerIds.some((id) => !activePlayers.some((player) => player.id === id))) {
      throw new Error('Kies twee verschillende actieve rikkers.');
    }
    const baseValue = snapshot.values.rikAfrik[13 - input.tricksTakenByRikkers];
    if (!Number.isSafeInteger(baseValue)) throw new Error('De Rik/Afrik-waarde is ongeldig.');
    const value = baseValue * (input.contract === 'troel' ? 2 : 1);
    const rikkerSet = new Set(input.rikkerIds);
    for (const player of activePlayers) changes[player.id] = rikkerSet.has(player.id) ? value : -value;
  }

  private scoreSolo(
    snapshot: RulesSnapshot,
    activePlayers: readonly Player[],
    input: Extract<GiftInput, { soloistId: string }>,
    changes: Record<string, number>,
  ): void {
    this.requireFourActive(activePlayers);
    if (!activePlayers.some((player) => player.id === input.soloistId)) throw new Error('Kies een actieve soloist.');
    const value = snapshot.values.soloContracts[SOLO_VALUE_KEYS[input.contract]];
    if (!Number.isSafeInteger(value) || value <= 0 || value % 3 !== 0) {
      throw new Error('De solo-contractwaarde moet positief, geheel en deelbaar door drie zijn.');
    }
    const direction = input.success ? 1 : -1;
    changes[input.soloistId] = value * direction;
    for (const player of activePlayers) {
      if (player.id !== input.soloistId) changes[player.id] = -(value / 3) * direction;
    }
  }

  private scoreTwoPlayerMiserie(
    snapshot: RulesSnapshot,
    activePlayers: readonly Player[],
    input: Extract<GiftInput, { miseriePlayerIds: [string, string] }>,
    changes: Record<string, number>,
  ): void {
    this.requireFourActive(activePlayers);
    const [firstId, secondId] = input.miseriePlayerIds;
    if (firstId === secondId || !activePlayers.some((player) => player.id === firstId)
      || !activePlayers.some((player) => player.id === secondId)) {
      throw new Error('Kies twee verschillende actieve Miserie-spelers.');
    }
    const amount = snapshot.values.twoPlayerMiserie;
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('De Miserie-waarde moet een positief geheel getal zijn.');
    const [firstSuccess, secondSuccess] = input.successes;
    if (firstSuccess && secondSuccess) {
      changes[firstId] = amount;
      changes[secondId] = amount;
      for (const player of activePlayers) {
        if (player.id !== firstId && player.id !== secondId) changes[player.id] = -amount;
      }
    } else if (!firstSuccess && !secondSuccess) {
      changes[firstId] = -amount;
      changes[secondId] = -amount;
      for (const player of activePlayers) {
        if (player.id !== firstId && player.id !== secondId) changes[player.id] = amount;
      }
    } else {
      changes[firstId] = firstSuccess ? amount : -amount;
      changes[secondId] = secondSuccess ? amount : -amount;
    }
  }

  private requireFourActive(activePlayers: readonly Player[]): void {
    if (activePlayers.length !== 4) throw new Error('Deze berekening vereist precies vier actieve spelers.');
  }

  private validateConservation(activePlayers: readonly Player[], changes: Record<string, number>): void {
    for (const value of Object.values(changes)) {
      if (!Number.isSafeInteger(value)) throw new Error('Scorewijzigingen moeten gehele getallen zijn.');
    }
    const sum = activePlayers.reduce((total, player) => total + changes[player.id], 0);
    if (sum !== 0) throw new Error('Deze scoreverdeling is niet in balans.');
  }
}