interface IconProps {
  className?: string
}

export function SoundIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.2h4.1L13 5v14l-4.9-4.2H4z" fill="currentColor" />
      <path d="M16 8.2c1 1 1.5 2.2 1.5 3.8S17 14.8 16 15.8M18.5 5.7c1.7 1.7 2.5 3.8 2.5 6.3s-.8 4.6-2.5 6.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8l1.2 2.1 2.4.3.7 2.3 2.1 1.2-.6 2.3 1.4 1.9-1.4 1.9.6 2.3-2.1 1.2-.7 2.3-2.4.3L12 21.2l-1.2-2.1-2.4-.3-.7-2.3-2.1-1.2.6-2.3-1.4-1.9L6.2 11l-.6-2.3 2.1-1.2.7-2.3 2.4-.3z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function SpearIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 12 24" aria-hidden="true">
      <path d="M6 1l3.2 5L6 8.8 2.8 6z" fill="currentColor" />
      <path d="M6 7v15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M3.4 20.8h5.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  )
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" />
    </svg>
  )
}
