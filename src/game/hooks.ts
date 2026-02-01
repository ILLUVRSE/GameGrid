export interface MatchData {
  playerIds: number[];
}

export interface MatchResult {
  playerId: number;
  placement: number;
  stocks: number;
  damage: number;
}

export const onMatchStart = (matchData: MatchData) => {
  console.info('Match started', matchData);
};

export const onPlayerKO = (playerId: number) => {
  console.info('Player KO', playerId);
};

export const onMatchEnd = (results: MatchResult[]) => {
  console.info('Match ended', results);
};
