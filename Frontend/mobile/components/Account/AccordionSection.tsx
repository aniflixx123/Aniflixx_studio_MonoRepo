import React, { useState, ReactNode } from "react";
import { View, TouchableOpacity, Text, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type Props = {
  icon: string;
  title: string;
  children: ReactNode;
  expanded?: boolean;
};

export default function AccordionSection({ icon, title, children, expanded = false }: Props) {
  const [open, setOpen] = useState(expanded);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((p) => !p);
  };

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.header} onPress={handleToggle} activeOpacity={0.8}>
        <Ionicons name={icon} size={22} color="#bfc6d6" style={styles.icon} />
        <Text style={styles.title}>{title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color="#bfc6d6" />
      </TouchableOpacity>
      {open && <View style={styles.children}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#19191c",
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#28282d",
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  icon: { marginRight: 16 },
  title: { color: "#e5e8ef", fontSize: 17, fontWeight: "600", flex: 1 },
  children: { paddingBottom: 12, paddingHorizontal: 18 }
});
