// Types partagés du parcours client EatUp (menu, panier, commande).
// Ils décrivent les lignes Supabase telles qu'elles sont lues par la page publique :
// les champs optionnels peuvent être absents ou nuls selon l'ancienneté des données.

export type Restaurant = {
  id: string
  slug: string
  name: string
  description: string | null
  address: string | null
  phone: string | null
  logo_url: string | null
  cover_image_url: string | null
  daily_message: string | null
  /** Couleur d'accent propre au restaurant (colonne optionnelle, voir docs/REFONTE-CLIENT.md). */
  accent_color: string | null
}

export type Product = {
  id: string
  name: string
  description: string | null
  price: number
  category: string | null
  image_url: string | null
  is_available: boolean | null
  is_online?: boolean | null
  /** Prix total du produit en formule (et non un supplément, malgré le nom de la colonne). */
  menu_extra_price?: number | null
  menu_label?: string | null
  /** Supplément appliqué lorsqu'une boisson est choisie dans une formule. */
  menu_supplement?: number | null
  has_accompagnement?: boolean | null
  position?: number | null
  created_at?: string | null
}

export type OptionItem = {
  id: string
  group_id: string
  name: string
  extra_price: number
  is_available: boolean | null
  position?: number | null
  created_at?: string | null
}

export type OptionGroup = {
  id: string
  product_id: string
  name: string
  min_choices: number
  max_choices: number
  position?: number | null
  created_at?: string | null
  items: OptionItem[]
}

export type Category = {
  id: string
  name: string
  emoji: string | null
  position: number | null
}

/** day_of_week : 0 = lundi … 6 = dimanche (convention du tableau de bord). */
export type DaySchedule = {
  day_of_week: number
  is_closed: boolean | null
  opening_time_1: string | null
  closing_time_1: string | null
  opening_time_2: string | null
  closing_time_2: string | null
  slot_duration: number | null
}

export type Closure = {
  closed_date: string
}

/** Choix du client pour un produit. Seuls des identifiants circulent : les prix sont toujours relus. */
export type Selection = {
  /** groupId → identifiants des options choisies */
  options: Record<string, string[]>
  menu: boolean
  drinkId: string | null
  sideId: string | null
}

export type Catalog = {
  products: Product[]
  groupsByProduct: Record<string, OptionGroup[]>
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
