import { useState, useEffect, useRef } from 'react';
import { WakeWordDetection } from '@/lib/wake-word-detection';

interface UseWakeWordOptions {
  onWakeWordDetected: () => void;
  enabled?: boolean;
}

export const useWakeWord = ({ onWakeWordDetected, enabled = true }: UseWakeWordOptions) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Not initialized');
  const [error, setError] = useState<string | null>(null);
  const wakeWordRef = useRef<WakeWordDetection | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const initializeWakeWord = async () => {
      if (wakeWordRef.current) return;

      wakeWordRef.current = new WakeWordDetection({
        onWakeWordDetected: () => {
          console.log('Wake word "Hey Atlas" detected!');
          onWakeWordDetected();
          setStatus('Wake word detected! Activating AI...');
        },
        onError: (errorMsg) => {
          setError(errorMsg);
          setStatus('Error in wake word detection');
        },
        onStatusChange: (statusMsg) => {
          setStatus(statusMsg);
          setError(null);
        }
      });

      const initialized = await wakeWordRef.current.initialize();
      setIsInitialized(initialized);

      if (initialized) {
        await wakeWordRef.current.startListening();
        setIsListening(true);
      }
    };

    initializeWakeWord();

    return () => {
      if (wakeWordRef.current) {
        wakeWordRef.current.destroy();
        wakeWordRef.current = null;
      }
      setIsInitialized(false);
      setIsListening(false);
      setStatus('Not initialized');
    };
  }, [enabled, onWakeWordDetected]);

  const startListening = async () => {
    if (wakeWordRef.current && isInitialized) {
      await wakeWordRef.current.startListening();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (wakeWordRef.current) {
      wakeWordRef.current.stopListening();
      setIsListening(false);
    }
  };

  return {
    isInitialized,
    isListening,
    status,
    error,
    startListening,
    stopListening
  };
};