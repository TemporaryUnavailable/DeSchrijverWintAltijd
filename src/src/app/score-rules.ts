export interface ScoredRound {
  scores: Readonly<Record<string, number>>;
}

export function calculateTotals(
  rounds: readonly ScoredRound[],
  playerIds: readonly string[],
): Record<string, number> {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      rounds.reduce((total, round) => {
        const score = round.scores[playerId];
        return total + (Number.isFinite(score) ? score : 0);
      }, 100),
    ]),
  );
}

export function getLeaderIds(totals: Readonly<Record<string, number>>): string[] {
  const entries = Object.entries(totals);
  if (entries.length === 0) return [];

  const highestScore = Math.max(...entries.map(([, score]) => score));
  return entries.filter(([, score]) => score === highestScore).map(([playerId]) => playerId);
}