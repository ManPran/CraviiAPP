import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { User, UserPreferences } from '../App';

interface DietaryRestrictionsScreenProps {
  user: User;
  onComplete: (preferences: UserPreferences) => void;
}

const DietaryRestrictionsScreen: React.FC<DietaryRestrictionsScreenProps> = ({ 
  user, 
  onComplete 
}) => {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedTaste, setSelectedTaste] = useState<string>('');
  const [selectedPrepTime, setSelectedPrepTime] = useState<number>(5);
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>([]);

  const courses = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
  ];

  const tastes = [
    { id: 'sweet', label: 'Sweet', emoji: '🍯' },
    { id: 'savory', label: 'Savory', emoji: '🧂' },
    { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
  ];

  const prepTimes = [
    { id: 5, label: '5 minutes', emoji: '⚡' },
    { id: 15, label: '15 minutes', emoji: '⏰' },
    { id: 30, label: '30 minutes', emoji: '⏳' },
  ];

  const appliances = [
    { id: 'stovetop', label: 'Stovetop', emoji: '🔥' },
    { id: 'oven', label: 'Oven', emoji: '🔥' },
    { id: 'microwave', label: 'Microwave', emoji: '📡' },
    { id: 'airfryer', label: 'Air Fryer', emoji: '💨' },
    { id: 'grill', label: 'Grill', emoji: '🔥' },
  ];

  const toggleAppliance = (applianceId: string) => {
    setSelectedAppliances(prev => {
      if (prev.includes(applianceId)) {
        return prev.filter(id => id !== applianceId);
      } else {
        return [...prev, applianceId];
      }
    });
  };

  const handleComplete = () => {
    const preferences: UserPreferences = {
      course: selectedCourse,
      taste: selectedTaste,
      prepTime: selectedPrepTime,
      appliances: selectedAppliances,
    };
    
    onComplete(preferences);
  };

  const isComplete = selectedCourse && selectedTaste && selectedAppliances.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Set Your Preferences</Text>
          <Text style={styles.subtitle}>
            Help us suggest the perfect recipes for you
          </Text>
        </View>

        {/* Course Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What meal are you planning?</Text>
          <View style={styles.optionsGrid}>
            {courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.optionCard,
                  selectedCourse === course.id && styles.selectedOption,
                ]}
                onPress={() => setSelectedCourse(course.id)}
              >
                <Text style={styles.optionEmoji}>{course.emoji}</Text>
                <Text style={[
                  styles.optionText,
                  selectedCourse === course.id && styles.selectedOptionText,
                ]}>
                  {course.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Taste Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What flavors do you prefer?</Text>
          <View style={styles.optionsGrid}>
            {tastes.map((taste) => (
              <TouchableOpacity
                key={taste.id}
                style={[
                  styles.optionCard,
                  selectedTaste === taste.id && styles.selectedOption,
                ]}
                onPress={() => setSelectedTaste(taste.id)}
              >
                <Text style={styles.optionEmoji}>{taste.emoji}</Text>
                <Text style={[
                  styles.optionText,
                  selectedTaste === taste.id && styles.selectedOptionText,
                ]}>
                  {taste.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Prep Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How much time do you have?</Text>
          <View style={styles.optionsGrid}>
            {prepTimes.map((time) => (
              <TouchableOpacity
                key={time.id}
                style={[
                  styles.optionCard,
                  selectedPrepTime === time.id && styles.selectedOption,
                ]}
                onPress={() => setSelectedPrepTime(time.id)}
              >
                <Text style={styles.optionEmoji}>{time.emoji}</Text>
                <Text style={[
                  styles.optionText,
                  selectedPrepTime === time.id && styles.selectedOptionText,
                ]}>
                  {time.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Appliances Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What appliances do you have?</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.optionsGrid}>
            {appliances.map((appliance) => (
              <TouchableOpacity
                key={appliance.id}
                style={[
                  styles.optionCard,
                  selectedAppliances.includes(appliance.id) && styles.selectedOption,
                ]}
                onPress={() => toggleAppliance(appliance.id)}
              >
                <Text style={styles.optionEmoji}>{appliance.emoji}</Text>
                <Text style={[
                  styles.optionText,
                  selectedAppliances.includes(appliance.id) && styles.selectedOptionText,
                ]}>
                  {appliance.label}
                </Text>
                {selectedAppliances.includes(appliance.id) && (
                  <Icon name="check-circle" size={20} color="white" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !isComplete && styles.disabledButton]}
          onPress={handleComplete}
          disabled={!isComplete}
        >
          <Text style={styles.continueButtonText}>Continue to Cravii</Text>
        </TouchableOpacity>
      </View>
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
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedOption: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  optionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: 'white',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  continueButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DietaryRestrictionsScreen;