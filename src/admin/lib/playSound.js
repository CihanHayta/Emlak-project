/**
 * Short notification chimes for the admin panel — synthesized with the Web
 * Audio API (no external .mp3/.wav asset to bundle or fail to load). One
 * shared `AudioContext`, created lazily on first use because browsers
 * refuse to start an AudioContext before a user gesture has happened on
 * the page (login button click, etc. — by the time any of these fire,
 * that's long since happened).
 */
let audioContext = null;

function getContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

/** A single short sine-wave tone. `time` is when (in AudioContext seconds) it should start. */
function tone(ctx, { frequency, startAt, durationMs, volume = 0.15 }) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const duration = durationMs / 1000;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function playChime(frequencies) {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    frequencies.forEach(({ frequency, delayMs, durationMs }) => {
      tone(ctx, { frequency, startAt: now + delayMs / 1000, durationMs });
    });
  } catch {
    // Sessizce yut — ses tarayıcı/ortam kısıtı yüzünden çalmazsa akışı bozmasın.
  }
}

/** Randevu oluşturuldu — kısa, net, yükselen iki nota. */
export function playAppointmentCreatedSound() {
  playChime([
    { frequency: 740, delayMs: 0, durationMs: 110 },
    { frequency: 988, delayMs: 90, durationMs: 160 },
  ]);
}

/** Yeni başvuru formu geldi — dikkat çekici, biraz daha belirgin üç nota. */
export function playNewLeadSound() {
  playChime([
    { frequency: 660, delayMs: 0, durationMs: 100 },
    { frequency: 880, delayMs: 90, durationMs: 100 },
    { frequency: 1108, delayMs: 180, durationMs: 180 },
  ]);
}

/** Satış hattında kart taşındı — hafif, tek nota (sık tetiklendiği için daha az müdahaleci). */
export function playPipelineMoveSound() {
  playChime([{ frequency: 523, delayMs: 0, durationMs: 90 }]);
}

/** Instagram/WhatsApp'tan yeni bir gelen mesaj — kısa, "pop" tarzı iki nota. */
export function playNewMessageSound() {
  playChime([
    { frequency: 880, delayMs: 0, durationMs: 90 },
    { frequency: 1318, delayMs: 70, durationMs: 130 },
  ]);
}
