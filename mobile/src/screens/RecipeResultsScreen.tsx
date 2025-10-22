import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { UserPreferences, Recipe } from '../App';

interface RecipeResultsScreenProps {
  ingredients: string[];
  userPreferences: UserPreferences;
  onSelectRecipe: (recipe: Recipe) => void;
  onBack: () => void;
}

const RecipeResultsScreen: React.FC<RecipeResultsScreenProps> = ({
  ingredients,
  userPreferences,
  onSelectRecipe,
  onBack,
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:5000'; // Update this for your setup

  useEffect(() => {
    searchRecipes();
  }, [ingredients, userPreferences]);

  const searchRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/recipe-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients,
          preferences: userPreferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }

      const recipesData = await response.json();
      setRecipes(recipesData);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRecipeCard = ({ item: recipe }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => onSelectRecipe(recipe)}
    >
      <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
      
      <View style={styles.recipeContent}>
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {recipe.title}
          </Text>
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
          </View>
        </View>

        <Text style={styles.recipeDescription} numberOfLines={2}>
          {recipe.description}
        </Text>

        <View style={styles.recipeMetrics}>
          <View style={styles.metric}>
            <Icon name="schedule" size={16} color="#666" />
            <Text style={styles.metricText}>{recipe.readyInMinutes} min</Text>
          </View>
          <View style={styles.metric}>
            <Icon name="people" size={16} color="#666" />
            <Text style={styles.metricText}>{recipe.servings} servings</Text>
          </View>
          {recipe.completenessScore && (
            <View style={styles.metric}>
              <Icon name="check-circle" size={16} color="#22c55e" />
              <Text style={styles.metricText}>{recipe.completenessScore}% complete</Text>
            </View>
          )}
        </View>

        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
          <View style={styles.missingIngredientsContainer}>
            <Text style={styles.missingIngredientsTitle}>Missing ingredients:</Text>
            <Text style={styles.missingIngredientsText} numberOfLines={2}>
              {recipe.missingIngredients.slice(0, 3).join(', ')}
              {recipe.missingIngredients.length > 3 && '...'}
            </Text>
          </View>
        )}

        <View style={styles.tags}>
          {recipe.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipe Results</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Ingredients Summary */}
      <View style={styles.ingredientsSummary}>
        <Text style={styles.summaryTitle}>Your ingredients ({ingredients.length}):</Text>
        <View style={styles.ingredientsList}>
          {ingredients.slice(0, 4).map((ingredient, index) => (
            <View key={index} style={styles.ingredientChip}>
              <Text style={styles.ingredientChipText}>{ingredient}</Text>
            </View>
          ))}
          {ingredients.length > 4 && (
            <View style={styles.ingredientChip}>
              <Text style={styles.ingredientChipText}>+{ingredients.length - 4} more</Text>
            </View>
          )}
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Finding perfect recipes...</Text>
        </View>
      ) : recipes.length > 0 ? (
        <FlatList
          data={recipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.recipesList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsEmoji}>😔</Text>
          <Text style={styles.noResultsTitle}>No recipes found</Text>
          <Text style={styles.noResultsText}>
            Try selecting different ingredients or adjusting your preferences.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onBack}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34, // Same width as back button for centering
  },
  ingredientsSummary: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientChip: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ingredientChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  recipesList: {
    padding: 20,
  },
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: 200,
  },
  recipeContent: {
    padding: 16,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 12,
  },
  difficultyBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textTransform: 'capitalize',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeMetrics: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: '#666',
  },
  missingIngredientsContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  missingIngredientsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  missingIngredientsText: {
    fontSize: 12,
    color: '#92400e',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: '#666',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noResultsEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecipeResultsScreen;