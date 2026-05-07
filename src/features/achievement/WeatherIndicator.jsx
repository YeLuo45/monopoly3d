import { useState, useEffect } from 'react';
import { useAchievementStore } from './achievementStore';
import { WEATHER_TYPES } from './achievementTypes';

const WEATHER_INFO = {
  [WEATHER_TYPES.SUNNY]: {
    icon: '☀️',
    name: '晴天',
    description: '晴空万里，学习效率最佳！',
    color: 'from-yellow-400 to-orange-400',
    bgColor: 'bg-yellow-500/20',
  },
  [WEATHER_TYPES.CLOUDY]: {
    icon: '☁️',
    name: '多云',
    description: '云淡风轻，保持好心情！',
    color: 'from-gray-400 to-gray-500',
    bgColor: 'bg-gray-500/20',
  },
  [WEATHER_TYPES.RAINY]: {
    icon: '🌧️',
    name: '雨天',
    description: '雨天答题，1.5倍积分！',
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-500/20',
  },
  [WEATHER_TYPES.STORMY]: {
    icon: '⛈️',
    name: '暴风雨',
    description: '风暴来袭，2倍积分挑战！',
    color: 'from-purple-500 to-gray-600',
    bgColor: 'bg-purple-500/20',
  },
  [WEATHER_TYPES.SNOWY]: {
    icon: '❄️',
    name: '雪天',
    description: '银装素裹，1.5倍积分！',
    color: 'from-cyan-300 to-blue-300',
    bgColor: 'bg-cyan-500/20',
  },
  [WEATHER_TYPES.SPECIAL]: {
    icon: '🌈',
    name: '彩虹',
    description: '幸运彩虹，3倍积分！',
    color: 'from-pink-400 via-purple-400 to-cyan-400',
    bgColor: 'bg-gradient-to-r bg-pink-500/20',
  },
};

export default function WeatherIndicator() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [animate, setAnimate] = useState(false);
  const currentWeather = useAchievementStore(s => s.currentWeather);
  const weatherMultiplier = useAchievementStore(s => s.getWeatherMultiplier());
  const updateWeather = useAchievementStore(s => s.updateWeather);
  const weatherChangedAt = useAchievementStore(s => s.weatherChangedAt);
  const weatherDuration = useAchievementStore(s => s.weatherDuration);

  const weatherInfo = WEATHER_INFO[currentWeather] || WEATHER_INFO[WEATHER_TYPES.SUNNY];

  // Check weather change periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateWeather();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [updateWeather]);

  // Animate on weather change
  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 1000);
    return () => clearTimeout(timer);
  }, [currentWeather]);

  // Calculate remaining time
  const elapsed = Date.now() - weatherChangedAt;
  const remaining = Math.max(0, Math.ceil((weatherDuration - elapsed) / 60000));

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl ${weatherInfo.bgColor} border border-white/20 hover:scale-105 transition-all ${animate ? 'animate-bounce' : ''}`}
      >
        <span className="text-2xl">{weatherInfo.icon}</span>
        <div className="text-left">
          <div className="text-xs text-white/70">{weatherInfo.name}</div>
          {weatherMultiplier > 1 && (
            <div className="text-xs font-bold text-yellow-300">
              {weatherMultiplier}x 积分
            </div>
          )}
        </div>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className={`bg-gradient-to-r ${weatherInfo.color} p-1 rounded-xl shadow-xl`}>
            <div className="bg-gray-900 rounded-lg px-4 py-3 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{weatherInfo.icon}</span>
                <div>
                  <div className="font-bold text-white">{weatherInfo.name}</div>
                  <div className="text-xs text-white/70">
                    剩余 {remaining} 分钟
                  </div>
                </div>
              </div>
              <p className="text-sm text-white/90 mb-2">{weatherInfo.description}</p>
              {weatherMultiplier > 1 && (
                <div className="bg-yellow-500/30 rounded-lg p-2 text-center">
                  <span className="text-yellow-300 font-bold">
                    当前积分 ×{weatherMultiplier}
                  </span>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2 text-center">
                天气将随机变化
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
