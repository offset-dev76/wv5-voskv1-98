interface WakeWordOptions {
  onWakeWordDetected: () => void;
  onError: (error: string) => void;
  onStatusChange: (status: string) => void;
}

// Extended Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class WakeWordDetection {
  private recognition: any = null;
  private isListening = false;
  private options: WakeWordOptions;
  private wakeWords = ['hey atlas', 'atlas', 'hey, atlas'];
  private isSupported = false;

  constructor(options: WakeWordOptions) {
    this.options = options;
    this.isSupported = this.checkSupport();
  }

  private checkSupport(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  async initialize() {
    if (!this.isSupported) {
      this.options.onError('Speech recognition not supported in this browser');
      return false;
    }

    try {
      this.options.onStatusChange('Initializing wake word detection...');
      
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create speech recognition instance
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      // Set up event handlers
      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i].transcript.toLowerCase().trim();
          if (transcript) {
            this.checkForWakeWord(transcript);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.options.onError('Microphone access denied. Please enable it and refresh the page.');
        } else if (event.error === 'network') {
          this.options.onError('Network error. Wake word detection may not work properly.');
        } else {
          this.options.onError(`Speech recognition error: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        // Automatically restart recognition if we're supposed to be listening
        if (this.isListening) {
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (error) {
                console.error('Failed to restart recognition:', error);
              }
            }
          }, 1000);
        }
      };
      
      this.options.onStatusChange('Wake word detection ready');
      return true;
    } catch (error) {
      console.error('Failed to initialize wake word detection:', error);
      this.options.onError('Failed to initialize wake word detection');
      return false;
    }
  }

  async startListening() {
    if (this.isListening || !this.recognition) return;

    try {
      this.options.onStatusChange('Starting wake word listening...');
      this.recognition.start();
      this.isListening = true;
      this.options.onStatusChange('Listening for "Hey Atlas"...');
    } catch (error) {
      console.error('Failed to start wake word listening:', error);
      this.options.onError('Failed to start wake word detection');
    }
  }

  stopListening() {
    if (!this.isListening || !this.recognition) return;

    this.isListening = false;
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
    this.options.onStatusChange('Wake word detection stopped');
  }

  private checkForWakeWord(text: string) {
    // Check if any wake word is detected in the text
    const isWakeWordDetected = this.wakeWords.some(wakeWord => 
      text.includes(wakeWord)
    );

    if (isWakeWordDetected) {
      console.log('Wake word detected:', text);
      this.options.onWakeWordDetected();
      this.options.onStatusChange('Wake word detected! Activating AI...');
      
      // Brief pause after wake word detection
      setTimeout(() => {
        if (this.isListening) {
          this.options.onStatusChange('Listening for "Hey Atlas"...');
        }
      }, 2000);
    }
  }

  destroy() {
    this.stopListening();
    this.recognition = null;
  }

  get listening() {
    return this.isListening;
  }

  get supported() {
    return this.isSupported;
  }
}