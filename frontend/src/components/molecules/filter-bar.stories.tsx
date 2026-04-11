import type { Meta, StoryObj } from '@storybook/react'
import { FilterBar } from './filter-bar'

const meta: Meta<typeof FilterBar> = {
  title: 'Molecules/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FilterBar>

export const Empty: Story = {
  args: {
    filters: { page: 1, limit: 20 },
    onChange: () => {},
    onReset: () => {},
  },
}

export const WithValues: Story = {
  args: {
    filters: {
      page: 1,
      limit: 20,
      tribunal: 'TJSP',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    },
    onChange: () => {},
    onReset: () => {},
  },
}
