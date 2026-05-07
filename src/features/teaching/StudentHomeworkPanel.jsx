import { useState, useEffect, useCallback, useMemo } from 'react';
import { getStudentCommunicator, StudentStatus } from '../../communication/broadcastChannel';

/**
 * StudentHomeworkPanel - Popup for student homework/assignments
 * This appears when teacher sends homework to students
 */
export default function StudentHomeworkPanel() {
  const [homework, setHomework] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [completedHomework, setCompletedHomework] = useState([]);
  
  const communicator = useMemo(() => getStudentCommunicator(), []);
  
  useEffect(() => {
    // Listen for assignments from teacher
    if (communicator) {
      communicator.onAssignment = (assignment) => {
        setHomework(assignment);
        setShowPanel(true);
      };
    }
    
    // Load completed homework from localStorage
    const saved = localStorage.getItem('monopoly3d_completed_homework');
    if (saved) {
      try {
        setCompletedHomework(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse completed homework:', e);
      }
    }
  }, [communicator]);
  
  const handleClose = useCallback(() => {
    setShowPanel(false);
  }, []);
  
  const handleComplete = useCallback(() => {
    if (!homework) return;
    
    const completed = {
      ...homework,
      completedAt: new Date().toISOString(),
      studentId: communicator.studentId,
    };
    
    const updated = [...completedHomework, completed];
    setCompletedHomework(updated);
    localStorage.setItem('monopoly3d_completed_homework', JSON.stringify(updated));
    setShowPanel(false);
    setHomework(null);
  }, [homework, completedHomework, communicator]);
  
  if (!showPanel || !homework) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl w-[500px] max-w-[90vw] border border-purple-500/30 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/30">
          <div className="flex items-center gap-4">
            <div className="text-5xl">📝</div>
            <div>
              <div className="text-purple-300 text-sm">教师布置的作业</div>
              <h2 className="text-2xl font-bold text-white">{homework.title}</h2>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Due date */}
          {homework.dueDate && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <span className="text-gray-400">截止日期:</span>
              <span className="text-yellow-400 font-bold">{homework.dueDate}</span>
            </div>
          )}
          
          {/* Content */}
          <div className="bg-black/30 rounded-xl p-4 mb-4">
            <div className="text-gray-300 leading-relaxed">
              {homework.content || '无具体内容，请查看教师说明'}
            </div>
          </div>
          
          {/* From */}
          <div className="text-gray-400 text-sm">
            布置教师: <span className="text-purple-300">{homework.assignedBy || '教师'}</span>
          </div>
          <div className="text-gray-400 text-sm mt-1">
            布置时间: <span className="text-purple-300">
              {new Date(homework.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-6 border-t border-purple-500/30 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl text-white font-bold"
          >
            稍后完成
          </button>
          <button
            onClick={handleComplete}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold"
          >
            ✅ 标记完成
          </button>
        </div>
      </div>
    </div>
  );
}
