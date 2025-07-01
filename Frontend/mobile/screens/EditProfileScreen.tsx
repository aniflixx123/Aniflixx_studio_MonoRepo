import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import ImagePicker from 'react-native-image-crop-picker';
import { useAppStore } from '../store/appStore';

const API_BASE = 'https://aniflixx-backend.onrender.com/api';

interface EditProfileScreenProps {
  navigation?: any;
}

interface UserProfile {
  _id: string;
  username: string;
  displayName?: string;
  bio?: string;
  profileImage?: string;
  customStatus?: string;
}

const EditProfileScreen = ({ navigation }: EditProfileScreenProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  
  const currentUser = auth().currentUser;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Global store
  const { user: globalUser, setUser: setGlobalUser, socket } = useAppStore();

  useEffect(() => {
    fetchUserProfile();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchUserProfile = async () => {
    try {
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const userProfile = data.user;
        setProfile(userProfile);
        setUsername(userProfile.username || '');
        setDisplayName(userProfile.displayName || '');
        setBio(userProfile.bio || '');
        setCustomStatus(userProfile.customStatus || '');
        setProfileImage(userProfile.profileImage || 'https://aniflixx.com/default-user.jpg');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: openCamera },
        { text: 'Choose from Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const openCamera = () => {
    ImagePicker.openCamera({
      width: 400,
      height: 400,
      cropping: true,
      cropperCircleOverlay: true,
      compressImageQuality: 0.8,
    }).then(handleImageSelection).catch(handleImageError);
  };

  const openGallery = () => {
    ImagePicker.openPicker({
      width: 400,
      height: 400,
      cropping: true,
      cropperCircleOverlay: true,
      compressImageQuality: 0.8,
    }).then(handleImageSelection).catch(handleImageError);
  };

  const handleImageSelection = async (image: any) => {
    setImageUploading(true);
    setLocalImageUri(image.path);
    
    try {
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      
      // Create form data
      const formData = new FormData();
      formData.append('profileImage', {
        uri: image.path,
        type: image.mime,
        name: 'profile.jpg',
      } as any);

      // Upload to server
      const response = await fetch(`${API_BASE}/user/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.profileImage);
        
        // Update global state
        if (globalUser) {
          const updatedUser = { ...globalUser, profileImage: data.profileImage };
          setGlobalUser(updatedUser);
        }
        
        Alert.alert('Success', 'Profile picture updated!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Failed to update profile picture');
      setLocalImageUri(null);
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageError = (error: any) => {
    if (error.code !== 'E_PICKER_CANCELLED') {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
  
    setSaving(true);
    try {
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      
      console.log('📤 Sending update request...');
      
      const response = await fetch(`${API_BASE}/user/update-profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim(),
          bio: bio.trim(),
          customStatus: customStatus.trim(),
          profileImage,
        }),
      });
  
      console.log('📥 Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 Response data:', data);
  
      if (response.ok) {
        // Update global state
        if (data.user) {
          setGlobalUser(data.user);
          
          // Emit profile update via WebSocket
          if (socket?.connected) {
            socket.emit('profile:update', {
              username: username.trim(),
              displayName: displayName.trim(),
              bio: bio.trim(),
              customStatus: customStatus.trim(),
              profileImage,
            });
          }
        }
        
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Handle error response
        console.error('❌ Error response:', data);
        Alert.alert('Error', data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('❌ Error saving profile:', err);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Image */}
          <View style={styles.imageSection}>
            <TouchableOpacity onPress={handleImagePicker} disabled={imageUploading}>
              <Image 
                source={{ uri: localImageUri || profileImage }} 
                style={styles.profileImage} 
              />
              {imageUploading ? (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : (
                <View style={styles.editImageButton}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleImagePicker}>
              <Text style={styles.changePhotoText}>Change Picture</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  maxLength={30}
                />
                <Text style={styles.charCount}>{username.length}/30</Text>
              </View>
            </View>

            {/* Display Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter display name"
                  placeholderTextColor="#666"
                  maxLength={50}
                />
                <Text style={styles.charCount}>{displayName.length}/50</Text>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <View style={[styles.inputContainer, styles.bioContainer]}>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                  maxLength={150}
                  textAlignVertical="top"
                />
                <Text style={styles.charCountBio}>{bio.length}/150</Text>
              </View>
            </View>

            {/* Custom Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Custom Status</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={customStatus}
                  onChangeText={setCustomStatus}
                  placeholder='"Watching Dragon Master 🐉"'
                  placeholderTextColor="#666"
                  maxLength={100}
                />
                <Text style={styles.charCount}>{customStatus.length}/100</Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerButton: {
    padding: 5,
    width: 30,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 0,
    backgroundColor: '#4285F4',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
  },
  changePhotoText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  bioContainer: {
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bioInput: {
    minHeight: 80,
    paddingTop: 0,
    paddingBottom: 0,
  },
  charCount: {
    color: '#666',
    fontSize: 12,
  },
  charCountBio: {
    position: 'absolute',
    bottom: 8,
    right: 16,
    color: '#666',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#4285F4',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProfileScreen;