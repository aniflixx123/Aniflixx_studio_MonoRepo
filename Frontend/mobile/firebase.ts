// firebase.ts
import auth from '@react-native-firebase/auth';

/**
 * Returns Firebase Auth instance
 */
export const getAuth = () => auth();

/**
 * Get currently logged-in user
 */
export const getCurrentUser = () => auth().currentUser;

/**
 * Sign in
 */
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const token = await userCredential.user.getIdToken();
    return { uid: userCredential.user.uid, token };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Register
 */
export const register = async (email: string, password: string) => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const token = await userCredential.user.getIdToken();
    return { uid: userCredential.user.uid, token };
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

/**
 * Sign out
 */
export const logout = async () => {
  try {
    await auth().signOut();
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};