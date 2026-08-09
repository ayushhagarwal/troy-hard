import type { ButtonHTMLAttributes, ReactNode } from "react"

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: "primary" | "secondary" | "quiet" | "danger"
}

export function GameButton({ children, variant = "secondary", className = "", ...props }: GameButtonProps) {
  return (
    <button className={`game-button game-button--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
