import React, { useState, memo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface ReelDescriptionProps {
  description: string;
  maxLength?: number;
}

const ReelDescription = memo(({ description, maxLength = 100 }: ReelDescriptionProps) => {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = description.length > maxLength;
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  return (
    <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
      <Text style={styles.description}>
        {shouldTruncate && !expanded 
          ? `${description.substring(0, maxLength)}...` 
          : description}
        {shouldTruncate && (
          <Text style={styles.showMoreText}>
            {expanded ? ' Show less' : ' Show more'}
          </Text>
        )}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  description: {
    color: '#ffffff',
    fontSize: 13,
    opacity: 0.9,
  },
  showMoreText: {
    color: '#aaaaaa',
    fontWeight: 'bold',
  },
});

export default ReelDescription;