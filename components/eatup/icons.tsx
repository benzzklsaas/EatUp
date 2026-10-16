// Jeu d'icônes inline (trait 1.8px, 24×24) : aucune dépendance, rendu net à toutes les tailles.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
export const MinusIcon = (p: IconProps) => <Icon {...p}><path d="M5 12h14" /></Icon>
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>
export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="M5 12.5l4.2 4.2L19 7" /></Icon>
export const ChevronLeftIcon = (p: IconProps) => <Icon {...p}><path d="M15 18l-6-6 6-6" /></Icon>
export const ChevronRightIcon = (p: IconProps) => <Icon {...p}><path d="M9 6l6 6-6 6" /></Icon>
export const ChevronDownIcon = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>
export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></Icon>
export const ClockIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>
export const PinIcon = (p: IconProps) => <Icon {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></Icon>
export const PhoneIcon = (p: IconProps) => <Icon {...p}><path d="M6.6 3.5h2.6l1.4 4.2-2 1.4a12 12 0 006.3 6.3l1.4-2 4.2 1.4v2.6a2 2 0 01-2.2 2A17 17 0 014.6 5.7a2 2 0 012-2.2z" /></Icon>
export const BagIcon = (p: IconProps) => <Icon {...p}><path d="M5.5 8h13l-1 12.5h-11z" /><path d="M9 8V6.5a3 3 0 016 0V8" /></Icon>
export const TrashIcon = (p: IconProps) => <Icon {...p}><path d="M4.5 7h15M10 7V5h4v2M6.5 7l1 13h9l1-13" /></Icon>
export const EditIcon = (p: IconProps) => <Icon {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></Icon>
export const InfoIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></Icon>
export const AlertIcon = (p: IconProps) => <Icon {...p}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></Icon>
export const ShareIcon = (p: IconProps) => <Icon {...p}><path d="M12 15V4M8 8l4-4 4 4" /><path d="M5 12v7.5h14V12" /></Icon>
export const CopyIcon = (p: IconProps) => <Icon {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5" /></Icon>
export const MegaphoneIcon = (p: IconProps) => <Icon {...p}><path d="M4 10v4h3l7 4V6l-7 4z" /><path d="M17.5 9.5a3.5 3.5 0 010 5" /></Icon>
export const CardIcon = (p: IconProps) => <Icon {...p}><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="M3.5 10h17M7 14.5h3" /></Icon>
export const ChefIcon = (p: IconProps) => <Icon {...p}><path d="M7 17h10v3H7z" /><path d="M7 17v-4.2A4 4 0 018.5 5a4.5 4.5 0 017 0A4 4 0 0117 12.8V17" /></Icon>
export const ReceiptIcon = (p: IconProps) => <Icon {...p}><path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" /><path d="M9 8.5h6M9 12h6" /></Icon>
export const RefreshIcon = (p: IconProps) => <Icon {...p}><path d="M19.5 12a7.5 7.5 0 11-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></Icon>

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="eu-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
