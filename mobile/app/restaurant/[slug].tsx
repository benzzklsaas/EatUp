import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function RestaurantLoyaltyScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [program, setProgram] = useState<any>(null)
  const [account, setAccount] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: resto } = await supabase.from('restaurants').select('id, name, slug').eq('slug', slug).single()
      if (!resto) { setLoading(false); return }
      setRestaurant(resto)
      navigation.setOptions({ title: resto.name })

      const { data: programData } = await supabase.from('loyalty_programs').select('*').eq('restaurant_id', resto.id).maybeSingle()
      setProgram(programData)

      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: customer } = await supabase.from('customers').select('id').eq('email', user.email.toLowerCase()).maybeSingle()
        if (customer) {
          const { data: acc } = await supabase.from('loyalty_accounts').select('*').eq('restaurant_id', resto.id).eq('customer_id', customer.id).maybeSingle()
          setAccount(acc)
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#f97316" />
      </View>
    )
  }

  if (!restaurant || !program) {
    return (
      <View style={styles.center}>
        <Text style={styles.rowSub}>Programme de fidélité non disponible.</Text>
      </View>
    )
  }

  const stampsCount = account?.stamps_count ?? 0
  const threshold = program.stamps_threshold ?? 0
  const rewardsAvailable = threshold > 0 ? Math.floor(stampsCount / threshold) : 0
  const progress = threshold > 0 ? (rewardsAvailable > 0 && stampsCount % threshold === 0 ? threshold : stampsCount % threshold) : 0

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 20, gap: 16 }}>
      {program.stamps_enabled && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Carte tampon</Text>
          <View style={styles.stampGrid}>
            {Array.from({ length: threshold }).map((_, i) => (
              <View key={i} style={[styles.stamp, i < progress && styles.stampFilled]}>
                <Text>{i < progress ? '🥙' : ''}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.progressText}>
            {rewardsAvailable > 0
              ? `🎉 Récompense disponible chez le commerçant : ${program.stamps_reward_label}`
              : `${progress} / ${threshold} — encore ${threshold - progress} pour : ${program.stamps_reward_label}`}
          </Text>
        </View>
      )}

      {program.points_enabled && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Points</Text>
          <Text style={styles.pointsValue}>{account?.points_balance ?? 0}</Text>
          <Text style={styles.progressText}>
            {Math.floor((account?.points_balance ?? 0) / program.points_per_reward) > 0
              ? `🎉 Récompense disponible chez le commerçant : ${program.points_reward_label}`
              : `À ${program.points_per_reward} points : ${program.points_reward_label}`}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFBF5' },
  center: { flex: 1, backgroundColor: '#FFFBF5', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#78716C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stamp: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', borderStyle: 'dashed' },
  stampFilled: { backgroundColor: 'rgba(249,115,22,0.12)', borderColor: '#f97316' },
  progressText: { fontSize: 13, color: '#78716C', textAlign: 'center' },
  pointsValue: { fontSize: 40, fontWeight: '900', color: '#1A1208', textAlign: 'center', marginBottom: 8 },
  rowSub: { fontSize: 12, color: '#78716C' },
})
