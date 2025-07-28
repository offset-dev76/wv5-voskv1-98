import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GeminiLiveAudio } from "@/lib/gemini-live-audio";
import { TaskExecutor } from "@/lib/task-executor";
import type { TranscriptionResult } from "@/types/transcription";

interface MiniAIWidgetProps {
  isVisible: boolean;
  onClose: () => void;
  onOrderDetected?: (itemName: string, quantity?: number) => void;
}

export const MiniAIWidget = ({ 
  isVisible, 
  onClose,
  onOrderDetected
}: MiniAIWidgetProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Tap to order");
  const [error, setError] = useState("");
  const geminiLiveRef = useRef<GeminiLiveAudio | null>(null);

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
    if (geminiLiveRef.current) {
      geminiLiveRef.current.destroy();
      geminiLiveRef.current = null;
      setIsRecording(false);
      setStatus("Tap to order");
      setError("");
    }
    onClose();
  };

  // Initialize Gemini Live Audio when widget becomes visible
  useEffect(() => {
    if (isVisible && !geminiLiveRef.current) {
      geminiLiveRef.current = new GeminiLiveAudio();
      geminiLiveRef.current.onStatusChange = setStatus;
      geminiLiveRef.current.onError = setError;
      geminiLiveRef.current.onTaskDetected = async (result: TranscriptionResult) => {
        // Handle food ordering specifically
        if (result.task.type === 'service_request' && 
            (result.task.payload?.request === 'food_order' || 
             result.task.payload?.request === 'order_food')) {
          const itemName = result.task.payload?.name || result.task.payload?.query;
          const quantity = result.task.payload?.quantity ? parseInt(result.task.payload.quantity) : 1;
          
          if (itemName && onOrderDetected) {
            onOrderDetected(itemName, quantity);
          }
        } else {
          // Execute other tasks normally
          if (result.task.type !== 'none') {
            await TaskExecutor.executeTask(result.task);
          }
        }
      };
    }

    return () => {
      if (!isVisible && geminiLiveRef.current) {
        geminiLiveRef.current.destroy();
        geminiLiveRef.current = null;
        setIsRecording(false);
        setStatus("Tap to order");
        setError("");
      }
    };
  }, [isVisible, onOrderDetected]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="glass-panel rounded-2xl p-4 w-64 border border-white/20 animate-slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-white/90">Voice Assistant</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="w-6 h-6 text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Status */}
        <div className="text-center mb-3">
          <p className={cn(
            "text-xs font-medium transition-colors duration-300",
            error ? "text-red-400" : "text-white/70"
          )}>
            {error || status}
          </p>
          {isRecording && (
            <div className="flex items-center justify-center space-x-1 mt-1">
              <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        {/* Record Button */}
        <div className="flex justify-center">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            size="sm"
            className={cn(
              "w-12 h-12 rounded-full transition-all duration-300",
              "relative border-2",
              isRecording
                ? "bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white"
                : "bg-gradient-to-br from-accent to-accent/80 border-accent text-black hover:scale-105"
            )}
          >
            {isRecording ? (
              <div className="w-3 h-3 bg-current rounded-sm" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-white/50 text-center mt-2">
          Say what you'd like to order
        </p>
      </div>
    </div>
  );
};