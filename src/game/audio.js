// Audio system using Web Audio API for sound effects and BGM
// Synthesized sounds - no external audio files needed

let audioContext = null;
let bgmOscillators = [];
let bgmGain = null;
let masterGain = null;
let isMuted = false;
let bgmPlaying = false;
let currentVolume = 0.3;

// Initialize audio context (must be called after user interaction)
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = currentVolume;
  }
  return audioContext;
}

// Resume audio context if suspended (browser autoplay policy)
export async function resumeAudio() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

// Set master volume (0 to 1)
export function setVolume(volume) {
  currentVolume = Math.max(0, Math.min(1, volume));
  if (masterGain && !isMuted) {
    masterGain.gain.setTargetAtTime(currentVolume, audioContext.currentTime, 0.1);
  }
}

// Mute/unmute
export function toggleMute() {
  isMuted = !isMuted;
  if (masterGain) {
    masterGain.gain.setTargetAtTime(isMuted ? 0 : currentVolume, audioContext.currentTime, 0.1);
  }
  return isMuted;
}

export function getIsMuted() {
  return isMuted;
}

// Play a sound effect by type
export function playSound(type) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') return;

  const now = ctx.currentTime;

  switch (type) {
    case 'dice': {
      // Short rolling sound - white noise burst
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 1;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.15);
      break;
    }

    case 'diceStop': {
      // Short click when dice stops
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    case 'purchase': {
      // Coin/jingle sound - two-tone chime
      const frequencies = [880, 1320];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
      break;
    }

    case 'rent': {
      // Payment sound - descending tones
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }

    case 'correct': {
      // Rising happy chime - ascending major chord
      const notes = [523, 659, 784]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.3);
      });
      break;
    }

    case 'wrong': {
      // Descending sad tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }

    case 'build': {
      // Construction/hammer sound - short noise burst
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.1);
      // Add a thud
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
      oscGain.gain.setValueAtTime(0.12, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.08);
      break;
    }

    case 'win': {
      // Victory fanfare - ascending arpeggio
      const notes = [523, 659, 784, 1047, 1319, 1568]; // C5 E5 G5 C6 E6 G6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
      break;
    }

    case 'click': {
      // UI click feedback
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.03);
      break;
    }

    case 'error': {
      // Error buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 200;
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.setValueAtTime(0.05, now + 0.05);
      gain.gain.setValueAtTime(0.05, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }

    default:
      break;
  }
}

// Simple BGM using oscillator synthesis
// A simple looping melody with chord accompaniment
const BGM_NOTES = [
  // Bar 1-2: C G Am F (I-V-vi-IV progression)
  { note: 'C4', duration: 0.4 },
  { note: 'G3', duration: 0.4 },
  { note: 'A3', duration: 0.4 },
  { note: 'F3', duration: 0.4 },
  // Bar 3-4
  { note: 'C4', duration: 0.4 },
  { note: 'G3', duration: 0.4 },
  { note: 'F3', duration: 0.4 },
  { note: 'G3', duration: 0.4 },
  // Bar 5-6: F G C (IV-V-I)
  { note: 'F3', duration: 0.4 },
  { note: 'G3', duration: 0.4 },
  { note: 'C4', duration: 0.8 },
  // Bar 7-8
  { note: 'E4', duration: 0.4 },
  { note: 'F4', duration: 0.4 },
  { note: 'G3', duration: 0.4 },
  { note: 'C4', duration: 0.4 },
];

const NOTE_FREQUENCIES = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
};

let bgmInterval = null;
let bgmIndex = 0;
let bgmStartTime = 0;

function playBGMLoop() {
  if (!bgmPlaying) return;
  
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') return;
  
  const now = ctx.currentTime;
  const noteData = BGM_NOTES[bgmIndex];
  const freq = NOTE_FREQUENCIES[noteData.note];
  
  if (!freq) {
    bgmIndex = (bgmIndex + 1) % BGM_NOTES.length;
    return;
  }

  // Lead melody
  const leadOsc = ctx.createOscillator();
  const leadGain = ctx.createGain();
  leadOsc.type = 'sine';
  leadOsc.frequency.value = freq;
  leadGain.gain.setValueAtTime(0.08, now);
  leadGain.gain.exponentialRampToValueAtTime(0.01, now + noteData.duration * 0.9);
  leadOsc.connect(leadGain);
  leadGain.connect(masterGain);
  leadOsc.start(now);
  leadOsc.stop(now + noteData.duration);

  // Bass accompaniment (lower octave)
  const bassFreq = freq / 2;
  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bassOsc.type = 'triangle';
  bassOsc.frequency.value = bassFreq;
  bassGain.gain.setValueAtTime(0.05, now);
  bassGain.gain.exponentialRampToValueAtTime(0.01, now + noteData.duration * 0.8);
  bassOsc.connect(bassGain);
  bassGain.connect(masterGain);
  bassOsc.start(now);
  bassOsc.stop(now + noteData.duration);

  // Schedule next note
  bgmIndex = (bgmIndex + 1) % BGM_NOTES.length;
  const nextDelay = noteData.duration * 1000;
  bgmInterval = setTimeout(playBGMLoop, nextDelay);
}

export function playBGM() {
  if (bgmPlaying) return;
  bgmPlaying = true;
  bgmIndex = 0;
  playBGMLoop();
}

export function stopBGM() {
  bgmPlaying = false;
  if (bgmInterval) {
    clearTimeout(bgmInterval);
    bgmInterval = null;
  }
}

export function getBgmPlaying() {
  return bgmPlaying;
}

// Initialize audio on first user interaction
export function initAudioOnInteraction() {
  const handler = () => {
    resumeAudio();
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler);
  document.addEventListener('keydown', handler);
}

export default {
  playSound,
  playBGM,
  stopBGM,
  toggleMute,
  setVolume,
  getIsMuted,
  getBgmPlaying,
  resumeAudio,
  initAudioOnInteraction,
};
