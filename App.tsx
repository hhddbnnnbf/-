
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameStatus, Fruit, Particle, SlashPoint, Point, ComboFeedback } from './types';
import { FRUITS, BOMB, GRAVITY, GAME_DURATION, SLASH_LIFETIME, FRUIT_RADIUS, COMBO_WINDOW } from './constants';
import SlashOverlay from './components/SlashOverlay';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [senseiMessage, setSenseiMessage] = useState("准备好了吗，忍者？");
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const slashPointsRef = useRef<SlashPoint[]>([]);
  const handRef = useRef<Point | null>(null);
  const cameraRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const nextSpawnIntervalRef = useRef<number>(1000);
  
  const comboRef = useRef<{ count: number; lastTime: number; lastX: number; lastY: number }>({ count: 0, lastTime: 0, lastX: 0, lastY: 0 });
  const combosFeedbackRef = useRef<ComboFeedback[]>([]);
  const lastRawPoint = useRef<Point | null>(null);

  const initCamera = useCallback(async () => {
    if (!videoRef.current) return;
    
    if (cameraRef.current) {
      await cameraRef.current.stop();
    }

    const hands = new (window as any).Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: any) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rawX = facingMode === 'user' ? (1 - indexTip.x) : indexTip.x;
        const x = rawX * canvas.width;
        const y = indexTip.y * canvas.height;
        
        const newPoint = { x, y };
        handRef.current = newPoint;

        if (status === GameStatus.PLAYING && lastRawPoint.current) {
          const dist = Math.hypot(x - lastRawPoint.current.x, y - lastRawPoint.current.y);
          if (dist > 15) {
            const steps = Math.min(6, Math.floor(dist / 8));
            for (let i = 1; i <= steps; i++) {
              slashPointsRef.current.push({
                x: lastRawPoint.current.x + (x - lastRawPoint.current.x) * (i / (steps + 1)),
                y: lastRawPoint.current.y + (y - lastRawPoint.current.y) * (i / (steps + 1)),
                timestamp: Date.now()
              });
            }
          }
        }

        if (status === GameStatus.PLAYING) {
          slashPointsRef.current.push({ ...newPoint, timestamp: Date.now() });
        }
        lastRawPoint.current = newPoint;
      } else {
        handRef.current = null;
        lastRawPoint.current = null;
      }
    });

    cameraRef.current = new (window as any).Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) await hands.send({ image: videoRef.current });
      },
      width: 1280,
      height: 720,
      facingMode: facingMode
    });
    cameraRef.current.start();
  }, [facingMode, status]);

  useEffect(() => {
    initCamera();
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, [initCamera]);

  useEffect(() => {
    let timer: number;
    if (status === GameStatus.PLAYING && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { endGame(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const spawnFruit = useCallback((count: number = 1) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < 0.08; 
      const template = isBomb ? BOMB : FRUITS[Math.floor(Math.random() * FRUITS.length)];
      const targetHeight = canvas.height * (0.65 + Math.random() * 0.3); 
      const vy = -Math.sqrt(2 * GRAVITY * targetHeight);

      const newFruit: Fruit = {
        id: Math.random().toString(36).substr(2, 9),
        x: (canvas.width * 0.1) + Math.random() * (canvas.width * 0.8),
        y: canvas.height + 150,
        vx: (Math.random() - 0.5) * 16, 
        vy: vy,
        radius: FRUIT_RADIUS,
        color: template.color,
        type: isBomb ? 'bomb' : 'fruit',
        emoji: template.emoji,
        isSliced: false,
        sliceAngle: 0,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.5 
      };
      fruitsRef.current.push(newFruit);
    }
  }, []);

  const handleSlice = (fruit: Fruit, p1: Point, p2: Point) => {
    const dx = p2.x - fruit.x;
    const dy = p2.y - fruit.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < fruit.radius) {
      if (fruit.type === 'bomb') {
        setScore(prev => Math.max(0, prev - 5));
        createParticles(fruit.x, fruit.y, '#ffffff');
        fruit.isSliced = true;
        comboRef.current.count = 0; 
        return true;
      } else {
        fruit.isSliced = true;
        setScore(prev => prev + 1);
        createParticles(fruit.x, fruit.y, fruit.color);

        const now = Date.now();
        if (now - comboRef.current.lastTime < COMBO_WINDOW) {
          comboRef.current.count++;
        } else {
          processComboEnd();
          comboRef.current.count = 1;
        }
        
        comboRef.current.lastTime = now;
        comboRef.current.lastX = fruit.x;
        comboRef.current.lastY = fruit.y;

        const spawnHalf = (side: 'left' | 'right') => {
          const half: Fruit = {
            ...JSON.parse(JSON.stringify(fruit)),
            id: Math.random().toString(36),
            isHalf: true,
            side: side,
            vx: fruit.vx + (side === 'left' ? -10 : 10),
            vy: fruit.vy - 7,
            vr: (side === 'left' ? -0.7 : 0.7),
            isSliced: true
          };
          fruitsRef.current.push(half);
        };
        spawnHalf('left');
        spawnHalf('right');
        return true;
      }
    }
    return false;
  };

  const processComboEnd = () => {
    if (comboRef.current.count >= 3) {
      const bonus = comboRef.current.count;
      setScore(prev => prev + bonus);
      combosFeedbackRef.current.push({
        x: comboRef.current.lastX,
        y: comboRef.current.lastY - 100,
        count: comboRef.current.count,
        life: 1.0
      });
    }
    comboRef.current.count = 0;
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 20; i++) { 
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 35,
        vy: (Math.random() - 0.5) * 35,
        color,
        life: 1.0,
        size: Math.random() * 10 + 3,
      });
    }
  };

  const update = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // 始终清除画布，无论状态如何
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (status !== GameStatus.PLAYING) {
      // 即使不在游戏中，也要绘制追踪点
      if (handRef.current) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'cyan';
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(handRef.current.x, handRef.current.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      lastTimeRef.current = timestamp;
      requestAnimationFrame(update);
      return;
    }

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    lastTimeRef.current = timestamp;

    const now = Date.now();
    slashPointsRef.current = slashPointsRef.current.filter(p => now - p.timestamp < SLASH_LIFETIME);

    if (comboRef.current.count > 0 && now - comboRef.current.lastTime >= COMBO_WINDOW) {
      processComboEnd();
    }

    // 水果生成逻辑：仅在游戏中触发
    if (timestamp - lastSpawnTimeRef.current > nextSpawnIntervalRef.current) {
      const count = Math.floor(Math.random() * 3) + 1; 
      spawnFruit(count);
      lastSpawnTimeRef.current = timestamp;
      nextSpawnIntervalRef.current = 1000 + Math.random() * 1000; 
    }

    fruitsRef.current = fruitsRef.current.filter(fruit => {
      fruit.x += fruit.vx;
      fruit.y += fruit.vy;
      fruit.vy += GRAVITY;
      fruit.rotation += fruit.vr;

      if (!fruit.isSliced && !fruit.isHalf && slashPointsRef.current.length >= 2) {
        const p2 = slashPointsRef.current[slashPointsRef.current.length - 1];
        const p1 = slashPointsRef.current[slashPointsRef.current.length - 2];
        if (handleSlice(fruit, p1, p2)) return false; 
      }
      return fruit.y <= canvas.height + 400;
    });

    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.6; p.life -= 0.06;
      return p.life > 0;
    });

    combosFeedbackRef.current = combosFeedbackRef.current.filter(c => {
      c.y -= 3; c.life -= 0.03;
      return c.life > 0;
    });

    // 渲染
    combosFeedbackRef.current.forEach(c => {
      ctx.save();
      ctx.globalAlpha = c.life;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 80px Bungee';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#FF4500';
      ctx.fillText(`${c.count}连斩!`, c.x, c.y);
      ctx.restore();
    });

    if (slashPointsRef.current.length > 2) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(slashPointsRef.current[0].x, slashPointsRef.current[0].y);
      for (let i = 1; i < slashPointsRef.current.length; i++) {
        ctx.lineTo(slashPointsRef.current[i].x, slashPointsRef.current[i].y);
      }
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 12; 
      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    fruitsRef.current.forEach(fruit => {
      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rotation);
      ctx.font = `${fruit.radius * 2.1}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (fruit.isHalf) {
        ctx.beginPath();
        if (fruit.side === 'left') ctx.rect(-fruit.radius * 2, -fruit.radius * 2, fruit.radius * 2, fruit.radius * 4);
        else ctx.rect(0, -fruit.radius * 2, fruit.radius * 2, fruit.radius * 4);
        ctx.clip();
        ctx.fillText(fruit.emoji, 0, 0);
      } else if (!fruit.isSliced) {
        ctx.fillText(fruit.emoji, 0, 0);
      }
      ctx.restore();
    });

    particlesRef.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if (handRef.current) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'cyan';
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(handRef.current.x, handRef.current.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(update);
  }, [status, spawnFruit]);

  useEffect(() => {
    const animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [update]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    fruitsRef.current = [];
    particlesRef.current = [];
    slashPointsRef.current = [];
    combosFeedbackRef.current = [];
    comboRef.current = { count: 0, lastTime: 0, lastX: 0, lastY: 0 };
    lastSpawnTimeRef.current = performance.now();
    setStatus(GameStatus.PLAYING);
    spawnFruit(2); 
  };

  const endGame = async () => {
    setStatus(GameStatus.GAMEOVER);
    fruitsRef.current = []; // 游戏结束，立即清空水果数组
    particlesRef.current = [];
    slashPointsRef.current = [];
    const msg = await geminiService.getEncouragement(score);
    setSenseiMessage(msg);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#020617] flex items-center justify-center overflow-hidden select-none">
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover grayscale opacity-20 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />
      
      <SlashOverlay 
        score={score} 
        timeLeft={timeLeft} 
        status={status} 
        senseiMessage={senseiMessage}
        onStart={startGame}
        onToggleCamera={toggleCamera}
        isUserFacing={facingMode === 'user'}
      />

      <div className="fixed bottom-4 left-4 flex flex-col gap-1 text-cyan-500/30 text-[9px] font-mono uppercase tracking-[2px] z-20">
        <span>Air Gesture v4.7</span>
        <span>Game Over Cleanup Ready</span>
      </div>
    </div>
  );
};

export default App;
