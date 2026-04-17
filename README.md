# 🏦 Monopoly3D - Educational Edition

《大富翁3D教育版》- A 3D educational board game for children aged 4-10.

## Overview

A browser-based 3D Monopoly game with embedded educational content covering kindergarten through 4th grade curriculum. Built with React 18, Three.js (React-Three-Fiber), and Zustand.

## Features

### P0 Core Features ✅
- 3D game board with 20 property tiles
- Animated dice rolling (2d6)
- Turn-based movement with step-by-step animation
- Property purchase / rent / bankruptcy system
- Knowledge question tiles (25%+ of board)
- Correct answer rewards (+$100) / incorrect penalties (-$50)
- House/hotel building mechanism
- 15-second question timer
- 2-4 player local multiplayer
- 20-round win condition
- Teacher control console

### P1 Important Features ✅
- AI opponents (1-3 players)
- 3 age-tier question banks (K, P1-2, P3-4)
- Text-to-speech narration for kindergarten tier
- Camera orbit/zoom controls
- Save/resume via localStorage

## Tech Stack

- **React 18** + **Vite**
- **Three.js** via **@react-three/fiber** + **@react-three/drei**
- **Zustand** for state management
- **Tailwind CSS v4** for styling
- **Web Speech API** for TTS
- No backend required - fully client-side

## Project Structure

```
monopoly3d/
├── public/
│   ├── audio/           # Audio assets (placeholder)
│   ├── models/          # 3D models (future)
│   └── textures/        # Board textures (future)
├── src/
│   ├── components/
│   │   ├── 3d/          # 3D scene components
│   │   │   ├── Board.jsx
│   │   │   ├── Dice.jsx
│   │   │   ├── Players.jsx
│   │   │   └── MoveAnimator.jsx
│   │   ├── HUD.jsx
│   │   ├── GameBoard.jsx
│   │   ├── GameControls.jsx
│   │   ├── GameOverScreen.jsx
│   │   ├── MenuScreen.jsx
│   │   ├── PropertyPanel.jsx
│   │   ├── QuestionModal.jsx
│   │   ├── SetupScreen.jsx
│   │   └── TeacherConsole.jsx
│   ├── game/
│   │   ├── boardConfig.js   # Board tile definitions
│   │   ├── dice.js          # Dice utilities
│   │   └── store.js         # Zustand game state
│   ├── hooks/
│   │   └── useAnimation.js  # Animation utilities
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
cd monopoly3d
npm install
```

### Development

```bash
npm run dev
```

The app will be available at **http://localhost:3456**

### Production Build

```bash
npm run build
```

Output will be in the `dist/` folder.

## How to Play

1. **Main Menu** → Click "新游戏" (New Game)
2. **Age Tier Selection** → Choose difficulty (Kindergarten / Primary 1-2 / Primary 3-4)
3. **Player Setup** → Select 1-4 human players and 0-3 AI opponents
4. **Gameplay** → Take turns rolling dice and moving
5. **Property Tiles** → Buy unowned properties or pay rent
6. **Question Tiles** → Answer questions for money rewards/penalties
7. **Win Condition** → Last player standing, or highest net worth after 20 rounds

## Question Banks

- **Kindergarten (4-6岁)**: Colors, shapes, numbers 1-20, basic animals, emotions
- **Primary 1-2 (6-8岁)**: Addition/subtraction, simple multiplication, days/months, basic geography
- **Primary 3-4 (8-10岁)**: Multiplication/division, fractions, reading comprehension, science facts

## Teacher Mode

Click "🎓 教师模式" button during gameplay to access:
- Toggle question timer on/off
- View all player balances
- Save game
- Return to main menu

## Game Rules Summary

| Tile Type | Action |
|-----------|--------|
| Property (unowned) | Buy for listed price |
| Property (owned) | Pay rent to owner |
| Question tile | Answer correctly for +$100, wrong for -$50 |
| Chance tile | Random reward/penalty or question |
| Tax tile | Pay listed amount to bank |
| GO | Collect $200 when passing |
| Jail | Just visiting (no penalty) |
| Go To Jail | Move to jail immediately |
| Free Parking | Rest, no effect |

## Architecture Notes

### State Management
All game state is centralized in `store.js` using Zustand. This includes:
- Player states (money, position, properties)
- Turn management (current player, phase)
- Dice state
- Question bank
- Game flow (start → playing → gameover)

### 3D Rendering
The game board is procedurally generated using Three.js primitives:
- Board tiles: RoundedBox + Text labels
- Dice: BoxGeometry with pip markers
- Players: CylinderGeometry tokens with color coding
- Camera: OrbitControls for interactive viewing

### Animation
Step-by-step token movement is driven by `MoveAnimator.jsx` which uses `useFrame` to advance one tile position every 400ms.

### Save System
Game state is serialized to localStorage as JSON. Board configuration (property ownership, houses) is saved as part of the state.

## Known Limitations

- Audio uses Web Speech API (TTS) - no bundled sound files
- 3D models use procedural geometry (no external .glb files)
- AI opponents use simple rule-based logic
- No network/multiplayer functionality

## Future Enhancements

- External 3D model loading (GLTF/GLB)
- Bundled audio files (MP3/OGG)
- More question bank tiers
- Subject category filtering
- Classroom mode with statistics
- Animation refinements and particle effects

## License

CC0 / Public Domain (for game code). Question bank content is sample data for demonstration.
