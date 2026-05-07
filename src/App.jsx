import { useEffect, useState } from 'react';
import { useGameStore } from './game/store';
import { BOARD_THEMES } from './game/themes';
import { playBGM, stopBGM, toggleMute, getIsMuted, getBgmPlaying, initAudioOnInteraction } from './game/audio';
import MenuScreen from './components/MenuScreen';
import SetupScreen from './components/SetupScreen';
import PieceSelectionScreen from './components/PieceSelectionScreen';
import GameBoard from './components/GameBoard';
import GameOverScreen from './components/GameOverScreen';
import TeacherConsole from './components/TeacherConsole';
import FloatingEffects from './components/FloatingEffects';
import EditorPage from './editor/EditorPage';
import './index.css';

function AudioControls() {
  const [isMuted, setIsMuted] = useState(getIsMuted());
  const [isPlaying, setIsPlaying] = useState(getBgmPlaying());
  const screen = useGameStore(s => s.screen);

  const handleToggleMute = () => {
    const newMuted = toggleMute();
    setIsMuted(newMuted);
  };

  const handleToggleBGM = () => {
    if (getBgmPlaying()) {
      stopBGM();
    } else {
      playBGM();
    }
    setIsPlaying(getBgmPlaying());
  };

  // Poll BGM state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsMuted(getIsMuted());
      setIsPlaying(getBgmPlaying());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (screen !== 'playing') return null;

  return (
    <div className="absolute top-4 right-4 z-50 flex gap-2">
      <button
        onClick={handleToggleBGM}
        className="px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-white text-sm font-bold transition-all"
        title={isPlaying ? "停止音乐" : "播放音乐"}
      >
        {isPlaying ? '🔊' : '🔇'} BGM
      </button>
      <button
        onClick={handleToggleMute}
        className="px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-white text-sm font-bold transition-all"
        title={isMuted ? "取消静音" : "静音"}
      >
        {isMuted ? '🔇' : '🔊'} {isMuted ? '已静音' : '声音'}
      </button>
    </div>
  );
}

function App() {
  const screen = useGameStore(s => s.screen);
  const currentTheme = useGameStore(s => s.currentTheme);
  const theme = BOARD_THEMES[currentTheme] || BOARD_THEMES.classic;

  // Initialize audio on first interaction
  useEffect(() => {
    initAudioOnInteraction();
  }, []);

  // Start BGM when entering playing screen
  useEffect(() => {
    if (screen === 'playing') {
      playBGM();
    } else {
      stopBGM();
    }
  }, [screen]);

  return (
    <div className="w-full h-screen overflow-hidden" style={{ background: theme.backgroundGradient }}>
      {screen === 'menu' && <MenuScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'piece_selection' && <PieceSelectionScreen />}
      {screen === 'editor' && <EditorPage />}
      {screen === 'playing' && (
        <>
          <AudioControls />
          <GameBoard />
          <FloatingEffects />
          <TeacherConsole />
        </>
      )}
      {screen === 'gameover' && <GameOverScreen />}
    </div>
  );
}

export default App;
