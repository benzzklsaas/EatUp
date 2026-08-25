import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function sendMagicLink() {
    if (!email) return
    setSending(true)
    setError('')
    const redirectTo = Linking.createURL('auth/callback')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
    setSending(false)
    if (error) { setError("Impossible d'envoyer le lien. Réessaie."); return }
    setSent(true)
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
      <Text style={styles.emoji}>🎁</Text>
      <Text style={styles.title}>Ma fidélité EatUp</Text>
      <Text style={styles.subtitle}>Tous vos points et récompenses, dans tous vos restaurants préférés.</Text>

      {sent ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lien envoyé 📧</Text>
          <Text style={styles.cardText}>Ouvrez l'email reçu à {email} pour vous connecter.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="vous@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={[styles.button, sending && styles.buttonDisabled]} onPress={sendMagicLink} disabled={sending}>
            <Text style={styles.buttonText}>{sending ? 'Envoi...' : 'Recevoir mon lien de connexion'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFBF5', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', color: '#1A1208', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#78716C', textAlign: 'center', marginBottom: 28, maxWidth: 280 },
  card: { width: '100%', backgroundColor: 'white', borderRadius: 24, padding: 24, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1208', marginBottom: 6 },
  cardText: { fontSize: 13, color: '#78716C' },
  label: { fontSize: 13, fontWeight: '600', color: '#78716C', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 14, fontSize: 14, color: '#1A1208', marginBottom: 16 },
  button: { backgroundColor: '#f97316', borderRadius: 14, padding: 15, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  error: { color: '#dc2626', fontSize: 12, marginBottom: 12 },
})
