
export interface WordCard {
  word: string;
  taboo: string[];
}

export enum GamePhase {
  HOME = 'HOME',
  SETUP = 'SETUP',
  PRE_ROUND = 'PRE_ROUND',
  PLAYING = 'PLAYING',
  POST_ROUND = 'POST_ROUND',
  GAME_OVER = 'GAME_OVER'
}

export interface Team {
  name: string;
  score: number;
}

export interface GameSettings {
  roundTime: number;
  maxScore: number;
  skipLimit: number;
}
