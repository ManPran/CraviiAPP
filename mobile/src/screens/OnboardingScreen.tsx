import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const pages = [
    {
      emoji: '🥘',
      title: 'Swipe Through Ingredients',
      description: 'Choose from thousands of ingredients with simple swipe gestures. Find exactly what you have at home.',
    },
    {
      emoji: '🤖',
      title: 'AI-Powered Recipes',
      description: 'Get personalized recipe suggestions based on your ingredients, dietary needs, and cooking preferences.',
    },
    {
      emoji: '👨‍🍳',
      title: 'Cook Amazing Meals',
      description: 'Follow step-by-step instructions to create delicious meals with ingredients you already have.',
    },
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      scrollViewRef.current?.scrollTo({ x: nextPage * width, animated: true });
    } else {
      // Animation before completing
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }
  };

  const handleSkip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  const onScroll = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {pages.map((page, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.content}>
              <Text style={styles.emoji}>{page.emoji}</Text>
              <Text style={styles.title}>{page.title}</Text>
              <Text style={styles.description}>{page.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentPage ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <Text style={styles.nextText}>
            {currentPage === pages.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DC2626',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  page: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingBottom: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: 'white',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextButton: {
    backgroundColor: 'white',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  nextText: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;