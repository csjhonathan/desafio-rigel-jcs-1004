'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input, type InputProps } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { cn } from '@/lib/utils'

export interface TextInputProps extends Omit<InputProps, 'id' | 'type'> {
  id: string
  label: React.ReactNode
  type?: React.HTMLInputTypeAttribute
  /** Borda de erro (ex.: erro geral de login aplicado aos campos). */
  invalid?: boolean
  /** Texto de ajuda em tom muted; oculto se `errorText` estiver definido. */
  hintText?: string
  /** Mensagem abaixo do campo em tom destrutivo. */
  errorText?: string
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    {
      id,
      label,
      type = 'text',
      invalid,
      hintText,
      errorText,
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const [show_secret, setShowSecret] = React.useState(false)
    const is_password = type === 'password'
    const resolved_type = is_password && show_secret ? 'text' : type

    const has_error = Boolean(invalid || errorText)
    const support_visible = errorText ? errorText : hintText
    const support_is_error = Boolean(errorText)

    return (
      <div className="flex flex-col gap-3">
        <Label className='text-base' htmlFor={id}>{label}</Label>
        <div className="relative">
          <Input
            ref={ref}
            id={id}
            type={resolved_type}
            disabled={disabled}
            {...rest}
            className={cn(
              is_password && 'pr-10',
              has_error && 'border-destructive focus-visible:ring-destructive',
              className,
            )}
          />
          {is_password && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowSecret((v) => !v)}
              disabled={disabled}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              aria-label={show_secret ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {show_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {support_visible ? (
          <p
            className={cn(
              'text-xs',
              support_is_error ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {support_visible}
          </p>
        ) : null}
      </div>
    )
  },
)

TextInput.displayName = 'TextInput'
