import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGameStore } from '../../game/store';
import { 
  getClassManager, 
  MessageTypes,
  StudentStatus,
  createMessage,
  sendMessage 
} from '../../communication/broadcastChannel';
import { t } from '../../i18n';

// Category labels
const getCategoryLabels = () => ({
  math: t('category_math'),
  shape: t('category_shape'),
  time: t('category_time'),
  geography: t('category_geography'),
  science: t('category_science'),
  reading: t('category_reading'),
  life: t('category_life'),
  emotion: t('category_emotion'),
  animal: t('category_animal'),
});

// Status colors
const STATUS_COLORS = {
  [StudentStatus.ONLINE]: '#4ADE80',
  [StudentStatus.OFFLINE]: '#9CA3AF',
  [StudentStatus.FROZEN]: '#FBBF24',
  [StudentStatus.OBSERVING]: '#60A5FA',
  [StudentStatus.ANSWERING]: '#A78BFA',
  [StudentStatus.AWAY]: '#F87171',
};

export default function TeacherPage() {
  const [activeTab, setActiveTab] = useState('students'); // students | observe | homework | wrongbook
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentContent, setAssignmentContent] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [homeworkList, setHomeworkList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  
  const classManager = useMemo(() => getClassManager(), []);
  
  // Initialize class manager
  useEffect(() => {
    classManager.onStudentUpdate = (students) => {
      setStudentList(students);
    };
    classManager.onStudentAnswer = (answer) => {
      console.log('Student answer received:', answer);
    };
    classManager.onStudentHelp = (help) => {
      console.log('Student help request:', help);
      // Show notification or highlight student
    };
    
    const unsubscribe = classManager.initialize();
    
    return () => {
      unsubscribe();
      classManager.destroy();
    };
  }, [classManager]);
  
  // Calculate class statistics
  const classStats = useMemo(() => {
    if (studentList.length === 0) {
      return {
        totalStudents: 0,
        onlineCount: 0,
        avgAccuracy: 0,
        totalQuestions: 0,
        categoryPerformance: {},
      };
    }
    
    const onlineCount = studentList.filter(s => s.status === StudentStatus.ONLINE).length;
    const totalQuestions = studentList.reduce((sum, s) => sum + (s.questionsAnswered || 0), 0);
    const totalCorrect = studentList.reduce((sum, s) => sum + (s.questionsCorrect || 0), 0);
    const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    // Category performance from wrong answers
    const categoryPerformance = {};
    
    return {
      totalStudents: studentList.length,
      onlineCount,
      avgAccuracy,
      totalQuestions,
      categoryPerformance,
    };
  }, [studentList]);
  
  // Handle freeze/unfreeze student
  const handleFreezeStudent = useCallback((studentId) => {
    const student = classManager.getStudent(studentId);
    if (!student) return;
    
    if (student.status === StudentStatus.FROZEN) {
      classManager.unfreezeStudent(studentId);
    } else {
      classManager.freezeStudent(studentId);
    }
  }, [classManager]);
  
  // Handle observe student
  const handleObserveStudent = useCallback((studentId) => {
    if (selectedStudent === studentId) {
      classManager.stopObservingStudent(studentId);
      setSelectedStudent(null);
    } else {
      if (selectedStudent) {
        classManager.stopObservingStudent(selectedStudent);
      }
      classManager.observeStudent(studentId);
      setSelectedStudent(studentId);
    }
  }, [classManager, selectedStudent]);
  
  // Handle send assignment
  const handleSendAssignment = useCallback(() => {
    if (!assignmentTitle.trim()) {
      alert(t('enter_homework_title_alert'));
      return;
    }
    
    const assignment = {
      id: Date.now().toString(),
      title: assignmentTitle.trim(),
      content: assignmentContent.trim(),
      dueDate: assignmentDueDate,
      createdAt: new Date().toISOString(),
      assignedBy: t('assigned_by_label'),
    };
    
    classManager.sendAssignment(assignment);
    setHomeworkList(prev => [...prev, assignment]);
    setShowAssignmentModal(false);
    setAssignmentTitle('');
    setAssignmentContent('');
    setAssignmentDueDate('');
    
    alert(t('homework_sent_success'));
  }, [classManager, assignmentTitle, assignmentContent, assignmentDueDate]);
  
  // Handle kick student
  const handleKickStudent = useCallback((studentId, reason) => {
    if (confirm(t('confirm_remove_student'))) {
      classManager.kickStudent(studentId, reason || t('removed_by_teacher'));
    }
  }, [classManager]);
  
  // Export wrong answer notebook
  const handleExportWrongAnswers = useCallback(() => {
    // Load all student profiles
    const profilesJson = localStorage.getItem('monopoly3d_student_profiles');
    if (!profilesJson) {
      alert(t('no_data_to_export'));
      return;
    }
    
    const profiles = JSON.parse(profilesJson);
    const wrongAnswers = [];
    
    // Collect all wrong answers from all students
    Object.values(profiles).forEach(profile => {
      profile.games?.forEach(game => {
        game.questionsAnswered?.forEach(q => {
          if (!q.correct) {
            wrongAnswers.push({
              studentName: profile.name,
              category: q.category,
              question: q.question,
              answer: q.answer,
              date: new Date(q.timestamp).toLocaleDateString(),
            });
          }
        });
      });
    });
    
    if (wrongAnswers.length === 0) {
      alert(t('no_wrong_to_export'));
      return;
    }
    
    // Group by category
    const groupedByCategory = {};
    wrongAnswers.forEach(wa => {
      if (!groupedByCategory[wa.category]) {
        groupedByCategory[wa.category] = [];
      }
      groupedByCategory[wa.category].push(wa);
    });
    
    // Create export data
    const exportData = {
      exportTime: new Date().toISOString(),
      totalWrongAnswers: wrongAnswers.length,
      totalStudents: Object.keys(profiles).length,
      categorySummary: Object.keys(groupedByCategory).map(cat => ({
        category: cat,
        categoryLabel: getCategoryLabels()[cat] || cat,
        count: groupedByCategory[cat].length,
      })),
      wrongAnswers: groupedByCategory,
    };
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monopoly3d-wrong-answers-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl w-[1200px] max-w-[95vw] max-h-[90vh] overflow-hidden border border-purple-500/30 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎓</div>
              <div>
                <h1 className="text-2xl font-bold text-white">{t('teacher_terminal')}</h1>
                <p className="text-purple-300 text-sm">{t('teaching_auxiliary_tool')}</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-black/30 rounded-xl px-4 py-2 text-center">
                <div className="text-2xl font-bold text-green-400">{classStats.onlineCount}/{classStats.totalStudents}</div>
                <div className="text-xs text-gray-400">{t('online')}</div>
              </div>
              <div className="bg-black/30 rounded-xl px-4 py-2 text-center">
                <div className="text-2xl font-bold text-purple-400">{classStats.avgAccuracy}%</div>
                <div className="text-xs text-gray-400">{t('class_accuracy')}</div>
              </div>
              <div className="bg-black/30 rounded-xl px-4 py-2 text-center">
                <div className="text-2xl font-bold text-yellow-400">{classStats.totalQuestions}</div>
                <div className="text-xs text-gray-400">{t('total_questions_stat')}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 px-6 py-3 bg-black/20">
          <TabButton 
            active={activeTab === 'students'} 
            onClick={() => setActiveTab('students')}
            icon="👥"
            label={t('student_list')}
          />
          <TabButton 
            active={activeTab === 'observe'} 
            onClick={() => setActiveTab('observe')}
            icon="👁️"
            label={t('observe')}
          />
          <TabButton 
            active={activeTab === 'homework'} 
            onClick={() => setActiveTab('homework')}
            icon="📝"
            label={t('homework')}
          />
          <TabButton 
            active={activeTab === 'wrongbook'} 
            onClick={() => setActiveTab('wrongbook')}
            icon="📕"
            label={t('wrong_book')}
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Students Tab */}
          {activeTab === 'students' && (
            <StudentListPanel
              students={studentList}
              selectedStudent={selectedStudent}
              onFreeze={handleFreezeStudent}
              onObserve={handleObserveStudent}
              onKick={handleKickStudent}
            />
          )}
          
          {/* Observe Tab */}
          {activeTab === 'observe' && (
            <ObservePanel
              students={studentList}
              selectedStudent={selectedStudent}
              onSelect={handleObserveStudent}
            />
          )}
          
          {/* Homework Tab */}
          {activeTab === 'homework' && (
            <HomeworkPanel
              homeworkList={homeworkList}
              onNewAssignment={() => setShowAssignmentModal(true)}
            />
          )}
          
          {/* Wrong Book Tab */}
          {activeTab === 'wrongbook' && (
            <WrongBookPanel onExport={handleExportWrongAnswers} />
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-purple-500/30 bg-black/20 flex justify-between items-center">
          <div className="text-gray-400 text-sm">
            {t('teaching_mode_enabled')}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-bold"
          >
            {t('exit_teacher_mode')}
          </button>
        </div>
      </div>
      
      {/* Assignment Modal */}
      {showAssignmentModal && (
        <AssignmentModal
          title={assignmentTitle}
          setTitle={setAssignmentTitle}
          content={assignmentContent}
          setContent={setAssignmentContent}
          dueDate={assignmentDueDate}
          setDueDate={setAssignmentDueDate}
          onSend={handleSendAssignment}
          onClose={() => setShowAssignmentModal(false)}
        />
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
        active 
          ? 'bg-purple-600 text-white' 
          : 'bg-black/30 text-gray-400 hover:bg-black/50 hover:text-white'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Student List Panel
function StudentListPanel({ students, selectedStudent, onFreeze, onObserve, onKick }) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <p className="text-purple-300 text-lg">{t('no_students_connected_hint')}</p>
        <p className="text-gray-400 text-sm mt-2">{t('waiting_for_students_join')}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-4">
        {students.map(student => (
          <StudentCard
            key={student.id}
            student={student}
            isSelected={selectedStudent === student.id}
            onFreeze={() => onFreeze(student.id)}
            onObserve={() => onObserve(student.id)}
            onKick={() => onKick(student.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Student Card Component
function StudentCard({ student, isSelected, onFreeze, onObserve, onKick }) {
  const accuracy = student.questionsAnswered > 0
    ? Math.round((student.questionsCorrect / student.questionsAnswered) * 100)
    : 0;
  
  return (
    <div 
      className={`bg-black/30 rounded-xl p-4 border-2 transition-all ${
        isSelected ? 'border-blue-500' : 'border-transparent hover:border-purple-500/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[student.status] || STATUS_COLORS.offline }}
          />
          <span className="text-white font-bold">{student.name}</span>
        </div>
        <span className="text-xs text-gray-400 capitalize">{student.status}</span>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <span className="text-gray-400">{t('accuracy_label')}</span>
          <span className={`ml-1 font-bold ${
            accuracy >= 80 ? 'text-green-400' : accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {accuracy}%
          </span>
        </div>
        <div>
          <span className="text-gray-400">{t('questions_label')}</span>
          <span className="ml-1 text-white">{student.questionsAnswered || 0}</span>
        </div>
      </div>
      
      {/* Position */}
      <div className="text-xs text-gray-400 mb-3">
        {t('position_label')} {student.currentPosition || 0}{t('grid_suffix', '格')} · ${student.money || 0}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onObserve}
          className={`flex-1 px-2 py-1 rounded text-xs font-bold ${
            isSelected 
              ? 'bg-blue-600 text-white' 
              : 'bg-blue-600/50 hover:bg-blue-600 text-white'
          }`}
        >
          👁️ {isSelected ? t('already_observing') : t('observing_label')}
        </button>
        <button
          onClick={onFreeze}
          className={`flex-1 px-2 py-1 rounded text-xs font-bold ${
            student.status === 'frozen'
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-600/50 hover:bg-yellow-600 text-white'
          }`}
        >
          {student.status === 'frozen' ? t('unfreeze_label') : t('freeze_label')}
        </button>
        <button
          onClick={onKick}
          className="px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded text-xs font-bold text-white"
        >
          {t('remove_label')}
        </button>
      </div>
    </div>
  );
}

// Observe Panel
function ObservePanel({ students, selectedStudent, onSelect }) {
  const observingStudents = students.filter(s => s.status === StudentStatus.OBSERVING);
  
  if (selectedStudent) {
    const student = students.find(s => s.id === selectedStudent);
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{t('currently_observing')} {student?.name}</h3>
          <button
            onClick={() => onSelect(selectedStudent)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-sm font-bold"
          >
            {t('stop_observing_label')}
          </button>
        </div>
        
        {/* Game state would be displayed here */}
        <div className="bg-black/30 rounded-xl p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/30 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-xs mb-1">{t('current_tile_position')}</div>
              <div className="text-3xl font-bold text-white">{t('position_label')} {student?.currentPosition || 0}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-xs mb-1">{t('funds_label')}</div>
              <div className="text-3xl font-bold text-yellow-400">${student?.money || 0}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-xs mb-1">{t('property_count')}</div>
              <div className="text-3xl font-bold text-purple-400">{student?.properties?.length || 0}</div>
            </div>
          </div>
          
          {/* Properties */}
          <div className="mt-4">
            <div className="text-gray-400 text-sm mb-2">{t('properties_owned')}</div>
            <div className="flex flex-wrap gap-2">
              {student?.properties?.length > 0 ? (
                student.properties.map(propId => (
                  <span key={propId} className="px-3 py-1 bg-purple-600/30 rounded-lg text-purple-300 text-sm">
                    {t('tile_label', '格子')}{propId}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">{t('no_properties_owned')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-4">{t('select_student_to_observe_title')}</h3>
      <div className="grid grid-cols-4 gap-4">
        {students.map(student => (
          <button
            key={student.id}
            onClick={() => onSelect(student.id)}
            className="bg-black/30 hover:bg-black/50 rounded-xl p-4 text-left border border-transparent hover:border-blue-500 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[student.status] }}
              />
              <span className="text-white font-bold">{student.name}</span>
            </div>
            <div className="text-xs text-gray-400">
              {t('accuracy_label')} {student.questionsAnswered > 0 
                ? Math.round((student.questionsCorrect / student.questionsAnswered) * 100) 
                : 0}%
            </div>
          </button>
        ))}
      </div>
      
      {students.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👁️</div>
          <p className="text-purple-300">{t('no_students_available')}</p>
        </div>
      )}
    </div>
  );
}

// Homework Panel
function HomeworkPanel({ homeworkList, onNewAssignment }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{t('homework_management_title')}</h3>
        <button
          onClick={onNewAssignment}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm font-bold"
        >
          {t('assign_new_homework_btn')}
        </button>
      </div>
      
      {/* Existing homework */}
      {homeworkList.length > 0 ? (
        <div className="space-y-3">
          {homeworkList.map(hw => (
            <div key={hw.id} className="bg-black/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold">{hw.title}</h4>
                  <p className="text-gray-400 text-sm mt-1">{hw.content}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{t('due_date_label')}</div>
                  <div className="text-purple-300 text-sm">{hw.dueDate || t('not_set_label')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-purple-300">{t('no_homework_yet')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('click_above_hint')}</p>
        </div>
      )}
    </div>
  );
}

// Wrong Book Panel
function WrongBookPanel({ onExport }) {
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  useEffect(() => {
    // Load wrong answers from localStorage
    const profilesJson = localStorage.getItem('monopoly3d_student_profiles');
    if (!profilesJson) return;
    
    const profiles = JSON.parse(profilesJson);
    const collected = [];
    
    Object.values(profiles).forEach(profile => {
      profile.games?.forEach(game => {
        game.questionsAnswered?.forEach(q => {
          if (!q.correct) {
            collected.push({
              studentName: profile.name,
              category: q.category,
              question: q.question,
              answer: q.answer,
              date: new Date(q.timestamp).toLocaleDateString(),
            });
          }
        });
      });
    });
    
    setWrongAnswers(collected);
  }, []);
  
  // Group by category
  const groupedByCategory = useMemo(() => {
    const grouped = {};
    wrongAnswers.forEach(wa => {
      if (!grouped[wa.category]) {
        grouped[wa.category] = [];
      }
      grouped[wa.category].push(wa);
    });
    return grouped;
  }, [wrongAnswers]);
  
  const categoryLabels = getCategoryLabels();
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{t('wrong_answer_book')}</h3>
        <button
          onClick={onExport}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-bold"
        >
          {t('export_wrong_answers_btn')}
        </button>
      </div>
      
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 rounded-lg text-sm font-bold ${
            selectedCategory === null 
              ? 'bg-purple-600 text-white' 
              : 'bg-black/30 text-gray-400'
          }`}
        >
          {t('all_filter')} ({wrongAnswers.length})
        </button>
        {Object.keys(groupedByCategory).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-sm font-bold ${
              selectedCategory === cat 
                ? 'bg-purple-600 text-white' 
                : 'bg-black/30 text-gray-400'
            }`}
          >
            {categoryLabels[cat] || cat} ({groupedByCategory[cat].length})
          </button>
        ))}
      </div>
      
      {/* Wrong Answers List */}
      {wrongAnswers.length > 0 ? (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {wrongAnswers
            .filter(wa => selectedCategory === null || wa.category === selectedCategory)
            .map((wa, idx) => (
              <div key={idx} className="bg-black/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-900/50 rounded text-red-300 text-xs">
                      {categoryLabels[wa.category] || wa.category}
                    </span>
                    <span className="text-gray-400 text-xs">{wa.studentName}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{wa.date}</span>
                </div>
                <div className="text-white">{wa.question}</div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📕</div>
          <p className="text-purple-300">{t('no_wrong_records')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('wrong_answers_auto_hint')}</p>
        </div>
      )}
    </div>
  );
}

// Assignment Modal
function AssignmentModal({ 
  title, setTitle, 
  content, setContent, 
  dueDate, setDueDate, 
  onSend, onClose 
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-6 w-[500px] border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">{t('create_homework_title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">{t('homework_title_field')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('homework_title_eg')}
              className="w-full px-4 py-2 bg-black/30 border border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
            />
          </div>
          
          <div>
            <label className="text-gray-400 text-sm mb-1 block">{t('homework_content_field')}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('homework_content_eg')}
              rows={4}
              className="w-full px-4 py-2 bg-black/30 border border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 resize-none"
            />
          </div>
          
          <div>
            <label className="text-gray-400 text-sm mb-1 block">{t('deadline_field')}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 bg-black/30 border border-purple-500/50 rounded-xl text-white focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-xl text-white font-bold"
          >
            {t('cancel_btn')}
          </button>
          <button
            onClick={onSend}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold"
          >
            {t('send_to_all')}
          </button>
        </div>
      </div>
    </div>
  );
}
