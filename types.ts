
export interface Point {
  x: number;
  y: number;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export interface Fruit {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: 'fruit' | 'bomb';
  emoji: string;
  isSliced: boolean;
  sliceAngle: number;
  rotation: number;
  vr: number; 
  isHalf?: boolean;
  side?: 'left' | 'right';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

export interface SlashPoint extends Point {
  timestamp: number;
}

export interface ComboFeedback {
  x: number;
  y: number;
  count: number;
  life: number;
}
