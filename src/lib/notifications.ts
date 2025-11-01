/**
 * Notification Manager
 * Handles browser notifications and permissions for matchmaking events
 */

export type NotificationType = 'match-found' | 'match-accepted' | 'game-ready';

export class NotificationManager {
  private static instance: NotificationManager;
  private hasPermission: boolean = false;

  private constructor() {
    this.checkPermission();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Check if browser supports notifications
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Check current permission status
   */
  private checkPermission(): void {
    if (this.isSupported()) {
      this.hasPermission = Notification.permission === 'granted';
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[NotificationManager] Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('[NotificationManager] Notifications denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('[NotificationManager] Failed to request permission:', error);
      return false;
    }
  }

  /**
   * Show a notification
   */
  async notify(type: NotificationType, data: {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
  }): Promise<void> {
    if (!this.isSupported() || !this.hasPermission) {
      console.log('[NotificationManager] Cannot show notification:', type);
      return;
    }

    try {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/icon.png',
        tag: data.tag || type,
        requireInteraction: type === 'match-found', // Keep match-found visible
        badge: '/badge.png',
      });

      // Auto-close after 10 seconds (except match-found)
      if (type !== 'match-found') {
        setTimeout(() => notification.close(), 10000);
      }

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('[NotificationManager] Failed to show notification:', error);
    }
  }

  /**
   * Show match found notification
   */
  async notifyMatchFound(opponentName: string, opponentRating: number): Promise<void> {
    await this.notify('match-found', {
      title: '🎮 Match Found!',
      body: `Opponent: ${opponentName} (${opponentRating} rating)`,
      tag: 'match-found',
    });
  }

  /**
   * Show game ready notification
   */
  async notifyGameReady(): Promise<void> {
    await this.notify('game-ready', {
      title: '⚔️ Game Starting!',
      body: 'Your ranked match is ready. Good luck!',
      tag: 'game-ready',
    });
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    // Note: Can't programmatically clear notifications in modern browsers
    // They auto-clear or user must dismiss them
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();
