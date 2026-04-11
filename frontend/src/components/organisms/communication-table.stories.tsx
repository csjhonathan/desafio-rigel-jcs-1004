import type { Meta, StoryObj } from '@storybook/react'
import { CommunicationTable } from './communication-table'
import { Communication } from '@/types'

const mock_communications: Communication[] = [
  {
    id: '1',
    external_id: 'ext-1',
    process_number: '1234567-89.2024.8.26.0001',
    tribunal: 'TJSP',
    available_at: '2024-11-15T00:00:00.000Z',
    kind: 'Intimação',
    content: 'Fica intimada a parte autora para apresentar réplica no prazo de 15 dias.',
    has_res_judicata: false,
    ai_summary: null,
    recipients: [{ id: 'r1', name: 'Dr. João Silva', kind: 'lawyer', communication_id: '1' }],
    created_at: '2024-11-15T00:00:00.000Z',
  },
  {
    id: '2',
    external_id: 'ext-2',
    process_number: '9876543-21.2023.4.02.5101',
    tribunal: 'TRF2',
    available_at: '2024-11-14T00:00:00.000Z',
    kind: 'Despacho',
    content: 'O presente recurso transitou em julgado em 10/11/2024.',
    has_res_judicata: true,
    ai_summary: 'Decisão transitada em julgado.',
    recipients: [],
    created_at: '2024-11-14T00:00:00.000Z',
  },
]

const meta: Meta<typeof CommunicationTable> = {
  title: 'Organisms/CommunicationTable',
  component: CommunicationTable,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CommunicationTable>

export const Default: Story = {
  args: { data: mock_communications, loading: false, error: null },
}

export const Loading: Story = {
  args: { data: [], loading: true, error: null },
}

export const Empty: Story = {
  args: { data: [], loading: false, error: null },
}

export const Error: Story = {
  args: { data: [], loading: false, error: 'Erro ao carregar comunicações' },
}
