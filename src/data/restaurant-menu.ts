import type { RestaurantMenu } from '@/types/menu';

export const restaurantMenu: RestaurantMenu = {
  currency: "USD",
  taxRate: 0.08,
  categories: [
    {
      id: "appetizers",
      name: "Appetizers",
      items: [
        {
          id: "bruschetta",
          name: "Classic Bruschetta",
          description: "Grilled bread topped with fresh tomatoes, basil, and garlic",
          price: 12.99,
          category: "appetizers",
          dietary: ["vegetarian"],
          available: true
        },
        {
          id: "calamari",
          name: "Crispy Calamari",
          description: "Fresh squid rings with marinara sauce and lemon",
          price: 14.99,
          category: "appetizers",
          available: true
        },
        {
          id: "wings",
          name: "Buffalo Wings",
          description: "Spicy chicken wings with blue cheese dip",
          price: 13.99,
          category: "appetizers",
          dietary: ["spicy"],
          available: true
        }
      ]
    },
    {
      id: "mains",
      name: "Main Courses",
      items: [
        {
          id: "pasta-carbonara",
          name: "Pasta Carbonara",
          description: "Creamy pasta with pancetta, eggs, and parmesan cheese",
          price: 18.99,
          category: "mains",
          available: true
        },
        {
          id: "grilled-salmon",
          name: "Grilled Salmon",
          description: "Atlantic salmon with lemon herb butter and seasonal vegetables",
          price: 24.99,
          category: "mains",
          dietary: ["gluten-free"],
          available: true
        },
        {
          id: "ribeye-steak",
          name: "Ribeye Steak",
          description: "12oz prime ribeye with garlic mashed potatoes",
          price: 32.99,
          category: "mains",
          dietary: ["gluten-free"],
          available: true
        },
        {
          id: "veggie-burger",
          name: "Plant-Based Burger",
          description: "House-made veggie patty with avocado and sweet potato fries",
          price: 16.99,
          category: "mains",
          dietary: ["vegetarian", "vegan"],
          available: true
        }
      ]
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        {
          id: "tiramisu",
          name: "Classic Tiramisu",
          description: "Coffee-soaked ladyfingers with mascarpone cream",
          price: 8.99,
          category: "desserts",
          dietary: ["vegetarian"],
          available: true
        },
        {
          id: "chocolate-cake",
          name: "Chocolate Lava Cake",
          description: "Warm chocolate cake with molten center and vanilla ice cream",
          price: 9.99,
          category: "desserts",
          dietary: ["vegetarian"],
          available: true
        }
      ]
    },
    {
      id: "beverages",
      name: "Beverages",
      items: [
        {
          id: "coffee",
          name: "Espresso Coffee",
          description: "Freshly brewed Italian espresso",
          price: 3.99,
          category: "beverages",
          dietary: ["vegetarian", "vegan"],
          available: true
        },
        {
          id: "wine-red",
          name: "House Red Wine",
          description: "Smooth cabernet sauvignon by the glass",
          price: 8.99,
          category: "beverages",
          dietary: ["vegetarian", "vegan"],
          available: true
        },
        {
          id: "soft-drink",
          name: "Soft Drinks",
          description: "Coca-Cola, Sprite, Orange Juice",
          price: 2.99,
          category: "beverages",
          dietary: ["vegetarian", "vegan"],
          available: true
        }
      ]
    }
  ]
};