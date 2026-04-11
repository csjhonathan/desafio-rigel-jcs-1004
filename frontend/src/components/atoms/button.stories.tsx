import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = { args: { children: 'Botão padrão' } }
export const Secondary: Story = { args: { children: 'Secundário', variant: 'secondary' } }
export const Outline: Story = { args: { children: 'Contorno', variant: 'outline' } }
export const Destructive: Story = { args: { children: 'Deletar', variant: 'destructive' } }
export const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } }
export const Small: Story = { args: { children: 'Pequeno', size: 'sm' } }
export const Large: Story = { args: { children: 'Grande', size: 'lg' } }
export const Disabled: Story = { args: { children: 'Desabilitado', disabled: true } }
