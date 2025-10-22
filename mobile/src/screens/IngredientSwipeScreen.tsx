import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanGestureHandler,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { UserPreferences } from '../App';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = screenHeight * 0.6;
const SWIPE_THRESHOLD = 80;

interface Ingredient {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  priority: 'main' | 'complementary';
}

interface IngredientSwipeScreenProps {
  userPreferences: UserPreferences;
  onComplete: (ingredients: string[]) => void;
  onBack: () => void;
}

const IngredientSwipeScreen: React.FC<IngredientSwipeScreenProps> = ({
  userPreferences,
  onComplete,
  onBack,
}) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectedIngredients, setRejectedIngredients] = useState<string[]>([]);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // API base URL - you'll need to update this to your backend URL
  const API_BASE_URL = 'http://localhost:5000'; // Update this for your setup

  useEffect(() => {
    loadMainIngredient();
  }, []);

  const loadMainIngredient = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/ingredients/random-main?taste=${userPreferences.taste}&course=${userPreferences.course}&rejectedIngredients=${rejectedIngredients.join(',')}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch ingredient');
      }
      
      const ingredient = await response.json();
      setIngredients([ingredient]);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading main ingredient:', error);
      Alert.alert('Error', 'Failed to load ingredients. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSmartSuggestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/ingredients/smart-suggestions?selectedIngredients=${selectedIngredients.join(',')}&rejectedIngredients=${rejectedIngredients.join(',')}&preferences=${JSON.stringify(userPreferences)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const suggestions = await response.json();
      if (suggestions.length > 0) {
        setIngredients(suggestions);
        setCurrentIndex(0);
      } else {
        // No more suggestions, generate recipes
        handleGenerateRecipes();
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      Alert.alert('Error', 'Failed to load suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIngredient = ingredients[currentIndex];
    if (!currentIngredient) return;

    if (direction === 'right') {
      // Accept ingredient
      setSelectedIngredients(prev => [...prev, currentIngredient.name]);
    } else {
      // Reject ingredient
      setRejectedIngredients(prev => [...prev, currentIngredient.name]);
    }

    // Animate card out
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === 'right' ? screenWidth : -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: direction === 'right' ? 0.3 : -0.3,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset animations
      translateX.setValue(0);
      translateY.setValue(0);
      rotate.setValue(0);
      scale.setValue(1);

      // Move to next ingredient or load more
      if (currentIndex < ingredients.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Need to load more ingredients
        if (selectedIngredients.length === 0 && direction === 'right') {
          // First ingredient selected, load smart suggestions
          loadSmartSuggestions();
        } else if (selectedIngredients.length > 0) {
          // Already have ingredients, load more suggestions
          loadSmartSuggestions();
        } else {
          // No ingredients selected yet, load another main ingredient
          loadMainIngredient();
        }
      }
    });
  };

  const handlePanGesture = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY } = event.nativeEvent;
    
    translateX.setValue(translationX);
    translateY.setValue(translationY);
    
    // Calculate rotation based on horizontal movement
    const rotation = translationX / screenWidth * 0.4;
    rotate.setValue(rotation);
    
    // Calculate scale based on movement
    const distance = Math.sqrt(translationX * translationX + translationY * translationY);
    const scaleValue = Math.max(0.95, 1 - distance / 1000);
    scale.setValue(scaleValue);
  };

  const handlePanEnd = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, velocityX } = event.nativeEvent;
    
    if (Math.abs(translationX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 500) {
      // Swipe threshold met
      const direction = translationX > 0 ? 'right' : 'left';
      handleSwipe(direction);
    } else {
      // Return to center
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(rotate, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleGenerateRecipes = () => {
    if (selectedIngredients.length >= 3) {
      onComplete(selectedIngredients);
    } else {
      Alert.alert(
        'Need More Ingredients',
        'Please select at least 3 ingredients to generate recipes.',
        [{ text: 'OK' }]
      );
    }
  };

  const currentIngredient = ingredients[currentIndex];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading ingredients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentIngredient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No more ingredients available</Text>
          <TouchableOpacity style={styles.generateButton} onPress={handleGenerateRecipes}>
            <Text style={styles.generateButtonText}>Generate Recipes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Ingredients</Text>
        <TouchableOpacity onPress={handleGenerateRecipes} style={styles.doneButton}>
          <Text style={styles.doneText}>Done ({selectedIngredients.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {selectedIngredients.length} ingredients selected
        </Text>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        <PanGestureHandler
          onGestureEvent={handlePanGesture}
          onEnded={handlePanEnd}
        >
          <Animated.View
            style={[
              styles.card,
              {
                transform: [
                  { translateX },
                  { translateY },
                  { rotate: rotate.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-30deg', '30deg'],
                  }) },
                  { scale },
                ],
              },
            ]}
          >
            <Image 
              source={{ uri: currentIngredient.imageUrl }} 
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.cardContent}>
              <Text style={styles.ingredientName}>{currentIngredient.name}</Text>
              <Text style={styles.ingredientCategory}>{currentIngredient.category}</Text>
              <Text style={styles.ingredientDescription}>{currentIngredient.description}</Text>
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleSwipe('left')}
        >
          <Icon name="close" size={30} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleSwipe('right')}
        >
          <Icon name="check" size={30} color="white" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Swipe right to add • Swipe left to skip
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  doneButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  cardImage: {
    width: '100%',
    height: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardContent: {
    padding: 20,
    flex: 1,
  },
  ingredientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ingredientCategory: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  ingredientDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 50,
    paddingVertical: 20,
    gap: 40,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  instructions: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default IngredientSwipeScreen;