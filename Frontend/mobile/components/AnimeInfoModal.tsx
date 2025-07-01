import React, { memo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  TouchableOpacity,
  ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Reel } from '../types';
import { formatCount, getGenreColor } from '../utils/formatters';

interface AnimeInfoModalProps {
  visible: boolean;
  reel: Reel | null; // This can only be Reel or null, not undefined
  onClose: () => void;
}

const AnimeInfoModal = memo(({ visible, reel, onClose }: AnimeInfoModalProps) => {
  if (!reel) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{reel.title || reel.anime || 'Anime'}</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {reel.episodes && (
              <View style={styles.infoRow}>
                <Ionicons name="film-outline" size={16} color="#ffffff" />
                <Text style={styles.infoText}>{reel.episodes} Episodes</Text>
              </View>
            )}
            
            {reel.viewers !== undefined && (
              <View style={styles.infoRow}>
                <Ionicons name="eye-outline" size={16} color="#ffffff" />
                <Text style={styles.infoText}>
                  {typeof reel.viewers === 'number' ? formatCount(reel.viewers) : '0'} Viewers
                </Text>
              </View>
            )}
            
            {reel.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{reel.description}</Text>
              </View>
            )}
            
            {reel.genre && reel.genre.length > 0 && (
              <View style={styles.genreContainer}>
                {reel.genre.map((genre, idx) => (
                  <View 
                    key={idx} 
                    style={[
                      styles.genreTag,
                      { backgroundColor: getGenreColor(genre) }
                    ]}
                  >
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
          
          <TouchableOpacity style={styles.watchButton}>
            <Text style={styles.watchButtonText}>Watch Series</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#191919',
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 14,
  },
  descriptionContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  descriptionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  descriptionText: {
    color: '#dddddd',
    fontSize: 14,
    lineHeight: 20,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 16,
  },
  genreTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  watchButton: {
    backgroundColor: '#ff3366',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  watchButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AnimeInfoModal;