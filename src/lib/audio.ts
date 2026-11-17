type SoundKind = 'tick' | 'rotate' | 'fold';

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
let context: AudioContext | undefined;
let resuming: Promise<void> | undefined;
let lastRotation = -Infinity;

/** Call from a pointer/keyboard interaction; unsupported or blocked audio is silent. */
export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const now = performance.now();
    if (kind === 'rotate' && now - lastRotation < 90) return;
    if (kind === 'rotate') lastRotation = now;

    const Constructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Constructor) return;
    if (!context || context.state === 'closed') context = new Constructor();
    const audio = context;
    const sound = () => {
      try {
        if (audio.state !== 'running') return;
        const start = audio.currentTime;
        const duration = kind === 'fold' ? 0.16 : kind === 'rotate' ? 0.045 : 0.065;
        const oscillator = audio.createOscillator();
        const overtone = audio.createOscillator();
        const gain = audio.createGain();
        const filter = audio.createBiquadFilter();
        oscillator.type = 'triangle';
        overtone.type = 'sine';
        const frequency = kind === 'fold' ? 175 : kind === 'rotate' ? 310 : 460;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(65, start + duration);
        overtone.frequency.setValueAtTime(frequency * 2.31, start);
        overtone.frequency.exponentialRampToValueAtTime(110, start + duration);
        filter.type = 'lowpass';
        filter.frequency.value = 1600;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(kind === 'fold' ? 0.025 : 0.018, start + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(filter);
        overtone.connect(filter);
        filter.connect(gain);
        gain.connect(audio.destination);
        overtone.onended = () => {
          oscillator.disconnect();
          overtone.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        overtone.start(start);
        oscillator.stop(start + duration + 0.01);
        overtone.stop(start + duration + 0.01);
      } catch {
        // Audio must never interrupt the interaction that requested it.
      }
    };
    if (audio.state === 'running') sound();
    else if (!resuming) {
      // Invoke resume synchronously while the user activation is still available.
      resuming = audio.resume().then(sound).catch(() => {}).finally(() => {
        resuming = undefined;
      });
    }
  } catch {
    // Some browsers expose Web Audio but disallow constructing a context.
  }
}
