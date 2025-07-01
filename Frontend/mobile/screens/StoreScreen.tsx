import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Sample store items
const storeItems = [
  {
    id: '1',
    title: 'Naruto Hoodie',
    price: 39.99,
    image: 'https://example.com/placeholder-image.jpg',
    rating: 4.8,
    reviews: 125
  },
  {
    id: '2',
    title: 'Attack on Titan Figurine',
    price: 59.99,
    image: 'https://example.com/placeholder-image.jpg',
    rating: 4.9,
    reviews: 84
  },
  {
    id: '3',
    title: 'Demon Slayer Poster Set',
    price: 24.99,
    image: 'https://example.com/placeholder-image.jpg',
    rating: 4.7,
    reviews: 63
  },
  {
    id: '4',
    title: 'Goku Action Figure',
    price: 44.99,
    image: 'https://example.com/placeholder-image.jpg',
    rating: 4.5,
    reviews: 92
  },
  {
    id: '5',
    title: 'My Hero Academia T-Shirt',
    price: 29.99,
    image: 'https://example.com/placeholder-image.jpg',
    rating: 4.6,
    reviews: 77
  },
  {
    id: '6',
    title: 'One Piece Wanted Posters',
    price: 19.99,
    image: 'https://example.com/placeholder-image.jpg',
    rating: 4.8,
    reviews: 103
  }
];

// Sample categories
const categories = [
  { id: '1', name: 'Clothing', icon: 'shirt-outline' },
  { id: '2', name: 'Figurines', icon: 'cube-outline' },
  { id: '3', name: 'Posters', icon: 'image-outline' },
  { id: '4', name: 'Accessories', icon: 'watch-outline' },
  { id: '5', name: 'Digital', icon: 'cloud-download-outline' }
];

const StoreScreen = () => {
  const renderCategoryItem = ({ item }:any) => (
    <TouchableOpacity style={styles.categoryItem}>
      <View style={styles.categoryIconContainer}>
        <Ionicons name={item.icon} size={24} color="#fff" />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderStoreItem = ({ item }:any) => (
    <TouchableOpacity style={styles.storeItem}>
      <View style={styles.itemImageContainer}>
        <Image 
          source={{ uri: item.image }}
          style={styles.itemImage}
          // Fallback for placeholder images
          onError={({ nativeEvent: { error } }) => console.log('Image error:', error)}
        />
        <TouchableOpacity style={styles.favButton}>
          <Ionicons name="heart-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.reviewCount}>({item.reviews})</Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>${item.price}</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Anime Store</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="cart-outline" size={24} color="#fff" />
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
        
        {/* Featured */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={storeItems.slice(0, 3)}
            renderItem={renderStoreItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsList}
          />
        </View>
        
        {/* Popular */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Items</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.gridContainer}>
            {storeItems.map((item) => (
              <View key={item.id} style={styles.gridItem}>
                {renderStoreItem({ item })}
              </View>
            ))}
          </View>
        </View>
        
        {/* Add some padding at the bottom for the navbar */}
        <View style={{ height: 20 }} />
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40, // Account for status bar
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#0066ff',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 12,
  },
  seeAllText: {
    color: '#0066ff',
    fontSize: 14,
  },
  categoriesList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  productsList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  storeItem: {
    width: 160,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  itemImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333', // Placeholder color
  },
  favButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    padding: 10,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  reviewCount: {
    color: '#999',
    fontSize: 11,
    marginLeft: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    color: '#0066ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#0066ff',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  gridItem: {
    width: '50%',
    padding: 4,
  },
});

export default StoreScreen;