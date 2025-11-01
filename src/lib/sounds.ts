/**
 * Sound Manager
 * Handles audio notifications for matchmaking events
 */

export type SoundType = 'match-found' | 'queue-join' | 'queue-leave' | 'notification';

export class SoundManager {
  private static instance: SoundManager;
  private enabled: boolean = true;
  private audioContext: AudioContext | null = null;

  private constructor() {
    // Check if user has sound enabled in localStorage
    const soundPref = localStorage.getItem('kido-sound-enabled');
    this.enabled = soundPref !== 'false'; // Default to enabled
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private initAudioContext(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('[SoundManager] Failed to initialize audio context:', error);
      }
    }
  }

  /**
   * Enable sounds
   */
  enable(): void {
    this.enabled = true;
    localStorage.setItem('kido-sound-enabled', 'true');
  }

  /**
   * Disable sounds
   */
  disable(): void {
    this.enabled = false;
    localStorage.setItem('kido-sound-enabled', 'false');
  }

  /**
   * Toggle sound on/off
   */
  toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem('kido-sound-enabled', this.enabled ? 'true' : 'false');
    return this.enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a simple beep using Web Audio API
   */
  private playBeep(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.enabled) return;

    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      // Fade in/out to avoid clicks
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.linearRampToValueAtTime(0.3, now + duration - 0.01);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.error('[SoundManager] Failed to play sound:', error);
    }
  }

  /**
   * Play match found sound (exciting!)
   */
  playMatchFound(): void {
    if (!this.enabled) return;

    // Play ascending chord
    setTimeout(() => this.playBeep(523.25, 0.15, 'triangle'), 0);    // C5
    setTimeout(() => this.playBeep(659.25, 0.15, 'triangle'), 100);  // E5
    setTimeout(() => this.playBeep(783.99, 0.3, 'triangle'), 200);   // G5
  }

  /**
   * Play queue join sound (positive)
   */
  playQueueJoin(): void {
    if (!this.enabled) return;
    this.playBeep(440, 0.1, 'sine'); // A4
    setTimeout(() => this.playBeep(554.37, 0.15, 'sine'), 80); // C#5
  }

  /**
   * Play queue leave sound (neutral)
   */
  playQueueLeave(): void {
    if (!this.enabled) return;
    this.playBeep(440, 0.1, 'sine'); // A4
    setTimeout(() => this.playBeep(349.23, 0.15, 'sine'), 80); // F4
  }

  /**
   * Play generic notification sound
   */
  playNotification(): void {
    if (!this.enabled) return;
    this.playBeep(800, 0.1, 'sine');
  }

  /**
   * Play sound by type
   */
  play(type: SoundType): void {
    switch (type) {
      case 'match-found':
        this.playMatchFound();
        break;
      case 'queue-join':
        this.playQueueJoin();
        break;
      case 'queue-leave':
        this.playQueueLeave();
        break;
      case 'notification':
        this.playNotification();
        break;
    }
  }
}

// Export singleton instance
export const soundManager = SoundManager.getInstance();
