import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { User } from '../App';

interface RecipesScreenProps {
  user: User;
}

const RecipesScreen: React.FC<RecipesScreenProps> = ({ user }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Recipes</Text>
          <TouchableOpacity style={styles.searchButton}>
            <Icon name="search" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Coming Soon Message */}
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonEmoji}>🚧</Text>
          <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
          <Text style={styles.comingSoonText}>
            This section will show your saved recipes, cooking history, and favorite dishes.
          </Text>
        </View>

        {/* Feature Preview */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What's Coming:</Text>
          
          <View style={styles.featureItem}>
            <Icon name="bookmark" size={24} color="#DC2626" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Saved Recipes</Text>
              <Text style={styles.featureDescription}>
                All the recipes you've bookmarked for later
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Icon name="history" size={24} color="#DC2626" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Cooking History</Text>
              <Text style={styles.featureDescription}>
                Track recipes you've made and rate them
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Icon name="favorite" size={24} color="#DC2626" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Favorites</Text>
              <Text style={styles.featureDescription}>
                Quick access to your most-loved recipes
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Icon name="shopping-list" size={24} color="#DC2626" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Shopping Lists</Text>
              <Text style={styles.featureDescription}>
                Generate shopping lists from recipe ingredients
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchButton: {
    padding: 8,
  },
  comingSoonContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comingSoonEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default RecipesScreen;