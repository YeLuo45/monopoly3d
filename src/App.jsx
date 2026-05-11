import { useGameStore } from './game/store';
import MenuScreen from './components/MenuScreen';
import SetupScreen from './components/SetupScreen';
import PieceSelectionScreen from './components/PieceSelectionScreen';
import GameBoard from './components/GameBoard';
import GameOverScreen from './components/GameOverScreen';
import TeacherConsole from './components/TeacherConsole';
import './index.css';

function App() {
  const screen = useGameStore(s => s.screen);

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* 3D沉浸式背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
        {/* 顶部光晕 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        {/* 底部光晕 */}
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* 3D骰子装饰 */}
        <div className="absolute top-16 left-10 text-8xl opacity-20 animate-float">🎲</div>
        <div className="absolute top-32 right-16 text-6xl opacity-15 animate-float" style={{ animationDelay: '0.5s' }}>💰</div>
        <div className="absolute bottom-32 left-16 text-7xl opacity-15 animate-float" style={{ animationDelay: '1.5s' }}>🏠</div>
        <div className="absolute bottom-20 right-20 text-5xl opacity-10 animate-float" style={{ animationDelay: '2.5s' }}>🎯</div>
        
        {/* 网格线背景 */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center top'
        }} />
      </div>

      {/* 主内容区域 - 毛玻璃卡片 */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {screen === 'menu' && <MenuScreen />}
        {screen === 'setup' && <SetupScreen />}
        {screen === 'piece_selection' && <PieceSelectionScreen />}
        {screen === 'playing' && (
          <>
            <GameBoard />
            <TeacherConsole />
          </>
        )}
        {screen === 'gameover' && <GameOverScreen />}
      </div>
    </div>
  );
}

export default App;
