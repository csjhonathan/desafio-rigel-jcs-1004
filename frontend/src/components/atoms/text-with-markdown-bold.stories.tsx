import type { Meta, StoryObj } from '@storybook/react'
import { TextWithMarkdownBold } from './text-with-markdown-bold'

const meta: Meta<typeof TextWithMarkdownBold> = {
  title: 'Atoms/TextWithMarkdownBold',
  component: TextWithMarkdownBold,
  args: {
    text: 'Texto normal e **trecho em negrito** e mais texto.',
  },
}

export default meta

type Story = StoryObj<typeof TextWithMarkdownBold>

export const Default: Story = {}

export const MultiplosNegritos: Story = {
  args: {
    text: '**Primeiro:** valor. **Segundo:** outro.',
  },
}

export const SemNegrito: Story = {
  args: {
    text: 'Apenas texto sem asteriscos.',
  },
}
