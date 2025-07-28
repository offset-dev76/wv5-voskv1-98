import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, X, Brain, RotateCcw, Sparkles, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-nav";
import { GeminiLiveAudio } from "@/lib/gemini-live-audio";
import { TaskExecutor } from "@/lib/task-executor";
import type { TranscriptionResult } from "@/types/transcription";

interface AIOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isMinimized?: boolean;
  onOrderDetected?: (itemName: string, quantity?: number) => void;
}

export const AIOverlay = ({ 
  isOpen, 
  onClose,
  isMinimized = false,
  onOrderDetected
}: AIOverlayProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready to speak");
  const [error, setError] = useState("");
  const [lastDetectedTask, setLastDetectedTask] = useState<TranscriptionResult | null>(null);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; message: string } | null>(null);
  const geminiLiveRef = useRef<GeminiLiveAudio | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const startRecording = async () => {
    if (!geminiLiveRef.current || isRecording) return;
    
    setError("");
    await geminiLiveRef.current.startRecording();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!geminiLiveRef.current || !isRecording) return;
    
    geminiLiveRef.current.stopRecording();
    setIsRecording(false);
  };

  const handleClose = () => {
    // Ensure full disconnection when closing overlay
    if (geminiLiveRef.current) {
      geminiLiveRef.current.destroy();
      geminiLiveRef.current = null;
      setIsRecording(false);
      setStatus("Ready to speak");
      setError("");
    }
    onClose();
  };

  const resetSession = () => {
    if (!geminiLiveRef.current) return;
    
    geminiLiveRef.current.reset();
    setIsRecording(false);
    setError("");
  };

  // Initialize Gemini Live Audio when overlay opens and auto-start recording
  useEffect(() => {
    let autoStart = false;
    if (isOpen && !geminiLiveRef.current) {
      // Request notification permission
      TaskExecutor.requestNotificationPermission();
      geminiLiveRef.current = new GeminiLiveAudio();
      geminiLiveRef.current.onStatusChange = setStatus;
      geminiLiveRef.current.onError = setError;
      geminiLiveRef.current.onTaskDetected = async (result: TranscriptionResult) => {
        setLastDetectedTask(result);
        // Execute the task if it's not 'none'
        if (result.task.type !== 'none') {
          const execResult = await TaskExecutor.executeTask(result.task);
          setExecutionResult(execResult);
          // Auto-close the overlay and stop recording after command execution
          setTimeout(() => {
            handleClose();
          }, 1500);
          // Auto-clear execution result after 4 seconds
          setTimeout(() => setExecutionResult(null), 4000);
        }
        // Auto-clear the task after 5 seconds
        setTimeout(() => setLastDetectedTask(null), 5000);
      };
      autoStart = true;
    }
    // Auto-start recording when overlay opens
    if (isOpen && autoStart) {
      setTimeout(() => {
        startRecording();
      }, 100); // slight delay to ensure GeminiLiveAudio is ready
    }
    return () => {
      if (!isOpen && geminiLiveRef.current) {
        geminiLiveRef.current.destroy();
        geminiLiveRef.current = null;
        setIsRecording(false);
        setStatus("Ready to speak");
        setError("");
        setLastDetectedTask(null);
        setExecutionResult(null);
      }
    };
  }, [isOpen]);

  useKeyboardNavigation({
    onEscape: handleClose,
    onEnter: () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    },
    disabled: !isOpen,
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Background overlay with enhanced blur */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xl"
        onClick={handleClose}
      />
      
      {/* Professional AI Panel */}
      <div 
        ref={overlayRef}
        className={cn(
          "relative glass-panel rounded-3xl p-10 animate-scale-in",
          "w-96 h-96 flex flex-col items-center justify-center",
          "border border-white/20 transition-all duration-300",
          "focus-visible:border-white nav-focus"
        )}
        tabIndex={-1}
      >
        
        {/* Header Section */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-6">
          {/* Reset Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={resetSession}
            disabled={isRecording}
            className="w-10 h-10 text-white/60 hover:text-white hover:bg-white/5 nav-focus rounded-xl transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          {/* AI Branding */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-sm" />
            </div>
            <span className="text-sm font-semibold text-white/90 tracking-wide">Gemini Live</span>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="w-10 h-10 text-white/60 hover:text-white hover:bg-white/5 nav-focus rounded-xl transition-all duration-300"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Central Recording Area */}
        <div className="flex flex-col items-center space-y-8 z-10">
          {/* Enhanced Record Button */}
          <div className="relative">
            {/* Clean Recording State Indicator */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-pulse" />
            )}
            
            {/* Main Button */}
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="lg"
              className={cn(
                "w-24 h-24 rounded-full transition-all duration-300 nav-focus",
                "relative z-10 border-2",
                isRecording
                  ? "bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white"
                  : "bg-gradient-to-br from-accent to-accent/80 border-accent text-black hover:scale-105"
              )}
            >
              {isRecording ? (
                <div className="w-7 h-7 bg-current rounded-md" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </Button>
          </div>

          {/* Professional Status Display */}
          <div className="text-center space-y-2">
            <p className={cn(
              "text-sm font-medium tracking-wide transition-colors duration-300",
              error ? "text-red-400" : "text-white/90"
            )}>
              {error || status}
            </p>
            {isRecording && (
              <div className="flex items-center justify-center space-x-1">
                <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        </div>

        {/* Task Detection Display */}
        {lastDetectedTask && lastDetectedTask.task.type !== 'none' && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-80">
            <div className="glass-panel rounded-xl p-4 border border-green-400/30 bg-green-500/10 animate-fade-in">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">
                  Command Detected
                </span>
              </div>
              <p className="text-sm text-white/90 mb-1">
                "{lastDetectedTask.transcription}"
              </p>
              <div className="text-xs text-white/60">
                Type: {lastDetectedTask.task.type.replace('_', ' ')}
                {lastDetectedTask.task.payload && (
                  <span className="ml-2">
                    • {Object.entries(lastDetectedTask.task.payload)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(' • ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Execution Result Display */}
        {executionResult && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-80">
            <div className={cn(
              "glass-panel rounded-xl p-3 animate-fade-in",
              executionResult.success 
                ? "border border-blue-400/30 bg-blue-500/10"
                : "border border-red-400/30 bg-red-500/10"
            )}>
              <div className="flex items-center space-x-2">
                {executionResult.success ? (
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  executionResult.success ? "text-blue-400" : "text-red-400"
                )}>
                  {executionResult.success ? "Executed" : "Failed"}
                </span>
              </div>
              <p className="text-sm text-white/90 mt-1">
                {executionResult.message}
              </p>
            </div>
          </div>
        )}

        {/* Subtle Bottom Indicator */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="w-12 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
        </div>
      </div>
    </div>
  );
};
