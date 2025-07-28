import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-nav";

const apps = [{
  id: 1,
  name: "Netflix",
  icon: "/images/apps/netflix.png",
  url: "https://netflix.com",
  gradient: "from-red-600 to-red-500"
}, {
  id: 2,
  name: "Plex",
  icon: "/images/apps/plex.png",
  url: "https://plex.tv",
  gradient: "from-yellow-500 to-orange-500"
}, {
  id: 3,
  name: "YouTube",
  icon: "/images/apps/youtube.png",
  url: "https://youtube.com/tv",
  gradient: "from-red-500 to-red-600"
}, {
  id: 4,
  name: "PlutoTV",
  icon: "/images/apps/plutotv.png",
  url: "https://pluto.tv",
  gradient: "from-blue-600 to-blue-700"
}, {
  id: 5,
  name: "YouTube Music",
  icon: "/images/apps/ytmusic.png",
  url: "https://music.youtube.com",
  gradient: "from-red-400 to-orange-500"
}];

interface AppGridProps {
  isFocused?: boolean;
  onFocusChange?: (focused: boolean) => void;
}

export const AppGrid = ({
  isFocused = false,
  onFocusChange
}: AppGridProps) => {
  const [selectedApp, setSelectedApp] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isGridFocused, setIsGridFocused] = useState(false);
  const appRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && appRefs.current[0]) {
      appRefs.current[0].focus();
      setIsGridFocused(true);
      scrollToApp(0);
    }
  }, [isFocused]);

  const scrollToApp = (index: number) => {
    if (containerRef.current && appRefs.current[index]) {
      const container = containerRef.current;
      const app = appRefs.current[index];
      const containerWidth = container.offsetWidth;
      const appLeft = app.offsetLeft;
      const appWidth = app.offsetWidth;

      // Position the focused app at 20% from the left
      const targetLeft = appLeft - containerWidth * 0.2;
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    onFocusChange?.(isGridFocused);
  }, [isGridFocused, onFocusChange]);

  useKeyboardNavigation({
    onArrowLeft: () => {
      if (isGridFocused && focusedIndex > 0) {
        const newIndex = Math.max(0, focusedIndex - 1);
        setFocusedIndex(newIndex);
        appRefs.current[newIndex]?.focus();
        scrollToApp(newIndex);
      }
    },
    onArrowRight: () => {
      if (isGridFocused && focusedIndex < apps.length - 1) {
        const newIndex = Math.min(apps.length - 1, focusedIndex + 1);
        setFocusedIndex(newIndex);
        appRefs.current[newIndex]?.focus();
        scrollToApp(newIndex);
      }
    },
    onEnter: () => {
      if (isGridFocused && focusedIndex >= 0) {
        const app = apps[focusedIndex];
        if (app?.url) {
          window.open(app.url, '_blank');
        }
      }
    },
    disabled: false
  });

  const handleAppClick = (appId: number, index: number) => {
    const app = apps.find(a => a.id === appId);
    if (app?.url) {
      window.open(app.url, '_blank');
    }
    setFocusedIndex(index);
    setIsGridFocused(true);
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    setIsGridFocused(true);
    scrollToApp(index);
  };

  const handleBlur = () => {
    // Small delay to check if focus moved to another app
    setTimeout(() => {
      const hasFocusedElement = appRefs.current.some(ref => ref === document.activeElement);
      if (!hasFocusedElement) {
        setIsGridFocused(false);
      }
    }, 10);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-semibold text-foreground/90 px-2">Your Apps</h2>
      <div className="w-full overflow-hidden">
        <div 
          ref={containerRef} 
          className="flex space-x-8 p-2 pb-4 overflow-x-auto scrollbar-hide" 
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {apps.map((app, index) => {
            const isFocused = focusedIndex === index;
            return (
              <div
                key={app.id}
                ref={el => appRefs.current[index] = el}
                className={cn(
                  "tv-tile relative group cursor-pointer",
                  "w-64 h-32 md:w-72 md:h-40",
                  "flex-shrink-0"
                )}
                onClick={() => handleAppClick(app.id, index)}
                tabIndex={0}
                onFocus={() => handleFocus(index)}
                onBlur={handleBlur}
              >
                {/* App icon container */}
                <div className={cn(
                  "w-full h-full rounded-2xl overflow-hidden",
                  "bg-transparent",
                  "flex items-center justify-center",
                  "transition-all duration-300",
                  "border border-white/20",
                  isFocused && isGridFocused && "border-white ring-2 ring-white/30"
                )}>
                  <img 
                    src={app.icon} 
                    alt={app.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>

                {/* App name - only show when focused/hovered */}
                <div className={cn(
                  "absolute -bottom-10 left-1/2 transform -translate-x-1/2",
                  "glass-panel px-4 py-2 rounded-lg",
                  "transition-all duration-300",
                  "opacity-0 translate-y-2",
                  "group-hover:opacity-100 group-hover:translate-y-0",
                  "group-focus:opacity-100 group-focus:translate-y-0",
                  "whitespace-nowrap z-10"
                )}>
                  <span className="text-base font-medium text-foreground">
                    {app.name}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
