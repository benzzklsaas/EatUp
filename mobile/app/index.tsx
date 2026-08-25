import { View, ActivityIndicator } from 'react-native'

// Écran vide, affiché brièvement pendant que _layout détermine si on
// redirige vers /login ou /hub selon la session.
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBF5' }}>
      <ActivityIndicator color="#f97316" />
    </View>
  )
}
