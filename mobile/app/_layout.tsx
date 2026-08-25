import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as Linking from 'expo-linking'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '@/lib/supabase'

const COLORS = {
  bg: '#FFFBF5',
  text: '#1A1208',
}

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<any>(null)
  const router = useRouter()
  const segments = useSegments()

  // Écoute le lien magique (eatup://auth/callback?code=...) et échange
  // le code contre une session — équivalent natif de la route
  // /auth/callback du site web.
  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return
      const { queryParams } = Linking.parse(url)
      const code = queryParams?.code
      if (typeof code === 'string') {
        await supabase.auth.exchangeCodeForSession(code)
      }
    }

    Linking.getInitialURL().then(handleUrl)
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url))
    return () => sub.remove()
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!ready) return
    const inAuthGroup = segments[0] === 'login'
    if (!session && !inAuthGroup) router.replace('/login')
    if (session && inAuthGroup) router.replace('/hub')
  }, [ready, session, segments])

  if (!ready) return null

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.bg },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="hub" options={{ title: 'Ma fidélité' }} />
        <Stack.Screen name="restaurant/[slug]" options={{ title: '' }} />
      </Stack>
    </>
  )
}
