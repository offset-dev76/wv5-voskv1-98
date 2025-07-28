import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = (onRecordingComplete: (blob: Blob) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // The onstop event handler will handle the rest.
    }
  }, []);

  const startRecording = useCallback(async () => {
    setPermissionError(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsRecording(true);
        
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          onRecordingComplete(audioBlob);
          // Stop all media tracks to turn off the microphone indicator
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        };
        
        recorder.start();

      } catch (err) {
        console.error("Error accessing microphone:", err);
        const errorMessage = err instanceof Error ? err.message : 'Could not access microphone.';
        setPermissionError(`Microphone access denied. Please enable it in your browser settings. Error: ${errorMessage}`);
        setIsRecording(false);
      }
    } else {
        setPermissionError('Audio recording is not supported by this browser.');
    }
  }, [onRecordingComplete]);

  return { isRecording, startRecording, stopRecording, permissionError };
};