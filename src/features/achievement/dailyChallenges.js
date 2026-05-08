// Daily Challenge Types
export const CHALLENGE_TYPES = {
  WIN_GAME: 'win_game',
  ANSWER_CORRECT: 'answer_correct',
  PROPERTY_BUY: 'property_buy',
  RENT_COLLECT: 'rent_collect',
  CORRECT_STREAK: 'correct_streak',
  AVOID_BANKRUPTCY: 'avoid_bankruptcy',
  PASS_GO: 'pass_go',
  ESCAPE_JAIL: 'escape_jail',
};

export const CHALLENGE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

// Daily challenge templates
export const DAILY_CHALLENGE_TEMPLATES = [
  // Easy challenges
  {
    id: 'dc_easy_1',
    type: CHALLENGE_TYPES.ANSWER_CORRECT,
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    title: '答题小能手',
    description: '答对3道题目',
    target: 3,
    reward: 50,
    category: 'math',
  },
  {
    id: 'dc_easy_2',
    type: CHALLENGE_TYPES.PROPERTY_BUY,
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    title: '小小地产商',
    description: '购买1处房产',
    target: 1,
    reward: 30,
  },
  {
    id: 'dc_easy_3',
    type: CHALLENGE_TYPES.PASS_GO,
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    title: '路过就是赚到',
    description: '经过起点2次',
    target: 2,
    reward: 40,
  },
  // Medium challenges
  {
    id: 'dc_medium_1',
    type: CHALLENGE_TYPES.CORRECT_STREAK,
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    title: '连胜达人',
    description: '连续答对5道题',
    target: 5,
    reward: 100,
  },
  {
    id: 'dc_medium_2',
    type: CHALLENGE_TYPES.RENT_COLLECT,
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    title: '收租小富婆',
    description: '收取租金共计500元',
    target: 500,
    reward: 80,
  },
  {
    id: 'dc_medium_3',
    type: CHALLENGE_TYPES.WIN_GAME,
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    title: '胜利在望',
    description: '赢得一局游戏',
    target: 1,
    reward: 150,
  },
  {
    id: 'dc_medium_4',
    type: CHALLENGE_TYPES.ANSWER_CORRECT,
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    title: '知识就是力量',
    description: '答对10道题目',
    target: 10,
    reward: 120,
  },
  // Hard challenges
  {
    id: 'dc_hard_1',
    type: CHALLENGE_TYPES.WIN_GAME,
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    title: '常胜将军',
    description: '赢得3局游戏',
    target: 3,
    reward: 300,
  },
  {
    id: 'dc_hard_2',
    type: CHALLENGE_TYPES.CORRECT_STREAK,
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    title: '学霸之路',
    description: '连续答对15道题',
    target: 15,
    reward: 250,
  },
  {
    id: 'dc_hard_3',
    type: CHALLENGE_TYPES.PROPERTY_BUY,
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    title: '房产大亨',
    description: '购买5处房产',
    target: 5,
    reward: 200,
  },
  {
    id: 'dc_hard_4',
    type: CHALLENGE_TYPES.ANSWER_CORRECT,
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    title: '全能选手',
    description: '答对20道题目',
    target: 20,
    reward: 280,
  },
];

// Get challenge template by ID
export function getChallengeTemplate(id) {
  return DAILY_CHALLENGE_TEMPLATES.find(c => c.id === id);
}

// Generate a seed from date for consistent daily challenges
function dateToSeed(date) {
  const d = new Date(date);
  const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Seeded random number generator
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Get daily challenges for a specific date
export function getDailyChallenges(date = new Date()) {
  const seed = dateToSeed(date);
  const challenges = [];
  
  // Select 3 challenges: 1 easy, 1 medium, 1 hard
  const easyChallenges = DAILY_CHALLENGE_TEMPLATES.filter(c => c.difficulty === CHALLENGE_DIFFICULTY.EASY);
  const mediumChallenges = DAILY_CHALLENGE_TEMPLATES.filter(c => c.difficulty === CHALLENGE_DIFFICULTY.MEDIUM);
  const hardChallenges = DAILY_CHALLENGE_TEMPLATES.filter(c => c.difficulty === CHALLENGE_DIFFICULTY.HARD);
  
  // Use seeded random to pick challenges
  let currentSeed = seed;
  
  // Pick easy challenge
  const easyIndex = Math.floor(seededRandom(currentSeed++) * easyChallenges.length);
  challenges.push({ ...easyChallenges[easyIndex], date: date.toISOString().split('T')[0] });
  
  // Pick medium challenge
  const mediumIndex = Math.floor(seededRandom(currentSeed++) * mediumChallenges.length);
  challenges.push({ ...mediumChallenges[mediumIndex], date: date.toISOString().split('T')[0] });
  
  // Pick hard challenge
  const hardIndex = Math.floor(seededRandom(currentSeed++) * hardChallenges.length);
  challenges.push({ ...hardChallenges[hardIndex], date: date.toISOString().split('T')[0] });
  
  return challenges;
}

// Get today's date string
export function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Calculate time until midnight
export function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}