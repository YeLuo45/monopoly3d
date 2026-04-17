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
    <div className="w-full h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden">
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
  );
}

export default App;
