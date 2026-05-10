import { useEffect, useState } from 'react';
import { useGameStore } from './game/store';
import { BOARD_THEMES } from './game/themes';
import { playBGM, stopBGM, toggleMute, getIsMuted, getBgmPlaying, initAudioOnInteraction } from './game/audio';
import MenuScreen from './components/MenuScreen';
import SetupScreen from './components/SetupScreen';
import PieceSelectionScreen from './components/PieceSelectionScreen';
import { lazy, Suspense } from 'react';
import GameOverScreen from './components/GameOverScreen';
import ProfileScreen from './components/ProfileScreen';
import WorkshopScreen from './components/WorkshopScreen';
import TeacherConsole from './components/TeacherConsole';
import FloatingEffects from './components/FloatingEffects';

// Lazy-load 3D Canvas components to split three.js out of main bundle
const GameBoard = lazy(() => import('./components/GameBoard'));
const EditorPage = lazy(() => import('./editor/EditorPage'));
import './index.css';

// Achievement System
import { AchievementPopup, TaskProgress, WeatherIndicator, Leaderboard, LeaderboardPanel, AchievementPanel, DailyChallengeScreen } from './features/achievement';

// Teaching Tools
import { TeacherPage, StudentHomeworkPanel } from './features/teaching';

// Learning Features
import { AIAssistant, PracticeMode, LearningReport } from './features/learning';

// Online Multiplayer
import OnlineLobby from './multiplayer/OnlineLobby';
import MultiplayerHUD from './multiplayer/MultiplayerHUD';
import GamePage from './multiplayer/GamePage';

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
  const isMultiplayer = useGameStore(s => s.isMultiplayer);
  const isOnlineMultiplayer = useGameStore(s => s.isOnlineMultiplayer);
  const theme = BOARD_THEMES[currentTheme] || BOARD_THEMES.classic;
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);

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
      {screen === 'editor' && <Suspense fallback={<div className="w-full h-screen flex items-center justify-center text-white text-xl">加载编辑器...</div>}><EditorPage /></Suspense>}
      {screen === 'teacher_page' && <TeacherPage />}
      {screen === 'playing' && (
        <>
          <AudioControls />
          <WeatherIndicator />
          <TaskProgress />
          <Leaderboard />
          {isOnlineMultiplayer && <MultiplayerHUD />}
          <Suspense fallback={<div className="w-full h-screen flex items-center justify-center text-white text-xl">加载3D棋盘...</div>}><GameBoard /></Suspense>
          <FloatingEffects />
          <TeacherConsole />
          <StudentHomeworkPanel />
          {/* Learning Features */}
          <AIAssistant />
          <PracticeMode />
          <LearningReport />
        </>
      )}
      {screen === 'gameover' && <GameOverScreen />}
      {screen === 'profile' && <ProfileScreen />}
      {screen === 'workshop' && <WorkshopScreen />}
      {/* Achievement System - Overlays */}
      <AchievementPopup />
      <AchievementPanel />
      <DailyChallengeScreen />
      <LeaderboardPanel />
    </div>
  );
}

export default App;
