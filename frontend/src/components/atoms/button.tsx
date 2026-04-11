import * as React from 'react'
import { Button as ShadcnButton, buttonVariants } from '@/components/ui/button'
import type { VariantProps } from 'class-variance-authority'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <ShadcnButton ref={ref} {...props} />,
)

Button.displayName = 'Button'
