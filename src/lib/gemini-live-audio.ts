import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { createBlob, decode, decodeAudioData } from './gemini-utils';
import { transcribeAndIdentifyTask } from './gemini-transcription';
import type { TranscriptionResult } from '../types/transcription';

// Hard-coded API key as requested
const GEMINI_API_KEY = 'AIzaSyCUwKFsTZQLM_avbJBmdVlGwuewPjdTtl8';

export class GeminiLiveAudio {
  private client: GoogleGenAI;
  private session: Session | null = null;
  private inputAudioContext: AudioContext;
  private outputAudioContext: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private nextStartTime = 0;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private isRecording = false;
  
  // Secondary processing for command detection
  private secondaryMediaRecorder: MediaRecorder | null = null;
  private secondaryAudioChunks: Blob[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  public onStatusChange?: (status: string) => void;
  public onError?: (error: string) => void;
  public onTaskDetected?: (result: TranscriptionResult) => void;

  constructor() {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });
    this.inputNode = this.inputAudioContext.createGain();
    this.outputNode = this.outputAudioContext.createGain();
    
    this.client = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });

    this.outputNode.connect(this.outputAudioContext.destination);
    this.initSession();
  }

  private async initSession() {
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';

    try {
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus('Connected to Gemini Live');
          },
          onmessage: async (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;

            if (audio) {
              this.nextStartTime = Math.max(
                this.nextStartTime,
                this.outputAudioContext.currentTime,
              );

              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                this.outputAudioContext,
                24000,
                1,
              );
              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputNode);
              source.addEventListener('ended', () => {
                this.sources.delete(source);
              });

              source.start(this.nextStartTime);
              this.nextStartTime = this.nextStartTime + audioBuffer.duration;
              this.sources.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            this.updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            this.updateStatus('Connection closed: ' + e.reason);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
          systemInstruction: `You are a helpful AI assistant with natural conversational abilities. When asked to perform actions related to:
          
          - Room/Environmental control (temperature, lighting, mood settings, etc.)
          - Opening applications (YouTube, Spotify, Netflix, etc.)
          - Playing videos, movies, or media content
          - Timer/reminder requests
          - Service requests (viewing menus, information, etc.)
          
          Always respond positively with phrases like "Sure, I can do that", "Of course, I'll help you with that", "Absolutely, let me take care of that for you", or similar affirmative responses. Then proceed with your normal helpful conversation.
          
          For all other conversations, respond naturally and helpfully as you normally would.`,
        },
      });
    } catch (e) {
      console.error('Failed to initialize session:', e);
      this.updateError('Failed to connect to Gemini Live');
    }
  }

  private updateStatus(msg: string) {
    this.onStatusChange?.(msg);
  }

  private updateError(msg: string) {
    this.onError?.(msg);
  }

  private startSecondaryProcessing(): void {
    if (!this.mediaStream || this.secondaryMediaRecorder) return;

    try {
      this.secondaryMediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'audio/webm',
      });
      this.secondaryAudioChunks = [];

      this.secondaryMediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.secondaryAudioChunks.push(event.data);
        }
      };

      this.secondaryMediaRecorder.onstop = async () => {
        if (this.secondaryAudioChunks.length > 0) {
          const audioBlob = new Blob(this.secondaryAudioChunks, { type: 'audio/webm' });
          await this.processAudioForCommands(audioBlob);
          this.secondaryAudioChunks = [];
        }
      };

      // Record in 5-second chunks for command processing to reduce duplicates
      this.secondaryMediaRecorder.start();
      this.processingInterval = setInterval(() => {
        if (this.secondaryMediaRecorder?.state === 'recording') {
          this.secondaryMediaRecorder.stop();
          setTimeout(() => {
            if (this.isRecording && this.secondaryMediaRecorder?.state === 'inactive') {
              this.secondaryMediaRecorder.start();
            }
          }, 200);
        }
      }, 5000);

    } catch (error) {
      console.warn('Secondary audio processing failed to start:', error);
    }
  }

  private stopSecondaryProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.secondaryMediaRecorder) {
      if (this.secondaryMediaRecorder.state === 'recording') {
        this.secondaryMediaRecorder.stop();
      }
      this.secondaryMediaRecorder = null;
    }

    this.secondaryAudioChunks = [];
  }

  private async processAudioForCommands(audioBlob: Blob): Promise<void> {
    try {
      const result = await transcribeAndIdentifyTask(audioBlob);
      
      // Only notify if a valid task was detected
      if (result.task.type !== 'none' && this.onTaskDetected) {
        this.onTaskDetected(result);
      }
    } catch (error) {
      console.warn('Command processing failed:', error);
      // Don't surface this error to the user as it's a secondary feature
    }
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      return;
    }

    await this.inputAudioContext.resume();
    await this.outputAudioContext.resume();

    this.updateStatus('Requesting microphone access...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      this.updateStatus('Listening...');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.inputNode);
      
      // Start secondary processing for command detection
      this.startSecondaryProcessing();

      // Load AudioWorklet processor
      try {
        await this.inputAudioContext.audioWorklet.addModule('/audio-processor.js');
        this.audioWorkletNode = new AudioWorkletNode(this.inputAudioContext, 'audio-processor');
        
        this.audioWorkletNode.port.onmessage = (event) => {
          if (!this.isRecording || !this.session) return;
          
          const pcmData = event.data;
          this.session.sendRealtimeInput({ media: createBlob(pcmData) });
        };

        this.sourceNode.connect(this.audioWorkletNode);
        this.audioWorkletNode.connect(this.inputAudioContext.destination);
      } catch (error) {
        console.warn('AudioWorklet not supported, falling back to deprecated ScriptProcessor');
        // Fallback for older browsers
        const bufferSize = 256;
        const scriptProcessor = this.inputAudioContext.createScriptProcessor(bufferSize, 1, 1);
        
        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          if (!this.isRecording || !this.session) return;
          const inputBuffer = audioProcessingEvent.inputBuffer;
          const pcmData = inputBuffer.getChannelData(0);
          this.session.sendRealtimeInput({ media: createBlob(pcmData) });
        };

        this.sourceNode.connect(scriptProcessor);
        scriptProcessor.connect(this.inputAudioContext.destination);
      }

      this.isRecording = true;
    } catch (err) {
      console.error('Error starting recording:', err);
      this.updateError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      this.stopRecording();
    }
  }

  stopRecording(): void {
    if (!this.isRecording) return;

    this.updateStatus('Disconnecting...');
    this.isRecording = false;

    // Stop secondary processing
    this.stopSecondaryProcessing();

    if (this.audioWorkletNode && this.sourceNode) {
      this.audioWorkletNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.audioWorkletNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Close the session when stopping recording to fully disconnect
    this.session?.close();
    this.session = null;

    this.updateStatus('Disconnected');
  }

  reset(): void {
    this.stopRecording();
    this.session?.close();
    this.initSession();
    this.updateStatus('Session reset');
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  destroy(): void {
    this.stopRecording();
    this.stopSecondaryProcessing();
    this.session?.close();
    this.inputAudioContext.close();
    this.outputAudioContext.close();
  }
}
