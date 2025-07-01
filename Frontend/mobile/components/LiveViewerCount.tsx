import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { formatCount } from '../utils/formatters';

interface LiveViewerCountProps {
  count?: number; // Only number or undefined, not null
  isLoaded: boolean;
  onPress?: () => void;
}

const LiveViewerCount = memo(({ count, isLoaded, onPress }: LiveViewerCountProps) => {
  // Default to 1 viewer if count is undefined or we're still loading
  const displayCount = isLoaded && typeof count === 'number' && count > 0 
    ? formatCount(count) 
    : "1";
    
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.indicator} />
      <Text style={styles.count}>
        {`${displayCount} watching`}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3366',
    marginRight: 6,
  },
  count: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LiveViewerCount;