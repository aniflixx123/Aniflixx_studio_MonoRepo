// LoginScreen.tsx - Updated with better error handling
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from "react-native-vector-icons/Ionicons";

const BACKEND_URL = "https://aniflixx-backend.onrender.com";

const LoginScreen = ({ navigation, onLogin }: { navigation?: any; onLogin: (user: any) => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // Check if all required fields are filled
  useEffect(() => {
    setIsFormValid(
      email.trim().length > 0 && 
      password.trim().length > 0 &&
      email.includes('@') // Basic email validation
    );
  }, [email, password]);

  const handleLogin = async () => {
    if (!isFormValid) {
      Alert.alert("Invalid Input", "Please enter a valid email and password");
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting login for:', email);
      
      // Step 1: Firebase Authentication
      const userCredential = await auth().signInWithEmailAndPassword(
        email.trim().toLowerCase(), // Ensure email is trimmed and lowercase
        password
      );
      
      console.log('Firebase auth successful, getting token...');
      const idToken = await userCredential.user.getIdToken();
      
      // Step 2: Sync with backend
      console.log('Syncing with backend...');
      const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', response.status, errorText);
        
        // If backend fails but Firebase succeeds, still let user in
        if (response.status === 500 || response.status === 404) {
          console.log('Backend error, using Firebase data only');
          const fallbackProfile = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            username: userCredential.user.email?.split('@')[0] || 'User',
            profileImage: 'https://aniflixx.com/default-user.jpg',
          };
          
          await saveUserProfile(fallbackProfile);
          onLogin(fallbackProfile);
          return;
        }
        
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Login successful:', data.user?.username);
      
      await saveUserProfile(data.user);
      onLogin(data.user);

    } catch (err: any) {
      console.error("Login error:", err.code, err.message);
      
      let errorMessage = "Something went wrong. Please try again.";
      
      // Handle specific Firebase errors
      switch (err.code) {
        case 'auth/invalid-email':
          errorMessage = "Invalid email address format";
          break;
        case 'auth/user-not-found':
          errorMessage = "No account found with this email";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password";
          break;
        case 'auth/invalid-credential':
          errorMessage = "Invalid email or password";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed attempts. Please try again later";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your connection";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled";
          break;
        default:
          if (err.message.includes('500')) {
            errorMessage = "Server error. Please try again later";
          }
      }
      
      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveUserProfile = async (profile: any) => {
    try {
      const data = {
        ...profile,
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem("userProfile", JSON.stringify(data));
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = () => {
    if (!email || !email.includes('@')) {
      Alert.alert("Email Required", "Please enter a valid email address first");
      return;
    }

    Alert.alert(
      "Reset Password",
      `Send password reset email to ${email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            try {
              await auth().sendPasswordResetEmail(email.trim().toLowerCase());
              Alert.alert(
                "Email Sent",
                "Please check your inbox for password reset instructions"
              );
            } catch (error: any) {
              console.error('Password reset error:', error);
              Alert.alert("Error", error.message || "Failed to send reset email");
            }
          }
        }
      ]
    );
  };

  const navigateToSignup = () => {
    if (navigation) {
      navigation.navigate("Signup");
    } else {
      Alert.alert("Feature Not Available", "Sign up is not available in this context");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        {/* Back button if needed */}
        {navigation && navigation.canGoBack() && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.contentContainer}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>The anime world is waiting for you.</Text>

          <View style={styles.form}>
            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                textContentType="emailAddress"
              />
            </View>

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
              />
              <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity 
              style={styles.forgotPasswordContainer}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, !isFormValid && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Log in</Text>
              )}
            </TouchableOpacity>

            {/* Create Account Link */}
            <View style={styles.createAccountLink}>
              <Text style={styles.createAccountText}>Don't have an account? </Text>
              <TouchableOpacity onPress={navigateToSignup}>
                <Text style={styles.createAccountLinkText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  keyboardContainer: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    marginTop: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "left",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "left",
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#222",
    borderRadius: 10,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    color: "#fff",
    padding: 14,
    fontSize: 16,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  forgotPasswordContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  forgotPasswordText: {
    color: "#fff",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#1E88E5",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: "rgba(30, 136, 229, 0.5)",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  createAccountLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  createAccountText: {
    color: "#888",
    fontSize: 14,
  },
  createAccountLinkText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default LoginScreen;