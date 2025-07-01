import React, { memo, useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, TouchableOpacity, Dimensions, StyleSheet, Platform } from 'react-native';
import { 
  NativeAdView, 
  NativeAd,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NativeAdItemProps {
  adUnitId: string;
  isActive: boolean;
  reelHeight?: number;
  onAdLoaded?: () => void;
  bottomOffset?: number;
}

const NativeAdItem = memo(({ 
  adUnitId, 
  isActive, 
  reelHeight = SCREEN_HEIGHT,
  onAdLoaded,
  bottomOffset = 0 
}: NativeAdItemProps) => {
  const [nativeAd, setNativeAd] = useState<NativeAd>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    console.log('🔵 Creating native ad with ID:', adUnitId);
    
    NativeAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    })
      .then((ad) => {
        console.log('🟢 Native ad loaded successfully');
        setNativeAd(ad);
        setLoading(false);
        onAdLoaded?.();
      })
      .catch((err) => {
        console.error('🔴 Failed to load native ad:', err);
        setLoading(false);
        setError(true);
      });
  }, [adUnitId, onAdLoaded]);

  if (loading) {
    return (
      <View style={[styles.container, { height: reelHeight }]}>
        <ActivityIndicator size="large" color="#ff3366" />
        <Text style={styles.loadingText}>Loading ad...</Text>
      </View>
    );
  }

  if (error || !nativeAd) {
    return (
      <View style={[styles.container, { height: reelHeight }]}>
        <Text style={styles.errorText}>Ad not available</Text>
      </View>
    );
  }

  return (
    <NativeAdView nativeAd={nativeAd} style={[styles.container, { height: reelHeight }]}>
      {/* Media View - Full screen video or image */}
      <NativeMediaView style={styles.mediaView} />
      
      {/* Gradient overlay */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradient} />
      
      {/* Ad Badge */}
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>Ad</Text>
      </View>

      {/* Ad Content */}
      <View style={[styles.content, { bottom: bottomOffset + 80 }]}>
        {/* Icon */}
        {nativeAd.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}
        
        <View style={styles.info}>
          {/* Headline */}
          {nativeAd.headline && (
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline}>{nativeAd.headline}</Text>
            </NativeAsset>
          )}
          
          {/* Body */}
          {nativeAd.body && (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.body} numberOfLines={2}>{nativeAd.body}</Text>
            </NativeAsset>
          )}
          
          {/* Advertiser */}
          {nativeAd.advertiser && (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.advertiser}>by {nativeAd.advertiser}</Text>
            </NativeAsset>
          )}
        </View>

        {/* Call to Action */}
        {nativeAd.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <TouchableOpacity style={styles.cta} activeOpacity={0.8}>
              <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
            </TouchableOpacity>
          </NativeAsset>
        )}
      </View>

      {/* Swipe Indicator */}
      <View style={styles.swipeIndicator}>
        <Ionicons name="chevron-up" size={24} color="#fff" />
        <Text style={styles.swipeText}>Swipe to continue</Text>
      </View>
    </NativeAdView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  mediaView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  adBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  adBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    position: 'absolute',
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    flex: 1,
  },
  headline: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  body: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  advertiser: {
    color: '#aaa',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  cta: {
    backgroundColor: '#ff3366',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginLeft: 10,
    elevation: 3,
    shadowColor: '#ff3366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  ctaText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  swipeIndicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  swipeText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default NativeAdItem;