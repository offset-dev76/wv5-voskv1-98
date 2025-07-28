import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-nav";
import { Sparkles } from "lucide-react";
import aiIcon from "@/assets/ai-icon.png";
interface TVNavigationProps {
  onAIClick: () => void;
  onFocusChange?: (focused: boolean) => void;
  isFocused?: boolean;
  onTabChange?: (tabId: string) => void;
  activeTab?: string;
  wakeWordStatus?: string;
  isWakeWordListening?: boolean;
}
const navItems = [{
  id: "home",
  label: "Home",
  active: true
}, {
  id: "library",
  label: "Library",
  active: false
}, {
  id: "apps",
  label: "Apps",
  active: false
}];
export const TVNavigation = ({
  onAIClick,
  onFocusChange,
  isFocused: propIsFocused = false,
  onTabChange,
  activeTab: propActiveTab = "home",
  wakeWordStatus,
  isWakeWordListening = false
}: TVNavigationProps) => {
  const [activeTab, setActiveTab] = useState(propActiveTab);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Focus the first nav item when prop changes
  useEffect(() => {
    if (propIsFocused && buttonRefs.current[0]) {
      buttonRefs.current[0].focus();
      setIsFocused(true);
    } else if (!propIsFocused) {
      setIsFocused(false);
    }
  }, [propIsFocused]);
  useEffect(() => {
    onFocusChange?.(isFocused);
  }, [isFocused, onFocusChange]);
  useKeyboardNavigation({
    onArrowLeft: () => {
      if (!isFocused) return;
      const newIndex = Math.max(0, focusedIndex - 1);
      setFocusedIndex(newIndex);
      buttonRefs.current[newIndex]?.focus();
    },
    onArrowRight: () => {
      if (!isFocused) return;
      const newIndex = Math.min(buttonRefs.current.length - 1, focusedIndex + 1);
      setFocusedIndex(newIndex);
      buttonRefs.current[newIndex]?.focus();
    },
    onEnter: () => {
      if (!isFocused) return;
      if (focusedIndex === buttonRefs.current.length - 1) {
        onAIClick();
      } else {
        const tabId = navItems[focusedIndex]?.id;
        if (tabId) {
          setActiveTab(tabId);
          onTabChange?.(tabId);
        }
      }
    },
    disabled: false
  });
  const handleTabClick = (tabId: string, index: number) => {
    setActiveTab(tabId);
    setFocusedIndex(index);
    setIsFocused(true);
    onTabChange?.(tabId);
  };
  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    setIsFocused(true);
  };
  const handleBlur = () => {
    // Small delay to check if focus moved to another nav item
    setTimeout(() => {
      const hasFocusedElement = buttonRefs.current.some(ref => ref === document.activeElement);
      if (!hasFocusedElement) {
        setIsFocused(false);
      }
    }, 10);
  };
  return <TooltipProvider>
      <nav ref={navRef} className="relative px-8 py-3 bg-transparent backdrop-blur-sm \\n">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {navItems.map((item, index) => {
            const isActive = activeTab === item.id;
            return <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                     <Button ref={el => buttonRefs.current[index] = el} variant="ghost" size="lg" onClick={() => handleTabClick(item.id, index)} onFocus={() => handleFocus(index)} onBlur={handleBlur} className={cn("relative px-6 py-3 nav-focus nav-text-glow group bg-transparent hover:bg-transparent focus:bg-transparent", "transition-all duration-300 font-bold text-base uppercase border-none shadow-none", isActive ? "text-white" : "text-muted-foreground hover:text-white")}>
                      {item.label}
                      {isActive && <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-full transition-all duration-300 ease-in-out" />}
                    </Button>
                  </TooltipTrigger>
                  
                </Tooltip>;
          })}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Wake Word Status Indicator */}
            {isWakeWordListening && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">Listening</span>
              </div>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button ref={el => buttonRefs.current[navItems.length] = el} onClick={onAIClick} onFocus={() => handleFocus(navItems.length)} onBlur={handleBlur} variant="ghost" size="lg" className={cn("relative px-4 py-3 nav-focus nav-text-glow group bg-transparent hover:bg-transparent focus:bg-transparent", "transition-all duration-300 border-none shadow-none")}>
                  <span className="font-bold text-base uppercase text-white group-hover:text-white/90 transition-all duration-300">AI</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open AI Assistant {isWakeWordListening && '(or say "Hey Atlas")'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </nav>
    </TooltipProvider>;
};