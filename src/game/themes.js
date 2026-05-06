// Theme configuration for the Monopoly3D board
// Each theme defines colors for board, tiles, buildings, and background

export const THEMES = {
  CLASSIC: 'classic',
  MODERN: 'modern',
  FESTIVE: 'festive',
  SPACE: 'space',
};

export const BOARD_THEMES = {
  classic: {
    name: '🎲 经典',
    description: '木质棋盘风格',
    // Board colors
    boardColor: '#B45309',        // 木质棕色
    boardBorderColor: '#92400E',  // 深木色
    feltColor: '#16A34A',         // 绿色毛毡
    gridColor: '#4ADE80',          // 浅绿格子线
    // Tile colors
    tileBaseColor: '#FFFBEB',      // 米白色台面
    tileSideColor: '#B45309',      // 棕色边
    // Building colors
    buildingColors: ['#FF6B6B', '#FF8C00', '#FFD700', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316'],
    roofColors: ['#DC2626', '#B45309', '#D97706', '#15803D', '#1D4ED8', '#6D28D9', '#BE185D', '#C2410C'],
    // Special tiles
    goColor: '#22C55E',
    jailColor: '#F97316',
    freeParkingColor: '#3B82F6',
    goToJailColor: '#DC2626',
    chanceColor: '#F59E0B',
    questionColor: '#10B981',
    taxColor: '#EF4444',
    // Corner decoration
    cornerColors: ['#FF6B6B', '#F59E0B', '#3B82F6', '#10B981'],
    // Center
    centerColor: '#7C3AED',
    centerAccentColor: '#A78BFA',
    textColor: '#FEF08A',
    // Background gradient
    backgroundGradient: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    // Label style
    labelStyle: { textColor: '#0f172a', outlineColor: '#ffffff' },
    // Ambient/directional light for this theme
    ambientColor: '#fff8f0',
    ambientIntensity: 1.2,
    directionalColor: '#fff5e0',
    directionalIntensity: 1.8,
    fillLightColor: '#a0d8ef',
    fillLightIntensity: 0.6,
    warmFillColor: '#ffe4b5',
    warmFillIntensity: 0.4,
  },

  modern: {
    name: '✨ 现代',
    description: '浅色扁平化设计',
    // Board colors
    boardColor: '#E5E5E5',         // 浅灰色
    boardBorderColor: '#D4D4D4',    // 稍深灰
    feltColor: '#F8FAFC',          // 近白色
    gridColor: '#CBD5E1',           // 蓝灰色格子
    // Tile colors
    tileBaseColor: '#FFFFFF',       // 纯白台面
    tileSideColor: '#E5E5E5',       // 灰色边
    // Building colors
    buildingColors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
    roofColors: ['#1D4ED8', '#047857', '#B45309', '#B91C1C', '#6D28D9', '#BE185D', '#0891B2', '#4D7C0F'],
    // Special tiles
    goColor: '#22C55E',
    jailColor: '#F97316',
    freeParkingColor: '#3B82F6',
    goToJailColor: '#DC2626',
    chanceColor: '#F59E0B',
    questionColor: '#10B981',
    taxColor: '#EF4444',
    // Corner decoration
    cornerColors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    // Center
    centerColor: '#6366F1',
    centerAccentColor: '#A5B4FC',
    textColor: '#312E81',
    // Background gradient
    backgroundGradient: 'linear-gradient(135deg, #f5f5f5, #e0e0e0)',
    // Label style
    labelStyle: { textColor: '#1e293b', outlineColor: '#ffffff' },
    // Ambient/directional light for this theme
    ambientColor: '#ffffff',
    ambientIntensity: 1.4,
    directionalColor: '#ffffff',
    directionalIntensity: 1.5,
    fillLightColor: '#e0e7ff',
    fillLightIntensity: 0.5,
    warmFillColor: '#fef3c7',
    warmFillIntensity: 0.3,
  },

  festive: {
    name: '🎄 节日',
    description: '红绿配色节日主题',
    // Board colors
    boardColor: '#DC2626',         // 节日红
    boardBorderColor: '#991B1B',   // 深红
    feltColor: '#15803D',          // 圣诞绿
    gridColor: '#86EFAC',          // 浅绿格子
    // Tile colors
    tileBaseColor: '#FEF9C3',       // 淡黄台面
    tileSideColor: '#DC2626',       // 红色边
    // Building colors
    buildingColors: ['#FFD700', '#FF6B6B', '#22C55E', '#3B82F6', '#F97316', '#EC4899', '#A855F7', '#14B8A6'],
    roofColors: ['#CA8A04', '#B91C1C', '#15803D', '#1D4ED8', '#C2410C', '#BE185D', '#7C3AED', '#0D9488'],
    // Special tiles
    goColor: '#22C55E',
    jailColor: '#F97316',
    freeParkingColor: '#3B82F6',
    goToJailColor: '#DC2626',
    chanceColor: '#F59E0B',
    questionColor: '#10B981',
    taxColor: '#EF4444',
    // Corner decoration
    cornerColors: ['#FF6B6B', '#FFD700', '#3B82F6', '#22C55E'],
    // Center
    centerColor: '#B91C1C',
    centerAccentColor: '#FCA5A5',
    textColor: '#FEF08A',
    // Background gradient
    backgroundGradient: 'linear-gradient(135deg, #7f1d1d, #14532d)',
    // Label style
    labelStyle: { textColor: '#ffffff', outlineColor: '#78350F' },
    // Ambient/directional light for this theme
    ambientColor: '#fff8f0',
    ambientIntensity: 1.3,
    directionalColor: '#fff5e0',
    directionalIntensity: 1.6,
    fillLightColor: '#dcfce7',
    fillLightIntensity: 0.6,
    warmFillColor: '#fed7aa',
    warmFillIntensity: 0.4,
  },

  space: {
    name: '🚀 太空',
    description: '深蓝紫色星空主题',
    // Board colors
    boardColor: '#1E1B4B',         // 深紫蓝
    boardBorderColor: '#312E81',   // 靛蓝
    feltColor: '#1E3A5F',          // 深蓝毛毡
    gridColor: '#4F46E5',          // 紫罗兰格子
    // Tile colors
    tileBaseColor: '#E0E7FF',       // 浅紫蓝台面
    tileSideColor: '#312E81',       // 靛蓝边
    // Building colors
    buildingColors: ['#F472B6', '#A78BFA', '#38BDF8', '#4ADE80', '#FB923C', '#F87171', '#C084FC', '#22D3EE'],
    roofColors: ['#DB2777', '#7C3AED', '#0284C7', '#16A34A', '#EA580C', '#DC2626', '#9333EA', '#0891B2'],
    // Special tiles
    goColor: '#4ADE80',
    jailColor: '#F97316',
    freeParkingColor: '#38BDF8',
    goToJailColor: '#EF4444',
    chanceColor: '#FBBF24',
    questionColor: '#34D399',
    taxColor: '#F87171',
    // Corner decoration
    cornerColors: ['#F472B6', '#A78BFA', '#38BDF8', '#4ADE80'],
    // Center
    centerColor: '#4C1D95',
    centerAccentColor: '#C4B5FD',
    textColor: '#FEF08A',
    // Background gradient
    backgroundGradient: 'linear-gradient(135deg, #0f0f23, #1a1a3e)',
    // Label style
    labelStyle: { textColor: '#E0E7FF', outlineColor: '#000000' },
    // Ambient/directional light for this theme
    ambientColor: '#e0e7ff',
    ambientIntensity: 0.9,
    directionalColor: '#c7d2fe',
    directionalIntensity: 1.4,
    fillLightColor: '#7c3aed',
    fillLightIntensity: 0.4,
    warmFillColor: '#ddd6fe',
    warmFillIntensity: 0.3,
  },
};

export default BOARD_THEMES;
