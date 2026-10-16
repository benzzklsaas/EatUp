import type { Viewport } from 'next'
import { displayFont } from '@/lib/eatup/fonts'

export const viewport: Viewport = {
  themeColor: '#F7F4EE',
}

export default function SuiviLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${displayFont.variable} contents`}>{children}</div>
}
