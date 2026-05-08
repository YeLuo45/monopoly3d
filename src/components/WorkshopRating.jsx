import { useState } from 'react';
import { DIFFICULTY_LEVELS } from '../editor/editorTypes';

/**
 * Difficulty Selector for Workshop Maps
 */
export function DifficultySelector({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0);

  const handleSelect = (level) => {
    if (!readonly && onChange) {
      onChange(level);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300 font-medium">难度等级</span>
        {value && (
          <span 
            className="text-sm font-bold px-2 py-0.5 rounded"
            style={{ 
              backgroundColor: DIFFICULTY_LEVELS[value]?.color + '33',
              color: DIFFICULTY_LEVELS[value]?.color
            }}
          >
            {DIFFICULTY_LEVELS[value]?.label}
          </span>
        )}
      </div>
      
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((level) => {
          const info = DIFFICULTY_LEVELS[level];
          const isSelected = value === level;
          const isHovered = hover === level;
          
          return (
            <button
              key={level}
              onClick={() => handleSelect(level)}
              onMouseEnter={() => !readonly && setHover(level)}
              onMouseLeave={() => !readonly && setHover(0)}
              disabled={readonly}
              className={`
                flex-1 p-2 rounded-lg border-2 transition-all text-center
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-105'}
                ${isSelected ? 'border-white scale-105' : 'border-transparent'}
              `}
              style={{
                backgroundColor: isHovered || isSelected ? info.color + '44' : '#374151',
                borderColor: isSelected ? info.color : 'transparent',
              }}
              title={info.description}
            >
              <div className="text-lg font-bold" style={{ color: info.color }}>
                {level}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {['入门', '简单', '中等', '困难', '地狱'][level - 1]}
              </div>
            </button>
          );
        })}
      </div>
      
      {value && (
        <p className="text-xs text-gray-500 mt-1">
          {DIFFICULTY_LEVELS[value]?.description}
        </p>
      )}
    </div>
  );
}

/**
 * Star Rating Component
 */
export function StarRating({ rating, onRate, readonly = false, size = 'md' }) {
  const [hover, setHover] = useState(0);
  
  const sizeClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg';
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hover || rating);
        return (
          <button
            key={star}
            className={`${sizeClass} ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
            onClick={() => !readonly && onRate && onRate(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            disabled={readonly}
          >
            {isFilled ? '⭐' : '☆'}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Combined Rating Display with difficulty
 */
export function WorkshopRatingDisplay({ rating, difficulty, downloads, showDifficulty = true }) {
  return (
    <div className="flex items-center gap-3">
      {/* Star Rating */}
      <div className="flex items-center gap-1">
        <StarRating rating={rating} readonly size="sm" />
        <span className="text-sm text-gray-400 ml-1">{rating?.toFixed(1) || '0.0'}</span>
      </div>
      
      {/* Difficulty Badge */}
      {showDifficulty && difficulty && (
        <span 
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ 
            backgroundColor: DIFFICULTY_LEVELS[difficulty]?.color + '33',
            color: DIFFICULTY_LEVELS[difficulty]?.color
          }}
        >
          {DIFFICULTY_LEVELS[difficulty]?.label}
        </span>
      )}
      
      {/* Downloads */}
      {downloads !== undefined && (
        <span className="text-xs text-gray-500">
          📥 {downloads}
        </span>
      )}
    </div>
  );
}

/**
 * Editable Rating Modal for Workshop
 */
export function RatingModal({ item, itemType, onClose, onRate, onDifficulty }) {
  const [rating, setRating] = useState(0);
  const [difficulty, setDifficulty] = useState(item.difficulty || 3);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return alert('请选择评分');
    setSubmitting(true);
    
    let result;
    if (itemType === 'map' && onDifficulty) {
      // Save difficulty first
      onDifficulty(item.id, difficulty);
    }
    
    result = await onRate({ itemId: item.id, itemType, rating, comment });
    
    setSubmitting(false);
    if (result.success) {
      alert('评价成功！');
      onClose();
    } else {
      alert(`评价失败: ${result.error}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-lg font-bold text-white">
          评价「{item.name || item.title}」
        </h2>
        
        {/* Difficulty Selector */}
        {itemType === 'map' && (
          <div className="bg-gray-700/50 rounded-lg p-3">
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </div>
        )}
        
        {/* Star Rating */}
        <div className="flex flex-col items-center py-2">
          <span className="text-sm text-gray-400 mb-2">你的评分</span>
          <StarRating rating={rating} onRate={setRating} size="lg" />
        </div>
        
        {/* Comment */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="写下你的评论（选填，最多200字）..."
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 h-24 resize-none"
          maxLength={200}
        />
        
        {/* Actions */}
        <div className="flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !rating}
            className="flex-1 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 disabled:opacity-50 font-medium"
          >
            {submitting ? '提交中...' : '提交评价'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Difficulty Badge Component
 */
export function DifficultyBadge({ difficulty, size = 'md' }) {
  if (!difficulty) return null;
  
  const info = DIFFICULTY_LEVELS[difficulty];
  if (!info) return null;
  
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : size === 'lg' ? 'text-base px-3 py-1' : 'text-sm px-2 py-0.5';
  
  return (
    <span 
      className={`${sizeClass} font-bold rounded-full`}
      style={{ 
        backgroundColor: info.color + '33',
        color: info.color
      }}
      title={info.description}
    >
      {info.label}
    </span>
  );
}
