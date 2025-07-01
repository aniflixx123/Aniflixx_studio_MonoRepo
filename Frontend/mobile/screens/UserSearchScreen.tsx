// UserSearchScreen.tsx - Fixed Navigation
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { debounce } from 'lodash';

const API_BASE = 'https://aniflixx-backend.onrender.com/api';

interface SearchResult {
  _id: string;
  uid: string;
  username: string;
  displayName?: string;
  profileImage?: string;
  bio?: string;
  isVerified?: boolean;
  followersCount?: number;
}

interface UserSearchScreenProps {
  navigation: any;
}

const UserSearchScreen: React.FC<UserSearchScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Focus search input on mount
  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  // Debounced search function
  const searchUsers = useCallback(
    debounce(async (query: string) => {
      // Clear results if query is empty
      if (!query || !query.trim()) {
        setSearchResults([]);
        setLoading(false);
        setHasSearched(false);
        return;
      }

      try {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        const token = await currentUser.getIdToken();
        
        const response = await fetch(
          `${API_BASE}/user/search?q=${encodeURIComponent(query)}&limit=20`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.results) {
            setSearchResults(data.results);
          } else {
            setSearchResults([]);
          }
        } else {
          // Fallback: Use the reels endpoint if search endpoint doesn't exist yet
          const fallbackResponse = await fetch(
            `${API_BASE}/reels?limit=100`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            
            // Extract unique users from reels and filter by search query
            const usersMap = new Map();
            
            if (data.reels && Array.isArray(data.reels)) {
              data.reels.forEach((reel: any) => {
                if (reel.user && !usersMap.has(reel.user.uid)) {
                  const user = reel.user;
                  // Simple search matching username or display name
                  const searchLower = query.toLowerCase();
                  const usernameMatch = user.username?.toLowerCase().includes(searchLower);
                  const displayNameMatch = user.displayName?.toLowerCase().includes(searchLower);
                  
                  if (usernameMatch || displayNameMatch) {
                    usersMap.set(user.uid, {
                      _id: user._id || user.uid,
                      uid: user.uid,
                      username: user.username,
                      displayName: user.displayName,
                      profileImage: user.profileImage,
                      bio: user.bio,
                      isVerified: user.isVerified,
                      followersCount: user.followersCount || 0
                    });
                  }
                }
              });
            }
            
            const results = Array.from(usersMap.values());
            // Sort by followers count (if available) or alphabetically
            results.sort((a, b) => {
              if (a.followersCount && b.followersCount) {
                return b.followersCount - a.followersCount;
              }
              return a.username.localeCompare(b.username);
            });
            
            setSearchResults(results);
          }
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    }, 500),
    []
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    if (!text || !text.trim()) {
      // Clear everything when input is empty
      setSearchResults([]);
      setLoading(false);
      setHasSearched(false);
      // Cancel any pending search
      searchUsers.cancel();
    } else {
      // Only search if there's actual text
      setLoading(true);
      searchUsers(text.trim());
    }
  };

  const handleUserPress = (user: SearchResult) => {
    // Dismiss keyboard
    Keyboard.dismiss();
    
    const currentUser = auth().currentUser;
    
    // Check if viewing own profile
    if (user.uid === currentUser?.uid) {
      // Navigate back to own profile tab
      navigation.goBack();
    } else {
      // Navigate to ProfileScreen with userId param
      navigation.navigate('ProfileScreen', {
        userId: user.uid
      });
    }
  };

  const renderUser = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.profileImage || 'https://aniflixx.com/default-user.jpg' }}
        style={styles.userImage}
      />
      
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.username}>{item.username}</Text>
          {item.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color="#0066FF" style={styles.verifiedBadge} />
          )}
        </View>
        {item.displayName && (
          <Text style={styles.displayName}>{item.displayName}</Text>
        )}
        {item.followersCount !== undefined && (
          <Text style={styles.followersText}>
            {formatCount(item.followersCount)} followers
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Search Users</Text>
          
          <View style={styles.headerRight} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results */}
        <View style={styles.resultsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066FF" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : hasSearched && searchResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>Try searching with a different username</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderUser}
              keyExtractor={(item) => item.uid}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
            />
          ) : !hasSearched && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>Search for users</Text>
              <Text style={styles.emptySubtext}>Find friends and discover new creators</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 10,
    padding: 5,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#222',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedBadge: {
    marginLeft: 5,
  },
  displayName: {
    color: '#999',
    fontSize: 14,
    marginTop: 2,
  },
  followersText: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
});

export default UserSearchScreen;