import * as React from 'react'

type TextWithMarkdownBoldProps = {
  text: string
  className?: string
  /** Classes Tailwind para o negrito (ex. font-semibold). */
  bold_class_name?: string
}

/**
 * Renderiza trechos `**assim**` como negrito. Tailwind não interpreta Markdown;
 * isto só cobre o padrão de negrito duplo, comum em resumos de IA.
 */
export function TextWithMarkdownBold({
  text,
  className,
  bold_class_name = 'font-semibold text-foreground',
}: TextWithMarkdownBoldProps) {
  const parts = text.split(/\*\*([\s\S]+?)\*\*/)

  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className={bold_class_name}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}
