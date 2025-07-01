import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import auth from '@react-native-firebase/auth';
import Ionicons from "react-native-vector-icons/Ionicons";
import { register } from "../authService";

const BACKEND_URL = "https://aniflixx-backend.onrender.com";

const SignupScreen = ({ navigation, onLogin }: { navigation?: any; onLogin?: (user: any) => void }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [receiveUpdates, setReceiveUpdates] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Validation states
  const [fullNameValid, setFullNameValid] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [confirmPasswordValid, setConfirmPasswordValid] = useState(false);

  // Check if all required fields are filled and valid
  useEffect(() => {
    setIsFormValid(
      fullNameValid && 
      emailValid && 
      passwordValid && 
      confirmPasswordValid && 
      agreeToTerms
    );
  }, [fullNameValid, emailValid, passwordValid, confirmPasswordValid, agreeToTerms]);

  const validateFullName = (name: string) => {
    const isValid = name.trim().length > 2;
    setFullNameValid(isValid);
    return isValid;
  };

  const validateEmail = (email: string) => {
    const isValid = /\S+@\S+\.\S+/.test(email);
    setEmailValid(isValid);
    return isValid;
  };

  const validatePassword = (pass: string) => {
    // Password must be at least 8 characters and have 1 special character
    const isValid = pass.length >= 8 && /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    setPasswordValid(isValid);
    
    // Also check confirm password validation if it has a value
    if (confirmPassword) {
      validateConfirmPassword(confirmPassword);
    }
    
    return isValid;
  };

  const validateConfirmPassword = (confirmPass: string) => {
    const isValid = confirmPass === password && confirmPass.length > 0;
    setConfirmPasswordValid(isValid);
    return isValid;
  };

  const handleSignup = async () => {
    if (!isFormValid) {
      return;
    }

    setLoading(true);

    try {
      // Register the user using the authService
      const result = await register(email, password);
      
      console.log("Registration successful:", result);
      
      // The register function already signs the user in with Firebase
      // and returns both firebaseUser and profile
      if (result.profile) {
        // Initialize the user in the backend with additional info
        const firebaseUser = result.firebaseUser;
        const token = await firebaseUser.getIdToken();
        
        // Update profile with display name (optional step)
        try {
          await fetch(`${BACKEND_URL}/api/user/update-profile`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              displayName: fullName.trim(),
              username: result.profile.username, // Keep the generated username
            }),
          });
        } catch (updateError) {
          console.log('Profile update error (non-critical):', updateError);
        }
        
        // Call onLogin to update the app state - this will log the user in
        if (onLogin) {
          onLogin(result.profile);
        }
        
        // No need to navigate to login screen - user is already authenticated
      }
    } catch (err: any) {
      console.error("Registration error:", err.message);
      let errorMessage = "Something went wrong";
      
      // Handle specific Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "Email is already in use";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "Password is too weak";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const navigateToLogin = () => {
    if (navigation) {
      navigation.navigate("Login");
    } else {
      Alert.alert("No Navigation", "Login screen navigation not available");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Back Button */}
          {navigation && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Join the anime world. Stream, Create and Connect.</Text>

          <View style={styles.form}>
            {/* Full Name */}
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#888"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  validateFullName(text);
                }}
                autoCapitalize="words"
              />
              {fullNameValid && <Ionicons name="checkmark" size={24} color="#4CAF50" style={styles.validIcon} />}
            </View>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor="#888"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  validateEmail(text);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {emailValid && <Ionicons name="checkmark" size={24} color="#4CAF50" style={styles.validIcon} />}
            </View>

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  validatePassword(text);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#fff" />
              </TouchableOpacity>
              {passwordValid && <Ionicons name="checkmark" size={24} color="#4CAF50" style={styles.validIcon} />}
            </View>
            
            <View style={styles.passwordHints}>
              <Text style={styles.hintText}>• Password must contain minimum 8 characters.</Text>
              <Text style={styles.hintText}>• Password must contain at least 1 special symbol.</Text>
            </View>

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password again"
                placeholderTextColor="#888"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  validateConfirmPassword(text);
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity onPress={toggleConfirmPasswordVisibility} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={24} color="#fff" />
              </TouchableOpacity>
              {confirmPasswordValid && <Ionicons name="checkmark" size={24} color="#4CAF50" style={styles.validIcon} />}
            </View>

            {/* Terms and Privacy - REQUIRED */}
            <View style={styles.checkboxRow}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                {agreeToTerms ? (
                  <Ionicons name="checkbox" size={20} color="#2196F3" />
                ) : (
                  <Ionicons name="square-outline" size={20} color="#888" />
                )}
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                Agree to our <Text style={styles.blueText}>Terms of Service</Text> and <Text style={styles.blueText}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Updates Opt-in - OPTIONAL */}
            <View style={styles.checkboxRow}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => setReceiveUpdates(!receiveUpdates)}
              >
                {receiveUpdates ? (
                  <Ionicons name="checkbox" size={20} color="#2196F3" />
                ) : (
                  <Ionicons name="square-outline" size={20} color="#888" />
                )}
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                I'd like to receive updates, special offers, and news from Aniflixx.
              </Text>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.button, !isFormValid && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginLink}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLinkText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 40,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "left",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "left",
    marginBottom: 24,
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
  validIcon: {
    paddingRight: 12,
  },
  passwordHints: {
    marginBottom: 16,
  },
  hintText: {
    color: "#888",
    fontSize: 12,
    marginBottom: 2,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    marginRight: 10,
  },
  checkboxText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
  },
  blueText: {
    color: "#2196F3",
  },
  button: {
    backgroundColor: "#1E88E5",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: "rgba(30, 136, 229, 0.5)", // Same blue but with opacity
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    color: "#888",
    fontSize: 14,
  },
  loginLinkText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "bold",
  },
});
export default SignupScreen;