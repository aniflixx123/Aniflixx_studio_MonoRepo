// AccountScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Switch
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Helper Accordion Section Component
const AccordionSection = ({ icon, title, expanded, onPress, children }:any) => (
  <View style={styles.section}>
    <TouchableOpacity style={styles.sectionHeader} onPress={onPress}>
      <Ionicons name={icon} size={21} color="#bfc6d6" style={{ marginRight: 12 }} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={19}
        color="#bfc6d6"
        style={{ marginLeft: 'auto' }}
      />
    </TouchableOpacity>
    {expanded && <View style={styles.sectionContent}>{children}</View>}
  </View>
);

export default function AccountScreen({ navigation }:any) {
  // Accordion state
  const [expanded, setExpanded] = useState<any>({
    profile: false,
    account: false,
    app: false,
    flicks: false,
    privacy: false,
    support: false,
    subs: false,
  });

  // Example toggles
  const [autoplay, setAutoplay] = useState(false);
  const [mutePreview, setMutePreview] = useState(true);
  const [cellular, setCellular] = useState(false);
  const [vibration, setVibration] = useState(false);
  const [soundEffects, setSoundEffects] = useState(false);
  const [subsSize, setSubsSize] = useState("Medium");

  const onAccordion:any = (key:any) => setExpanded((prev:any) => ({ ...prev, [key]: !prev[key] }));

  // Helper: Segmented control for subtitles
  const SubtitleSelector = () => (
    <View style={{ flexDirection: "row", gap: 12, marginVertical: 7 }}>
      {["Small", "Medium", "Large"].map(size => (
        <TouchableOpacity
          key={size}
          style={[
            styles.segment,
            subsSize === size && styles.segmentActive
          ]}
          onPress={() => setSubsSize(size)}
        >
          <Text style={[
            styles.segmentText,
            subsSize === size && styles.segmentTextActive
          ]}>{size}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: "https://aniflixx.com/default-user.jpg" }}
          style={styles.avatar}
        />
        <Text style={styles.username}>AstroOtaku99</Text>
      </View>

      {/* Accordion Sections */}
      <AccordionSection
        icon="person-circle-outline"
        title="Edit Profile"
        expanded={expanded.profile}
        onPress={() => onAccordion('profile')}
      >
        <TouchableOpacity style={styles.row} onPress={() => navigation?.navigate("EditProfile")}>
          <Text style={styles.rowText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#bfc6d6" />
        </TouchableOpacity>
      </AccordionSection>

      <AccordionSection
        icon="key-outline"
        title="Account and Login"
        expanded={expanded.account}
        onPress={() => onAccordion('account')}
      >
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Change password</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Two-factor authentication</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Linked devices</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
      </AccordionSection>

      <AccordionSection
        icon="options-outline"
        title="App Experience"
        expanded={expanded.app}
        onPress={() => onAccordion('app')}
      >
        <View style={styles.row}><Text style={styles.rowText}>Stream using cellular</Text><Switch value={cellular} onValueChange={setCellular} thumbColor={cellular ? "#4d90ff" : "#222"} /></View>
        <View style={styles.row}><Text style={styles.rowText}>Vibration Feedback</Text><Switch value={vibration} onValueChange={setVibration} thumbColor={vibration ? "#4d90ff" : "#222"} /></View>
        <View style={styles.row}><Text style={styles.rowText}>Sound effects on</Text><Switch value={soundEffects} onValueChange={setSoundEffects} thumbColor={soundEffects ? "#4d90ff" : "#222"} /></View>
        <Text style={[styles.rowText, { marginTop: 10 }]}>Subtitles</Text>
        <SubtitleSelector />
      </AccordionSection>

      <AccordionSection
        icon="film-outline"
        title="Flicks Settings"
        expanded={expanded.flicks}
        onPress={() => onAccordion('flicks')}
      >
        <View style={styles.row}><Text style={styles.rowText}>Flicks autoplay</Text><Switch value={autoplay} onValueChange={setAutoplay} thumbColor={autoplay ? "#4d90ff" : "#222"} /></View>
        <View style={styles.row}><Text style={styles.rowText}>Flicks quality: HD</Text><Switch value={true} disabled /></View>
        <View style={styles.row}><Text style={styles.rowText}>Mute audio on preview</Text><Switch value={mutePreview} onValueChange={setMutePreview} thumbColor={mutePreview ? "#4d90ff" : "#222"} /></View>
      </AccordionSection>

      <AccordionSection
        icon="lock-closed-outline"
        title="Privacy and Safety"
        expanded={expanded.privacy}
        onPress={() => onAccordion('privacy')}
      >
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Deactivate my account</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Delete account permanently</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Download my data</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Reported content history</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
      </AccordionSection>

      <AccordionSection
        icon="help-circle-outline"
        title="Support and Help"
        expanded={expanded.support}
        onPress={() => onAccordion('support')}
      >
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Report a bug</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Request a feature</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Contact support</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Help center</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
      </AccordionSection>

      <AccordionSection
        icon="card-outline"
        title="Subscriptions and Payments"
        expanded={expanded.subs}
        onPress={() => onAccordion('subs')}
      >
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Current plan</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Payment methods</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Billing history and invoices</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
        <TouchableOpacity style={styles.row}><Text style={styles.rowText}>Referral program</Text><Ionicons name="chevron-forward" size={18} color="#bfc6d6" /></TouchableOpacity>
      </AccordionSection>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.version}>App Version 1.00</Text>
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#181a20" },
  profileHeader: { alignItems: "center", marginTop: 36, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  username: { color: "#fff", fontWeight: "bold", fontSize: 18, marginBottom: 10 },
  section: { marginHorizontal: 12, marginBottom: 13, backgroundColor: "#23252b", borderRadius: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomColor: "#23252b", borderBottomWidth: 1 },
  sectionTitle: { color: "#bfc6d6", fontWeight: "600", fontSize: 16 },
  sectionContent: { paddingHorizontal: 9, paddingVertical: 7 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomColor: "#202228", borderBottomWidth: 1, paddingHorizontal: 4 },
  rowText: { color: "#dbe4fb", fontSize: 15, flex: 1 },
  footer: { marginTop: 24, alignItems: "center", justifyContent: "center" },
  version: { color: "#666", fontSize: 12, marginBottom: 14 },
  logoutButton: { backgroundColor: "#32343c", flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 10, paddingVertical: 14, width: "90%", marginBottom: 12 },
  logoutText: { color: "#fff", marginLeft: 9, fontWeight: "bold", fontSize: 16 },
  segment: { backgroundColor: "#24252c", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginHorizontal: 2 },
  segmentActive: { backgroundColor: "#4d90ff" },
  segmentText: { color: "#bfc6d6", fontSize: 14 },
  segmentTextActive: { color: "#fff", fontWeight: "bold" }
});
