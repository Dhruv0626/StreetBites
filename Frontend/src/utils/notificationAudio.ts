/**
 * StreetBites Notification Audio & Voice Announcement Engine
 * 
 * Provides:
 * 1. Web Audio API synthesized notification chimes (zero external assets, 100% reliable).
 * 2. Role-aware Text-To-Speech (TTS) voice announcements for Vendor, Rider, and Customer.
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
 * Play a rich, multi-tone pleasant chime
 */
export function playNotificationChime(toneType: 'order' | 'delivery' | 'payout' | 'general' = 'order'): void {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Frequencies tailored to tone types
    let notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Crisp Order Chime)
    if (toneType === 'delivery') {
      notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6 (Active Delivery)
    } else if (toneType === 'payout') {
      notes = [440.0, 554.37, 659.25, 880.0]; // A4, C#5, E5, A5 (Cash/Payout)
    }

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Add warmth with soft envelope
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  } catch (err) {
    console.warn('Failed to play notification chime:', err);
  }
}

/**
 * Clean text for SpeechSynthesis (remove markdown, extra codes, hashes)
 */
function sanitizeSpeechText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[#*_`~[\]]/g, '')
    .replace(/₹\s*(\d+)/g, '$1 rupees')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Announce notification via voice (SpeechSynthesis)
 */
export function speakNotificationVoice(title: string, message: string, role?: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    // Cancel any active speech to avoid overlaps
    window.speechSynthesis.cancel();

    const cleanTitle = sanitizeSpeechText(title);
    const cleanMessage = sanitizeSpeechText(message);

    let prefix = 'Notification';
    const roleUpper = (role || '').toUpperCase();

    if (roleUpper === 'VENDOR') {
      prefix = 'Vendor alert';
    } else if (roleUpper === 'RIDER') {
      prefix = 'Rider alert';
    } else if (roleUpper === 'CUSTOMER' || roleUpper === 'USER') {
      prefix = 'StreetBites update';
    }

    // Compose concise, clear sentence
    const speechSentence = `${prefix}: ${cleanTitle}. ${cleanMessage}`;
    const utterance = new SpeechSynthesisUtterance(speechSentence);

    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Pick a high-quality natural voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferredVoice =
        voices.find(v => v.lang === 'en-IN' || v.name.includes('India')) ||
        voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
        voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Text to speech failed:', err);
  }
}

/**
 * Trigger combined Chime + Voice announcement
 */
export function triggerNotificationSoundAndVoice(
  title: string,
  message: string,
  role?: string,
  toneType: 'order' | 'delivery' | 'payout' | 'general' = 'order'
): void {
  // 1. Play auditory chime immediately
  playNotificationChime(toneType);

  // 2. Announce voice after brief delay so chime isn't drowned out
  setTimeout(() => {
    speakNotificationVoice(title, message, role);
  }, 220);
}
