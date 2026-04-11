# Notas de frontend

Registo de decisões de arquitetura, padrões e o que **não** fazer no projeto.

## Quando extrair componente vs. manter na página

**Regra prática:** extrair para `components/` quando houver **reuso real** (duas ou mais telas/features), **testes isolados** ou **Storybook** como contrato visual — não só porque o JSX “ficou grande”.

- **Evitar:** organismos ou formulários dedicados (`LoginForm`, `RegisterForm`, `AuthForm`) quando cada um só existe **numa** rota e não há plano de reutilizar. Isso adiciona indireção, props genéricas (`mode`, `onSubmit` polimórfico) e manutenção dupla sem ganho.
- **Preferir:** manter o fluxo do formulário **inline** na `page.tsx` (ainda client component com `'use client'`), co-localizado com `signIn`, `router`, estado local e mensagens de erro daquele fluxo.

Atomic Design continua válido para **atoms/molecules/organisms** que aparecem em vários sítios (tabelas, modais, barras de filtro). A pasta `organisms/` não é obrigatória para todo bloco “grande” de uma página única.

## `TextInput` (atom)

O padrão **label + campo + mensagem opcional** repetia-se nas telas de auth; para **password**, o botão mostrar/ocultar também se repetia.

Faz sentido um atom **`TextInput`** (`components/atoms/text-input.tsx`) que:

- renderiza `Label` + `Input` com `htmlFor` / `id` alinhados;
- se `type="password"`, gere **internamente** o estado de visibilidade e o botão (ícones + `aria-label` em português);
- aceite `invalid` (borda de erro sem texto, ex. login com erro genérico nos dois campos);
- aceite `errorText` e `hintText` (linha por baixo: erro destrutivo tem prioridade sobre hint muted).

As **páginas** continuam a donas da validação (ex. cadastro: e-mail, tamanho mínimo da senha, confirmação) e das chamadas à API / NextAuth; o atom só unifica apresentação e acessibilidade básica do campo.

## Shadcn / atoms

- UI base do Shadcn vive em `components/ui/`; as **páginas e features** importam **`@/components/atoms/*`** (wrappers), não o `ui/` diretamente — alinhado às regras do repositório.
- Novos atoms devem seguir o mesmo critério: só criar quando o padrão se **repete** ou quando encapsula comportamento transversal (como o toggle de senha).

## Problema → direção

| Situação | Direção |
|----------|---------|
| Formulário usado só numa rota | Manter na `page.tsx` ou num colocated module se a página explodir **e** houver sub-blocos testáveis. |
| Label + input + erro/hint repetidos | Atom (`TextInput`) ou molecule, conforme complexidade. |
| “Componentizar para ficar bonito no diagrama” | Evitar; custo de navegação e props sem reuso. |
