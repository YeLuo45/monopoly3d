/**
 * AITeammatePanel - AI teammate interaction UI
 * 
 * Features:
 * - Recruit/dismiss teammates
 * - View teammate stats and loyalty
 * - Team strategy settings
 * - Trade proposal management
 * - Help offer management
 */

import { useState, useEffect } from 'react';
import { useAiTeammateStore, TEAM_ROLES, ROLE_LABELS, ROLE_ICONS, MAX_TEAMMATES } from './aiTeammateStore';
import { useGameStore } from '../../game/store';

export default function AITeammatePanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('team'); // team | proposals | strategy

  const teammates = useAiTeammateStore(s => s.teammates);
  const isSoloMode = useAiTeammateStore(s => s.isSoloMode);
  const teamStrategy = useAiTeammateStore(s => s.teamStrategy);
  const teamSummary = useAiTeammateStore(s => s.getTeamSummary());
  const pendingProposals = useAiTeammateStore(s => s.pendingProposals || []);
  const pendingHelpOffers = useAiTeammateStore(s => s.pendingHelpOffers || []);
  const recruitTeammate = useAiTeammateStore(s => s.recruitTeammate);
  const dismissTeammate = useAiTeammateStore(s => s.dismissTeammate);
  const enableSoloMode = useAiTeammateStore(s => s.enableSoloMode);
  const disableSoloMode = useAiTeammateStore(s => s.disableSoloMode);
  const setTeamStrategy = useAiTeammateStore(s => s.setTeamStrategy);
  const respondToProposal = useAiTeammateStore(s => s.respondToProposal);
  const acceptHelp = useAiTeammateStore(s => s.acceptHelp);
  const declineHelp = useAiTeammateStore(s => s.declineHelp);

  const pendingCount = [
    ...(pendingProposals || []).filter(p => p.status === 'pending'),
    ...(pendingHelpOffers || []).filter(o => o.status === 'pending'),
  ].length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤝</span>
            <div>
              <h2 className="text-xl font-bold text-white">AI队友系统</h2>
              <p className="text-gray-400 text-sm">
                队伍: {teamSummary.count}/{teamSummary.maxCount} | 战斗力: {teamSummary.teamPower}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
          >
            关闭
          </button>
        </div>

        {/* Solo mode toggle */}
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white font-bold">单人模式</span>
              <p className="text-gray-400 text-xs">开启后可招募AI队友</p>
            </div>
            <button
              onClick={() => isSoloMode ? disableSoloMode() : enableSoloMode()}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                isSoloMode ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                isSoloMode ? 'translate-x-8' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'team' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            👥 队伍 {teammates.length > 0 && `(${teammates.length})`}
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`flex-1 py-3 text-center font-bold transition-colors relative ${
              activeTab === 'proposals' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 待处理 {pendingCount > 0 && (
              <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('strategy')}
            className={`flex-1 py-3 text-center font-bold transition-colors ${
              activeTab === 'strategy' 
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎯 策略
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'team' && (
            <TeamTab
              teammates={teammates}
              isSoloMode={isSoloMode}
              onDismiss={dismissTeammate}
              onRecruit={recruitTeammate}
            />
          )}
          {activeTab === 'proposals' && (
            <ProposalsTab
              proposals={pendingProposals}
              helpOffers={pendingHelpOffers}
              onRespond={respondToProposal}
              onAcceptHelp={acceptHelp}
              onDeclineHelp={declineHelp}
            />
          )}
          {activeTab === 'strategy' && (
            <StrategyTab
              strategy={teamStrategy}
              onChange={setTeamStrategy}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Team tab
function TeamTab({ teammates, isSoloMode, onDismiss, onRecruit }) {
  const [recruitRole, setRecruitRole] = useState(TEAM_ROLES.SUPPORTER);

  if (!isSoloMode) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🤝</div>
        <h3 className="text-xl font-bold text-white mb-2">AI队友系统已关闭</h3>
        <p className="text-gray-400">开启单人模式来招募AI队友</p>
      </div>
    );
  }

  if (teammates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🧑‍🤝‍🧑</div>
        <h3 className="text-xl font-bold text-white mb-2">还没有队友</h3>
        <p className="text-gray-400 mb-6">招募第一位AI队友开始合作</p>

        {/* Role selection */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">选择队友类型:</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {Object.values(TEAM_ROLES).map(role => (
              <button
                key={role}
                onClick={() => setRecruitRole(role)}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                  recruitRole === role
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span>{ROLE_ICONS[role]}</span>
                <span>{ROLE_LABELS[role]}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onRecruit(recruitRole)}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-bold"
        >
          🎯 招募{ROLE_LABELS[recruitRole]}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {teammates.map(teammate => (
        <TeammateCard
          key={teammate.id}
          teammate={teammate}
          onDismiss={() => onDismiss(teammate.id)}
        />
      ))}

      {teammates.length < MAX_TEAMMATES && (
        <div className="border-2 border-dashed border-gray-600 rounded-xl p-6">
          <p className="text-gray-400 text-sm text-center mb-3">招募新队友</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {Object.values(TEAM_ROLES).map(role => (
              <button
                key={role}
                onClick={() => onRecruit(role)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 text-gray-300 hover:text-white"
              >
                <span>{ROLE_ICONS[role]}</span>
                <span>{ROLE_LABELS[role]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Teammate card
function TeammateCard({ teammate, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const loyaltyColor = teammate.loyalty > 70 ? 'text-green-400' : teammate.loyalty > 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-750"
      >
        <div className="text-3xl">{teammate.roleIcon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{teammate.name}</span>
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
              Lv.{teammate.level}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{teammate.roleLabel}</span>
            <span>|</span>
            <span className={loyaltyColor}>忠诚 {teammate.loyalty}%</span>
            <span>|</span>
            <span>信任 {teammate.trust}%</span>
          </div>
        </div>
        <div className="text-gray-400">{expanded ? '▲' : '▼'}</div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-700 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-amber-400">{teammate.skills.negotiation}</div>
              <div className="text-xs text-gray-400">谈判</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-400">{teammate.skills.strategy}</div>
              <div className="text-xs text-gray-400">策略</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-400">{teammate.skills.property}</div>
              <div className="text-xs text-gray-400">房产</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-red-400">{teammate.skills.blocking}</div>
              <div className="text-xs text-gray-400">防守</div>
            </div>
          </div>

          {/* Performance */}
          <div className="text-sm text-gray-400 mb-4">
            <div className="flex justify-between mb-1">
              <span>战绩:</span>
              <span className="text-white">{teammate.matchesWon}/{teammate.matchesPlayed} 胜</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>贡献度:</span>
              <span className="text-white">{teammate.totalContribution}</span>
            </div>
            <div className="flex justify-between">
              <span>交易接受率:</span>
              <span className="text-white">
                {teammate.tradesProposed > 0
                  ? Math.round((teammate.tradesAccepted / teammate.tradesProposed) * 100)
                  : 0}%
              </span>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="w-full py-2 bg-red-600/30 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm"
          >
            解雇队友
          </button>
        </div>
      )}
    </div>
  );
}

// Proposals tab
function ProposalsTab({ proposals, helpOffers, onRespond, onAcceptHelp, onDeclineHelp }) {
  const pendingProposals = (proposals || []).filter(p => p.status === 'pending');
  const pendingOffers = (helpOffers || []).filter(o => o.status === 'pending');

  if (pendingProposals.length === 0 && pendingOffers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-xl font-bold text-white mb-2">暂无待处理事项</h3>
        <p className="text-gray-400">队友的请求会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trade proposals */}
      {pendingProposals.map(proposal => (
        <div key={proposal.id} className="bg-gray-800 rounded-xl p-4 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤝</span>
            <span className="text-white font-bold">{proposal.teammateName}的交易请求</span>
          </div>
          <p className="text-gray-300 text-sm mb-3">{proposal.message}</p>
          <div className="flex gap-2 text-sm mb-4">
            <div className="flex-1 bg-gray-700 rounded-lg p-2">
              <div className="text-gray-400 text-xs mb-1"> offered</div>
              <div className="text-green-400">{JSON.stringify(proposal.offered)}</div>
            </div>
            <div className="flex-1 bg-gray-700 rounded-lg p-2">
              <div className="text-gray-400 text-xs mb-1"> requested</div>
              <div className="text-red-400">{JSON.stringify(proposal.requested)}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onRespond(proposal.id, true)}
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold"
            >
              接受
            </button>
            <button
              onClick={() => onRespond(proposal.id, false)}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
            >
              拒绝
            </button>
          </div>
        </div>
      ))}

      {/* Help offers */}
      {pendingOffers.map(offer => (
        <div key={offer.id} className="bg-gray-800 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💝</span>
            <span className="text-white font-bold">{offer.teammateName}的帮助请求</span>
          </div>
          <p className="text-gray-300 text-sm mb-3">
            {offer.helpType === 'coin_donation' && '想要赠送你金币'}
            {offer.helpType === 'property_gift' && '想要赠送你房产'}
            {offer.helpType === 'blocking_help' && '想要帮你防守对手'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onAcceptHelp(offer.id)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold"
            >
              接受帮助
            </button>
            <button
              onClick={() => onDeclineHelp(offer.id)}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
            >
              婉拒
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Strategy tab
function StrategyTab({ strategy, onChange }) {
  const strategies = [
    { id: 'balanced', name: '均衡策略', icon: '⚖️', desc: '平衡发展，既注重个人成长也考虑团队配合' },
    { id: 'aggressive', name: '激进策略', icon: '⚔️', desc: '团队成员优先抢夺高价值资产，快速扩张' },
    { id: 'defensive', name: '防守策略', icon: '🛡️', desc: '团队成员优先阻止对手，稳固地盘' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-gray-400 text-sm">选择团队整体策略，所有队友将以此为导向</p>
      </div>

      {strategies.map(strat => (
        <button
          key={strat.id}
          onClick={() => onChange(strat.id)}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            strategy === strat.id
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-gray-600 bg-gray-800 hover:border-gray-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{strat.icon}</span>
            <div className="flex-1">
              <div className="text-white font-bold">{strat.name}</div>
              <div className="text-gray-400 text-sm">{strat.desc}</div>
            </div>
            {strategy === strat.id && (
              <span className="text-amber-400 text-2xl">✓</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}