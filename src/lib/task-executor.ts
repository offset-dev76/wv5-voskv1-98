import type { Task } from '@/types/transcription';

// App URL mappings
const APP_URLS = {
  youtube: 'https://youtube.com',
  netflix: 'https://netflix.com',
  'pluto tv': 'https://pluto.tv',
  'pluto': 'https://pluto.tv',
  plex: 'https://app.plex.tv',
  'youtube music': 'https://music.youtube.com',
  spotify: 'https://open.spotify.com',
  disney: 'https://disneyplus.com',
  'disney plus': 'https://disneyplus.com',
  primevideo: 'https://primevideo.com',
  'prime video': 'https://primevideo.com',
  amazon: 'https://primevideo.com',
} as const;

// Search URL patterns
const SEARCH_URLS = {
  youtube: (query: string) => `https://youtube.com/results?search_query=${encodeURIComponent(query)}`,
  'youtube music': (query: string) => `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
  spotify: (query: string) => `https://open.spotify.com/search/${encodeURIComponent(query)}`,
  netflix: (query: string) => `https://netflix.com/search?q=${encodeURIComponent(query)}`,
  plex: (query: string) => `https://app.plex.tv/desktop/#!/search?query=${encodeURIComponent(query)}`,
} as const;

export class TaskExecutor {
  /**
   * Execute a task based on the detected command
   */
  static async executeTask(task: Task): Promise<{ success: boolean; message: string }> {
    try {
      switch (task.type) {
        case 'open_app':
          return this.handleOpenApp(task);
        
        case 'timer':
          return this.handleTimer(task);
        
        case 'environment_control':
          return this.handleEnvironmentControl(task);
        
        case 'service_request':
          return this.handleServiceRequest(task);
        
        case 'none':
          return { success: false, message: 'No actionable command detected' };
        
        default:
          return { success: false, message: 'Unknown task type' };
      }
    } catch (error) {
      console.error('Task execution error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Handle opening apps with optional search functionality
   */
  private static handleOpenApp(task: Task): { success: boolean; message: string } {
    const appName = task.payload?.name?.toLowerCase();
    const searchQuery = task.payload?.search_query || task.payload?.query;

    if (!appName) {
      return { success: false, message: 'App name not specified' };
    }

    // If there's a search query, use search URL
    if (searchQuery && SEARCH_URLS[appName as keyof typeof SEARCH_URLS]) {
      const searchUrl = SEARCH_URLS[appName as keyof typeof SEARCH_URLS](searchQuery);
      window.open(searchUrl, '_blank');
      return { 
        success: true, 
        message: `Searching for \"${searchQuery}\" on ${appName}` 
      };
    }

    // Otherwise just open the app
    const appUrl = APP_URLS[appName as keyof typeof APP_URLS];
    if (appUrl) {
      window.open(appUrl, '_blank');
      return { 
        success: true, 
        message: `Opening ${appName}` 
      };
    }

    return { 
      success: false, 
      message: `App \"${appName}\" not supported. Available apps: ${Object.keys(APP_URLS).join(', ')}` 
    };
  }

  /**
   * Handle timer/reminder tasks
   */
  private static handleTimer(task: Task): { success: boolean; message: string } {
    const duration = task.payload?.duration;
    
    if (!duration) {
      return { success: false, message: 'Timer duration not specified' };
    }

    // Parse duration (basic implementation)
    const durationMs = this.parseDuration(duration);
    
    if (durationMs <= 0) {
      return { success: false, message: 'Invalid duration format' };
    }

    // Set the timer
    setTimeout(() => {
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Timer Complete!', {
          body: `Your ${duration} timer has finished.`,
          icon: '/favicon.ico'
        });
      } else {
        alert(`Timer Complete! Your ${duration} timer has finished.`);
      }
    }, durationMs);

    return { 
      success: true, 
      message: `Timer set for ${duration}` 
    };
  }

  /**
   * Handle environment control tasks
   */
  private static handleEnvironmentControl(task: Task): { success: boolean; message: string } {
    const device = task.payload?.device;
    const action = task.payload?.action;
    const value = task.payload?.value;

    // This is a placeholder for smart home integration
    // In a real implementation, this would connect to IoT devices
    return { 
      success: true, 
      message: `Environment control simulated: ${device} - ${action}${value ? ` (${value})` : ''}` 
    };
  }

  /**
   * Handle service requests
   */
  private static handleServiceRequest(task: Task): { success: boolean; message: string } {
    const request = task.payload?.request;

    switch (request) {
      case 'view_menu':
        // Placeholder for hotel menu or restaurant menu
        return { 
          success: true, 
          message: 'Menu service requested - this would show available menus' 
        };
      
      default:
        return { 
          success: true, 
          message: `Service request noted: ${request}` 
        };
    }
  }

  /**
   * Parse duration strings like \"5 minutes\", \"1 hour\", \"30 seconds\"
   */
  private static parseDuration(duration: string): number {
    const cleanDuration = duration.toLowerCase().trim();
    
    // Extract number and unit
    const match = cleanDuration.match(/(\d+)\s*(second|seconds|sec|minute|minutes|min|hour|hours|hr)/);
    
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'second':
      case 'seconds':
      case 'sec':
        return value * 1000;
      case 'minute':
      case 'minutes':
      case 'min':
        return value * 60 * 1000;
      case 'hour':
      case 'hours':
      case 'hr':
        return value * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  /**
   * Request notification permission (call this when the app initializes)
   */
  static async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }
}
