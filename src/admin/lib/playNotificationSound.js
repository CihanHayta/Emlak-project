/**
 * The "ding" played whenever a new notification arrives (bell badge, new
 * lead form, etc). Uses a real sound file (see src/notifications/) rather
 * than a synthesized tone; falls back to a synthesized two-tone beep if
 * playback fails for any reason (blocked autoplay before user interaction,
 * browser without Audio support, ...) so a missing/blocked sound never
 * throws an error the user would see.
 */
import notificationSoundUrl from "../../notifications/universfield-new-notification-056-494256.mp3";

function playSynthesizedFallback() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (frequency, startTime, duration) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.12);
    playTone(1318.5, now + 0.1, 0.18);
    setTimeout(() => ctx.close(), 400);
  } catch {
    // Autoplay/audio can be blocked by the browser — a missed notification
    // sound isn't worth surfacing an error for.
  }
}

export function playNotificationSound() {
  try {
    const audio = new Audio(notificationSoundUrl);
    audio.volume = 0.5;
    audio.play().catch(() => playSynthesizedFallback());
  } catch {
    playSynthesizedFallback();
  }
}
