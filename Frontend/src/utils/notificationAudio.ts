/**
 * StreetBites Notification Audio Engine
 * 
 * Synthesizes a melodic 2.5–3 second music notification tone
 * using the browser's native Web Audio API (zero external files, instant playback).
 * 
 * Per user specification:
 * - 2 to 3 second musical tone.
 * - NO human voice speaking the notification message.
 */

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

// Initialize or resume Web Audio context on user gesture
export function initAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        isAudioUnlocked = true;
      }).catch(() => {});
    } else {
      isAudioUnlocked = true;
    }
    return audioCtx;
  } catch (err) {
    console.warn('AudioContext init error:', err);
    return null;
  }
}

// Auto-unlock audio on first user interaction anywhere on the window
if (typeof window !== 'undefined') {
  const unlockListener = () => {
    initAudioContext();
    if (isAudioUnlocked) {
      window.removeEventListener('click', unlockListener);
      window.removeEventListener('touchstart', unlockListener);
      window.removeEventListener('keydown', unlockListener);
    }
  };
  window.addEventListener('click', unlockListener, { once: false, passive: true });
  window.addEventListener('touchstart', unlockListener, { once: false, passive: true });
  window.addEventListener('keydown', unlockListener, { once: false, passive: true });
}

/**
 * Play a rich 2.5 to 3.0 second melodic music notification tone
 */
export function playNotificationChime(toneType: 'order' | 'delivery' | 'payout' | 'general' = 'order'): void {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Master gain node for clean, pleasant listening level
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.38, now);
    masterGain.connect(ctx.destination);

    // Warm biquad lowpass filter for silky, organic acoustic timbre
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3800, now);
    filter.Q.setValueAtTime(1.1, now);
    filter.connect(masterGain);

    // Melodic structure: 2.6 - 2.8 second musical motif
    // Each note has: [freq, startTimeOffset, duration, volumeWeight]
    let melody: Array<[number, number, number, number]>;

    if (toneType === 'payout') {
      // Golden celebratory chime melody (~2.6s)
      melody = [
        [554.37, 0.00, 0.45, 0.28], // C#5
        [659.25, 0.24, 0.45, 0.32], // E5
        [830.61, 0.50, 0.55, 0.36], // G#5
        [1108.73, 0.82, 0.65, 0.40], // C#6
        [1318.51, 1.20, 0.70, 0.42], // E6
        [1661.22, 1.65, 1.10, 0.38], // G#6 (long ringing sustain)
      ];
    } else if (toneType === 'delivery') {
      // Dynamic delivery alert melody (~2.6s)
      melody = [
        [587.33, 0.00, 0.40, 0.28], // D5
        [739.99, 0.22, 0.45, 0.32], // F#5
        [880.00, 0.48, 0.50, 0.36], // A5
        [1174.66, 0.78, 0.60, 0.40], // D6
        [1479.98, 1.15, 0.70, 0.42], // F#6
        [1174.66, 1.60, 1.10, 0.38], // D6 (warm resolution)
      ];
    } else {
      // Signature StreetBites 2.7-second cheerful musical chime
      // Uplifting arpeggio resolving into a warm crystal bell
      melody = [
        [523.25, 0.00, 0.45, 0.30], // C5
        [659.25, 0.22, 0.45, 0.34], // E5
        [783.99, 0.46, 0.50, 0.38], // G5
        [1046.50, 0.75, 0.65, 0.42], // C6
        [1318.51, 1.10, 0.75, 0.44], // E6
        [1046.50, 1.55, 1.20, 0.40], // C6 (long crystal resonance resolving until ~2.75s)
      ];
    }

    // Synthesize each note with primary sine + gentle harmonic overtone
    melody.forEach(([freq, offset, duration, gainVal]) => {
      const noteStart = now + offset;
      const noteEnd = noteStart + duration;

      // 1. Primary fundamental oscillator
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      // Organic marimba/bell attack & decay curve
      noteGain.gain.setValueAtTime(0.0001, noteStart);
      noteGain.gain.linearRampToValueAtTime(gainVal, noteStart + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      osc.connect(noteGain);
      noteGain.connect(filter);

      osc.start(noteStart);
      osc.stop(noteEnd);

      // 2. Subtle glassy overtone (2x octave) for acoustic shine
      const overtoneOsc = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      overtoneOsc.type = 'sine';
      overtoneOsc.frequency.setValueAtTime(freq * 2.01, noteStart);

      overtoneGain.gain.setValueAtTime(0.0001, noteStart);
      overtoneGain.gain.linearRampToValueAtTime(gainVal * 0.25, noteStart + 0.008);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration * 0.4);

      overtoneOsc.connect(overtoneGain);
      overtoneGain.connect(filter);

      overtoneOsc.start(noteStart);
      overtoneOsc.stop(noteStart + duration * 0.42);
    });

  } catch (err) {
    console.warn('Failed to play 2-3s notification music tone:', err);
  }
}

/**
 * Disabled voice announcement: Strictly silent.
 * No human voice speaks the notification message.
 */
export function speakNotificationVoice(_title: string, _message: string, _role?: string): void {
  // Purely silent - per user instruction, no human voice reads notification text
}

/**
 * Trigger notification tone
 * Plays the 2 to 3 second musical tone. Zero spoken voice.
 */
export function triggerNotificationSoundAndVoice(
  _title: string,
  _message: string,
  _role?: string,
  toneType: 'order' | 'delivery' | 'payout' | 'general' = 'order'
): void {
  playNotificationChime(toneType);
}
