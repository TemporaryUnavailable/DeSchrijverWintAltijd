export type ScoringSystemKind = 'source-preset' | 'custom';
export type RulesVerification = 'unverified' | 'confirmed';

export type SoloContract = 'abondance' | 'miserieOne' | 'miserieOpen' | 'thirteenTricks' | 'soloSlim';

export interface ScoringValues {
  readonly rikAfrik: readonly number[];
  readonly soloContracts: Readonly<Record<SoloContract, number>>;
  readonly twoPlayerMiserie: number;
  readonly verzaking: Readonly<{ mode: 'manual-only' }> | null;
}

export interface ScoringSystem {
  id: string;
  name: string;
  revision: number;
  kind: ScoringSystemKind;
  verification: RulesVerification;
  values: ScoringValues;
}

export interface RulesSnapshot {
  readonly systemId: string;
  readonly name: string;
  readonly revision: number;
  readonly kind: ScoringSystemKind;
  readonly verification: RulesVerification;
  readonly values: ScoringValues;
}
