
import React from 'react';
import { GameStatus } from '../types';

interface SlashOverlayProps {
  score: number;
  timeLeft: number;
  status: GameStatus;
  senseiMessage: string;
  onStart: () => void;
  onToggleCamera?: () => void;
  isUserFacing?: boolean;
}

const SlashOverlay: React.FC<SlashOverlayProps> = ({ 
  score, 
  timeLeft, 
  status, 
  senseiMessage, 
  onStart,
  onToggleCamera,
  isUserFacing
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 md:p-8">
      {/* Top Bar */}
      <div className="w-full flex justify-between items-start">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 md:p-4 rounded-2xl min-w-[100px] md:min-w-[120px]">
          <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">Score</p>
          <p className="text-white text-3xl md:text-4xl font-game leading-none">{score}</p>
        </div>
        
        {/* Camera Toggle Button (Active in IDLE or PLAYING) */}
        {onToggleCamera && (
          <button 
            onClick={onToggleCamera}
            className="pointer-events-auto bg-white/10 hover:bg-white/20 text-white p-3 rounded-full border border-white/20 backdrop-blur-md transition-all active:scale-95"
            title="Switch Camera"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21v-5h5"/>
            </svg>
          </button>
        )}

        {/* Timer UI */}
        <div className={`bg-black/40 backdrop-blur-md border p-3 md:p-4 rounded-2xl min-w-[100px] md:min-w-[120px] transition-colors ${timeLeft <= 5 ? 'border-red-500 animate-pulse' : 'border-white/10'}`}>
          <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">Time</p>
          <p className={`text-3xl md:text-4xl font-game leading-none ${timeLeft <= 5 ? 'text-red-500' : 'text-yellow-400'}`}>
            {timeLeft}s
          </p>
        </div>
      </div>

      {/* Center UI */}
      {status === GameStatus.IDLE && (
        <div className="flex flex-col items-center">
          <h1 className="text-5xl md:text-8xl text-white font-game text-center drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] mb-8">
            GEMINI SLASH
          </h1>
          <button 
            onClick={onStart}
            className="pointer-events-auto bg-gradient-to-b from-yellow-300 to-yellow-500 hover:from-yellow-200 hover:to-yellow-400 text-black font-game text-2xl px-14 py-5 rounded-full shadow-[0_8px_0_0_#ca8a04] active:shadow-none active:translate-y-2 transition-all"
          >
            START
          </button>
          <div className="text-white/70 mt-10 text-center bg-black/60 p-6 rounded-3xl backdrop-blur-lg border border-white/5 max-w-sm">
            <p className="mb-2 font-bold text-yellow-400">HOW TO PLAY</p>
            <p className="text-sm leading-relaxed">
              Slice fruits with your <span className="text-white font-bold">Index Finger</span>.<br/>
              Combo (3+) for <span className="text-yellow-400 font-bold">Double Points</span>!<br/>
            </p>
          </div>
        </div>
      )}

      {status === GameStatus.GAMEOVER && (
        <div className="flex flex-col items-center bg-black/80 backdrop-blur-2xl p-8 md:p-12 rounded-[40px] border-2 border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.2)] pointer-events-auto scale-in max-w-md w-full">
          <h2 className="text-5xl md:text-6xl text-yellow-500 font-game mb-6">FINISH!</h2>
          <div className="flex flex-col items-center mb-8">
            <span className="text-white/50 uppercase text-xs tracking-widest mb-1">Final Score</span>
            <span className="text-white text-6xl font-game">{score}</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl italic text-yellow-200 text-center text-sm md:text-base mb-10 w-full leading-relaxed">
            "{senseiMessage}"
          </div>
          <button 
            onClick={onStart}
            className="w-full bg-green-500 hover:bg-green-400 text-white font-game text-xl py-5 rounded-full shadow-[0_6px_0_0_#16a34a] active:shadow-none active:translate-y-1 transition-all"
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      {/* Bottom Text */}
      <div className="text-white/20 text-[10px] tracking-[4px] uppercase font-game">
        Mobile Gesture Control Ready
      </div>
    </div>
  );
};

export default SlashOverlay;
