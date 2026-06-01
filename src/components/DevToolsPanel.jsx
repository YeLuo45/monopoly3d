import { useEffect, useState, useRef } from 'react';
import { eventBus } from '../game/eventBus';
import { hookRegistry } from '../game/hooks/hookRegistry';
import { hookDebugger } from '../game/hooks/hookDebugger';

const DEV_TOOLS_KEY = 'devtools-open';

export default function DevToolsPanel() {
  const [isOpen, setIsOpen] = useState(() => {
    try { return localStorage.getItem(DEV_TOOLS_KEY) === 'true'; } catch { return false; }
  });
  const [activeTab, setActiveTab] = useState('events');
  const [eventLog, setEventLog] = useState([]);
  const [hookLog, setHookLog] = useState([]);
  const [breakpoints, setBreakpoints] = useState([]);
  const [eventHistory, setEventHistory] = useState([]);
  const logRef = useRef(null);

  // Toggle via keyboard shortcut Ctrl+Shift+D
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const next = !isOpen;
        setIsOpen(next);
        try { localStorage.setItem(DEV_TOOLS_KEY, next); } catch {}
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Enable debugger and subscribe to logs
  useEffect(() => {
    if (!isOpen) return;
    hookDebugger.enable();

    const unsubEvent = eventBus.subscribe('*', (e) => {
      setEventLog(prev => {
        const next = [{ t: Date.now(), ev: e.type, d: e.detail }, ...prev].slice(0, 200);
        return next;
      });
    });

    const hookInterval = setInterval(() => {
      const elog = hookDebugger.getLog();
      const hlog = hookDebugger.getHookLog();
      const bps = hookDebugger.getBreakpoints();
      setEventLog(elog.length ? elog : eventLog);
      setHookLog(hlog);
      setBreakpoints(bps);
      try {
        setEventHistory(eventBus.getEventHistory() || []);
      } catch {}
    }, 500);

    return () => {
      hookDebugger.disable();
      unsubEvent();
      clearInterval(hookInterval);
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          try { localStorage.setItem(DEV_TOOLS_KEY, 'true'); } catch {}
        }}
        className="fixed bottom-4 right-4 z-[9999] px-3 py-2 bg-gray-900/90 hover:bg-gray-800 text-white text-xs rounded-lg border border-gray-600 shadow-lg"
        title="打开调试面板 (Ctrl+Shift+D)"
      >
        🛠️ DevTools
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9998] bg-black/60 flex items-start justify-end" onClick={(e) => { if (e.target === e.currentTarget) { setIsOpen(false); try { localStorage.setItem(DEV_TOOLS_KEY, 'false'); } catch {} } }}>
      <div className="w-[480px] h-full bg-gray-900 text-white text-xs flex flex-col shadow-2xl border-l border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
          <span className="font-bold text-sm">🛠️ 游戏调试面板</span>
          <div className="flex gap-2">
            <button onClick={() => hookDebugger.clearLog()} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px]">清空</button>
            <button
              onClick={() => {
                setIsOpen(false);
                try { localStorage.setItem(DEV_TOOLS_KEY, 'false'); } catch {}
              }}
              className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-[10px]"
            >关闭</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {['events', 'hooks', 'history', 'replay'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${activeTab === tab ? 'bg-gray-700 text-white border-b-2 border-blue-400' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {tab === 'events' ? '事件' : tab === 'hooks' ? '钩子' : tab === 'history' ? '历史' : '回放'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2" ref={logRef}>
          {activeTab === 'events' && (
            <div>
              <div className="text-gray-400 mb-1">事件日志 (最新200条)</div>
              {eventLog.slice(0, 50).map((item, i) => (
                <div key={i} className="flex gap-2 py-0.5 border-b border-gray-800 text-[10px]">
                  <span className="text-gray-500 shrink-0">{(item.t ? new Date(item.t).toISOString().substr(11, 12) : '---')}</span>
                  <span className="text-blue-400 shrink-0 font-mono">{item.ev || item.event || '?'}</span>
                  <span className="text-gray-300 truncate">{JSON.stringify(item.d || item.data || {}).substr(0, 60)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hooks' && (
            <div>
              <div className="text-gray-400 mb-1">钩子日志</div>
              {hookLog.length === 0 && <div className="text-gray-600 py-2">无钩子活动记录</div>}
              {hookLog.slice(0, 50).map((item, i) => (
                <div key={i} className="flex gap-2 py-0.5 border-b border-gray-800 text-[10px]">
                  <span className="text-purple-400 shrink-0">{item.type || item.hookType || '?'}</span>
                  <span className="text-yellow-400 shrink-0 font-mono">{item.event || '?'}</span>
                  <span className="text-gray-300 truncate">{JSON.stringify(item.data || {}).substr(0, 60)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="text-gray-400 mb-1">EventBus 历史</div>
              {eventHistory.length === 0 && <div className="text-gray-600 py-2">无事件历史</div>}
              {eventHistory.slice(0, 50).map((item, i) => (
                <div key={i} className="flex gap-2 py-0.5 border-b border-gray-800 text-[10px]">
                  <span className="text-green-400 shrink-0 font-mono">{item.event || '?'}</span>
                  <span className="text-gray-300 truncate">{JSON.stringify(item.data || {}).substr(0, 60)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'replay' && (
            <div>
              <div className="text-gray-400 mb-1">回放控制</div>
              <div className="text-gray-500 text-[10px] mt-2">
                <p>使用 Ctrl+Shift+D 关闭调试面板后</p>
                <p>可通过游戏内回放控制使用 GameReplay</p>
                <p className="mt-1 text-yellow-600">注意: 回放功能需在游戏结束后访问</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 bg-gray-800 border-t border-gray-700 text-gray-500 text-[9px] flex justify-between">
          <span>Ctrl+Shift+D 切换</span>
          <span>DevTools v1.0</span>
        </div>
      </div>
    </div>
  );
}