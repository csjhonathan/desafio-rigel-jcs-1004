import * as React from 'react'
import { Badge as ShadcnBadge } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type ShadcnVariant = VariantProps<typeof badgeVariants>['variant']

type ExtendedVariant = ShadcnVariant | 'warning' | 'success'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ExtendedVariant
}

const custom_variant_classes: Partial<Record<NonNullable<ExtendedVariant>, string>> = {
  warning: 'border-transparent bg-amber-100 text-amber-800',
  success: 'border-transparent bg-green-100 text-green-800',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const is_custom = variant === 'warning' || variant === 'success'

  return (
    <ShadcnBadge
      className={cn(is_custom && custom_variant_classes[variant], className)}
      variant={is_custom ? 'outline' : (variant as ShadcnVariant)}
      {...props}
    />
  )
}
