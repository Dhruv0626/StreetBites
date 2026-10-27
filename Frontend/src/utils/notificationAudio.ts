/**
 * StreetBites Notification Audio Engine
 * 
 * Synthesizes a crisp, modern mobile message drop tone (reminiscent of WhatsApp / Snapchat / iOS)
 * using the browser's native Web Audio API (zero external assets, instant playback, zero network lag).
 * 
 * Per user specification: NO spoken voice (TTS) is used — purely a clean, satisfying mobile message drop tone.
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
 * Play a modern mobile message drop tone (WhatsApp / Snapchat style "pop & crystal ping")
 */
export function playNotificationChime(toneType: 'order' | 'delivery' | 'payout' | 'general' = 'order'): void {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Master gain for clear, pleasant volume without clipping
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.42, now);
    masterGain.connect(ctx.destination);

    // Warm biquad filter for smooth acoustic rounding
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4500, now);
    filter.Q.setValueAtTime(1.2, now);
    filter.connect(masterGain);

    if (toneType === 'payout') {
      // Payout / Cash register sparkle tone (3-note bright chime)
      const payoutNotes = [880.0, 1108.73, 1318.51]; // A5, C#6, E6
      payoutNotes.forEach((freq, idx) => {
        const start = now + idx * 0.065;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.35, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

        osc.connect(gain);
        gain.connect(filter);

        osc.start(start);
        osc.stop(start + 0.36);
      });
      return;
    }

    // Default / Order / Delivery Message Drop Tone:
    // Signature mobile messaging "bubble-pop & glassy ping" (WhatsApp/Snapchat style)

    // --- Component 1: The "Bubble Pop" transient (t = 0 to 0.055s) ---
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'sine';

    // Upward pitch droplet sweep (820 Hz -> 1180 Hz)
    popOsc.frequency.setValueAtTime(820, now);
    popOsc.frequency.exponentialRampToValueAtTime(1180, now + 0.038);

    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.linearRampToValueAtTime(0.36, now + 0.008);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.052);

    popOsc.connect(popGain);
    popGain.connect(filter);
    popOsc.start(now);
    popOsc.stop(now + 0.055);

    // --- Component 2: The Crystal "Ping" / Bell body (t = 0.055s to 0.32s) ---
    const pingStart = now + 0.055;
    // Crisp bell tone: 1396.9 Hz (F6) for order/message, 1480 Hz for delivery
    const pingFreq = toneType === 'delivery' ? 1479.98 : 1396.91;

    // Primary resonant tone
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(pingFreq, pingStart);
    pingOsc.frequency.exponentialRampToValueAtTime(pingFreq * 0.99, pingStart + 0.22);

    pingGain.gain.setValueAtTime(0.0001, pingStart);
    pingGain.gain.linearRampToValueAtTime(0.40, pingStart + 0.007);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, pingStart + 0.28);

    pingOsc.connect(pingGain);
    pingGain.connect(filter);
    pingOsc.start(pingStart);
    pingOsc.stop(pingStart + 0.30);

    // Subtle glassy harmonic overtone (gives modern mobile crispness)
    const overtoneOsc = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtoneOsc.type = 'sine';
    overtoneOsc.frequency.setValueAtTime(pingFreq * 2.02, pingStart);

    overtoneGain.gain.setValueAtTime(0.0001, pingStart);
    overtoneGain.gain.linearRampToValueAtTime(0.14, pingStart + 0.005);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, pingStart + 0.16);

    overtoneOsc.connect(overtoneGain);
    overtoneGain.connect(filter);
    overtoneOsc.start(pingStart);
    overtoneOsc.stop(pingStart + 0.18);

  } catch (err) {
    console.warn('Failed to play mobile notification tone:', err);
  }
}

/**
 * Disabled voice announcement: Notifications now purely play the mobile message drop tone.
 * Kept for signature compatibility without speaking.
 */
export function speakNotificationVoice(_title: string, _message: string, _role?: string): void {
  // Purely silent - no voice speaks on notification drop
}

/**
 * Trigger mobile message notification tone
 * (No spoken voice — plays WhatsApp/Snapchat style message drop tone)
 */
export function triggerNotificationSoundAndVoice(
  _title: string,
  _message: string,
  _role?: string,
  toneType: 'order' | 'delivery' | 'payout' | 'general' = 'order'
): void {
  // Play the signature mobile message drop tone immediately
  playNotificationChime(toneType);
}
