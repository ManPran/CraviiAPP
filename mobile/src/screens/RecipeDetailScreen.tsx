import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Recipe } from '../App';

interface RecipeDetailScreenProps {
  recipe: Recipe;
  onBack: () => void;
}

const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ recipe, onBack }) => {
  const handleOpenSource = () => {
    if (recipe.sourceUrl) {
      Linking.openURL(recipe.sourceUrl);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          {recipe.rating && (
            <View style={styles.ratingBadge}>
              <Icon name="star" size={16} color="#fbbf24" />
              <Text style={styles.ratingText}>{recipe.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title and Basic Info */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{recipe.title}</Text>
            <Text style={styles.description}>{recipe.description}</Text>
            
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Icon name="schedule" size={20} color="#666" />
                <Text style={styles.metricText}>{recipe.readyInMinutes} min</Text>
              </View>
              <View style={styles.metric}>
                <Icon name="people" size={20} color="#666" />
                <Text style={styles.metricText}>{recipe.servings} servings</Text>
              </View>
              <View style={styles.metric}>
                <View style={[styles.difficultyIndicator, { backgroundColor: getDifficultyColor(recipe.difficulty) }]} />
                <Text style={styles.metricText}>{recipe.difficulty}</Text>
              </View>
            </View>
          </View>

          {/* Missing Ingredients Alert */}
          {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
            <View style={styles.missingIngredientsSection}>
              <View style={styles.missingHeader}>
                <Icon name="info" size={20} color="#f59e0b" />
                <Text style={styles.missingTitle}>Missing Ingredients</Text>
              </View>
              <Text style={styles.missingText}>
                You'll need to get these ingredients to complete this recipe:
              </Text>
              {recipe.missingIngredients.map((ingredient, index) => (
                <View key={index} style={styles.missingIngredientItem}>
                  <Icon name="shopping-cart" size={16} color="#f59e0b" />
                  <Text style={styles.missingIngredientText}>{ingredient}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ingredients Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients ({recipe.ingredients.length})</Text>
            {recipe.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientBullet} />
                <Text style={styles.ingredientText}>{ingredient}</Text>
              </View>
            ))}
          </View>

          {/* Instructions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {recipe.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>

          {/* Tags Section */}
          {recipe.tags && recipe.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {recipe.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Source Section */}
          {recipe.sourceUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Source</Text>
              <TouchableOpacity style={styles.sourceButton} onPress={handleOpenSource}>
                <Icon name="link" size={20} color="#DC2626" />
                <Text style={styles.sourceButtonText}>View Original Recipe</Text>
                <Icon name="open-in-new" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.saveButton}>
          <Icon name="bookmark-border" size={20} color="white" />
          <Text style={styles.saveButtonText}>Save Recipe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Icon name="share" size={20} color="#DC2626" />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  recipeImage: {
    width: '100%',
    height: 300,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  ratingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  difficultyIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  missingIngredientsSection: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  missingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  missingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
  },
  missingText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 12,
  },
  missingIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  missingIngredientText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
    marginTop: 7,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  sourceButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    minWidth: 100,
  },
  shareButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecipeDetailScreen;