import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import { supabase } from '@/lib/supabase'

export default function HubScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<any>(null)
  const [myAccounts, setMyAccounts] = useState<any[]>([])
  const [directory, setDirectory] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }

      const { data: customerRow } = await supabase.from('customers').select('*').eq('email', user.email.toLowerCase()).maybeSingle()
      setCustomer(customerRow)
      if (!customerRow) { setLoading(false); return }

      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('*, restaurants(name, slug, logo_url)')
        .eq('customer_id', customerRow.id)
      setMyAccounts(accounts || [])

      const { data: programs } = await supabase
        .from('loyalty_programs')
        .select('restaurant_id, restaurants(name, slug, logo_url, is_open)')
        .or('stamps_enabled.eq.true,points_enabled.eq.true')
      const myIds = new Set((accounts || []).map((a: any) => a.restaurant_id))
      setDirectory((programs || []).filter((p: any) => !myIds.has(p.restaurant_id) && p.restaurants))

      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#f97316" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 20, gap: 16 }}>
      {customer && (
        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={styles.sectionLabel}>Ma carte</Text>
          <Text style={styles.qrHint}>Présentez ce QR code en caisse.</Text>
          <View style={{ padding: 16, backgroundColor: 'white', borderRadius: 16 }}>
            <QRCode value={`https://eatup-app.fr/dashboard/scan/${customer.id}`} size={180} color="#1A1208" backgroundColor="white" />
          </View>
          <Text style={styles.customerName}>{customer.first_name} {customer.last_name}</Text>
        </View>
      )}

      {myAccounts.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>Mes restaurants</Text>
          {myAccounts.map(acc => (
            <TouchableOpacity key={acc.id} style={styles.row} onPress={() => router.push(`/restaurant/${acc.restaurants?.slug}`)}>
              {acc.restaurants?.logo_url
                ? <Image source={{ uri: acc.restaurants.logo_url }} style={styles.avatar} />
                : <View style={[styles.avatar, styles.avatarFallback]}><Text>🍽️</Text></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{acc.restaurants?.name}</Text>
                <Text style={styles.rowSub}>
                  {acc.stamps_count > 0 ? `🥙 ${acc.stamps_count}  ` : ''}
                  {acc.points_balance > 0 ? `⭐ ${acc.points_balance}` : ''}
                  {!acc.stamps_count && !acc.points_balance ? "Aucun point pour l'instant" : ''}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {directory.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>Autres restaurants équipés</Text>
          {directory.map((p: any) => (
            <View key={p.restaurant_id} style={styles.row}>
              {p.restaurants.logo_url
                ? <Image source={{ uri: p.restaurants.logo_url }} style={styles.avatarSmall} />
                : <View style={[styles.avatarSmall, styles.avatarFallback]}><Text>🍽️</Text></View>
              }
              <Text style={[styles.rowTitle, { flex: 1 }]}>{p.restaurants.name}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: p.restaurants.is_open ? '#4ade80' : '#A8A29E' }}>
                {p.restaurants.is_open ? '● Ouvert' : 'Fermé'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!customer && (
        <View style={styles.card}>
          <Text style={styles.rowSub}>Aucune commande trouvée pour cet email pour l'instant.</Text>
        </View>
      )}

      <TouchableOpacity onPress={signOut} style={{ padding: 8, alignItems: 'center' }}>
        <Text style={{ color: '#78716C', fontSize: 13 }}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFBF5' },
  center: { flex: 1, backgroundColor: '#FFFBF5', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#78716C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  qrHint: { fontSize: 12, color: '#A8A29E', marginBottom: 16, textAlign: 'center' },
  customerName: { fontSize: 14, fontWeight: '700', color: '#1A1208', marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'white', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarSmall: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { backgroundColor: 'rgba(249,115,22,0.1)', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#1A1208' },
  rowSub: { fontSize: 12, color: '#78716C', marginTop: 2 },
  arrow: { color: '#f97316', fontSize: 13 },
})
