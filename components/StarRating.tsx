import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scaledPixels } from '@/hooks/useScale';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, maxStars = 5 }) => {
  return (
    <View style={styles.container}>
      {[...Array(maxStars)].map((_, index) => (
        <Ionicons
          key={index}
          name={index < Math.floor(rating) ? 'star' : 'star-outline'}
          size={scaledPixels(24)}
          color="#FFD700"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
});
