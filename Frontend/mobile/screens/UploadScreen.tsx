import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Dimensions,
  Image,
  FlatList,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Modal,
  Keyboard,
} from 'react-native';
import { CameraRoll, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import auth from '@react-native-firebase/auth';
import Video from 'react-native-video';

const API_BASE = 'https://aniflixx-backend.onrender.com/api';
const { width, height } = Dimensions.get('window');

interface VideoFile {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
  duration?: number | null;
}

const UploadFlickScreen: React.FC<any> = ({ navigation, route }) => {
  const [currentStep, setCurrentStep] = useState<'gallery' | 'details' | 'uploading' | 'success'>('gallery');
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [galleryVideos, setGalleryVideos] = useState<PhotoIdentifier[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string>('');
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [visibility, setVisibility] = useState<'Public' | 'Followers only' | 'Private'>('Public');
  const [showOnProfile, setShowOnProfile] = useState(true);
  const [enableComments, setEnableComments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);

  useEffect(() => {
    requestGalleryPermission();
  }, []);

  // Get setShowBottomNavBar from route params
  const setShowBottomNavBar = route?.params?.setShowBottomNavBar;

  // Hide/show navbar based on current step
  useEffect(() => {
    if (setShowBottomNavBar) {
      const shouldShow = currentStep === 'gallery';
      setShowBottomNavBar(shouldShow);
    }

    // Cleanup - show navbar when component unmounts
    return () => {
      if (setShowBottomNavBar) {
        setShowBottomNavBar(true);
      }
    };
  }, [currentStep, setShowBottomNavBar]);



  const requestGalleryPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const permission = Platform.Version >= 33 
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
          
        const granted = await PermissionsAndroid.request(permission);
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          loadGalleryVideos();
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      loadGalleryVideos();
    }
  };

  const loadGalleryVideos = async (after?: string) => {
    try {
      setLoadingGallery(true);
      const params: any = {
        first: 30,
        assetType: 'Videos',
        groupTypes: 'All',
      };
      
      if (after) {
        params.after = after;
      }

      const result = await CameraRoll.getPhotos(params);
      
      if (after) {
        setGalleryVideos([...galleryVideos, ...result.edges]);
      } else {
        setGalleryVideos(result.edges);
      }
      
      setHasNextPage(result.page_info.has_next_page);
      setEndCursor(result.page_info.end_cursor || '');
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleVideoSelect = (video: PhotoIdentifier, index: number) => {
    // Check video duration (in seconds)
    const duration = video.node.image.playableDuration;
    
    if (duration && duration > 20) {
      Alert.alert(
        'Video Too Long',
        `Please select a video that is 20 seconds or less. This video is ${Math.round(duration)} seconds long.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedIndex(index);
    setSelectedVideo({
      uri: video.node.image.uri,
      name: `video_${Date.now()}.mp4`,
      type: 'video/mp4',
      size: video.node.image.fileSize,
      duration: video.node.image.playableDuration,
    });
  };

  const addHashtag = () => {
    if (hashtagInput.trim()) {
      // Remove # if user added it, then add it back to ensure consistency
      const cleanTag = hashtagInput.trim().replace(/^#/, '');
      const formattedTag = `#${cleanTag}`;
      
      if (!hashtags.includes(formattedTag)) {
        setHashtags([...hashtags, formattedTag]);
      }
      setHashtagInput('');
    }
  };

  const uploadToCloudflare = async (
    uploadUrl: string,
    videoFile: VideoFile,
    onProgress: (status: string) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      onProgress('Uploading video...');
      
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          // Ensure progress never exceeds 100%
          const clampedProgress = Math.min(progress, 100);
          onProgress(`Uploading: ${clampedProgress}%`);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress('Processing...');
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout - file too large or connection too slow'));
      });

      xhr.open('POST', uploadUrl);
      
      // Set timeout to 5 minutes for large files
      xhr.timeout = 300000;
      
      const formData = new FormData();
      formData.append('file', {
        uri: videoFile.uri,
        type: videoFile.type,
        name: videoFile.name,
      } as any);

      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    if (!selectedVideo || !title.trim()) {
      Alert.alert('Missing Info', 'Please add a video and title');
      return;
    }

    // Check video size
    if (selectedVideo.size && selectedVideo.size > 100 * 1024 * 1024) { // 100MB
      Alert.alert(
        'Large Video File',
        `Your video is ${Math.round((selectedVideo.size || 0) / (1024 * 1024))}MB. Large files may take longer to upload. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => performUpload() }
        ]
      );
    } else {
      performUpload();
    }
  };

  const performUpload = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setCurrentStep('uploading');

    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('Please sign in to upload');
      }
      
      setUploadStatus('Getting upload URL...');
      const token = await currentUser.getIdToken();

      const urlResponse = await fetch(`${API_BASE}/upload/upload-url`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, videoId } = await urlResponse.json();
      
      // Store the videoId for later use
      setUploadedVideoId(videoId);

      await uploadToCloudflare(uploadUrl, selectedVideo!, setUploadStatus);

      setUploadStatus('Publishing flick...');
      
      const registerResponse = await fetch(`${API_BASE}/upload/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          title: title.trim(),
          description: description.trim(),
          hashtags: hashtags.join(' '),
          visibility: visibility.toLowerCase().replace(' ', '_'), // Convert to API format
          showOnProfile,
          enableComments,
          skipProcessingWait: true,
        }),
      });

      if (!registerResponse.ok) {
        throw new Error('Failed to register video');
      }

      setUploadStatus('Success!');
      setTimeout(() => {
        setCurrentStep('success');
      }, 1000);

    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Something went wrong');
      setCurrentStep('details');
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  const handleViewFlick = () => {
    if (uploadedVideoId) {
      // Get the onNavigateToReels function from route params if available
      const onNavigateToReels = route?.params?.onNavigateToReels;
      
      if (onNavigateToReels) {
        // Use the same navigation method as HomeScreen
        onNavigateToReels(uploadedVideoId);
      } else if (navigation?.navigate) {
        // Fallback to direct navigation
        navigation.navigate('Reels', {
          initialReelId: uploadedVideoId,
          initialIndex: 0
        });
      }
    }
  };

  const renderGalleryItem = ({ item, index }: { item: PhotoIdentifier; index: number }) => {
    const duration = item.node.image.playableDuration;
    const isOverLimit = duration && duration > 20;
    
    return (
      <TouchableOpacity
        style={[
          styles.galleryItem,
          ...(isOverLimit ? [styles.galleryItemDisabled] : [])
        ]}
        onPress={() => handleVideoSelect(item, index)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.node.image.uri }}
          style={[
            styles.galleryImage,
            ...(isOverLimit ? [styles.galleryImageDisabled] : [])
          ]}
        />
        {duration && (
          <View style={styles.durationBadge}>
            <Text style={[
              styles.durationText,
              ...(isOverLimit ? [styles.durationTextError] : [])
            ]}>
              {Math.round(duration)}s
            </Text>
          </View>
        )}
        <View 
          style={[
            styles.selectionCircle,
            selectedIndex === index && styles.selectionCircleActive,
          ]} 
        />
      </TouchableOpacity>
    );
  };

  const handleBackToHome = () => {
    // Reset all states
    setCurrentStep('gallery');
    setSelectedVideo(null);
    setSelectedIndex(null);
    setTitle('');
    setDescription('');
    setHashtags([]);
    setHashtagInput('');
    setVisibility('Public');
    setShowOnProfile(true);
    setEnableComments(true);
    setUploadedVideoId(null);
    
    // Navigate back or change tab
    const onChangeTab = route?.params?.onChangeTab;
    if (onChangeTab) {
      onChangeTab('home');
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Gallery Screen
  if (currentStep === 'gallery') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 30 }} />
          <Text style={styles.headerTitle}>Upload a Flick</Text>
          <View style={{ width: 30 }} />
        </View>

        <Text style={styles.durationNote}>Maximum video length: 20 seconds</Text>

        <FlatList
          data={galleryVideos}
          renderItem={renderGalleryItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.galleryRow}
          contentContainerStyle={styles.galleryContent}
          onEndReached={() => {
            if (hasNextPage && !loadingGallery) {
              loadGalleryVideos(endCursor);
            }
          }}
          onEndReachedThreshold={0.5}
        />
        
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.addDetailsButton,
              !selectedVideo && styles.addDetailsButtonDisabled
            ]}
            onPress={() => selectedVideo && setCurrentStep('details')}
            disabled={!selectedVideo}
          >
            <Text style={styles.addDetailsText}>Add Flick Details</Text>
            <Text style={styles.arrowText}>——→</Text>
          </TouchableOpacity>
          
          <View style={styles.homeIndicator} />
        </View>
      </View>
    );
  }

  // Details Screen
  if (currentStep === 'details') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentStep('gallery')}>
            <Text style={styles.backButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Details</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {selectedVideo && (
            <View style={styles.videoPreview}>
              <Video
                source={{ uri: selectedVideo.uri }}
                style={styles.previewVideo}
                paused={true}
                resizeMode="cover"
              />
            </View>
          )}

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Flick Title (Required)</Text>
            <TextInput
              style={styles.input}
              placeholder="Give your flick a title"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add context, credits or story..."
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Tags / Hashtags</Text>
            <Text style={styles.hashtagHint}>Add tags one at a time (no need to type #)</Text>
            
            <View style={styles.hashtagInputWrapper}>
              <TextInput
                style={styles.hashtagInput}
                placeholder="Enter tag"
                placeholderTextColor="#666"
                value={hashtagInput}
                onChangeText={setHashtagInput}
                onSubmitEditing={addHashtag}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.addHashtagButton,
                  !hashtagInput.trim() && styles.addHashtagButtonDisabled
                ]}
                onPress={addHashtag}
                disabled={!hashtagInput.trim()}
              >
                <Text style={styles.addHashtagButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tagsWrapper}>
              {hashtags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.tag}
                  onPress={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                  <Text style={styles.tagRemove}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Visibility Settings</Text>
            <View style={styles.visibilityRow}>
              {['Public', 'Followers only', 'Private'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.visibilityButton,
                    visibility === option && styles.visibilityButtonActive
                  ]}
                  onPress={() => setVisibility(option as any)}
                >
                  <Text style={[
                    styles.visibilityText,
                    visibility === option && styles.visibilityTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show on profile</Text>
            <TouchableOpacity
              style={[styles.toggle, showOnProfile && styles.toggleActive]}
              onPress={() => setShowOnProfile(!showOnProfile)}
            >
              <View style={[
                styles.toggleDot, 
                showOnProfile && styles.toggleDotActive
              ]} />
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enable comments</Text>
            <TouchableOpacity
              style={[styles.toggle, enableComments && styles.toggleActive]}
              onPress={() => setEnableComments(!enableComments)}
            >
              <View style={[
                styles.toggleDot, 
                enableComments && styles.toggleDotActive
              ]} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={styles.detailsBottomContainer}>
          <TouchableOpacity
            style={[
              styles.postButton,
              (!title.trim() || loading) && styles.postButtonDisabled
            ]}
            onPress={handleUpload}
            disabled={!title.trim() || loading}
          >
            <Text style={styles.postButtonText}>
              {loading ? 'Uploading...' : 'Post Flick'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Uploading Screen
  if (currentStep === 'uploading') {
    return (
      <View style={styles.uploadingContainer}>
        {selectedVideo && (
          <View style={styles.uploadingVideoWrapper}>
            <Video
              source={{ uri: selectedVideo.uri }}
              style={styles.uploadingVideo}
              paused={false}
              muted={true}
              repeat={true}
              resizeMode="cover"
            />
          </View>
        )}

        <ActivityIndicator size="large" color="#007AFF" style={styles.uploadingSpinner} />
        <Text style={styles.uploadingText}>{uploadStatus || 'Uploading...'}</Text>
      </View>
    );
  }

  // Success Screen
  if (currentStep === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToHome}>
            <Text style={styles.backButton}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Your Flick is Live!!!</Text>
          
          {selectedVideo && (
            <View style={styles.successVideoWrapper}>
              <Video
                source={{ uri: selectedVideo.uri }}
                style={styles.successVideo}
                paused={false}
                muted={true}
                repeat={true}
                resizeMode="cover"
              />
            </View>
          )}

          <TouchableOpacity style={styles.viewFlickButton} onPress={handleViewFlick}>
            <Text style={styles.viewFlickIcon}>▶</Text>
            <Text style={styles.viewFlickText}>View Flick</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.buttonIcon}>👤</Text>
            <Text style={styles.buttonText}>Go to Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.buttonIcon}>↗</Text>
            <Text style={styles.buttonText}>Share Flick</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
  },
  backButton: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '200',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '500',
  },
  durationNote: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  content: {
    flex: 1,
  },
  
  // Gallery Grid
  galleryContent: {
    paddingBottom: 100,
  },
  galleryRow: {
    paddingHorizontal: 0,
  },
  galleryItem: {
    width: width / 3,
    height: width / 3 * 1.5,
    padding: 1,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  galleryItemDisabled: {
    opacity: 0.5,
  },
  galleryImageDisabled: {
    opacity: 0.7,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  durationTextError: {
    color: '#FF3B30',
  },
  selectionCircle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
  },
  selectionCircleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  
  // Bottom Container
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  addDetailsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 28,
    marginBottom: 70,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addDetailsButtonDisabled: {
    backgroundColor: '#1C1C1E',
  },
  addDetailsText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  arrowText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 10,
    opacity: 0.8,
  },
  homeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: '#FFF',
    borderRadius: 3,
    alignSelf: 'center',
  },
  
  // Details Screen
  videoPreview: {
    width: width - 32,
    height: 200,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  inputSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  inputLabel: {
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#38383A',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 16,
  },
  textArea: {
    borderRadius: 16,
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#38383A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    color: '#FFF',
    fontSize: 14,
  },
  tagRemove: {
    color: '#FF3B30',
    fontSize: 18,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  hashtagHint: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
  },
  hashtagInputWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  hashtagInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#38383A',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 16,
  },
  addHashtagButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    borderRadius: 22,
    justifyContent: 'center',
  },
  addHashtagButtonDisabled: {
    backgroundColor: '#38383A',
  },
  addHashtagButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addTagButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  addTagText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38383A',
    alignItems: 'center',
  },
  visibilityButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  visibilityText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  visibilityTextActive: {
    color: '#FFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  toggleLabel: {
    color: '#FFF',
    fontSize: 16,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 31,
    backgroundColor: '#38383A',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleDot: {
    width: 27,
    height: 27,
    borderRadius: 27,
    backgroundColor: '#FFF',
  },
  toggleDotActive: {
    transform: [{ translateX: 20 }],
  },
  detailsBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 34,
    paddingTop: 16,
  },
  postButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 17,
    borderRadius: 30,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#38383A',
  },
  postButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    width: width - 40,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#38383A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#38383A',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonTextPrimary: {
    fontWeight: '600',
  },
  
  // Uploading Screen
  uploadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  uploadingVideoWrapper: {
    width: width - 80,
    height: (width - 80) * 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
    backgroundColor: '#1C1C1E',
  },
  uploadingVideo: {
    width: '100%',
    height: '100%',
  },
  uploadingSpinner: {
    marginBottom: 20,
  },
  uploadingText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Success Screen
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  successTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 32,
  },
  successVideoWrapper: {
    width: width - 32,
    height: (width - 32) * 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: '#1C1C1E',
  },
  successVideo: {
    width: '100%',
    height: '100%',
  },
  viewFlickButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: width - 32,
    marginBottom: 12,
  },
  viewFlickIcon: {
    color: '#FFF',
    fontSize: 16,
    marginRight: 8,
  },
  viewFlickText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profileButton: {
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderRadius: 30,
    width: width - 32,
    marginBottom: 12,
  },
  shareButton: {
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderRadius: 30,
    width: width - 32,
  },
  buttonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default UploadFlickScreen;