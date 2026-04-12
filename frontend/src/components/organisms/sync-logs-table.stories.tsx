import type { Meta, StoryObj } from '@storybook/react'
import { SyncLogsTable } from './sync-logs-table'

const meta: Meta<typeof SyncLogsTable> = {
  title: 'Organisms/SyncLogsTable',
  component: SyncLogsTable,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof SyncLogsTable>

export const Default: Story = {}

export const Loading: Story = {}

export const Empty: Story = {}

export const WithRunning: Story = {}
