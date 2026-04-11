import * as React from 'react'
import { Label as ShadcnLabel } from '@/components/ui/label'

export type LabelProps = React.ComponentPropsWithoutRef<typeof ShadcnLabel>

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  (props, ref) => <ShadcnLabel ref={ref} {...props} />,
)

Label.displayName = 'Label'
