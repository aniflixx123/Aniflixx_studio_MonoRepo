// CommentsModal.tsx - Fixed with Proper Data Updates
import auth from '@react-native-firebase/auth';
import React, { useState, useCallback, useRef, useMemo, memo, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    Image,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { useAppStore } from '../store/appStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CommentModalProps {
    visible: boolean;
    reelId?: string;
    onClose: () => void;
    totalComments: number;
    onCommentsCountChange?: (newCount: number) => void;
}

interface Comment {
    _id: string;
    id: string;
    text: string;
    uid: string;
    username: string;
    profileImage: string;
    isVerified?: boolean;
    createdAt: string;
    likes: number;
    isLiked: boolean;
}

const CommentsModal = memo(({
    visible,
    reelId,
    onClose,
    totalComments,
    onCommentsCountChange
}: CommentModalProps) => {
    const insets = useSafeAreaInsets();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [commentCount, setCommentCount] = useState(totalComments);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
    
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const currentUser = auth().currentUser;
    const userProfile = useAppStore(state => state.user);
    const updateReel = useAppStore(state => state.updateReel);
    const socket = useAppStore(state => state.socket);

    // Load comments when modal opens
    useEffect(() => {
        if (visible && reelId) {
            loadComments();
        }
    }, [visible, reelId]);

    // Animate modal
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                damping: 25,
                stiffness: 300,
                mass: 0.8,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const loadComments = async () => {
        if (!reelId || !currentUser) return;
        
        try {
            setIsLoading(true);
            const token = await currentUser.getIdToken();
            
            const response = await fetch(
                `https://aniflixx-backend.onrender.com/api/comments/reel/${reelId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                const commentsData = data.comments || data.comment || [];
                
                // Process comments without hierarchy
                const processedComments: Comment[] = commentsData
                    .filter((c: any) => !c.parentCommentId) // Only get top-level comments
                    .map((c: any) => ({
                        _id: c._id || c.id,
                        id: c._id || c.id,
                        text: c.text,
                        uid: c.uid,
                        username: c.user?.username || c.username || 'Anonymous',
                        profileImage: c.user?.profileImage || c.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.uid}`,
                        isVerified: c.user?.isVerified || false,
                        createdAt: c.createdAt,
                        likes: c.likeCount || c.likes || 0,
                        isLiked: c.isLiked || false,
                    }))
                    .sort((a: Comment, b: Comment) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                
                setComments(processedComments);
                
                // Update count and sync with store
                const actualCount = data.total || data.totalComments || processedComments.length;
                setCommentCount(actualCount);
                
                // Update store to ensure consistency
                if (reelId) {
                    updateReel(reelId, { commentsCount: actualCount });
                }
                
                if (onCommentsCountChange) {
                    onCommentsCountChange(actualCount);
                }
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!newComment.trim() || isSubmitting || !reelId || !currentUser) return;
        
        try {
            setIsSubmitting(true);
            const token = await currentUser.getIdToken();
            
            const requestBody = {
                reelId: reelId,
                text: newComment.trim()
            };
            
            const response = await fetch(
                `https://aniflixx-backend.onrender.com/api/comments/reel/${reelId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                
                // Add the new comment to the list
                const newCommentObj: Comment = {
                    _id: data.comment._id || data.comment.id,
                    id: data.comment._id || data.comment.id,
                    text: data.comment.text,
                    uid: currentUser.uid,
                    username: userProfile?.username || 'You',
                    profileImage: userProfile?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.uid}`,
                    isVerified: userProfile?.isVerified || false,
                    createdAt: data.comment.createdAt || new Date().toISOString(),
                    likes: 0,
                    isLiked: false,
                };
                
                // Add as top-level comment
                setComments([newCommentObj, ...comments]);
                const newCount = commentCount + 1;
                setCommentCount(newCount);
                
                // Update store
                updateReel(reelId, { commentsCount: newCount });
                
                // Emit WebSocket event for real-time update
                if (socket?.connected) {
                    socket.emit('comment:create', {
                        reelId,
                        commentId: newCommentObj.id,
                        totalComments: newCount
                    });
                }
                
                if (onCommentsCountChange) {
                    onCommentsCountChange(newCount);
                }
                
                setNewComment('');
                Keyboard.dismiss();
            } else {
                Alert.alert('Error', 'Failed to post comment');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            Alert.alert('Error', 'Failed to post comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLikeComment = async (commentId: string) => {
        if (!currentUser) return;
        
        try {
            // Optimistic update
            setComments(prev => prev.map(comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        isLiked: !comment.isLiked,
                        likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
                    };
                }
                return comment;
            }));
            
            const token = await currentUser.getIdToken();
            await fetch(
                `https://aniflixx-backend.onrender.com/api/comments/${commentId}/like`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
        } catch (error) {
            console.error('Error liking comment:', error);
            // Revert on error
            setComments(prev => prev.map(comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        isLiked: !comment.isLiked,
                        likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
                    };
                }
                return comment;
            }));
        }
    };

    const handleEditComment = async (commentId: string) => {
        if (!editText.trim() || !currentUser) return;
        
        try {
            const token = await currentUser.getIdToken();
            const response = await fetch(
                `https://aniflixx-backend.onrender.com/api/comments/${commentId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ text: editText.trim() })
                }
            );
            
            if (response.ok) {
                setComments(prev => prev.map(comment => {
                    if (comment.id === commentId) {
                        return { ...comment, text: editText.trim() };
                    }
                    return comment;
                }));
                setEditingCommentId(null);
                setEditText('');
            }
        } catch (error) {
            console.error('Error editing comment:', error);
            Alert.alert('Error', 'Failed to edit comment');
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!currentUser || !reelId) return;
        
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await currentUser.getIdToken();
                            const response = await fetch(
                                `https://aniflixx-backend.onrender.com/api/comments/${commentId}`,
                                {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                }
                            );
                            
                            if (response.ok) {
                                setComments(prev => prev.filter(c => c.id !== commentId));
                                const newCount = Math.max(0, commentCount - 1);
                                setCommentCount(newCount);
                                
                                // Update store
                                updateReel(reelId, { commentsCount: newCount });
                                
                                // Emit WebSocket event
                                if (socket?.connected) {
                                    socket.emit('comment:delete', {
                                        reelId,
                                        commentId,
                                        totalComments: newCount
                                    });
                                }
                                
                                if (onCommentsCountChange) {
                                    onCommentsCountChange(newCount);
                                }
                                setSelectedCommentId(null);
                            }
                        } catch (error) {
                            console.error('Error deleting comment:', error);
                            Alert.alert('Error', 'Failed to delete comment');
                        }
                    }
                }
            ]
        );
    };

    const formatTimeAgo = (date: string) => {
        const now = new Date();
        const commentDate = new Date(date);
        const seconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
        
        if (seconds < 60) return 'now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
        
        return commentDate.toLocaleDateString();
    };

    const renderComment = ({ item }: { item: Comment }) => {
        const isOwnComment = currentUser?.uid === item.uid;
        const isEditing = editingCommentId === item.id;
        
        return (
            <View style={styles.commentContainer}>
                <Image
                    source={{ uri: item.profileImage }}
                    style={styles.avatar}
                />
                
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <View style={styles.userInfo}>
                            <Text style={styles.username}>{item.username}</Text>
                            {item.isVerified && (
                                <Ionicons name="checkmark-circle" size={14} color="#4285F4" />
                            )}
                            <Text style={styles.timestamp}>{formatTimeAgo(item.createdAt)}</Text>
                        </View>
                        
                        {isOwnComment && (
                            <TouchableOpacity
                                onPress={() => setSelectedCommentId(selectedCommentId === item.id ? null : item.id)}
                                style={styles.moreButton}
                            >
                                <Ionicons name="ellipsis-horizontal" size={16} color="#888" />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    {isEditing ? (
                        <View style={styles.editContainer}>
                            <TextInput
                                style={styles.editInput}
                                value={editText}
                                onChangeText={setEditText}
                                multiline
                                autoFocus
                                placeholder="Edit comment..."
                                placeholderTextColor="#666"
                            />
                            <View style={styles.editActions}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditingCommentId(null);
                                        setEditText('');
                                    }}
                                    style={styles.editButton}
                                >
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleEditComment(item.id)}
                                    style={styles.editButton}
                                >
                                    <Text style={styles.saveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.commentText}>{item.text}</Text>
                    )}
                    
                    {selectedCommentId === item.id && !isEditing && (
                        <View style={styles.optionsMenu}>
                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => {
                                    setEditingCommentId(item.id);
                                    setEditText(item.text);
                                    setSelectedCommentId(null);
                                }}
                            >
                                <Ionicons name="pencil" size={16} color="#4285F4" />
                                <Text style={styles.optionText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => handleDeleteComment(item.id)}
                            >
                                <Ionicons name="trash" size={16} color="#ff3366" />
                                <Text style={[styles.optionText, styles.deleteText]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                
                <TouchableOpacity 
                    onPress={() => handleLikeComment(item.id)}
                    style={styles.likeButton}
                >
                    <Ionicons
                        name={item.isLiked ? "heart" : "heart-outline"}
                        size={20}
                        color={item.isLiked ? "#ff3366" : "#888"}
                    />
                    {item.likes > 0 && (
                        <Text style={[styles.likeCount, item.isLiked && styles.likedCount]}>
                            {item.likes}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const inputSection = (
        <View style={[styles.inputSection, { paddingBottom: insets.bottom + 8 }]}>
            <Image
                source={{ uri: userProfile?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser?.uid}` }}
                style={styles.inputAvatar}
            />
            
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a comment..."
                    placeholderTextColor="#666"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline={true}
                    maxLength={500}
                />
                
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!newComment.trim() || isSubmitting}
                    style={[
                        styles.sendButton,
                        (!newComment.trim() || isSubmitting) && styles.sendButtonDisabled
                    ]}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name="send-outline" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    // Close handler that ensures data is synced
    const handleClose = useCallback(() => {
        // Force a final sync of comment count
        if (reelId) {
            updateReel(reelId, { commentsCount: commentCount });
        }
        onClose();
    }, [reelId, commentCount, updateReel, onClose]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            statusBarTranslucent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.modalContainer}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <Animated.View 
                    style={[
                        styles.contentContainer,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="dark"
                        blurAmount={20}
                        reducedTransparencyFallbackColor="rgba(25, 25, 25, 0.95)"
                    />
                    
                    <View style={styles.header}>
                        <View style={styles.handleBar} />
                        <Text style={styles.title}>{commentCount} Comments</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                        >
                            <Ionicons name="close" size={24} color="#ffffff" />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#4285F4" />
                        </View>
                    ) : (
                        <FlatList
                            data={comments}
                            renderItem={renderComment}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={48} color="#444" />
                                    <Text style={styles.emptyText}>No comments yet</Text>
                                    <Text style={styles.emptySubtext}>Be the first to comment</Text>
                                </View>
                            }
                        />
                    )}

                    {Platform.OS === 'ios' ? (
                        <KeyboardAvoidingView 
                            behavior="padding"
                            keyboardVerticalOffset={0}
                        >
                            {inputSection}
                        </KeyboardAvoidingView>
                    ) : (
                        // For Android, don't use KeyboardAvoidingView
                        inputSection
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    contentContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SCREEN_HEIGHT * 0.85,
        minHeight: SCREEN_HEIGHT * 0.5,
        overflow: 'hidden',
        // Add elevation for Android
        elevation: Platform.OS === 'android' ? 999 : 0,
        zIndex: Platform.OS === 'android' ? 999 : 0,
    },
    header: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#666',
        borderRadius: 2,
        marginBottom: 16,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    listContent: {
        paddingBottom: 20,
    },
    commentContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    username: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    timestamp: {
        color: '#888',
        fontSize: 12,
    },
    commentText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    likeButton: {
        alignItems: 'center',
        paddingLeft: 12,
    },
    likeCount: {
        color: '#888',
        fontSize: 12,
        marginTop: 2,
    },
    likedCount: {
        color: '#ff3366',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
    },
    emptySubtext: {
        color: '#666',
        fontSize: 14,
        marginTop: 4,
    },
    inputSection: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#191919',
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
        marginBottom: 8,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#2a2a2a',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 40,
        maxHeight: 120,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        paddingVertical: 4,
        maxHeight: 100,
    },
    sendButton: {
        marginLeft: 8,
        padding: 4,
    },
    sendButtonDisabled: {
        opacity: 0.4,
    },
    moreButton: {
        padding: 4,
    },
    editContainer: {
        marginVertical: 8,
    },
    editInput: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
        borderColor: '#444',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    editButton: {
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    cancelText: {
        color: '#888',
        fontSize: 13,
    },
    saveText: {
        color: '#4285F4',
        fontSize: 13,
        fontWeight: '600',
    },
    optionsMenu: {
        backgroundColor: '#222',
        borderRadius: 8,
        padding: 4,
        marginVertical: 8,
        flexDirection: 'row',
        gap: 12,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        gap: 6,
    },
    optionText: {
        color: '#fff',
        fontSize: 13,
    },
    deleteText: {
        color: '#ff3366',
    },
});

export default CommentsModal;