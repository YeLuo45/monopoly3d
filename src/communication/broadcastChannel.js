/**
 * BroadcastChannel Communication System
 * 用于教师端与学生端之间的实时通信
 */

const CHANNEL_NAME = 'monopoly3d_teaching_channel';

// Create or get the broadcast channel
let channel = null;

export function getChannel() {
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

// Message types
export const MessageTypes = {
  // Teacher to Student
  TEACHER_ASSIGNMENT: 'TEACHER_ASSIGNMENT',
  TEACHER_FREEZE: 'TEACHER_FREEZE',
  TEACHER_UNFREEZE: 'TEACHER_UNFREEZE',
  TEACHER_INTERVENTION: 'TEACHER_INTERVENTION',
  TEACHER_OBSERVE: 'TEACHER_OBSERVE',
  TEACHER_STOP_OBSERVE: 'TEACHER_STOP_OBSERVE',
  TEACHER_BROADCAST_STATE: 'TEACHER_BROADCAST_STATE',
  TEACHER_KICK: 'TEACHER_KICK',
  
  // Student to Teacher
  STUDENT_JOIN: 'STUDENT_JOIN',
  STUDENT_LEAVE: 'STUDENT_LEAVE',
  STUDENT_ANSWER_SUBMIT: 'STUDENT_ANSWER_SUBMIT',
  STUDENT_PROGRESS: 'STUDENT_PROGRESS',
  STUDENT_ERROR_REPORT: 'STUDENT_ERROR_REPORT',
  STUDENT_REQUEST_HELP: 'STUDENT_REQUEST_HELP',
  
  // Class management
  CLASS_SYNC: 'CLASS_SYNC',
  HEARTBEAT: 'HEARTBEAT',
};

// Student status
export const StudentStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  FROZEN: 'frozen',
  OBSERVING: 'observing',
  ANSWERING: 'answering',
  AWAY: 'away',
};

// Create a message
export function createMessage(type, payload) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    timestamp: Date.now(),
    source: 'monopoly3d',
  };
}

// Send message to channel
export function sendMessage(type, payload) {
  const ch = getChannel();
  const message = createMessage(type, payload);
  ch.postMessage(message);
  return message.id;
}

// Subscribe to messages
export function subscribe(callback) {
  const ch = getChannel();
  const handler = (event) => {
    callback(event.data);
  };
  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}

// Close channel
export function closeChannel() {
  if (channel) {
    channel.close();
    channel = null;
  }
}

// Class manager for teacher side
export class ClassManager {
  constructor() {
    this.students = new Map(); // studentId -> studentInfo
    this.observers = new Set(); // studentIds being observed
    this.heartbeatInterval = null;
    this.onStudentUpdate = null;
    this.onStudentAnswer = null;
    this.onStudentHelp = null;
  }
  
  initialize() {
    // Subscribe to all messages
    const unsubscribe = subscribe((message) => {
      this.handleMessage(message);
    });
    
    // Start heartbeat check
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 5000);
    
    return unsubscribe;
  }
  
  handleMessage(message) {
    const { type, payload } = message;
    
    switch (type) {
      case MessageTypes.STUDENT_JOIN:
        this.handleStudentJoin(payload);
        break;
      case MessageTypes.STUDENT_LEAVE:
        this.handleStudentLeave(payload);
        break;
      case MessageTypes.STUDENT_ANSWER_SUBMIT:
        this.handleStudentAnswer(payload);
        break;
      case MessageTypes.STUDENT_PROGRESS:
        this.handleStudentProgress(payload);
        break;
      case MessageTypes.STUDENT_ERROR_REPORT:
        this.handleStudentError(payload);
        break;
      case MessageTypes.STUDENT_REQUEST_HELP:
        this.handleStudentHelp(payload);
        break;
      case MessageTypes.HEARTBEAT:
        this.handleHeartbeat(payload);
        break;
    }
  }
  
  handleStudentJoin(payload) {
    const { studentId, studentName, status } = payload;
    this.students.set(studentId, {
      id: studentId,
      name: studentName,
      status: status || StudentStatus.ONLINE,
      lastHeartbeat: Date.now(),
      currentPosition: 0,
      money: 0,
      properties: [],
      accuracy: 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
    });
    if (this.onStudentUpdate) {
      this.onStudentUpdate(this.getStudentsList());
    }
  }
  
  handleStudentLeave(payload) {
    const { studentId } = payload;
    this.students.delete(studentId);
    this.observers.delete(studentId);
    if (this.onStudentUpdate) {
      this.onStudentUpdate(this.getStudentsList());
    }
  }
  
  handleStudentAnswer(payload) {
    if (this.onStudentAnswer) {
      this.onStudentAnswer(payload);
    }
  }
  
  handleStudentProgress(payload) {
    const { studentId, ...progress } = payload;
    const student = this.students.get(studentId);
    if (student) {
      Object.assign(student, progress);
      if (this.onStudentUpdate) {
        this.onStudentUpdate(this.getStudentsList());
      }
    }
  }
  
  handleStudentError(payload) {
    console.error('Student error report:', payload);
  }
  
  handleStudentHelp(payload) {
    if (this.onStudentHelp) {
      this.onStudentHelp(payload);
    }
  }
  
  handleHeartbeat(payload) {
    const { studentId } = payload;
    const student = this.students.get(studentId);
    if (student) {
      student.lastHeartbeat = Date.now();
      student.status = StudentStatus.ONLINE;
    }
  }
  
  checkHeartbeats() {
    const now = Date.now();
    const timeout = 15000; // 15 seconds timeout
    let hasChanges = false;
    
    this.students.forEach((student) => {
      if (now - student.lastHeartbeat > timeout && student.status !== StudentStatus.OFFLINE) {
        student.status = StudentStatus.OFFLINE;
        hasChanges = true;
      }
    });
    
    if (hasChanges && this.onStudentUpdate) {
      this.onStudentUpdate(this.getStudentsList());
    }
  }
  
  // Teacher actions
  sendAssignment(assignment) {
    sendMessage(MessageTypes.TEACHER_ASSIGNMENT, {
      assignment,
      timestamp: Date.now(),
    });
  }
  
  freezeStudent(studentId) {
    sendMessage(MessageTypes.TEACHER_FREEZE, { studentId });
    const student = this.students.get(studentId);
    if (student) {
      student.status = StudentStatus.FROZEN;
    }
    if (this.onStudentUpdate) {
      this.onStudentUpdate(this.getStudentsList());
    }
  }
  
  unfreezeStudent(studentId) {
    sendMessage(MessageTypes.TEACHER_UNFREEZE, { studentId });
    const student = this.students.get(studentId);
    if (student) {
      student.status = StudentStatus.ONLINE;
    }
    if (this.onStudentUpdate) {
      this.onStudentUpdate(this.getStudentsList());
    }
  }
  
  observeStudent(studentId) {
    this.observers.add(studentId);
    sendMessage(MessageTypes.TEACHER_OBSERVE, { studentId });
  }
  
  stopObservingStudent(studentId) {
    this.observers.delete(studentId);
    sendMessage(MessageTypes.TEACHER_STOP_OBSERVE, { studentId });
  }
  
  broadcastGameState(gameState) {
    sendMessage(MessageTypes.TEACHER_BROADCAST_STATE, { gameState });
  }
  
  kickStudent(studentId, reason = '') {
    sendMessage(MessageTypes.TEACHER_KICK, { studentId, reason });
    this.students.delete(studentId);
    this.observers.delete(studentId);
    if (this.onStudentUpdate) {
      this.onStudentUpdate(this.getStudentsList());
    }
  }
  
  getStudentsList() {
    return Array.from(this.students.values());
  }
  
  getStudent(studentId) {
    return this.students.get(studentId);
  }
  
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}

// Student-side communication manager
export class StudentCommunicator {
  constructor(studentId, studentName) {
    this.studentId = studentId;
    this.studentName = studentName;
    this.isFrozen = false;
    this.isBeingObserved = false;
    this.onAssignment = null;
    this.onIntervention = null;
    this.onObserve = null;
    this.onStopObserve = null;
  }
  
  initialize() {
    // Announce joining
    this.sendJoin();
    
    // Subscribe to messages
    const unsubscribe = subscribe((message) => {
      this.handleMessage(message);
    });
    
    // Start heartbeat
    const heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 3000);
    
    return () => {
      unsubscribe();
      clearInterval(heartbeatInterval);
      this.sendLeave();
    };
  }
  
  handleMessage(message) {
    const { type, payload } = message;
    
    switch (type) {
      case MessageTypes.TEACHER_FREEZE:
        if (payload.studentId === this.studentId) {
          this.isFrozen = true;
        }
        break;
      case MessageTypes.TEACHER_UNFREEZE:
        if (payload.studentId === this.studentId) {
          this.isFrozen = false;
        }
        break;
      case MessageTypes.TEACHER_ASSIGNMENT:
        if (this.onAssignment) {
          this.onAssignment(payload.assignment);
        }
        break;
      case MessageTypes.TEACHER_INTERVENTION:
        if (payload.studentId === this.studentId && this.onIntervention) {
          this.onIntervention(payload);
        }
        break;
      case MessageTypes.TEACHER_OBSERVE:
        if (payload.studentId === this.studentId) {
          this.isBeingObserved = true;
          if (this.onObserve) this.onObserve();
        }
        break;
      case MessageTypes.TEACHER_STOP_OBSERVE:
        if (payload.studentId === this.studentId) {
          this.isBeingObserved = false;
          if (this.onStopObserve) this.onStopObserve();
        }
        break;
      case MessageTypes.TEACHER_BROADCAST_STATE:
        if (payload.studentId === undefined || payload.studentId === this.studentId) {
          // Apply game state update
        }
        break;
      case MessageTypes.TEACHER_KICK:
        if (payload.studentId === this.studentId) {
          alert(`您已被教师移出游戏: ${payload.reason}`);
          window.location.reload();
        }
        break;
    }
  }
  
  sendJoin() {
    sendMessage(MessageTypes.STUDENT_JOIN, {
      studentId: this.studentId,
      studentName: this.studentName,
      status: StudentStatus.ONLINE,
    });
  }
  
  sendLeave() {
    sendMessage(MessageTypes.STUDENT_LEAVE, {
      studentId: this.studentId,
    });
  }
  
  sendHeartbeat() {
    sendMessage(MessageTypes.HEARTBEAT, {
      studentId: this.studentId,
    });
  }
  
  sendAnswer(questionId, answer, isCorrect) {
    sendMessage(MessageTypes.STUDENT_ANSWER_SUBMIT, {
      studentId: this.studentId,
      studentName: this.studentName,
      questionId,
      answer,
      isCorrect,
      timestamp: Date.now(),
    });
  }
  
  sendProgress(progress) {
    sendMessage(MessageTypes.STUDENT_PROGRESS, {
      studentId: this.studentId,
      ...progress,
    });
  }
  
  sendError(error) {
    sendMessage(MessageTypes.STUDENT_ERROR_REPORT, {
      studentId: this.studentId,
      error,
      timestamp: Date.now(),
    });
  }
  
  requestHelp() {
    sendMessage(MessageTypes.STUDENT_REQUEST_HELP, {
      studentId: this.studentId,
      studentName: this.studentName,
      timestamp: Date.now(),
    });
  }
}

// Singleton for global access
let globalClassManager = null;
let globalStudentCommunicator = null;

export function getClassManager() {
  if (!globalClassManager) {
    globalClassManager = new ClassManager();
  }
  return globalClassManager;
}

export function getStudentCommunicator() {
  if (!globalStudentCommunicator) {
    globalStudentCommunicator = new StudentCommunicator(
      localStorage.getItem('monopoly3d_student_id') || 'student_' + Date.now(),
      localStorage.getItem('monopoly3d_student_name') || '学生'
    );
  }
  return globalStudentCommunicator;
}
