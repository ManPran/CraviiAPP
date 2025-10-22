import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Heart, Eye, ArrowUp, Target } from "lucide-react";
import { SwipeCard } from "@/components/swipe-card";
import { useSwipe } from "@/hooks/use-swipe";
import { searchIngredients, fetchIngredientsByCategory, fetchIngredientsByPriority, fetchRandomMainIngredient, fetchComplementaryIngredients } from "@/lib/ingredients";
import { RecipeResults } from "@/components/RecipeResults";
import { RecipeDetailModal } from "@/components/RecipeDetailModal";
import { RecipeAlgorithm, sampleRecipes, type RecipeMatch } from "@/utils/recipeAlgorithm";
import type { Ingredient, IngredientLegacy } from "@shared/schema";

interface IngredientSwipeProps {
  preferences: {
    course: string;
    taste: string;
    prepTime: number;
    appliances: string[];
  };
  dietaryRestrictions: string[];
  onBack: () => void;
  onComplete: (selectedIngredients: IngredientLegacy[]) => void;
}

export default function IngredientSwipe({ preferences, dietaryRestrictions, onBack, onComplete }: IngredientSwipeProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientLegacy[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pairingQueue, setPairingQueue] = useState<Ingredient[]>([]);
  const [isInPairingMode, setIsInPairingMode] = useState(false);
  const [pairingBaseIngredient, setPairingBaseIngredient] = useState<Ingredient | null>(null);
  const [hasMainIngredient, setHasMainIngredient] = useState(false);
  const [showingMainIngredients, setShowingMainIngredients] = useState(true);
  const [selectedMainIngredient, setSelectedMainIngredient] = useState<Ingredient | null>(null);
  const [complementaryIngredients, setComplementaryIngredients] = useState<Ingredient[]>([]);
  const [loadingComplementary, setLoadingComplementary] = useState(false);
  const [seenIngredientIds, setSeenIngredientIds] = useState<number[]>([]);
  const [rejectedIngredients, setRejectedIngredients] = useState<number[]>([]);
  const [rejectedMainIngredients, setRejectedMainIngredients] = useState<string[]>([]);
  
  // New recipe algorithm state
  const [recipeAlgorithm, setRecipeAlgorithm] = useState<RecipeAlgorithm | null>(null);
  const [showRecipeResults, setShowRecipeResults] = useState(false);
  const [availableRecipes, setAvailableRecipes] = useState<RecipeMatch[]>([]);
  const [selectedRecipeMatch, setSelectedRecipeMatch] = useState<RecipeMatch | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  // Recipe-guided mode is now always enabled
  const useIntelligentMode = true;

  // Utility function to shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Utility function to deduplicate selected ingredients
  const deduplicateIngredients = (ingredients: IngredientLegacy[]): IngredientLegacy[] => {
    const seen = new Set<string>();
    return ingredients.filter(ing => {
      const key = `${ing.id}-${ing.name.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Auto-deduplicate selected ingredients whenever they change
  useEffect(() => {
    setSelectedIngredients(prev => {
      const deduplicated = deduplicateIngredients(prev);
      if (deduplicated.length !== prev.length) {
        console.log(`Removed ${prev.length - deduplicated.length} duplicate ingredients`);
        return deduplicated;
      }
      return prev;
    });
  }, [selectedIngredients.length]);

  // Initialize recipe algorithm on mount
  useEffect(() => {
    if (!recipeAlgorithm) {
      initializeRecipeAlgorithm();
    }
  }, []);

  // Load ingredients from database
  useEffect(() => {
    loadIngredients();
  }, [preferences, showingMainIngredients, hasMainIngredient, rejectedMainIngredients]);

  // Handle transition to complementary ingredients when main ingredient is selected
  useEffect(() => {
    if (selectedMainIngredient && hasMainIngredient && !showingMainIngredients && selectedIngredients.length === 1) {
      // Only load once when transitioning to complementary mode
      loadSmartIngredientSuggestions();
    }
  }, [selectedMainIngredient, hasMainIngredient, showingMainIngredients]);

  const loadSmartIngredientSuggestions = async () => {
    try {
      setLoading(true);
      
      // Get selected ingredient names (remove duplicates using Set)
      const selectedIngredientNames = [...new Set(selectedIngredients.map(ing => ing.name))];
      
      // Convert rejected ingredient IDs to names by looking up in current ingredients list
      const rejectedIngredientNames = rejectedIngredients.map(id => {
        const ingredient = ingredients.find(ing => ing.id === id);
        return ingredient ? ingredient.name : null;
      }).filter(name => name !== null);
      
      // Fetch smart suggestions based on recipe combinations
      const response = await fetch("/api/ingredients/smart-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedIngredients: selectedIngredientNames,
          rejectedIngredients: rejectedIngredientNames,
          preferences: preferences,
          dietaryRestrictions: dietaryRestrictions,
          limit: 20
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch smart suggestions");
      }
      
      const { suggestions, possibleRecipeCount } = await response.json();
      
      console.log(`Found ${suggestions.length} smart suggestions for ${selectedIngredientNames.length} selected ingredients. ${possibleRecipeCount} possible recipes.`);
      
      // Extract ingredients from suggestions
      const smartIngredients = suggestions.map((suggestion: any) => suggestion.ingredient);
      
      // Remove ingredients that have already been seen, rejected, or selected
      const unseenIngredients = smartIngredients.filter((ingredient: Ingredient) => {
        const ingredientName = ingredient.name.toLowerCase();
        const selectedNames = selectedIngredients.map(ing => ing.name.toLowerCase());
        
        return !seenIngredientIds.includes(ingredient.id) && 
               !rejectedIngredients.includes(ingredient.id) &&
               !selectedNames.includes(ingredientName);
      });
      
      setComplementaryIngredients(unseenIngredients);
      setIngredients(unseenIngredients);
      setCurrentIndex(0);
      
    } catch (error) {
      console.error("Failed to load smart ingredient suggestions:", error);
      // Fallback to empty array if smart suggestions fail
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  const loadIngredients = async () => {
    try {
      setLoading(true);
      
      // If we have the algorithm, use it for intelligent suggestions
      if (recipeAlgorithm && selectedIngredients.length > 0 && !showingMainIngredients) {
        try {
          // Skip the synthetic recipe algorithm completely
          // Instead load normal ingredients to avoid fake recipes
          console.log("Skipping synthetic recipe algorithm, loading real ingredients");
          // Continue to normal ingredient loading
        } catch (error) {
          console.error("Error getting algorithm suggestions:", error);
          // Continue to normal ingredient loading
        }
      }
      
      if (showingMainIngredients && !hasMainIngredient) {
        // Phase 1: Show random main ingredient first, filtered by taste and course preferences
        console.log(`Fetching main ingredient with ${rejectedMainIngredients.length} rejected ingredients:`, rejectedMainIngredients);
        const randomMainIngredient = await fetchRandomMainIngredient(preferences.taste, preferences.course, rejectedMainIngredients, dietaryRestrictions);
        if (randomMainIngredient) {
          console.log("Loaded main ingredient:", randomMainIngredient.name, "priority:", randomMainIngredient.priority);
          setIngredients([randomMainIngredient]);
        }
      }
      // Note: Complementary ingredients are now loaded by the dedicated useEffect
    } catch (error) {
      console.error("Failed to load ingredients:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterIngredientsByPreferences = (ingredients: Ingredient[], prefs: any) => {
    return ingredients.filter(ingredient => {
      // Filter by dietary restrictions first
      if (prefs.dietaryRestrictions) {
        const restrictions = Array.isArray(prefs.dietaryRestrictions) ? prefs.dietaryRestrictions : [prefs.dietaryRestrictions];
        
        for (const restriction of restrictions) {
          if (restriction === "vegetarian") {
            const meatTerms = ["chicken", "beef", "pork", "lamb", "turkey", "duck", "fish", "salmon", "tuna", "shrimp", "crab", "lobster", "meat", "seafood"];
            if (meatTerms.some(term => ingredient.name.toLowerCase().includes(term))) {
              return false;
            }
          }
          
          if (restriction === "vegan") {
            // Exclude all animal products
            const meatTerms = ["chicken", "beef", "pork", "lamb", "turkey", "duck", "fish", "salmon", "tuna", "shrimp", "crab", "meat", "seafood"];
            if (meatTerms.some(term => ingredient.name.toLowerCase().includes(term))) {
              return false;
            }
            
            // Handle dairy products
            if (ingredient.category === "dairy") {
              const plantMilkTerms = ["almond", "soy", "oat", "coconut", "rice milk", "plant-based"];
              const isPlantMilk = plantMilkTerms.some(term => ingredient.name.toLowerCase().includes(term));
              if (!isPlantMilk) {
                return false;
              }
            }
            
            // Exclude other animal products
            const animalProducts = ["honey", "eggs", "butter", "cheese", "milk", "cream", "yogurt", "gelatin"];
            if (animalProducts.some(term => ingredient.name.toLowerCase().includes(term))) {
              const plantAlternatives = ["plant", "vegan", "coconut", "almond", "soy", "oat"];
              const isPlantBased = plantAlternatives.some(alt => ingredient.name.toLowerCase().includes(alt));
              if (!isPlantBased) {
                return false;
              }
            }
          }
          
          if (restriction === "gluten-free") {
            const glutenTerms = ["wheat", "flour", "bread", "pasta", "oats", "barley", "rye", "gluten", "seitan"];
            if (glutenTerms.some(term => ingredient.name.toLowerCase().includes(term))) {
              const glutenFreeTerms = ["gluten-free", "rice", "quinoa", "corn"];
              const isGlutenFree = glutenFreeTerms.some(term => ingredient.name.toLowerCase().includes(term));
              if (!isGlutenFree) {
                return false;
              }
            }
          }
          
          if (restriction === "dairy-free") {
            if (ingredient.category === "dairy") {
              const plantMilkTerms = ["almond", "soy", "oat", "coconut", "rice milk", "plant-based", "dairy-free"];
              const isPlantMilk = plantMilkTerms.some(term => ingredient.name.toLowerCase().includes(term));
              if (!isPlantMilk) {
                return false;
              }
            }
            const dairyTerms = ["milk", "cheese", "butter", "cream", "yogurt"];
            if (dairyTerms.some(term => ingredient.name.toLowerCase().includes(term))) {
              const plantAlternatives = ["plant", "dairy-free", "coconut", "almond", "soy", "oat"];
              const isDairyFree = plantAlternatives.some(alt => ingredient.name.toLowerCase().includes(alt));
              if (!isDairyFree) {
                return false;
              }
            }
          }
          
          if (restriction === "nut-free") {
            const nutTerms = ["almond", "peanut", "walnut", "cashew", "pecan", "hazelnut", "pistachio", "macadamia", "brazil nut"];
            if (nutTerms.some(term => ingredient.name.toLowerCase().includes(term))) {
              return false;
            }
            if (ingredient.category === "nuts") {
              return false;
            }
          }
          
          if (restriction === "low-sodium") {
            const highSodiumTerms = ["salt", "soy sauce", "canned", "processed", "pickled", "cured"];
            if (highSodiumTerms.some(term => ingredient.name.toLowerCase().includes(term))) {
              const lowSodiumTerms = ["low-sodium", "no-salt", "fresh"];
              const isLowSodium = lowSodiumTerms.some(term => ingredient.name.toLowerCase().includes(term));
              if (!isLowSodium) {
                return false;
              }
            }
          }
        }
      }

      // Filter by meal type and cooking method compatibility
      if (prefs.course === "breakfast") {
        // Exclude heavy dinner proteins and ingredients that aren't breakfast appropriate
        const breakfastInappropriate = [
          "steak", "ribeye", "roast", "lamb", "duck", "turkey", "salmon", "tuna", "lobster", 
          "crab", "shrimp", "scallop", "mussels", "oysters", "squid", "octopus",
          "wine", "beer", "alcohol", "heavy cream", "heavy sauces", "complex spices",
          "curry", "paprika", "cumin", "oregano", "basil", "thyme", "rosemary",
          "pork chops", "pork ribs", "beef roast", "whole chicken", "chicken thighs",
          "ground beef", "sausage links", "bratwurst", "chorizo", "prosciutto"
        ];
        
        const isBreakfastInappropriate = breakfastInappropriate.some(term => 
          ingredient.name.toLowerCase().includes(term) || 
          ingredient.searchTerms.some(st => st.toLowerCase().includes(term))
        );
        
        if (isBreakfastInappropriate) {
          return false;
        }
        
        // Allow breakfast-appropriate ingredients
        const breakfastFriendly = [
          "eggs", "milk", "butter", "bread", "cereal", "oatmeal", "granola", "toast", 
          "english muffins", "bagels", "bacon", "ham", "yogurt", "fruit", "coffee",
          "pancake mix", "syrup", "jam", "peanut butter", "honey", "berries", "bananas",
          "cream cheese", "orange juice", "hash browns", "pancakes", "waffles", "potatoes",
          "rice", "pasta", "cheese", "onions", "tomatoes", "peppers", "mushrooms",
          "spinach", "flour", "sugar", "salt", "pepper", "cinnamon", "vanilla"
        ];
        
        const isBreakfastFriendly = breakfastFriendly.some(term => 
          ingredient.name.toLowerCase().includes(term) || 
          ingredient.searchTerms.some(st => st.toLowerCase().includes(term))
        );
        
        // Allow basic breakfast categories
        const breakfastCategories = ["grain", "dairy", "fruit", "nuts"];
        const isBasicBreakfastIngredient = breakfastCategories.includes(ingredient.category);
        
        if (!isBreakfastFriendly && !isBasicBreakfastIngredient) {
          return false;
        }
      } else if (prefs.course === "lunch") {
        // Exclude heavy breakfast-only items and very heavy dinner items
        const lunchInappropriate = [
          "pancake mix", "syrup", "cereal", "granola", "oatmeal", "french toast",
          "waffles", "breakfast", "ribeye", "prime rib", "lobster", "caviar",
          "whole roast", "turkey breast", "leg of lamb"
        ];
        
        const isLunchInappropriate = lunchInappropriate.some(term => 
          ingredient.name.toLowerCase().includes(term) || 
          ingredient.searchTerms.some(st => st.toLowerCase().includes(term))
        );
        
        if (isLunchInappropriate) {
          return false;
        }
      } else if (prefs.course === "dinner") {
        // Exclude breakfast-specific items
        const dinnerInappropriate = [
          "pancake mix", "syrup", "cereal", "granola", "oatmeal", "french toast",
          "waffles", "breakfast", "morning", "coffee", "orange juice"
        ];
        
        const isDinnerInappropriate = dinnerInappropriate.some(term => 
          ingredient.name.toLowerCase().includes(term) || 
          ingredient.searchTerms.some(st => st.toLowerCase().includes(term))
        );
        
        if (isDinnerInappropriate) {
          return false;
        }
      }

      // Filter by taste preference
      if (prefs.taste === "sweet") {
        const sweetCategories = ["fruit", "dairy", "grain"];
        const sweetTerms = ["sweet", "sugar", "honey", "syrup", "chocolate", "vanilla", "berries", "apple", "banana", "cinnamon", "nutmeg"];
        const savorySpices = ["curry", "cumin", "paprika", "garlic", "onion", "pepper", "salt", "oregano", "basil", "thyme", "rosemary"];
        
        // Exclude savory spices for sweet preference
        if (ingredient.category === "spice") {
          const isSavorySpice = savorySpices.some(term => 
            ingredient.name.toLowerCase().includes(term)
          );
          if (isSavorySpice) {
            return false;
          }
          // Only allow sweet spices
          const isSweetSpice = sweetTerms.some(term => 
            ingredient.name.toLowerCase().includes(term)
          );
          if (!isSweetSpice) {
            return false;
          }
        }
        
        const isSweetIngredient = sweetCategories.includes(ingredient.category) || 
          sweetTerms.some(term => 
            ingredient.name.toLowerCase().includes(term) || 
            ingredient.searchTerms.some(st => st.toLowerCase().includes(term))
          );
        
        // For sweet preference, exclude savory proteins and vegetables
        if (ingredient.category === "protein") {
          const savoryProteins = ["chicken", "beef", "pork", "fish", "seafood", "bacon", "sausage"];
          if (savoryProteins.some(term => ingredient.name.toLowerCase().includes(term))) {
            return false;
          }
        }
        if (ingredient.category === "vegetable" && !isSweetIngredient) {
          const sweetVegetables = ["corn", "carrot", "sweet potato", "bell pepper", "tomato"];
          if (!sweetVegetables.some(term => ingredient.name.toLowerCase().includes(term))) {
            return false;
          }
        }
        if (ingredient.category === "oil") {
          // For sweet recipes, exclude savory oils
          const savoryOils = ["olive oil", "sesame oil", "avocado oil"];
          if (savoryOils.some(term => ingredient.name.toLowerCase().includes(term))) {
            return false;
          }
        }
      } else if (prefs.taste === "savory") {
        // For savory preference, exclude sweet ingredients and dessert items
        const sweetTerms = ["sweet", "sugar", "honey", "syrup", "chocolate", "candy", "dessert", "frosting", "cake", "cookie"];
        const sweetFruits = ["berries", "strawberry", "blueberry", "raspberry", "apple", "banana", "peach", "grape"];
        
        const isSweetIngredient = sweetTerms.some(term => 
          ingredient.name.toLowerCase().includes(term) || 
          ingredient.searchTerms.some(st => st.toLowerCase().includes(term))
        );
        
        const isSweetFruit = sweetFruits.some(term => 
          ingredient.name.toLowerCase().includes(term)
        );
        
        // Exclude sweet dessert ingredients and sweet fruits for savory meals
        if (isSweetIngredient || (ingredient.category === "fruit" && isSweetFruit)) {
          return false;
        }
        
        // For dairy category in savory, exclude sweet dairy products
        if (ingredient.category === "dairy") {
          const sweetDairy = ["ice cream", "whipped cream", "sweetened", "condensed milk"];
          if (sweetDairy.some(term => ingredient.name.toLowerCase().includes(term))) {
            return false;
          }
        }
      }

      // Filter by preparation time - exclude complex ingredients for quick meals
      if (prefs.prepTime <= 15) {
        const quickCookingTerms = [
          "instant", "quick", "ready", "canned", "frozen", "pre-cooked",
          "microwave", "raw", "fresh", "simple", "pre-cut"
        ];
        const complexTerms = ["dried beans", "whole chicken", "roast", "slow", "marinate", "soak"];
        
        const isQuickIngredient = quickCookingTerms.some(term => 
          ingredient.name.toLowerCase().includes(term) ||
          ingredient.description.toLowerCase().includes(term) ||
          ingredient.searchTerms.some(st => st.toLowerCase().includes(term))
        );
        
        const isComplexIngredient = complexTerms.some(term => 
          ingredient.name.toLowerCase().includes(term) ||
          ingredient.description.toLowerCase().includes(term)
        );
        
        // For quick meals, prefer quick ingredients and exclude complex ones
        if (isComplexIngredient) {
          return false;
        }
        
        // Prioritize quick-cooking ingredients for short prep times
        if (!isQuickIngredient && ingredient.category === "protein") {
          const quickProteins = ["eggs", "ground", "shrimp", "fish fillet", "tofu"];
          if (!quickProteins.some(term => ingredient.name.toLowerCase().includes(term))) {
            return false;
          }
        }
      } else if (prefs.prepTime >= 60) {
        // For longer prep times, allow complex ingredients
        const complexIngredients = ["whole chicken", "roast", "dried beans", "homemade", "from scratch"];
        const isComplexIngredient = complexIngredients.some(term => 
          ingredient.name.toLowerCase().includes(term) ||
          ingredient.description.toLowerCase().includes(term)
        );
        // Don't filter out anything for long prep times, but could prioritize complex ingredients
      }

      // Filter by available appliances
      const applianceRequirements = {
        "oven": ["baking", "roast", "casserole", "baked", "broiled"],
        "stovetop": ["sautéed", "boiled", "fried", "simmered", "steamed"],
        "microwave": ["microwave", "instant", "ready"],
        "airfryer": ["crispy", "fried", "breaded"],
        "grill": ["grilled", "barbecue", "charred"],
        "slowcooker": ["slow", "braised", "stewed"],
        "blender": ["smoothie", "blended", "pureed"]
      };

      // If user only has microwave, prioritize microwave-friendly ingredients
      if (prefs.appliances.length === 1 && prefs.appliances.includes("microwave")) {
        const microwaveOnlyTerms = ["frozen", "instant", "ready", "pre-cooked", "canned", "microwave"];
        const isMicrowaveOnly = microwaveOnlyTerms.some(term => 
          ingredient.name.toLowerCase().includes(term) ||
          ingredient.description.toLowerCase().includes(term) ||
          ingredient.tags.some(tag => tag.toLowerCase().includes(term))
        );
        
        // For microwave-only users, exclude ingredients that require cooking
        const needsCookingTerms = ["raw", "fresh meat", "whole chicken", "dried beans"];
        const needsCooking = needsCookingTerms.some(term => 
          ingredient.name.toLowerCase().includes(term) ||
          ingredient.description.toLowerCase().includes(term)
        );
        
        if (needsCooking && !isMicrowaveOnly) {
          return false;
        }
      }

      // Check if ingredient requires specific appliances not available
      for (const [appliance, terms] of Object.entries(applianceRequirements)) {
        if (!prefs.appliances.includes(appliance)) {
          const requiresAppliance = terms.some(term => 
            ingredient.name.toLowerCase().includes(term) ||
            ingredient.description.toLowerCase().includes(term) ||
            ingredient.tags.some(tag => tag.toLowerCase().includes(term))
          );
          
          // Make exceptions for versatile ingredients
          const versatileIngredients = ["vegetables", "fruits", "spices", "oils"];
          const isVersatile = versatileIngredients.some(cat => 
            ingredient.category.includes(cat) || 
            ingredient.name.toLowerCase().includes(cat)
          );
          
          if (requiresAppliance && !isVersatile) {
            return false;
          }
        }
      }

      // Prioritize ingredients that work well with available appliances
      if (prefs.appliances.includes("microwave")) {
        const microwaveTerms = ["frozen", "instant", "quick", "ready", "pre-cooked", "canned"];
        const isMicrowaveFriendly = microwaveTerms.some(term => 
          ingredient.name.toLowerCase().includes(term) ||
          ingredient.tags.some(tag => tag.toLowerCase().includes(term))
        );
        if (isMicrowaveFriendly) {
          return true;
        }
      }

      if (prefs.appliances.includes("airfryer")) {
        const airfryerTerms = ["frozen", "crispy", "fried", "breaded", "wings", "fries"];
        const isAirfryerFriendly = airfryerTerms.some(term => 
          ingredient.name.toLowerCase().includes(term) ||
          ingredient.tags.some(tag => tag.toLowerCase().includes(term))
        );
        if (isAirfryerFriendly) {
          return true;
        }
      }

      if (prefs.appliances.includes("grill")) {
        const grillTerms = ["meat", "vegetables", "corn", "peppers"];
        const isGrillFriendly = grillTerms.some(term => 
          ingredient.name.toLowerCase().includes(term) ||
          ingredient.category.includes(term)
        );
        if (isGrillFriendly) {
          return true;
        }
      }

      return true;
    });
  };

  const getIngredientPairings = (ingredient: Ingredient): string[] => {
    const pairings: { [key: string]: string[] } = {
      // Proteins
      "chicken": ["garlic", "onions", "olive oil", "paprika", "thyme", "lemon", "bell peppers", "carrots", "celery"],
      "beef": ["onions", "garlic", "carrots", "potatoes", "mushrooms", "red wine", "thyme", "bay leaves", "tomatoes"],
      "pork": ["apples", "onions", "garlic", "sage", "thyme", "potatoes", "carrots", "soy sauce"],
      "salmon": ["lemon", "dill", "garlic", "olive oil", "capers", "asparagus", "spinach", "ginger"],
      "tuna": ["lemon", "olive oil", "capers", "tomatoes", "onions", "olives", "parsley"],
      "eggs": ["butter", "milk", "cheese", "onions", "mushrooms", "spinach", "bacon", "herbs"],
      "tofu": ["soy sauce", "ginger", "garlic", "sesame oil", "green onions", "mushrooms", "broccoli"],
      
      // Vegetables
      "tomatoes": ["basil", "garlic", "onions", "olive oil", "mozzarella", "oregano", "balsamic vinegar"],
      "onions": ["garlic", "olive oil", "butter", "herbs", "carrots", "celery", "bell peppers"],
      "garlic": ["olive oil", "butter", "herbs", "onions", "lemon", "parsley"],
      "mushrooms": ["garlic", "thyme", "butter", "onions", "wine", "cream", "parsley"],
      "spinach": ["garlic", "olive oil", "lemon", "feta", "nutmeg", "onions", "pine nuts"],
      "broccoli": ["garlic", "lemon", "olive oil", "parmesan", "ginger", "soy sauce"],
      "carrots": ["ginger", "honey", "thyme", "butter", "garlic", "onions", "parsley"],
      "potatoes": ["butter", "garlic", "rosemary", "thyme", "cheese", "bacon", "sour cream"],
      "bell peppers": ["onions", "garlic", "olive oil", "tomatoes", "basil", "oregano"],
      
      // Grains
      "rice": ["soy sauce", "garlic", "ginger", "onions", "vegetables", "coconut milk", "curry powder"],
      "pasta": ["tomatoes", "garlic", "basil", "olive oil", "parmesan", "onions", "mushrooms"],
      "quinoa": ["lemon", "olive oil", "herbs", "vegetables", "feta", "nuts", "dried fruit"],
      "bread": ["butter", "garlic", "herbs", "olive oil", "tomatoes", "cheese"],
      
      // Fruits
      "apples": ["cinnamon", "nutmeg", "butter", "honey", "vanilla", "oats", "walnuts"],
      "bananas": ["chocolate", "peanut butter", "honey", "cinnamon", "vanilla", "oats"],
      "lemons": ["garlic", "olive oil", "herbs", "fish", "chicken", "vegetables"],
      "berries": ["yogurt", "honey", "vanilla", "mint", "chocolate", "cream"],
      
      // Dairy
      "cheese": ["wine", "crackers", "fruits", "nuts", "herbs", "bread", "tomatoes"],
      "butter": ["garlic", "herbs", "bread", "vegetables", "flour", "sugar"],
      "yogurt": ["honey", "fruits", "granola", "nuts", "mint", "cucumber"],
      
      // Spices & Herbs
      "basil": ["tomatoes", "mozzarella", "olive oil", "garlic", "pine nuts", "pasta"],
      "oregano": ["tomatoes", "olive oil", "garlic", "onions", "cheese", "pizza"],
      "thyme": ["chicken", "lamb", "potatoes", "carrots", "onions", "garlic"],
      "rosemary": ["lamb", "potatoes", "olive oil", "garlic", "lemon", "bread"],
      "paprika": ["chicken", "pork", "potatoes", "vegetables", "rice", "sour cream"],
      "cumin": ["beans", "rice", "onions", "garlic", "tomatoes", "cilantro"],
      "ginger": ["garlic", "soy sauce", "honey", "sesame oil", "scallions", "rice"],
      "cinnamon": ["apples", "sugar", "vanilla", "nutmeg", "oats", "honey"]
    };

    const ingredientName = ingredient.name.toLowerCase();
    
    // Check for direct matches
    for (const [key, pairs] of Object.entries(pairings)) {
      if (ingredientName.includes(key)) {
        return pairs;
      }
    }
    
    // Check search terms for matches
    for (const searchTerm of ingredient.searchTerms) {
      for (const [key, pairs] of Object.entries(pairings)) {
        if (searchTerm.toLowerCase().includes(key)) {
          return pairs;
        }
      }
    }
    
    // Default pairings based on category
    const categoryPairings: { [key: string]: string[] } = {
      "protein": ["garlic", "onions", "olive oil", "herbs", "vegetables"],
      "vegetable": ["garlic", "olive oil", "onions", "herbs", "lemon"],
      "grain": ["garlic", "onions", "herbs", "olive oil", "vegetables"],
      "fruit": ["honey", "cinnamon", "vanilla", "nuts", "yogurt"],
      "dairy": ["herbs", "garlic", "honey", "fruits", "nuts"],
      "spice": ["garlic", "onions", "olive oil", "herbs", "vegetables"]
    };
    
    return categoryPairings[ingredient.category] || ["garlic", "onions", "olive oil"];
  };

  const findPairingIngredients = async (baseIngredient: Ingredient) => {
    const pairingNames = getIngredientPairings(baseIngredient);
    const foundPairings: Ingredient[] = [];
    
    // Search for each pairing ingredient in our database
    for (const pairingName of pairingNames.slice(0, 8)) { // Limit to 8 suggestions
      try {
        const searchResults = await searchIngredients(pairingName);
        const match = searchResults.find((ing: Ingredient) => 
          ing.name.toLowerCase().includes(pairingName.toLowerCase()) ||
          ing.searchTerms.some((term: string) => term.toLowerCase().includes(pairingName.toLowerCase()))
        );
        if (match && !foundPairings.find(p => p.id === match.id)) {
          foundPairings.push(match);
        }
      } catch (error) {
        console.error(`Error finding pairing for ${pairingName}:`, error);
      }
    }
    
    return foundPairings;
  };

  const initiatePairingMode = async (baseIngredient: Ingredient) => {
    try {
      const pairings = await findPairingIngredients(baseIngredient);
      if (pairings.length > 0) {
        // Add the base ingredient to selected ingredients first
        addSelectedIngredient(baseIngredient);
        
        // Set up pairing mode with the pairing queue
        setPairingQueue(pairings);
        setIsInPairingMode(true);
        setPairingBaseIngredient(baseIngredient);
        
        // Move to the first pairing ingredient
        if (pairings.length > 0) {
          setCurrentIndex(-1); // Will be incremented to 0 in nextIngredient
          nextIngredient();
        }
      }
    } catch (error) {
      console.error("Error initiating pairing mode:", error);
    }
  };

  const addPairingIngredient = (ingredient: Ingredient) => {
    const legacyIngredient: IngredientLegacy = {
      id: ingredient.id.toString(),
      name: ingredient.name,
      description: ingredient.description,
      imageUrl: ingredient.imageUrl,
      tags: ingredient.tags,
      category: ingredient.category
    };
    
    setSelectedIngredients(prev => [...prev, legacyIngredient]);
    // Remove from pairing queue to avoid duplicates
    setPairingQueue(prev => prev.filter(p => p.id !== ingredient.id));
    
    // If pairing queue is empty, exit pairing mode
    if (pairingQueue.length <= 1) {
      setIsInPairingMode(false);
      setPairingBaseIngredient(null);
      setPairingQueue([]);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await searchIngredients(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
  };

  const { isSweping, swipeDirection, swipeLeft, swipeRight } = useSwipe({
    onSwipeLeft: () => nextIngredient(),
    onSwipeRight: () => selectIngredient(),
    onSwipeUp: () => {
      if (currentIngredient) {
        initiatePairingMode(currentIngredient);
      }
    }
  });

  const nextIngredient = () => {
    // Mark the current ingredient as both seen and rejected (swiped left)
    if (currentIngredient && !seenIngredientIds.includes(currentIngredient.id)) {
      setSeenIngredientIds(prev => [...prev, currentIngredient.id]);
      setRejectedIngredients(prev => [...prev, currentIngredient.id]);
      
      // Update recipe algorithm with rejected ingredient
      if (recipeAlgorithm) {
        recipeAlgorithm.onIngredientRejected(currentIngredient.name);
      }
    }
    
    if (isInPairingMode && pairingQueue.length > 0) {
      // In pairing mode, move through the pairing queue
      const nextPairingIndex = Math.min(currentIndex + 1, pairingQueue.length - 1);
      setCurrentIndex(nextPairingIndex);
      
      // If we've shown all pairings, exit pairing mode
      if (nextPairingIndex >= pairingQueue.length - 1) {
        setIsInPairingMode(false);
        setPairingBaseIngredient(null);
        setPairingQueue([]);
        // Return to normal ingredient flow
        setCurrentIndex(Math.min(currentIndex + 1, ingredients.length - 1));
      }
    } else if (showingMainIngredients && ingredients.length === 1) {
      // For main ingredient phase, get a new random main ingredient
      loadIngredients();
    } else {
      // Normal ingredient flow
      if (currentIndex < ingredients.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Reached end of ingredients
        if (selectedIngredients.length >= 5) {
          // Show recipe results with current selections
          if (recipeAlgorithm) {
            updateAvailableRecipes();
            setShowRecipeResults(true);
          } else {
            onComplete(selectedIngredients);
          }
        } else {
          // Loop back to beginning if not enough selected
          setCurrentIndex(0);
        }
      }
    }
  };

  const passIngredient = () => {
    if (currentIngredient) {
      // If rejecting a main ingredient, track it to prevent re-showing
      if (currentIngredient.priority === "main" && showingMainIngredients) {
        console.log(`Rejecting main ingredient: ${currentIngredient.name}`);
        setRejectedMainIngredients(prev => {
          const newRejected = [...prev, currentIngredient.name];
          console.log(`Updated rejected main ingredients:`, newRejected);
          return newRejected;
        });
      }
      
      // Mark as rejected for complementary ingredients
      if (!rejectedIngredients.includes(currentIngredient.id)) {
        setRejectedIngredients(prev => [...prev, currentIngredient.id]);
      }
      
      // Mark as seen to prevent re-showing
      if (!seenIngredientIds.includes(currentIngredient.id)) {
        setSeenIngredientIds(prev => [...prev, currentIngredient.id]);
      }
    }
    
    nextIngredient();
  };

  const selectIngredient = () => {
    if (currentIngredient) {
      // Update recipe algorithm with selected ingredient
      if (recipeAlgorithm) {
        recipeAlgorithm.onIngredientSelected(currentIngredient.name);
      }
      
      // Mark the current ingredient as seen (swiped right/selected)
      if (!seenIngredientIds.includes(currentIngredient.id)) {
        setSeenIngredientIds(prev => [...prev, currentIngredient.id]);
      }
      
      const legacyIngredient: IngredientLegacy = {
        id: currentIngredient.id.toString(),
        name: currentIngredient.name,
        description: currentIngredient.description,
        imageUrl: currentIngredient.imageUrl,
        tags: currentIngredient.tags,
        category: currentIngredient.category
      };
      
      // Check for duplicates by both ID and name to prevent duplicate selections
      const alreadySelected = selectedIngredients.find(ing => 
        ing.id === legacyIngredient.id || ing.name.toLowerCase() === legacyIngredient.name.toLowerCase()
      );
      
      if (!alreadySelected) {
        setSelectedIngredients(prevSelected => {
          // Double check for duplicates in the state setter to prevent race conditions
          const stillNotSelected = !prevSelected.find(ing => 
            ing.id === legacyIngredient.id || ing.name.toLowerCase() === legacyIngredient.name.toLowerCase()
          );
          if (stillNotSelected) {
            console.log(`Adding ingredient: ${legacyIngredient.name}`);
            return [...prevSelected, legacyIngredient];
          } else {
            console.log(`Duplicate prevented: ${legacyIngredient.name}`);
            return prevSelected;
          }
        });
        
        // Also mark as seen to prevent showing again
        if (!seenIngredientIds.includes(currentIngredient.id)) {
          setSeenIngredientIds(prev => [...prev, currentIngredient.id]);
        }
        
        // Check if this is a main ingredient selection
        if (currentIngredient.priority === "main" && !hasMainIngredient) {
          console.log("Selected main ingredient:", currentIngredient.name);
          setHasMainIngredient(true);
          setShowingMainIngredients(false);
          setSelectedMainIngredient(currentIngredient);
          // Reset ingredients list to load complementary ingredients
          setCurrentIndex(0);
          return; // Don't call nextIngredient() since we're loading new ingredients
        } else if (hasMainIngredient) {
          // Continue with current suggestions - only reload when user explicitly requests more
        }
        
        // Update available recipes after selection
        if (recipeAlgorithm) {
          updateAvailableRecipes();
        }
      }
      nextIngredient();
    }
  };

  const addSelectedIngredient = (ingredient: Ingredient) => {
    const legacyIngredient: IngredientLegacy = {
      id: ingredient.id.toString(),
      name: ingredient.name,
      description: ingredient.description,
      imageUrl: ingredient.imageUrl,
      tags: ingredient.tags,
      category: ingredient.category
    };
    
    if (!selectedIngredients.find(item => item.id === legacyIngredient.id)) {
      setSelectedIngredients([...selectedIngredients, legacyIngredient]);
      
      // Check if this is a main ingredient selection
      if (ingredient.priority === "main" && !hasMainIngredient) {
        setHasMainIngredient(true);
        setShowingMainIngredients(false);
        setSelectedMainIngredient(ingredient);
        // Reset ingredients list to load complementary ingredients
        setCurrentIndex(0);
      } else if (hasMainIngredient) {
        // After selecting any ingredient (main or complementary), reload smart suggestions
        setTimeout(() => {
          loadSmartIngredientSuggestions();
        }, 100);
      }
    }
    setSearchQuery("");
    setSearchResults([]);
    setShowImportModal(false);
  };

  const removeSelectedIngredient = (ingredientId: string) => {
    setSelectedIngredients(prev => prev.filter(ing => ing.id !== ingredientId));
  };

  // Touch and mouse event handlers for swipe functionality
  const handleStart = (clientX: number, clientY: number) => {
    setStartX(clientX);
    setStartY(clientY);
    setCurrentX(clientX);
    setCurrentY(clientY);
    setIsDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    setCurrentX(clientX);
    setCurrentY(clientY);
    
    if (cardRef.current) {
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      const rotation = deltaX * 0.1;
      
      cardRef.current.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
      cardRef.current.style.opacity = `${1 - Math.abs(deltaX) / 300}`;
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.opacity = '';
    }
    
    // Only handle visual feedback here - let useSwipe hook handle the actual swipe actions
    // This prevents double selection when both handlers trigger
    
    setIsDragging(false);
  };

  // Initialize recipe algorithm with database recipes
  const initializeRecipeAlgorithm = async () => {
    try {
      const response = await fetch('/api/recipe-combinations');
      if (response.ok) {
        const dbRecipes = await response.json();
        // Convert database recipes to algorithm format
        const algorithmRecipes = dbRecipes.map((recipe: any) => ({
          id: recipe.id,
          name: recipe.title || `${recipe.mainIngredient} ${recipe.mealType}`,
          ingredients: [recipe.mainIngredient, ...recipe.supportingIngredients],
          instructions: `A delicious ${recipe.mealType.toLowerCase()} recipe featuring ${recipe.mainIngredient}. Cook with ${recipe.appliance.toLowerCase()} for about ${recipe.cookTime} minutes.`,
          prepTime: `${Math.max(5, recipe.cookTime - 10)} min`,
          cookTime: `${recipe.cookTime} min`,
          difficulty: recipe.cookTime <= 20 ? 'Easy' : recipe.cookTime <= 40 ? 'Medium' : 'Hard',
          imageUrl: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 9000000000) + 1000000000}?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200&q=${recipe.mainIngredient}`,
          appliance: recipe.appliance,
          mealType: recipe.mealType,
          tasteProfile: recipe.tasteProfile
        }));
        
        console.log(`Initialized recipe algorithm with ${algorithmRecipes.length} database recipe combinations`);
        console.log('First few converted recipes:', algorithmRecipes.slice(0, 3));
        const algorithm = new RecipeAlgorithm(algorithmRecipes);
        setRecipeAlgorithm(algorithm);
        console.log('Recipe algorithm ready with database recipes');
      } else {
        // Fallback to sample recipes
        console.log('Using sample recipes as fallback');
        setRecipeAlgorithm(new RecipeAlgorithm(sampleRecipes));
      }
    } catch (error) {
      console.error('Failed to load recipes for algorithm:', error);
      setRecipeAlgorithm(new RecipeAlgorithm(sampleRecipes));
    }
  };

  // Helper function to update available recipes
  const updateAvailableRecipes = () => {
    if (!recipeAlgorithm) {
      console.log('No recipe algorithm available');
      return;
    }
    
    const recipes = recipeAlgorithm.getAvailableRecipes(0.2); // Show recipes with 20%+ completion
    console.log(`Found ${recipes.length} available recipes with 20%+ completion`);
    setAvailableRecipes(recipes);
    
    // Log analytics for debugging
    const analytics = recipeAlgorithm.getAnalytics();
    console.log('Recipe Algorithm Analytics:', analytics);
    
    if (recipes.length === 0) {
      console.log('No recipes found, trying with lower threshold...');
      const allRecipes = recipeAlgorithm.getAvailableRecipes(0.1);
      console.log(`Found ${allRecipes.length} recipes with 10%+ completion`);
      setAvailableRecipes(allRecipes);
    }
  };

  // Handle recipe selection
  const handleSelectRecipe = (recipeMatch: RecipeMatch) => {
    setSelectedRecipeMatch(recipeMatch);
    setShowRecipeDetail(true);
  };

  // Handle continuing to swipe for more ingredients
  const handleContinueSwiping = () => {
    setShowRecipeResults(false);
    // Continue with regular ingredient loading
    if (currentIndex >= ingredients.length - 1) {
      setCurrentIndex(0);
    }
  };

  const currentIngredient = isInPairingMode && pairingQueue.length > 0 
    ? pairingQueue[Math.min(currentIndex, pairingQueue.length - 1)]
    : ingredients[currentIndex];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-40 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cravii-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ingredients...</p>
        </div>
      </div>
    );
  }

  // Show recipe results screen
  if (showRecipeResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecipeResults(false)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Swiping
            </Button>
          </div>
          
          <RecipeResults 
            recipes={availableRecipes}
            onSelectRecipe={handleSelectRecipe}
            onContinueSwiping={handleContinueSwiping}
          />
          
          <RecipeDetailModal 
            isOpen={showRecipeDetail}
            onClose={() => setShowRecipeDetail(false)}
            recipeMatch={selectedRecipeMatch}
          />
        </div>
      </div>
    );
  }

  if (!currentIngredient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">No more ingredients!</h2>
          <Button onClick={() => setCurrentIndex(0)}>Start Over</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cravii-red to-cravii-red-dark pb-20">
      {/* Header Card */}
      <div className="mx-4 mt-4 mb-6">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div className="text-center">
              <h2 className="font-bold text-xl text-gray-900">
                {showingMainIngredients && !hasMainIngredient 
                  ? "Choose Your Main Ingredient" 
                  : "Choose Complementary Ingredients"
                }
              </h2>
              {showingMainIngredients && !hasMainIngredient && (
                <p className="text-sm text-cravii-red font-medium mt-1">
                  Select a protein or main component first
                </p>
              )}
              <div className="flex items-center justify-center gap-1 mt-1">
                <Target className="w-3 h-3 text-cravii-red" />
                <span className="text-xs text-cravii-red font-medium">Recipe-Guided Mode</span>
              </div>
            </div>
            <button 
              onClick={() => setShowImportModal(true)}
              className="bg-cravii-red text-white px-4 py-2 rounded-full text-sm font-medium flex items-center hover:bg-cravii-red-dark transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Import
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selectedIngredients.length} of 10 minimum
            </p>
            {selectedIngredients.length > 0 && (
              <button 
                onClick={() => setShowSelectedModal(true)}
                className="text-cravii-red text-sm font-medium flex items-center hover:text-cravii-red-dark"
              >
                <Eye className="w-4 h-4 mr-1" />
                View Selected
              </button>
            )}
          </div>
          {selectedIngredients.length >= 5 && (
            <div className="mt-4">
              <Button 
                onClick={() => {
                  updateAvailableRecipes();
                  setShowRecipeResults(true);
                }}
                className="w-full bg-cravii-red hover:bg-cravii-red-dark text-white rounded-full py-3 font-semibold"
              >
                Find Recipes ({selectedIngredients.length} ingredients)
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 px-4">
        {ingredients.length === 0 ? (
          <div className="text-center">
            <p className="text-white/80 mb-4">Loading ingredients...</p>
          </div>
        ) : currentIngredient ? (
          <>
            {/* Ingredient Card */}
            <div className="relative w-80 h-96">
              <div className="absolute inset-0 bg-white rounded-3xl shadow-xl overflow-hidden">
                <img
                  src={currentIngredient.imageUrl}
                  alt={currentIngredient.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-2 text-gray-900">{currentIngredient.name}</h2>
                  <p className="text-gray-600 text-sm mb-4">{currentIngredient.description}</p>
                  <Badge variant="secondary" className="mb-4 bg-cravii-red/10 text-cravii-red border-0">
                    {currentIngredient.category}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-6 mt-6">
              <button
                onClick={passIngredient}
                className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <X className="w-8 h-8 text-gray-600" />
              </button>
              <button
                onClick={selectIngredient}
                className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-50 transition-colors"
              >
                <Heart className="w-8 h-8 text-cravii-red" />
              </button>
            </div>
            
            {/* Instructions */}
            <div className="text-center text-white/80 text-sm space-y-1 mt-4">
              {showingMainIngredients ? (
                <p>Choose Your Main Ingredient • Swipe right to select</p>
              ) : (
                <p>Choose Complementary Ingredients • Swipe left to skip • Swipe right to select</p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-white rounded-3xl shadow-xl p-8 mx-4">
              <h2 className="text-xl font-bold mb-4 text-gray-900">No more ingredients!</h2>
              <Button 
                onClick={() => setCurrentIndex(0)}
                className="bg-cravii-red hover:bg-cravii-red-dark text-white rounded-full px-6 py-3"
              >
                Start Over
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Search Ingredients Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="w-full max-w-sm mx-4 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Search Ingredients</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden">
            <Input 
              placeholder="Search for ingredients..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            
            {searchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.map((ingredient) => (
                  <button
                    key={ingredient.id}
                    onClick={() => addSelectedIngredient(ingredient)}
                    className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left flex items-center gap-3"
                  >
                    <img 
                      src={ingredient.imageUrl} 
                      alt={ingredient.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium">{ingredient.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {ingredient.category}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-gray-500 text-center py-4">No ingredients found</p>
            )}
            
            {searchQuery.length < 2 && (
              <p className="text-gray-500 text-center py-4">Type at least 2 characters to search</p>
            )}
          </div>
          
          <Button 
            variant="outline"
            onClick={() => setShowImportModal(false)}
            className="w-full py-3 rounded-xl font-semibold mt-4"
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>

      {/* Selected Ingredients Modal */}
      <Dialog open={showSelectedModal} onOpenChange={setShowSelectedModal}>
        <DialogContent className="w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selected Ingredients ({selectedIngredients.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedIngredients.map((ingredient) => (
              <div key={ingredient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <img 
                    src={ingredient.imageUrl} 
                    alt={ingredient.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div>
                    <h4 className="font-medium">{ingredient.name}</h4>
                    <div className="flex gap-1">
                      {ingredient.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => removeSelectedIngredient(ingredient.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <Button 
            onClick={() => setShowSelectedModal(false)}
            className="w-full bg-cravii-red hover:bg-cravii-red-dark text-white"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* Pairing Mode Indicator */}
      {isInPairingMode && pairingBaseIngredient && (
        <div className="fixed top-20 left-4 right-4 z-40">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-cravii-red/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-cravii-red rounded-full animate-pulse"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Showing ingredients that pair with {pairingBaseIngredient.name}
                </p>
                <p className="text-xs text-gray-600">
                  Swipe right to add • Swipe left to skip • Swipe up for more pairings
                </p>
              </div>
              <button
                onClick={() => {
                  setIsInPairingMode(false);
                  setPairingBaseIngredient(null);
                  setPairingQueue([]);
                }}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
