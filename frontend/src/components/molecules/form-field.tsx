import * as React from 'react'
import { Input, InputProps } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { cn } from '@/lib/utils'

interface FormFieldProps extends InputProps {
  label: string
  error?: string
}

export function FormField({ label, error, id, className, ...props }: FormFieldProps) {
  const field_id = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={field_id}>{label}</Label>
      <Input
        id={field_id}
        aria-invalid={!!error}
        aria-describedby={error ? `${field_id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${field_id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
