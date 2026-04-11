import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = { args: { children: 'Padrão' } }
export const Secondary: Story = { args: { children: 'Secundário', variant: 'secondary' } }
export const Destructive: Story = { args: { children: 'Erro', variant: 'destructive' } }
export const Warning: Story = { args: { children: 'Transitado em julgado', variant: 'warning' } }
export const Success: Story = { args: { children: 'Concluído', variant: 'success' } }
export const Outline: Story = { args: { children: 'Contorno', variant: 'outline' } }
