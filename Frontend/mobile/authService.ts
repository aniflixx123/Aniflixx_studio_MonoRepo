// authService.ts
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔗 Backend Base URL
const BACKEND_URL = "https://aniflixx-backend.onrender.com";

// 🛠 Utility to save profile with timestamp
export const saveUserProfile = async (profile: any) => {
  const data = {
    ...profile,
    cachedAt: Date.now(),
  };
  await AsyncStorage.setItem("userProfile", JSON.stringify(data));
};

// 🧠 Load cached profile and validate age (max 2.5 days)
export const loadUserProfile = async () => {
  const json = await AsyncStorage.getItem("userProfile");
  if (!json) return null;

  const parsed = JSON.parse(json);
  const now = Date.now();
  const maxAge = 2.5 * 24 * 60 * 60 * 1000; // 2.5 days

  if (now - parsed.cachedAt > maxAge) {
    await AsyncStorage.removeItem("userProfile");
    return null;
  }

  return parsed;
};

// 🧼 Clear cached profile
export const clearUserProfile = async () => {
  await AsyncStorage.removeItem("userProfile");
};

// 🔐 Register user with Firebase + MongoDB
export const register = async (email: string, password: string) => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const token = await user.getIdToken();

    const res = await fetch(`${BACKEND_URL}/api/user/init`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to register user in backend");

    await saveUserProfile(result.user);
    return { firebaseUser: user, profile: result.user };
  } catch (err: any) {
    throw new Error(err.message || "Something went wrong during registration");
  }
};


// 🔐 Login user with Firebase + MongoDB
export const login = async (email: string, password: string) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const token = await user.getIdToken();

    const res = await fetch(`${BACKEND_URL}/api/user/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to sync user with backend");

    await saveUserProfile(result.user);
    return { firebaseUser: user, profile: result.user };
  } catch (err: any) {
    throw new Error(err.message || "Login failed");
  }
};


// 🔓 Logout
export const logout = async () => {
  await clearUserProfile();
  await auth().signOut();
};

// 🧾 Check if Firebase has a logged-in user
export const getCurrentFirebaseUser = () => {
  return auth().currentUser;
};