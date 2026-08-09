interface BrandMarkProps {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark${compact ? " brand-mark--compact" : ""}`} aria-label="Troy Hard">
      <span>TROY</span>
      <span>HARD</span>
    </div>
  )
}
