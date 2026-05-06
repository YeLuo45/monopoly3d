import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';
import { playSound } from '../game/audio';

// Floating text that animates upward and fades
export function FloatingText({ text, color, position, onComplete }) {
  const [opacity, setOpacity] = useState(1);
  const [yOffset, setYOffset] = useState(0);
  const frameRef = useRef(0);
  
  useEffect(() => {
    let animationFrame;
    const animate = () => {
      frameRef.current += 1;
      const progress = frameRef.current / 90; // 1.5s at 60fps
      if (progress >= 1) {
        onComplete?.();
        return;
      }
      setYOffset(progress * 60);
      setOpacity(1 - progress);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);
  
  return (
    <div 
      className="absolute pointer-events-none transition-opacity"
      style={{
        left: position?.x ?? '50%',
        top: position?.y ?? '50%',
        transform: `translate(-50%, ${-yOffset}px)`,
        opacity,
      }}
    >
      <span className={`text-2xl font-bold ${color} drop-shadow-lg`}>
        {text}
      </span>
    </div>
  );
}

// Purchase success animation overlay
export function PurchaseOverlay() {
  const [purchases, setPurchases] = useState([]);
  
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const prevPlayer = prevState.players[state.currentPlayerIndex];
      
      // Detect property purchase
      if (currentPlayer && prevPlayer) {
        const prevProps = prevPlayer.properties.length;
        const currProps = currentPlayer.properties.length;
        
        if (currProps > prevProps) {
          // New property purchased - find the new property id
          const newPropId = currentPlayer.properties[currProps - 1];
          const tile = BOARD_CONFIG[newPropId];
          if (tile) {
            const id = Date.now();
            setPurchases(p => [...p, { id, name: tile.name, color: currentPlayer.color }]);
            // Play purchase sound
            playSound('purchase');
            setTimeout(() => {
              setPurchases(p => p.filter(x => x.id !== id));
            }, 1500);
          }
        }
      }
    });
    return unsubscribe;
  }, []);
  
  if (purchases.length === 0) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {purchases.map(p => (
        <div
          key={p.id}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="bg-green-600/90 px-6 py-3 rounded-2xl border-2 border-green-400 shadow-2xl animate-purchase">
            <span className="text-white font-bold text-xl">+{p.name}</span>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes purchase-pop {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        .animate-purchase { animation: purchase-pop 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

// Question feedback overlay - correct (green glow) or incorrect (red flash)
export function QuestionFeedback() {
  const questionAnswered = useGameStore(s => s.questionAnswered);
  const [show, setShow] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  useEffect(() => {
    if (questionAnswered) {
      setFeedback(questionAnswered);
      setShow(true);
      // Play sound based on result
      playSound(questionAnswered === 'correct' ? 'correct' : 'wrong');
      const timer = setTimeout(() => setShow(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [questionAnswered]);
  
  if (!show || !feedback) return null;
  
  const isCorrect = feedback === 'correct';
  
  return (
    <div className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
      isCorrect 
        ? 'bg-green-500/20 animate-correct-glow' 
        : 'bg-red-500/20 animate-incorrect-flash'
    }`}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2">
        <span className={`text-4xl font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {isCorrect ? '+$100' : '-$50'}
        </span>
      </div>
      <style>{`
        @keyframes correct-glow {
          0% { box-shadow: inset 0 0 0 0 rgba(34, 197, 94, 0); }
          50% { box-shadow: inset 0 0 100px 20px rgba(34, 197, 94, 0.3); }
          100% { box-shadow: inset 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes incorrect-flash {
          0%, 100% { background: rgba(239, 68, 68, 0); }
          25%, 75% { background: rgba(239, 68, 68, 0.3); }
        }
        .animate-correct-glow { animation: correct-glow 1.5s ease-out; }
        .animate-incorrect-flash { animation: incorrect-flash 0.3s ease-in-out 3; }
      `}</style>
    </div>
  );
}

// Rent payment floating indicator
export function RentPayment() {
  const [payments, setPayments] = useState([]);
  
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      // Detect rent payment events by monitoring player money changes
      // This is simplified - in a full impl, track last payment details
    });
    return unsubscribe;
  }, []);
  
  return null; // Simplified placeholder
}

export default function FloatingEffects() {
  return (
    <>
      <PurchaseOverlay />
      <QuestionFeedback />
    </>
  );
}
