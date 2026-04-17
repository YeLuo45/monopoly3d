// Dice utilities
export function rollDice() {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

export function getDiceResult(dice) {
  return dice[0] + dice[1];
}

export function isDoubles(dice) {
  return dice[0] === dice[1];
}
