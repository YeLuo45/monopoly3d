/**
 * ReplayPlayer - Playback engine for recorded game events
 * 
 * Features:
 * - Play/pause/resume/stop controls
 * - Variable speed playback (0.5x, 1x, 2x, 4x)
 * - Seek to specific event
 * - Progress tracking
 * - Re-publishes events to eventBus for UI reactivity
 */

class ReplayPlayer {
  /**
   * @param {EventBus} eventBus - Event bus to publish events to
   * @param {object} replay - Replay data from GameReplay.getRecording()
   */
  constructor(eventBus, replay) {
    this.eventBus = eventBus;
    this.replay = replay;
    
    // Playback state
    this._currentIndex = 0;
    this._isPlaying = false;
    this.speed = 1.0;
    this.pauseTime = null;
    
    // Timer reference
    this._timer = null;
    
    // Valid speeds
    this.validSpeeds = [0.5, 1.0, 2.0, 4.0];
  }

  /**
   * Get total number of events
   * @returns {number}
   */
  get totalEvents() {
    return this.replay.events ? this.replay.events.length : 0;
  }

  /**
   * Start or resume playback
   * @param {number} speed - Playback speed (0.5, 1.0, 2.0, 4.0)
   */
  play(speed = 1.0) {
    if (this.totalEvents === 0) {
      console.warn('No events to play');
      return;
    }
    
    // Validate speed
    if (!this.validSpeeds.includes(speed)) {
      speed = 1.0;
    }
    this.speed = speed;
    
    // If already at end, restart from beginning
    if (this._currentIndex >= this.totalEvents) {
      this._currentIndex = 0;
    }
    
    this._isPlaying = true;
    this.pauseTime = null;
    
    this._scheduleNext();
  }

  /**
   * Internal: Schedule the next event
   */
  _scheduleNext() {
    if (!this._isPlaying) return;
    
    if (this._currentIndex >= this.totalEvents) {
      this.stop();
      return;
    }
    
    const event = this.replay.events[this._currentIndex];
    
    // Calculate delay based on timestamp and speed
    let delay = 100; // Default delay in ms
    
    if (this._currentIndex > 0) {
      const prevEvent = this.replay.events[this._currentIndex - 1];
      const eventTimeDiff = event.timestamp - prevEvent.timestamp;
      delay = Math.min(Math.max(eventTimeDiff / this.speed, 50), 5000); // 50ms-5s range
    }
    
    this._timer = setTimeout(() => {
      this._publishCurrentEvent();
      this._currentIndex++;
      
      if (this._isPlaying) {
        this._scheduleNext();
      }
    }, delay);
  }

  /**
   * Internal: Publish current event to eventBus
   */
  _publishCurrentEvent() {
    const event = this.replay.events[this._currentIndex];
    
    if (event) {
      this.eventBus.publish(event.type, event.data);
    }
  }

  /**
   * Pause playback
   */
  pause() {
    if (!this._isPlaying) return;
    
    this._isPlaying = false;
    this.pauseTime = Date.now();
    
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * Resume playback from paused position
   */
  resume() {
    if (this._isPlaying) return;
    if (this._currentIndex >= this.totalEvents) {
      this._currentIndex = 0; // Restart if at end
    }
    
    this._isPlaying = true;
    this.pauseTime = null;
    
    this._scheduleNext();
  }

  /**
   * Seek to specific event index
   * @param {number} eventIndex - Target event index
   */
  seekTo(eventIndex) {
    if (eventIndex < 0) eventIndex = 0;
    if (eventIndex >= this.totalEvents) eventIndex = this.totalEvents - 1;
    
    this._currentIndex = eventIndex;
    
    // If playing, we need to reschedule
    if (this._isPlaying) {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
      this._scheduleNext();
    }
  }

  /**
   * Stop playback and reset
   */
  stop() {
    this._isPlaying = false;
    this._currentIndex = 0;
    this.pauseTime = null;
    
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * Get current event index
   * @returns {number}
   */
  getCurrentIndex() {
    return this._currentIndex;
  }

  /**
   * Get playback progress
   * @returns {object} {currentIndex, totalEvents, percentage}
   */
  getProgress() {
    const total = this.totalEvents;
    const current = this._currentIndex;
    // Show 100% when at or past the last event, otherwise calculate percentage
    const percentage = total > 0 
      ? (current >= total - 1 ? 100 : Math.round((current / total) * 100))
      : 0;
    
    return {
      currentIndex: current,
      totalEvents: total,
      percentage: percentage,
    };
  }

  /**
   * Check if currently playing
   * @returns {boolean}
   */
  isPlaying() {
    return this._isPlaying;
  }
}

export { ReplayPlayer };