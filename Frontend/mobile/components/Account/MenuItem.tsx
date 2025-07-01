import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type Props = {
  icon?: string;
  label: string;
  onPress?: () => void;
  showArrow?: boolean;
  switchValue?: boolean;
  onSwitch?: (value: boolean) => void;
};

export default function MenuItem({ icon, label, onPress, showArrow, switchValue, onSwitch }: Props) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !onSwitch}
    >
      {icon && <Ionicons name={icon} size={20} color="#a4aec9" style={styles.icon} />}
      <Text style={styles.label}>{label}</Text>
      {typeof switchValue === "boolean" && onSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitch}
          thumbColor={switchValue ? "#4D7CFE" : "#555"}
          trackColor={{ true: "#222b53", false: "#25262b" }}
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={18} color="#a4aec9" />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#232324",
  },
  icon: { marginRight: 13 },
  label: { flex: 1, color: "#e5e8ef", fontSize: 16, fontWeight: "500" },
});
