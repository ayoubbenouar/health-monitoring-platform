/**
 * Health Monitoring Platform - Mobile (React Native / Expo)
 * Configure API_BASE to your API Gateway URL (e.g. http://localhost:8080 or your deployed URL).
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

const API_BASE = 'http://localhost:8080'; // Use your machine IP for device: e.g. http://192.168.1.x:8080

export default function App() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screen, setScreen] = useState('login'); // login | register | dashboard
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a real app, restore token from secure storage
    const t = null; // AsyncStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Login failed');
      setToken(data.access_token);
      setScreen('dashboard');
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.ok ? await res.json() : {};
      setVitals(data.vitals || []);
    } catch (_) {}
  };

  useEffect(() => {
    if (screen === 'dashboard' && token) loadDashboard();
  }, [screen, token]);

  if (!token && screen === 'login') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Surveillance Santé</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={login} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tableau de bord</Text>
      <Text style={styles.subtitle}>Dernières mesures</Text>
      {vitals.length === 0 && <Text style={styles.muted}>Aucune mesure. Enregistrez des données via l'app web ou une future saisie ici.</Text>}
      {vitals.slice(0, 5).map((v, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.vitalValue}>{v.value} {v.unit || ''}</Text>
          <Text style={styles.vitalType}>{v.type}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.button, styles.logout]}
        onPress={() => { setToken(null); setScreen('login'); }}
      >
        <Text style={styles.buttonText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 16 },
  muted: { color: '#666', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#3182ce', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  logout: { backgroundColor: '#718096', marginTop: 24 },
  card: { backgroundColor: '#edf2f7', padding: 12, borderRadius: 8, marginBottom: 8 },
  vitalValue: { fontSize: 18, fontWeight: '600' },
  vitalType: { fontSize: 14, color: '#4a5568' },
});
