import { useState, useEffect, useRef } from "react";
import { TVNavigation } from "@/components/tv-navigation";
import { AIOverlay } from "@/components/ai-overlay";
import { RestaurantMenuOverlay } from "@/components/restaurant-menu-overlay";
import { MiniAIWidget } from "@/components/mini-ai-widget";
import { HeroCarousel } from "@/components/hero-carousel";
import { AppGrid } from "@/components/app-grid";
import { ContentRow } from "@/components/content-row";
import { AppsView } from "@/components/apps-view";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-nav";
import { useWakeWord } from "@/hooks/use-wake-word";
import { cn } from "@/lib/utils";
import { restaurantMenu } from "@/data/restaurant-menu";
import type { Order } from "@/types/menu";

type WeatherType = 'rainy' | 'stormy' | 'cloudy' | 'sunny';

const Index = () => {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [highlightedItems, setHighlightedItems] = useState<string[]>([]);
  const [currentSection, setCurrentSection] = useState(1); // 0: nav, 1: carousel, 2: apps, 3: recommended
  const [activeTab, setActiveTab] = useState("home");
  const [navFocused, setNavFocused] = useState(false);
  const [carouselFocused, setCarouselFocused] = useState(false);
  const [appsFocused, setAppsFocused] = useState(false);
  const [recommendedFocused, setRecommendedFocused] = useState(false);
  const [weather, setWeather] = useState<WeatherType>('rainy');


  // --- WebSocket Wake Word Integration ---
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    // Only connect if overlay is not open
    if (isAIOpen) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }
    // Connect to backend WebSocket
    const ws = new window.WebSocket("ws://localhost:8765");
    wsRef.current = ws;
    ws.onopen = () => {
      console.log("Wake word WebSocket connected");
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.wakeword) {
          console.log("Wake word event received, opening AI overlay");
          setIsAIOpen(true);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
    ws.onerror = (err) => {
      console.warn("Wake word WebSocket error", err);
    };
    ws.onclose = () => {
      wsRef.current = null;
      console.log("Wake word WebSocket closed");
    };
    return () => {
      ws.close();
    };
  }, [isAIOpen]);

  // Restaurant menu event listeners
  useEffect(() => {
    const handleOpenMenu = () => setIsMenuOpen(true);
    const handleHighlightItem = (event: any) => {
      const { itemName } = event.detail;
      // Find matching menu items and highlight them
      const matchingItems = restaurantMenu.categories
        .flatMap(cat => cat.items)
        .filter(item => item.name.toLowerCase().includes(itemName.toLowerCase()))
        .map(item => item.id);
      setHighlightedItems(matchingItems);
      setIsMenuOpen(true);
    };

    window.addEventListener('openRestaurantMenu', handleOpenMenu);
    window.addEventListener('highlightMenuItem', handleHighlightItem);

    return () => {
      window.removeEventListener('openRestaurantMenu', handleOpenMenu);
      window.removeEventListener('highlightMenuItem', handleHighlightItem);
    };
  }, []);

  // Cycle through weather types on component mount
  useEffect(() => {
    const weatherTypes: WeatherType[] = ['rainy', 'stormy', 'cloudy', 'sunny'];
    const savedIndex = sessionStorage.getItem('weatherIndex');
    const currentIndex = savedIndex ? parseInt(savedIndex) : 0;
    const nextIndex = (currentIndex + 1) % weatherTypes.length;
    
    setWeather(weatherTypes[nextIndex]);
    sessionStorage.setItem('weatherIndex', nextIndex.toString());
  }, []);

  // Global keyboard navigation for section switching
  useKeyboardNavigation({
    onArrowDown: () => {
      const maxSection = activeTab === "apps" ? 1 : 3;
      if (currentSection < maxSection) {
        setCurrentSection(prev => prev + 1);
        // Reset focus states
        setNavFocused(false);
        setCarouselFocused(false);
        setAppsFocused(false);
        setRecommendedFocused(false);
      }
    },
    onArrowUp: () => {
      if (currentSection > 0) {
        setCurrentSection(prev => prev - 1);
        // Reset focus states
        setNavFocused(false);
        setCarouselFocused(false);
        setAppsFocused(false);
        setRecommendedFocused(false);
      }
    },
    // Disable when AI overlay is open to prevent background navigation
    disabled: isAIOpen,
  });

  // Effect to manage focus based on current section
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentSection === 0) {
        // Focus navigation
        setNavFocused(true);
        setCarouselFocused(false);
        setAppsFocused(false);
        setRecommendedFocused(false);
        scrollToSection('navigation-section');
      } else if (currentSection === 1) {
        if (activeTab === "apps") {
          // Focus apps view
          setNavFocused(false);
          setCarouselFocused(false);
          setAppsFocused(true);
          setRecommendedFocused(false);
          scrollToSection('apps-view-section');
        } else {
          // Focus carousel
          setNavFocused(false);
          setCarouselFocused(true);
          setAppsFocused(false);
          setRecommendedFocused(false);
          scrollToSection('carousel-section');
        }
      } else if (currentSection === 2) {
        // Focus apps
        setNavFocused(false);
        setCarouselFocused(false);
        setAppsFocused(true);
        setRecommendedFocused(false);
        scrollToSection('apps-section');
      } else if (currentSection === 3) {
        // Focus recommended
        setNavFocused(false);
        setCarouselFocused(false);
        setAppsFocused(false);
        setRecommendedFocused(true);
        scrollToSection('recommended-section');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentSection, activeTab]);

  // Smooth scroll to section with enhanced smoothness
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  };




  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Weather Effects Background */}
      {weather === 'rainy' && (
        <div className="weather-overlay rain-overlay fixed inset-0 z-0">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="rain-drop"></div>
          ))}
        </div>
      )}

      {weather === 'stormy' && (
        <div className="weather-overlay stormy-overlay fixed inset-0 z-0">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="rain-drop"></div>
          ))}
          <div className="lightning-flash"></div>
        </div>
      )}

      {weather === 'cloudy' && (
        <div className="weather-overlay cloudy-overlay fixed inset-0 z-0">
          <div className="cloud cloud-1"></div>
          <div className="cloud cloud-2"></div>
          <div className="cloud cloud-3"></div>
        </div>
      )}

      {weather === 'sunny' && (
        <div className="weather-overlay sunny-overlay fixed inset-0 z-0">
          <div className="sun-flare"></div>
          <div className="sun-rays"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-20">
      <div id="navigation-section">
        <TVNavigation 
          onAIClick={() => setIsAIOpen(true)}
          onMenuClick={() => setIsMenuOpen(true)}
          onFocusChange={setNavFocused}
          isFocused={currentSection === 0}
          onTabChange={setActiveTab}
          activeTab={activeTab}
        />
      </div>
      
      {activeTab === "apps" ? (
        <div id="apps-view-section">
          <AppsView 
            isFocused={currentSection === 1}
            onFocusChange={setAppsFocused}
          />
        </div>
      ) : (
        <>
          {/* Hero Carousel - Full Width */}
          <div id="carousel-section" className={cn(
            "transition-all duration-500",
            currentSection === 1 ? "opacity-100" : "opacity-60"
          )}>
            <HeroCarousel 
              isFocused={currentSection === 1}
              onFocusChange={setCarouselFocused}
            />
          </div>
          
          <div className={cn(
            "px-8 py-6 space-y-8 transition-all duration-500",
            currentSection === 1 ? "opacity-60" : "opacity-100"
          )}>
            {/* App Grid */}
            <div id="apps-section">
              <AppGrid 
                isFocused={currentSection === 2}
                onFocusChange={setAppsFocused}
              />
            </div>
            
            {/* Content Rows */}
            <div id="recommended-section">
              <ContentRow 
                title="Recommended Movies" 
                isFocused={currentSection === 3}
                onFocusChange={setRecommendedFocused}
              />
            </div>
          </div>
        </>
      )}

        {/* AI Overlay */}
        <AIOverlay
          isOpen={isAIOpen && !isMenuOpen}
          onClose={() => setIsAIOpen(false)}
        />

        {/* Restaurant Menu Overlay */}
        <RestaurantMenuOverlay
          isOpen={isMenuOpen}
          onClose={() => {
            setIsMenuOpen(false);
            setHighlightedItems([]);
          }}
          highlightedItems={highlightedItems}
          onOrderUpdate={(order: Order) => {
            console.log('Order received:', order);
            // TODO: Send order to restaurant endpoint
          }}
          onAIWidgetClose={() => setIsMenuOpen(false)}
        />

        {/* Mini AI Widget (shows when menu is open) */}
        <MiniAIWidget
          isVisible={isMenuOpen}
          onClose={() => setIsAIOpen(false)}
          onOrderDetected={(itemName: string, quantity?: number) => {
            const matchingItems = restaurantMenu.categories
              .flatMap(cat => cat.items)
              .filter(item => item.name.toLowerCase().includes(itemName.toLowerCase()))
              .map(item => item.id);
            setHighlightedItems(matchingItems);
          }}
        />
      </div>
    </div>
  );
};

export default Index;
