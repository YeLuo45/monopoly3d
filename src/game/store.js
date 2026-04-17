import { create } from 'zustand';
import { BOARD_CONFIG, BOARD_SIZE, STARTING_MONEY, MAX_ROUNDS, QUESTION_TILE_IDS, TILE_TYPES } from './boardConfig';
import { rollDice, getDiceResult } from './dice';

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
const AI_NAMES = ['小智', '小慧', '小能'];
const PIECE_NAMES = ['小汽车', '小狗狗', '小猫咪', '陀螺', '奥特曼', '皮卡丘', '哆啦A梦'];

function createPlayer(id, name, isAI = false, color = null) {
  return {
    id,
    name,
    isAI,
    color: color || PLAYER_COLORS[id % 4],
    money: STARTING_MONEY,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    isBankrupt: false,
    netWorth: STARTING_MONEY,
  };
}

function getNextPosition(currentPos, diceValue) {
  // Counterclockwise movement: subtract and wrap
  return ((currentPos - diceValue) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
}

function checkBankruptcy(player) {
  if (player.money < 0 && player.properties.length === 0) return true;
  return false;
}

const initialState = {
  // Screen state
  screen: 'menu', // menu | setup | piece_selection | playing | gameover

  // Game settings
  ageTier: 'kindergarten', // kindergarten | primary1_2 | primary3_4
  humanCount: 2,
  aiCount: 0,

  // Players
  players: [],
  currentPlayerIndex: 0,

  // Turn state
  currentRound: 1,
  phase: 'roll', // roll | moving | tile_event | question | buy_property | game_over
  diceValues: [1, 1],
  diceRolling: false,
  consecutiveDoubles: 0,

  // Question state
  currentQuestion: null,
  questionAnswered: null, // null | 'correct' | 'incorrect'
  questionTimer: 15,

  // Animation state
  movingPath: [], // array of tile indices for animation
  animationStep: 0,

  // Teacher mode
  teacherMode: false,
  timerEnabled: true,

  // Winner
  winner: null,

  // Piece selection (maps player index -> piece id)
  pieceSelections: {},
};

export const useGameStore = create((set, get) => ({
  ...initialState,

  // Navigation
  goToMenu: () => set({ ...initialState }),

  goToSetup: () => set({ screen: 'setup' }),

  setAgeTier: (tier) => set({ ageTier: tier }),

  setPlayers: (humanCount, aiCount) => {
    // Transition to piece selection screen
    set({ humanCount, aiCount, screen: 'piece_selection' });
  },

  setPieceSelection: (pieceMap) => {
    const state = get();
    const players = [];
    for (let i = 0; i < state.humanCount; i++) {
      const colorIdx = pieceMap[i] !== undefined ? pieceMap[i] : i;
      players.push(createPlayer(i, `玩家${i + 1}`, false, PLAYER_COLORS[colorIdx % 4]));
    }
    for (let i = 0; i < state.aiCount; i++) {
      const globalIdx = state.humanCount + i;
      const colorIdx = pieceMap[globalIdx] !== undefined ? pieceMap[globalIdx] : globalIdx;
      players.push(createPlayer(globalIdx, AI_NAMES[i], true, PLAYER_COLORS[colorIdx % 4]));
    }
    set({
      players,
      pieceSelections: pieceMap,
      screen: 'playing',
      phase: 'roll',
      currentPlayerIndex: 0,
      currentRound: 1,
    });
  },
  
  rollDice: () => {
    const state = get();
    if (state.diceRolling || state.phase !== 'roll') return;
    
    set({ diceRolling: true });
    
    // Animate dice for 1 second
    const animInterval = setInterval(() => {
      set({ diceValues: [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1] });
    }, 100);
    
    setTimeout(() => {
      clearInterval(animInterval);
      const [d1, d2] = get().diceValues;
      const isDoubles = d1 === d2;
      const newDoubles = isDoubles ? state.consecutiveDoubles + 1 : 0;
      
      // Three doubles = go to jail
      if (newDoubles >= 3) {
        const players = [...state.players];
        const currentPlayer = players[state.currentPlayerIndex];
        currentPlayer.position = 10; // Jail position
        currentPlayer.inJail = true;
        currentPlayer.jailTurns = 0;
        set({
          diceRolling: false,
          consecutiveDoubles: 0,
          players,
          phase: 'roll',
          ...advanceToNextPlayer(state),
        });
        return;
      }
      
      const total = d1 + d2;
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      // If in jail and not doubles, stay in jail
      if (currentPlayer.inJail) {
        if (isDoubles) {
          const players = [...state.players];
          players[state.currentPlayerIndex].inJail = false;
          players[state.currentPlayerIndex].jailTurns = 0;
          const newPos = getNextPosition(currentPlayer.position, total);
          set({
            diceRolling: false,
            consecutiveDoubles: newDoubles,
            players,
            phase: 'moving',
            movingPath: computePath(currentPlayer.position, newPos),
            animationStep: 0,
          });
        } else {
          const players = [...state.players];
          players[state.currentPlayerIndex].jailTurns += 1;
          if (players[state.currentPlayerIndex].jailTurns >= 3) {
            players[state.currentPlayerIndex].inJail = false;
            players[state.currentPlayerIndex].jailTurns = 0;
            const newPos = getNextPosition(currentPlayer.position, total);
            set({
              diceRolling: false,
              consecutiveDoubles: 0,
              players,
              phase: 'moving',
              movingPath: computePath(currentPlayer.position, newPos),
              animationStep: 0,
            });
          } else {
            set({
              diceRolling: false,
              consecutiveDoubles: 0,
              players,
              phase: 'roll',
              ...advanceToNextPlayer(state),
            });
          }
        }
        return;
      }
      
      // Normal movement
      const newPos = getNextPosition(currentPlayer.position, total);
      // Counterclockwise: passing Go occurs when newPos > currentPos (wrapping backward)
      const passedGo = newPos > currentPlayer.position;
      
      if (passedGo) {
        const players = [...state.players];
        players[state.currentPlayerIndex].money += 200;
        players[state.currentPlayerIndex].position = newPos;
        set({ players });
      }
      
      set({
        diceRolling: false,
        consecutiveDoubles: newDoubles,
        phase: 'moving',
        movingPath: computePath(currentPlayer.position, newPos),
        animationStep: 0,
      });
    }, 1000);
  },
  
  // Called by animation to advance one step
  advanceStep: () => {
    const state = get();
    if (state.phase !== 'moving') return;
    
    const nextStep = state.animationStep + 1;
    const players = [...state.players];
    players[state.currentPlayerIndex].position = state.movingPath[nextStep - 1];
    
    if (nextStep >= state.movingPath.length) {
      // Movement complete - handle tile event
      set({ players, animationStep: nextStep, phase: 'tile_event' });
      get().handleTileEvent();
    } else {
      set({ players, animationStep: nextStep });
    }
  },
  
  handleTileEvent: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    const tile = BOARD_CONFIG[player.position];
    
    switch (tile.type) {
      case TILE_TYPES.PROPERTY:
        if (tile.owner === null) {
          set({ phase: 'buy_property' });
        } else if (tile.owner !== player.id) {
          // Pay rent
          const owner = state.players[tile.owner];
          const rentAmount = calculateRent(tile, owner);
          if (player.money >= rentAmount) {
            const players = [...state.players];
            players[player.id].money -= rentAmount;
            players[owner.id].money += rentAmount;
            set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
          } else {
            // Bankruptcy
            const players = [...state.players];
            players[player.id].money -= rentAmount;
            players[player.id].isBankrupt = true;
            // Transfer properties
            tile.owner = owner.id;
            owner.properties.push(tile.id);
            owner.money += rentAmount + player.money;
            players[owner.id].money = owner.money;
            set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
          }
        } else {
          set({ phase: 'roll', ...advanceToNextPlayer(state) });
        }
        break;
        
      case TILE_TYPES.QUESTION:
        get().triggerQuestion();
        break;
        
      case TILE_TYPES.CHANCE:
        // Random chance event
        const chanceOutcome = Math.random();
        const players = [...state.players];
        if (chanceOutcome < 0.4) {
          // Reward
          players[state.currentPlayerIndex].money += 100;
          set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
        } else if (chanceOutcome < 0.7) {
          // Penalty
          players[state.currentPlayerIndex].money -= 50;
          set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
        } else {
          // Question
          get().triggerQuestion();
        }
        break;
        
      case TILE_TYPES.TAX:
        const players2 = [...state.players];
        players2[state.currentPlayerIndex].money -= tile.amount;
        set({ players: players2, phase: 'roll', ...advanceToNextPlayer(state) });
        break;
        
      case TILE_TYPES.GO_TO_JAIL:
        const players3 = [...state.players];
        players3[state.currentPlayerIndex].position = 10;
        players3[state.currentPlayerIndex].inJail = true;
        players3[state.currentPlayerIndex].jailTurns = 0;
        set({ players: players3, phase: 'roll', ...advanceToNextPlayer(state) });
        break;
        
      case 'free_parking':
      case 'jail':
      case 'go':
      default:
        set({ phase: 'roll', ...advanceToNextPlayer(state) });
    }
    
    // Check for game over after each turn
    get().checkGameOver();
  },
  
  triggerQuestion: () => {
    const state = get();
    const questions = getQuestionsForTier(state.ageTier);
    const question = questions[Math.floor(Math.random() * questions.length)];
    set({
      phase: 'question',
      currentQuestion: question,
      questionAnswered: null,
      questionTimer: 15,
    });
    
    // Start timer
    if (state.timerEnabled && !state.teacherMode) {
      const timerInterval = setInterval(() => {
        const current = get();
        if (current.phase !== 'question' || current.questionAnswered) {
          clearInterval(timerInterval);
          return;
        }
        const next = current.questionTimer - 1;
        if (next <= 0) {
          clearInterval(timerInterval);
          get().answerQuestion(-1); // Time's up = wrong
        } else {
          set({ questionTimer: next });
        }
      }, 1000);
    }
  },
  
  answerQuestion: (answerIndex) => {
    const state = get();
    if (state.questionAnswered || !state.currentQuestion) return;
    
    const isCorrect = answerIndex === state.currentQuestion.correctIndex;
    const players = [...state.players];
    const reward = isCorrect ? 100 : -50;
    players[state.currentPlayerIndex].money += reward;
    
    // If went bankrupt from wrong answer
    if (players[state.currentPlayerIndex].money < 0) {
      players[state.currentPlayerIndex].isBankrupt = true;
    }
    
    set({
      players,
      questionAnswered: isCorrect ? 'correct' : 'incorrect',
    });
    
    // Auto advance after 2 seconds
    setTimeout(() => {
      set({ currentQuestion: null, questionAnswered: null });
      set({ phase: 'roll', ...advanceToNextPlayer(state) });
      get().checkGameOver();
    }, 2000);
  },
  
  buyProperty: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    const tile = BOARD_CONFIG[player.position];
    
    if (tile.type !== TILE_TYPES.PROPERTY || tile.owner !== null) return;
    if (player.money < tile.price) return;
    
    const players = [...state.players];
    players[state.currentPlayerIndex].money -= tile.price;
    players[state.currentPlayerIndex].properties.push(tile.id);
    BOARD_CONFIG[tile.id].owner = player.id;
    
    set({ players, phase: 'roll', ...advanceToNextPlayer(state) });
  },
  
  passProperty: () => {
    const state = get();
    set({ phase: 'roll', ...advanceToNextPlayer(state) });
  },
  
  buildHouse: (tileId) => {
    const state = get();
    const tile = BOARD_CONFIG[tileId];
    const player = state.players[state.currentPlayerIndex];
    
    if (!player.properties.includes(tileId)) return;
    if (tile.houses >= 4) return; // Max 4 houses
    if (player.money < 50) return;
    
    const players = [...state.players];
    players[state.currentPlayerIndex].money -= 50;
    BOARD_CONFIG[tileId].houses += 1;
    
    set({ players });
  },
  
  toggleTeacherMode: () => set(s => ({ teacherMode: !s.teacherMode })),
  toggleTimer: () => set(s => ({ timerEnabled: !s.timerEnabled })),
  
  checkGameOver: () => {
    const state = get();
    const activePlayers = state.players.filter(p => !p.isBankrupt);
    
    if (activePlayers.length <= 1) {
      set({ winner: activePlayers[0] || null, phase: 'game_over', screen: 'gameover' });
      return;
    }
    
    if (state.currentRound > MAX_ROUNDS) {
      // Rank by net worth
      const ranked = [...state.players].sort((a, b) => {
        const netA = calculateNetWorth(a);
        const netB = calculateNetWorth(b);
        return netB - netA;
      });
      set({ winner: ranked[0], phase: 'game_over', screen: 'gameover' });
    }
  },
  
  getNextPlayer: () => {
    const state = get();
    let next = (state.currentPlayerIndex + 1) % state.players.length;
    // Skip bankrupt players
    let attempts = 0;
    while (state.players[next].isBankrupt && attempts < state.players.length) {
      next = (next + 1) % state.players.length;
      attempts++;
    }
    return state.players[next];
  },
  
  // AI turn
  aiTurn: () => {
    const state = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer.isAI) return;
    
    // AI automatically rolls
    setTimeout(() => get().rollDice(), 1000);
  },
  
  saveGame: () => {
    const state = get();
    const saveData = {
      players: state.players,
      currentPlayerIndex: state.currentPlayerIndex,
      currentRound: state.currentRound,
      phase: state.phase,
      ageTier: state.ageTier,
      humanCount: state.humanCount,
      aiCount: state.aiCount,
      boardConfig: BOARD_CONFIG.map(t => ({ id: t.id, owner: t.owner, houses: t.houses, mortgaged: t.mortgaged })),
    };
    localStorage.setItem('monopoly3d_save', JSON.stringify(saveData));
  },
  
  loadGame: () => {
    const saved = localStorage.getItem('monopoly3d_save');
    if (!saved) return false;
    try {
      const data = JSON.parse(saved);
      // Restore board config
      data.boardConfig.forEach(savedTile => {
        const tile = BOARD_CONFIG[savedTile.id];
        if (tile) {
          tile.owner = savedTile.owner;
          tile.houses = savedTile.houses;
          tile.mortgaged = savedTile.mortgaged;
        }
      });
      set({
        players: data.players,
        currentPlayerIndex: data.currentPlayerIndex,
        currentRound: data.currentRound,
        phase: data.phase,
        ageTier: data.ageTier,
        humanCount: data.humanCount,
        aiCount: data.aiCount,
        screen: 'playing',
      });
      return true;
    } catch (e) {
      return false;
    }
  },
}));

function getNextPlayerIndex(state) {
  let next = (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;
  while (state.players[next].isBankrupt && attempts < state.players.length) {
    next = (next + 1) % state.players.length;
    attempts++;
  }
  return next;
}

// Returns { nextPlayerIndex, roundIncremented }
function computeNextPlayer(state) {
  const wasLastPlayer = state.currentPlayerIndex === state.players.length - 1;
  return {
    nextPlayerIndex: getNextPlayerIndex(state),
    roundIncremented: wasLastPlayer,
  };
}

// Centralized player advancement — use this everywhere to ensure round increments correctly
function advanceToNextPlayer(state) {
  const { nextPlayerIndex, roundIncremented } = computeNextPlayer(state);
  return {
    currentPlayerIndex: nextPlayerIndex,
    currentRound: roundIncremented ? state.currentRound + 1 : state.currentRound,
  };
}

function computePath(from, to) {
  const path = [];
  if (from === to) return [to];
  // Counterclockwise: decrement position, wrap with + BOARD_SIZE
  let pos = ((from - 1) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
  while (pos !== to) {
    path.push(pos);
    pos = ((pos - 1) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
  }
  path.push(to);
  return path;
}

function calculateRent(tile, owner) {
  const baseIndex = Math.min(tile.houses, 4);
  return tile.rent[baseIndex];
}

function calculateNetWorth(player) {
  let worth = player.money;
  player.properties.forEach(propId => {
    const tile = BOARD_CONFIG[propId];
    worth += tile.mortgaged ? 0 : (tile.price + tile.houses * 50);
  });
  return worth;
}

// Question bank
function getQuestionsForTier(tier) {
  if (tier === 'kindergarten') return kindergartenQuestions;
  if (tier === 'primary1_2') return primary1_2Questions;
  return primary3_4Questions;
}

const kindergartenQuestions = [
  { id: 'k1', question: '太阳是什么颜色？', options: ['红色', '蓝色', '绿色', '黑色'], correctIndex: 0, subject: 'general' },
  { id: 'k2', question: '1 + 1 等于多少？', options: ['1', '2', '3', '4'], correctIndex: 1, subject: 'math' },
  { id: 'k3', question: '哪个是圆的？', options: ['正方形', '三角形', '圆形', '长方形'], correctIndex: 2, subject: 'math' },
  { id: 'k4', question: '天空是什么颜色？', options: ['红色', '绿色', '蓝色', '黄色'], correctIndex: 2, subject: 'general' },
  { id: 'k5', question: '3 + 2 等于多少？', options: ['4', '5', '6', '3'], correctIndex: 1, subject: 'math' },
  { id: 'k6', question: '哪个动物会飞？', options: ['狗', '猫', '鸟', '鱼'], correctIndex: 2, subject: 'general' },
  { id: 'k7', question: '5 - 1 等于多少？', options: ['3', '4', '5', '6'], correctIndex: 1, subject: 'math' },
  { id: 'k8', question: '哪个是红色？', options: ['苹果', '香蕉', '叶子', '天空'], correctIndex: 0, subject: 'general' },
  { id: 'k9', question: '2 + 3 等于多少？', options: ['4', '5', '6', '7'], correctIndex: 1, subject: 'math' },
  { id: 'k10', question: '哪个是冷的？', options: ['太阳', '冰淇淋', '火', '烤箱'], correctIndex: 1, subject: 'general' },
  { id: 'k11', question: '哪个形状有3条边？', options: ['圆形', '正方形', '三角形', '长方形'], correctIndex: 2, subject: 'math' },
  { id: 'k12', question: '4 - 2 等于多少？', options: ['1', '2', '3', '4'], correctIndex: 1, subject: 'math' },
  { id: 'k13', question: '哪个是交通工具？', options: ['桌子', '汽车', '椅子', '床'], correctIndex: 1, subject: 'general' },
  { id: 'k14', question: '6 - 3 等于多少？', options: ['2', '3', '4', '5'], correctIndex: 1, subject: 'math' },
  { id: 'k15', question: '哪个动物在水中生活？', options: ['兔子', '鱼', '鸟', '猫'], correctIndex: 1, subject: 'general' },
  { id: 'k16', question: '7 + 1 等于多少？', options: ['7', '8', '9', '10'], correctIndex: 1, subject: 'math' },
  { id: 'k17', question: '哪个是黄色的水果？', options: ['苹果', '香蕉', '葡萄', '西瓜'], correctIndex: 1, subject: 'general' },
  { id: 'k18', question: '5 + 4 等于多少？', options: ['8', '9', '10', '11'], correctIndex: 1, subject: 'math' },
  { id: 'k19', question: '哪个季节很热？', options: ['春天', '夏天', '秋天', '冬天'], correctIndex: 1, subject: 'general' },
  { id: 'k20', question: '8 - 4 等于多少？', options: ['2', '3', '4', '5'], correctIndex: 2, subject: 'math' },
];

const primary1_2Questions = [
  { id: 'p12_1', question: '12 + 8 等于多少？', options: ['18', '19', '20', '21'], correctIndex: 2, subject: 'math' },
  { id: 'p12_2', question: '25 - 7 等于多少？', options: ['16', '17', '18', '19'], correctIndex: 2, subject: 'math' },
  { id: 'p12_3', question: '一年有多少个月？', options: ['10', '11', '12', '13'], correctIndex: 2, subject: 'general' },
  { id: 'p12_4', question: '3 × 4 等于多少？', options: ['10', '11', '12', '13'], correctIndex: 2, subject: 'math' },
  { id: 'p12_5', question: '中国首都是哪里？', options: ['上海', '北京', '广州', '深圳'], correctIndex: 1, subject: 'general' },
  { id: 'p12_6', question: '20 ÷ 4 等于多少？', options: ['4', '5', '6', '7'], correctIndex: 1, subject: 'math' },
  { id: 'p12_7', question: '一个星期有多少天？', options: ['5', '6', '7', '8'], correctIndex: 2, subject: 'general' },
  { id: 'p12_8', question: '45 + 55 等于多少？', options: ['99', '100', '101', '98'], correctIndex: 1, subject: 'math' },
  { id: 'p12_9', question: '5 × 6 等于多少？', options: ['28', '29', '30', '31'], correctIndex: 2, subject: 'math' },
  { id: 'p12_10', question: '一年有几个季节？', options: ['2', '3', '4', '5'], correctIndex: 2, subject: 'general' },
  { id: 'p12_11', question: '99 - 33 等于多少？', options: ['64', '65', '66', '67'], correctIndex: 2, subject: 'math' },
  { id: 'p12_12', question: '2 × 9 等于多少？', options: ['16', '17', '18', '19'], correctIndex: 2, subject: 'math' },
  { id: 'p12_13', question: '今天是星期几？相关常识', options: ['星期一', '星期二', '星期三', '星期四'], correctIndex: 0, subject: 'general' },
  { id: 'p12_14', question: '15 + 27 等于多少？', options: ['40', '41', '42', '43'], correctIndex: 2, subject: 'math' },
  { id: 'p12_15', question: '6 × 7 等于多少？', options: ['40', '41', '42', '43'], correctIndex: 2, subject: 'math' },
  { id: 'p12_16', question: '哪个是哺乳动物？', options: ['鱼', '鸟', '狗', '蛇'], correctIndex: 2, subject: 'science' },
  { id: 'p12_17', question: '100 - 45 等于多少？', options: ['53', '54', '55', '56'], correctIndex: 2, subject: 'math' },
  { id: 'p12_18', question: '72 ÷ 8 等于多少？', options: ['7', '8', '9', '10'], correctIndex: 2, subject: 'math' },
  { id: 'p12_19', question: '水的化学式是什么？', options: ['O2', 'CO2', 'H2O', 'NaCl'], correctIndex: 2, subject: 'science' },
  { id: 'p12_20', question: '8 × 8 等于多少？', options: ['62', '63', '64', '65'], correctIndex: 2, subject: 'math' },
];

const primary3_4Questions = [
  { id: 'p34_1', question: '125 × 8 等于多少？', options: ['1000', '1001', '999', '1002'], correctIndex: 0, subject: 'math' },
  { id: 'p34_2', question: '1/2 + 1/4 等于多少？', options: ['2/6', '3/4', '1/2', '1/4'], correctIndex: 1, subject: 'math' },
  { id: 'p34_3', question: '地球到太阳的距离大约是多少？', options: ['1500公里', '15000公里', '150万公里', '1.5亿公里'], correctIndex: 3, subject: 'science' },
  { id: 'p34_4', question: '360 ÷ 12 等于多少？', options: ['28', '29', '30', '31'], correctIndex: 2, subject: 'math' },
  { id: 'p34_5', question: '中国有多少个省份？', options: ['22', '23', '24', '25'], correctIndex: 1, subject: 'general' },
  { id: 'p34_6', question: '3/5 - 1/5 等于多少？', options: ['1/5', '2/5', '3/5', '4/5'], correctIndex: 1, subject: 'math' },
  { id: 'p34_7', question: '光每秒传播约多少公里？', options: ['3万', '30万', '300万', '3000万'], correctIndex: 1, subject: 'science' },
  { id: 'p34_8', question: '999 × 7 等于多少？', options: ['6993', '6994', '6992', '6995'], correctIndex: 0, subject: 'math' },
  { id: 'p34_9', question: '植物进行光合作用需要什么？', options: ['氧气', '二氧化碳', '氮气', '氦气'], correctIndex: 1, subject: 'science' },
  { id: 'p34_10', question: '0.25 + 0.75 等于多少？', options: ['0.99', '1.0', '1.1', '1.01'], correctIndex: 1, subject: 'math' },
  { id: 'p34_11', question: '人体最大的器官是什么？', options: ['心脏', '肝脏', '皮肤', '大脑'], correctIndex: 2, subject: 'science' },
  { id: 'p34_12', question: '72 × 15 等于多少？', options: ['1060', '1070', '1080', '1090'], correctIndex: 2, subject: 'math' },
  { id: 'p34_13', question: '世界上最高的山是什么？', options: ['乔戈里峰', '珠穆朗玛峰', '干城章嘉峰', '洛子峰'], correctIndex: 1, subject: 'general' },
  { id: 'p34_14', question: '2/3 × 6 等于多少？', options: ['3', '4', '5', '6'], correctIndex: 1, subject: 'math' },
  { id: 'p34_15', question: '水的沸点是多少摄氏度？', options: ['90', '100', '110', '120'], correctIndex: 1, subject: 'science' },
  { id: 'p34_16', question: '9999 ÷ 9 等于多少？', options: ['1110', '1111', '1112', '1109'], correctIndex: 1, subject: 'math' },
  { id: 'p34_17', question: '太阳系有几颗行星？', options: ['7', '8', '9', '10'], correctIndex: 1, subject: 'science' },
  { id: 'p34_18', question: '7/8 - 3/8 等于多少？', options: ['3/8', '4/8', '5/8', '6/8'], correctIndex: 1, subject: 'math' },
  { id: 'p34_19', question: '世界上最长的河是什么？', options: ['亚马逊河', '尼罗河', '长江', '密西西比河'], correctIndex: 1, subject: 'general' },
  { id: 'p34_20', question: '0.5 × 0.4 等于多少？', options: ['0.2', '0.02', '2.0', '0.1'], correctIndex: 0, subject: 'math' },
];
