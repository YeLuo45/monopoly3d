/**
 * ParentDashboard - Comprehensive monitoring and control panel for parents
 * 
 * Features:
 * - Real-time child activity monitoring
 * - Time spent tracking with daily/weekly reports
 * - Category performance breakdown
 * - Alert configuration for suspicious activity
 * - Data export (CSV/JSON)
 * - Session management (time limits, bedtime)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getStudentCommunicator, StudentStatus } from '../../communication/broadcastChannel';
import { t } from '../../i18n';

// Time format helper
const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// Generate random avatar for students
const AVATARS = ['🧒', '👦', '👧', '🧒🏻', '🧒🏼', '🧒🏽', '🧒🏾', '🧒🏿'];

function getAvatar(studentId) {
  const idx = (studentId || '0').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length;
  return AVATARS[idx];
}

export default function ParentDashboard({ studentId, onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | time | performance | settings
  const [activityLog, setActivityLog] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    totalTime: 0,
    todayTime: 0,
    gamesPlayed: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
  });
  const [dailyStats, setDailyStats] = useState([]);
  const [categoryPerformance, setCategoryPerformance] = useState({});
  const [timeLimit, setTimeLimit] = useState(60); // minutes
  const [bedtime, setBedtime] = useState('21:00');
  const [alerts, setAlerts] = useState({
    lowAccuracy: true,
    longSession: true,
    unusualPattern: false,
  });
  const [notifications, setNotifications] = useState([]);

  const communicator = useMemo(() => getStudentCommunicator(), []);

  // Load saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('parent_dashboard_data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setSessionStats(data.sessionStats || sessionStats);
        setDailyStats(data.dailyStats || []);
        setCategoryPerformance(data.categoryPerformance || {});
        setTimeLimit(data.timeLimit || 60);
        setBedtime(data.bedtime || '21:00');
        setAlerts(data.alerts || alerts);
      } catch (e) {
        console.error('Failed to load parent dashboard data:', e);
      }
    }

    // Load activity log
    const log = localStorage.getItem('parent_activity_log');
    if (log) {
      try {
        setActivityLog(JSON.parse(log));
      } catch (e) {
        console.error('Failed to load activity log:', e);
      }
    }
  }, []);

  // Listen for student updates
  useEffect(() => {
    if (!communicator) return;

    // Listen for status updates
    const handleStatusUpdate = (data) => {
      addNotification(`${getAvatar(data.studentId)} 学生 ${data.studentId} ${data.status === StudentStatus.ONLINE ? '上线了' : '下线了'}`);
      logActivity('status', data);
    };

    // Listen for session stats updates
    const handleSessionUpdate = (stats) => {
      setSessionStats(prev => {
        const updated = { ...prev, ...stats };
        saveDashboardData();
        return updated;
      });
      logActivity('session', stats);
    };

    // Listen for accuracy alerts
    const handleAccuracyAlert = (data) => {
      if (data.accuracy < 0.6) {
        addNotification(`⚠️ 准确率预警: ${Math.round(data.accuracy * 100)}%`, 'warning');
      }
    };

    // Listen for time alerts
    const handleTimeAlert = (data) => {
      if (data.minutes > timeLimit) {
        addNotification(`⏰ 学习时间已超过 ${timeLimit} 分钟`, 'warning');
      }
    };

    // Listen for question answers
    const handleQuestionAnswer = (data) => {
      setSessionStats(prev => {
        const updated = {
          ...prev,
          questionsAnswered: prev.questionsAnswered + 1,
          correctAnswers: prev.correctAnswers + (data.correct ? 1 : 0),
        };
        saveDashboardData();
        return updated;
      });

      // Update category performance
      if (data.category) {
        setCategoryPerformance(prev => {
          const cat = prev[data.category] || { correct: 0, total: 0 };
          const updated = {
            ...prev,
            [data.category]: {
              correct: cat.correct + (data.correct ? 1 : 0),
              total: cat.total + 1,
            },
          };
          saveDashboardData();
          return updated;
        });
      }
    };

    if (communicator.onStatusUpdate) communicator.onStatusUpdate(handleStatusUpdate);
    if (communicator.onSessionUpdate) communicator.onSessionUpdate(handleSessionUpdate);
    if (communicator.onAccuracyAlert) communicator.onAccuracyAlert(handleAccuracyAlert);
    if (communicator.onTimeAlert) communicator.onTimeAlert(handleTimeAlert);
    if (communicator.onQuestionAnswer) communicator.onQuestionAnswer(handleQuestionAnswer);

    return () => {
      if (communicator.onStatusUpdate) communicator.onStatusUpdate(null);
      if (communicator.onSessionUpdate) communicator.onSessionUpdate(null);
      if (communicator.onAccuracyAlert) communicator.onAccuracyAlert(null);
      if (communicator.onTimeAlert) communicator.onTimeAlert(null);
      if (communicator.onQuestionAnswer) communicator.onQuestionAnswer(null);
    };
  }, [communicator, timeLimit]);

  // Update daily stats periodically
  useEffect(() => {
    const today = new Date().toDateString();
    const todayStat = dailyStats.find(s => new Date(s.date).toDateString() === today);
    if (todayStat) {
      todayStat.totalTime = sessionStats.todayTime;
      todayStat.gamesPlayed = sessionStats.gamesPlayed;
    } else {
      setDailyStats(prev => [
        ...prev.slice(-6), // Keep last 7 days
        {
          date: new Date(),
          totalTime: sessionStats.todayTime,
          gamesPlayed: sessionStats.gamesPlayed,
        },
      ]);
    }
  }, [sessionStats.todayTime]);

  const addNotification = (message, type = 'info') => {
    const notif = { id: Date.now(), message, type, time: new Date().toLocaleTimeString() };
    setNotifications(prev => [notif, ...prev.slice(0, 9)]);
  };

  const logActivity = (type, data) => {
    const entry = { id: Date.now(), type, data, time: new Date().toISOString() };
    setActivityLog(prev => {
      const updated = [entry, ...prev.slice(0, 99)];
      localStorage.setItem('parent_activity_log', JSON.stringify(updated));
      return updated;
    });
  };

  const saveDashboardData = () => {
    const data = {
      sessionStats,
      dailyStats,
      categoryPerformance,
      timeLimit,
      bedtime,
      alerts,
    };
    localStorage.setItem('parent_dashboard_data', JSON.stringify(data));
  };

  const handleSaveSettings = () => {
    saveDashboardData();
    addNotification('设置已保存', 'success');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Category', 'Correct', 'Total', 'Accuracy'];
    const rows = [];
    Object.entries(categoryPerformance).forEach(([cat, data]) => {
      rows.push([
        new Date().toLocaleDateString(),
        cat,
        data.correct,
        data.total,
        data.total > 0 ? `${Math.round((data.correct / data.total) * 100)}%` : 'N/A',
      ]);
    });

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadFile(csv, 'student_performance.csv', 'text/csv');
  };

  const handleExportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      sessionStats,
      categoryPerformance,
      dailyStats,
    };
    downloadFile(JSON.stringify(data, null, 2), 'student_report.json', 'application/json');
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const accuracy = sessionStats.questionsAnswered > 0
    ? Math.round((sessionStats.correctAnswers / sessionStats.questionsAnswered) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="text-2xl mb-2">👨‍👩‍👧</div>
          <h2 className="text-lg font-bold text-white">{t('parent_dashboard') || '家长控制台'}</h2>
          <p className="text-xs text-gray-400 mt-1">
            {t('monitoring_student') || '监控学生'} {studentId || 'Unknown'}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'overview', icon: '📊', label: t('overview') || '概览' },
            { id: 'time', icon: '⏱️', label: t('time_tracking') || '时间追踪' },
            { id: 'performance', icon: '📈', label: t('performance') || '学习表现' },
            { id: 'settings', icon: '⚙️', label: t('settings') || '设置' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Close button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 transition-colors"
          >
            ✕ {t('close') || '关闭'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-4 space-y-2">
            {notifications.slice(0, 3).map(notif => (
              <div
                key={notif.id}
                className={`px-4 py-3 rounded-xl flex items-center justify-between ${
                  notif.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                  notif.type === 'success' ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}
              >
                <span>{notif.message}</span>
                <span className="text-xs opacity-70">{notif.time}</span>
              </div>
            ))}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{t('overview') || '概览'}</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-2xl p-6">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="text-2xl font-bold text-white">
                  {formatDuration(sessionStats.totalTime)}
                </div>
                <div className="text-gray-400 text-sm">{t('total_time') || '总学习时长'}</div>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6">
                <div className="text-3xl mb-2">🎮</div>
                <div className="text-2xl font-bold text-white">{sessionStats.gamesPlayed}</div>
                <div className="text-gray-400 text-sm">{t('games_played') || '游戏局数'}</div>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-2xl font-bold text-white">{sessionStats.questionsAnswered}</div>
                <div className="text-gray-400 text-sm">{t('questions_answered') || '答题数'}</div>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-2xl font-bold text-white">{accuracy}%</div>
                <div className="text-gray-400 text-sm">{t('accuracy') || '正确率'}</div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('recent_activity') || '最近活动'}</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activityLog.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">{t('no_activity') || '暂无活动'}</p>
                ) : (
                  activityLog.slice(0, 10).map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{new Date(entry.time).toLocaleTimeString()}</span>
                      <span className="text-gray-300 capitalize">{entry.type}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Time Tracking Tab */}
        {activeTab === 'time' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{t('time_tracking') || '时间追踪'}</h2>

            {/* Today's Stats */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('today') || '今日'}</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-white">
                    {formatDuration(sessionStats.todayTime)}
                  </div>
                  <div className="text-gray-400">{t('time_spent_today') || '今日学习时间'}</div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${sessionStats.todayTime > timeLimit * 60 ? 'text-red-400' : 'text-green-400'}`}>
                    {Math.round(sessionStats.todayTime / 60)}/{timeLimit} min
                  </div>
                  <div className="text-gray-400">{t('of_limit') || '限制时长'}</div>
                </div>
              </div>
            </div>

            {/* Weekly Chart */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('weekly_progress') || '本周进度'}</h3>
              <div className="flex items-end gap-2 h-40">
                {dailyStats.length === 0 ? (
                  <p className="text-gray-500 text-center w-full py-8">{t('no_data') || '暂无数据'}</p>
                ) : (
                  dailyStats.map((day, idx) => {
                    const maxTime = Math.max(...dailyStats.map(d => d.totalTime), 1);
                    const height = Math.max((day.totalTime / maxTime) * 100, 5);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-purple-500 rounded-t-lg transition-all"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-gray-500">
                          {new Date(day.date).toLocaleDateString().slice(5)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{t('performance') || '学习表现'}</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-white text-sm transition-colors"
                >
                  📥 CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm transition-colors"
                >
                  📥 JSON
                </button>
              </div>
            </div>

            {/* Category Performance */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('category_performance') || '分类表现'}</h3>
              {Object.keys(categoryPerformance).length === 0 ? (
                <p className="text-gray-500 text-center py-4">{t('no_data') || '暂无数据'}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categoryPerformance).map(([cat, data]) => {
                    const catAccuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                    return (
                      <div key={cat} className="flex items-center gap-4">
                        <div className="w-24 text-gray-300 capitalize">{cat}</div>
                        <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${catAccuracy >= 80 ? 'bg-green-500' : catAccuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${catAccuracy}%` }}
                          />
                        </div>
                        <div className="w-16 text-right">
                          <span className={`font-bold ${catAccuracy >= 80 ? 'text-green-400' : catAccuracy >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {catAccuracy}%
                          </span>
                        </div>
                        <div className="w-20 text-right text-gray-500 text-sm">
                          {data.correct}/{data.total}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{t('settings') || '设置'}</h2>

            {/* Time Limits */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('time_limits') || '时间限制'}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">{t('daily_time_limit') || '每日时限'} (分钟)</label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="15"
                    max="240"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">{t('bedtime') || '就寝时间'}</label>
                  <input
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Alert Settings */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('alert_settings') || '提醒设置'}</h3>

              <div className="space-y-3">
                {[
                  { key: 'lowAccuracy', label: t('alert_low_accuracy') || '低正确率提醒' },
                  { key: 'longSession', label: t('alert_long_session') || '超时长提醒' },
                  { key: 'unusualPattern', label: t('alert_unusual') || '异常模式提醒' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alerts[item.key]}
                      onChange={(e) => setAlerts(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-gray-300">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSettings}
              className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold transition-colors"
            >
              💾 {t('save_settings') || '保存设置'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}