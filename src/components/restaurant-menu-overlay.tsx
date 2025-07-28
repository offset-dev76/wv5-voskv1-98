import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Minus, ShoppingCart, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { restaurantMenu } from "@/data/restaurant-menu";
import type { MenuItem, OrderItem, Order } from "@/types/menu";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-nav";
import { TVNavigation } from "@/components/tv-navigation";

interface RestaurantMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate?: (order: Order) => void;
  highlightedItems?: string[]; // Item IDs to highlight from voice orders
  onAIWidgetClose?: () => void;
}

export const RestaurantMenuOverlay = ({ 
  isOpen, 
  onClose, 
  onOrderUpdate,
  highlightedItems = [],
  onAIWidgetClose
}: RestaurantMenuOverlayProps) => {
  const [currentCategory, setCurrentCategory] = useState(0);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const [isOnCategoryNav, setIsOnCategoryNav] = useState(true);
  const { toast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  const currentCategoryData = restaurantMenu.categories[currentCategory];

  // TV Navigation
  useKeyboardNavigation({
    onArrowUp: () => {
      if (isOnCategoryNav) {
        setCurrentCategory(prev => Math.max(0, prev - 1));
      } else {
        const itemsCount = currentCategoryData.items.length;
        setFocusedItemIndex(prev => Math.max(0, prev - 1));
      }
    },
    onArrowDown: () => {
      if (isOnCategoryNav) {
        setCurrentCategory(prev => Math.min(restaurantMenu.categories.length - 1, prev + 1));
      } else {
        const itemsCount = currentCategoryData.items.length;
        setFocusedItemIndex(prev => Math.min(itemsCount - 1, prev + 1));
      }
    },
    onArrowLeft: () => {
      if (!isOnCategoryNav) {
        setIsOnCategoryNav(true);
        setFocusedItemIndex(0);
      }
    },
    onArrowRight: () => {
      if (isOnCategoryNav) {
        setIsOnCategoryNav(false);
        setFocusedItemIndex(0);
      }
    },
    onEnter: () => {
      if (!isOnCategoryNav && currentCategoryData.items[focusedItemIndex]) {
        const item = currentCategoryData.items[focusedItemIndex];
        if (item.available) {
          addToOrder(item, 1);
        }
      }
    },
    onEscape: () => {
      onClose();
    },
    disabled: showConfirmation
  });

  // Handle AI widget close
  useEffect(() => {
    if (onAIWidgetClose) {
      const handleWidgetClose = () => {
        onClose();
      };
      // Listen for custom event when AI widget closes
      window.addEventListener('aiWidgetClosed', handleWidgetClose);
      return () => window.removeEventListener('aiWidgetClosed', handleWidgetClose);
    }
  }, [onAIWidgetClose, onClose]);
  
  const addToOrder = (menuItem: MenuItem, quantity: number = 1) => {
    setOrderItems(prev => {
      const existingIndex = prev.findIndex(item => item.menuItem.id === menuItem.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, { menuItem, quantity }];
    });
  };

  const updateQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.menuItem.id !== menuItemId));
    } else {
      setOrderItems(prev => 
        prev.map(item => 
          item.menuItem.id === menuItemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const getItemQuantity = (menuItemId: string): number => {
    return orderItems.find(item => item.menuItem.id === menuItemId)?.quantity || 0;
  };

  const getTotalPrice = (): number => {
    const subtotal = orderItems.reduce((total, item) => 
      total + (item.menuItem.price * item.quantity), 0
    );
    const tax = subtotal * restaurantMenu.taxRate;
    return subtotal + tax;
  };

  const getTotalItems = (): number => {
    return orderItems.reduce((total, item) => total + item.quantity, 0);
  };

  const confirmOrder = () => {
    if (orderItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your order first.",
        variant: "destructive"
      });
      return;
    }
    setShowConfirmation(true);
  };

  const finalizeOrder = () => {
    const order: Order = {
      id: `order-${Date.now()}`,
      items: orderItems,
      total: getTotalPrice(),
      status: 'pending',
      timestamp: new Date()
    };
    
    // Call the order endpoint (placeholder for now)
    console.log('Order submitted:', order);
    
    toast({
      title: "Order Confirmed!",
      description: `Your order of ${getTotalItems()} items has been placed.`,
    });
    
    onOrderUpdate?.(order);
    setOrderItems([]);
    setShowConfirmation(false);
    onClose();
  };

  const getDietaryBadgeColor = (dietary: string) => {
    switch (dietary) {
      case 'vegetarian': return 'bg-green-100 text-green-800';
      case 'vegan': return 'bg-emerald-100 text-emerald-800';
      case 'gluten-free': return 'bg-blue-100 text-blue-800';
      case 'spicy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>Confirm Your Order</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {orderItems.map(item => (
                <div key={item.menuItem.id} className="flex justify-between">
                  <span>{item.quantity}x {item.menuItem.name}</span>
                  <span>${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total (incl. tax)</span>
              <span>${getTotalPrice().toFixed(2)}</span>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                Back to Menu
              </Button>
              <Button onClick={finalizeOrder} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Confirm Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-background" ref={menuRef}>
      {/* TV Navigation Header */}
      <TVNavigation onAIClick={() => {}} />
      
      {/* Menu Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Restaurant Menu</h1>
        <div className="text-sm text-muted-foreground">
          Use ← → arrows to navigate • Enter to add items • Esc to exit
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Category Navigation */}
        <div className="w-64 border-r bg-muted/30">
          <div className="p-4">
            <h3 className="font-semibold mb-4 text-center">
              Categories {isOnCategoryNav && "• SELECTED"}
            </h3>
            <nav className="space-y-3">
              {restaurantMenu.categories.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => setCurrentCategory(index)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg transition-all duration-200 text-lg",
                    "border-2 focus:outline-none",
                    index === currentCategory && isOnCategoryNav
                      ? "bg-primary text-primary-foreground border-primary-foreground"
                      : index === currentCategory
                      ? "bg-primary/20 text-primary border-primary"
                      : "hover:bg-muted border-transparent"
                  )}
                >
                  {category.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6 text-center">
              {currentCategoryData.name} {!isOnCategoryNav && "• SELECTED"}
            </h2>
            <div className="grid gap-6">
              {currentCategoryData.items.map((item, index) => {
                const quantity = getItemQuantity(item.id);
                const isHighlighted = highlightedItems.includes(item.id);
                const isFocused = !isOnCategoryNav && focusedItemIndex === index;
                
                return (
                  <Card 
                    key={item.id} 
                    className={cn(
                      "transition-all duration-300 border-2",
                      isHighlighted && "ring-2 ring-green-500 bg-green-50",
                      isFocused && "border-primary bg-primary/5 scale-105",
                      !item.available && "opacity-50",
                      !isFocused && "border-transparent"
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-xl mb-2">{item.name}</h3>
                          <p className="text-muted-foreground text-base mb-3">{item.description}</p>
                          
                          {item.dietary && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {item.dietary.map(diet => (
                                <Badge 
                                  key={diet} 
                                  variant="secondary"
                                  className={getDietaryBadgeColor(diet)}
                                >
                                  {diet}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <p className="font-semibold text-xl">${item.price.toFixed(2)}</p>
                          {quantity > 0 && (
                            <p className="text-sm text-green-600 font-medium mt-1">
                              {quantity} in cart
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3 ml-6">
                          {quantity > 0 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-10 h-10"
                                onClick={() => updateQuantity(item.id, quantity - 1)}
                              >
                                <Minus className="w-5 h-5" />
                              </Button>
                              <span className="w-10 text-center font-semibold text-lg">{quantity}</span>
                            </>
                          )}
                          <Button
                            variant={quantity > 0 ? "outline" : "default"}
                            size="sm"
                            className="w-10 h-10"
                            onClick={() => addToOrder(item, 1)}
                            disabled={!item.available}
                          >
                            <Plus className="w-5 h-5" />
                          </Button>
                          {isFocused && (
                            <div className="ml-2 text-sm text-primary font-medium">
                              Press Enter to add
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cart Summary - TV Optimized */}
      {orderItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-6">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="flex items-center space-x-6">
              <ShoppingCart className="w-6 h-6" />
              <span className="font-semibold text-lg">
                {getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''} • ${getTotalPrice().toFixed(2)}
              </span>
            </div>
            <Button onClick={confirmOrder} size="lg" className="text-lg px-8 py-3">
              Review Order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};