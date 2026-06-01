/**
 * CoachPanel - React component for AI Coach UI
 * 
 * Provides in-game coaching with:
 * - Real-time coaching advice panel
 * - Toggle visibility button (coach icon)
 * - Lesson progress display
 * - Opponent analysis summary
 * - Performance metrics
 * 
 * Part of Direction B v9: Full AI Coach Integration
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Factory function to create CoachPanel with injected FullAICoach
export function createAICoachPanel(fullCoach) {
  if (!fullCoach) {
    console.warn('CoachPanel: No FullAICoach provided');
  }

  /**
   * CoachPanel Component
   */
  const CoachPanel = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [advice, setAdvice] = useState(null);
    const [opponentAnalysis, setOpponentAnalysis] = useState(null);
    const [lessonProgress, setLessonProgress] = useState({});
    const [metrics, setMetrics] = useState({});
    const [fadeIn, setFadeIn] = useState(false);
    
    const refreshIntervalRef = useRef(null);

    // Refresh coaching advice periodically
    const refreshAdvice = useCallback(() => {
      if (!fullCoach?.isReady()) return;
      
      try {
        const currentAdvice = fullCoach.getCoachingAdvice();
        setAdvice(currentAdvice);
        
        if (currentAdvice.opponentAnalysis) {
          setOpponentAnalysis(currentAdvice.opponentAnalysis);
        }
        
        // Get lesson progress from coach
        const coach = fullCoach.getCoach();
        if (coach?.getLessonProgress) {
          setLessonProgress(coach.getLessonProgress(fullCoach.playerId) || {});
        }
        
        // Get metrics from dashboard
        const dashboard = fullCoach.getDashboard();
        if (dashboard?.getWinRate) {
          setMetrics({
            winRate: dashboard.getWinRate(fullCoach.playerId),
            avgPlacement: dashboard.getAveragePlacement(fullCoach.playerId),
            decisionAccuracy: dashboard.getDecisionAccuracy(fullCoach.playerId),
          });
        }
      } catch (e) {
        console.warn('CoachPanel refresh error:', e);
      }
    }, [fullCoach]);

    // Toggle panel visibility
    const toggleVisibility = useCallback(() => {
      setIsVisible(prev => !prev);
      setFadeIn(true);
      setTimeout(() => setFadeIn(false), 300);
    }, []);

    // Handle game state changes
    useEffect(() => {
      if (isVisible && fullCoach?.isReady()) {
        refreshAdvice();
        
        // Set up periodic refresh
        refreshIntervalRef.current = setInterval(refreshAdvice, 3000);
      }
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }, [isVisible, fullCoach, refreshAdvice]);

    // Listen for coach events
    useEffect(() => {
      if (!fullCoach?.eventBus) return;
      
      const unsubGameStart = fullCoach.eventBus.subscribe('game_start', () => {
        refreshAdvice();
      });
      
      const unsubGameEnd = fullCoach.eventBus.subscribe('game_end', () => {
        refreshAdvice();
      });
      
      const unsubTurnEnd = fullCoach.eventBus.subscribe('turn_end', () => {
        if (isVisible) refreshAdvice();
      });
      
      return () => {
        unsubGameStart();
        unsubGameEnd();
        unsubTurnEnd();
      };
    }, [fullCoach, isVisible, refreshAdvice]);

    // Render toggle button
    const renderToggleButton = () => (
      <button
        onClick={toggleVisibility}
        className="coach-toggle-btn"
        title={isVisible ? '隐藏教练' : '显示教练'}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: isVisible ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2d3748',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          transform: isVisible ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <span style={{ fontSize: '24px' }}>🎓</span>
      </button>
    );

    // Render advice panel content
    const renderAdviceContent = () => {
      if (!advice) {
        return (
          <div className="coach-empty">
            <p>等待教练数据...</p>
          </div>
        );
      }

      return (
        <div className="coach-content">
          {/* Primary Advice */}
          <div className="coach-section primary-advice">
            <h3 style={{ margin: '0 0 8px 0', color: '#667eea', fontSize: '14px' }}>
              💡 当前建议
            </h3>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#2d3748' }}>
              {advice.primaryAdvice}
            </p>
            {advice.confidence > 0 && (
              <div className="confidence-bar" style={{
                marginTop: '8px',
                height: '4px',
                background: '#e2e8f0',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${advice.confidence * 100}%`,
                  height: '100%',
                  background: advice.confidence > 0.7 ? '#48bb78' : advice.confidence > 0.4 ? '#ecc94b' : '#f56565',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            )}
          </div>

          {/* Reasoning */}
          {advice.reasoning && (
            <div className="coach-section reasoning">
              <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#718096' }}>
                推理
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#4a5568' }}>
                {advice.reasoning}
              </p>
            </div>
          )}

          {/* Phase Indicator */}
          {advice.phase && (
            <div className="coach-section phase-indicator">
              <span className="phase-badge" style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                background: advice.phase === 'early' ? '#ebf8ff' : advice.phase === 'mid' ? '#f0fff4' : '#fff5f5',
                color: advice.phase === 'early' ? '#2b6cb0' : advice.phase === 'mid' ? '#276749' : '#c53030',
              }}>
                {advice.phase === 'early' ? '🌱 早期' : advice.phase === 'mid' ? '⚡ 中期' : '🏁 后期'}
              </span>
            </div>
          )}

          {/* Related Lessons */}
          {advice.relatedLessons?.length > 0 && (
            <div className="coach-section lessons">
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#718096' }}>
                📚 相关课程
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {advice.relatedLessons.map((lessonId, idx) => (
                  <span key={idx} style={{
                    padding: '4px 8px',
                    background: '#edf2f7',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#4a5568',
                  }}>
                    {lessonId.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Opponent Analysis */}
          {opponentAnalysis && (
            <div className="coach-section opponent-analysis">
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#718096' }}>
                👥 对手分析
              </h4>
              {opponentAnalysis.exploitableOpponent ? (
                <div style={{
                  padding: '8px',
                  background: '#fff5f5',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#c53030',
                }}>
                  ⚠️ 可利用: {opponentAnalysis.exploitableOpponent.playerId}
                  <br />
                  <span style={{ fontSize: '11px' }}>弱点数: {opponentAnalysis.exploitableOpponent.exploitCount}</span>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '12px', color: '#718096' }}>
                  对手数: {opponentAnalysis.opponentCount || 0}
                </p>
              )}
            </div>
          )}

          {/* Quick Metrics */}
          {metrics && Object.keys(metrics).length > 0 && (
            <div className="coach-section quick-metrics">
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#718096' }}>
                📊 表现指标
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {metrics.winRate !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea' }}>
                      {Math.round(metrics.winRate * 100)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#718096' }}>胜率</div>
                  </div>
                )}
                {metrics.avgPlacement !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#48bb78' }}>
                      #{Math.round(metrics.avgPlacement)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#718096' }}>平均名次</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    };

    // Render main panel
    if (!isVisible) {
      return renderToggleButton();
    }

    return (
      <>
        {/* Toggle Button */}
        {renderToggleButton()}
        
        {/* Coach Panel */}
        <div
          className={`coach-panel ${fadeIn ? 'fade-in' : ''}`}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '320px',
            maxHeight: '450px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            animation: fadeIn ? 'fadeIn 0.3s ease' : 'none',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                🎓 AI 教练
              </h2>
              <button
                onClick={toggleVisibility}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>
            {fullCoach?.playerId && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                玩家: {fullCoach.playerId}
              </p>
            )}
          </div>

          {/* Content */}
          <div style={{
            padding: '12px',
            overflowY: 'auto',
            flex: 1,
          }}>
            {renderAdviceContent()}
          </div>

          {/* Footer */}
          <div style={{
            padding: '8px 16px',
            background: '#f7fafc',
            borderTop: '1px solid #e2e8f0',
            fontSize: '10px',
            color: '#718096',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>v9 Full AI Coach</span>
            {advice?.timestamp && (
              <span>更新: {new Date(advice.timestamp).toLocaleTimeString()}</span>
            )}
          </div>
        </div>

        {/* CSS Animation */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .coach-panel .coach-section {
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .coach-panel .coach-section:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }
          
          .coach-toggle-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
          }
        `}</style>
      </>
    );
  };

  return {
    component: CoachPanel,
    toggleButton: null, // Toggle is embedded in panel
    advicePanel: null,
  };
}

// Default CoachPanel component for direct import
export default function CoachPanel(props) {
  // Create a placeholder when no fullCoach is provided
  const { fullCoach: coach, ...rest } = props;
  
  if (!coach) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 16px',
        background: '#718096',
        color: 'white',
        borderRadius: '8px',
        fontSize: '12px',
      }}>
        🎓 AI教练未激活
      </div>
    );
  }
  
  const { component: CoachComponent } = createAICoachPanel(coach);
  return <CoachComponent {...rest} />;
}