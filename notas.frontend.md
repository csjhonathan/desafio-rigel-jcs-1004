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

## Layout do dashboard (sidebar)

Removemos o botão com o ícone `paper-plane` para `/communications` porque repetia o destino do atalho “Início” (Home) **sem** nenhuma função clara para ele no Layout.

O **abrir/fechar** do menu lateral fica num botão no **header**, à esquerda da logo (`DashboardShell`). Com o menu **aberto**, “Início” mostra ícone + texto; **fechado**, só o ícone (com `title="Início"`). A largura do `aside` e o texto usam transição suave (`transition`, ~300 ms). Novas entradas na sidebar devem seguir o mesmo padrão quando expandido.

## Tela de logs de sincronização — rastreabilidade e polling

Adicionamos uma tela dedicada em `/sync-logs` para visualizar o histórico de execuções do job de sincronização. A motivação era rastreabilidade: conseguir ver se o cron rodou, quanto tempo demorou, quantas comunicações foram obtidas e quantas eram realmente novas.

**Sobre o polling**

A tela atualiza os dados automaticamente enquanto houver alguma execução em andamento (`ended_at` nulo). O intervalo é de 5 segundos para buscar os logs atualizados do backend. Além disso, um segundo `setInterval` de 1 segundo atualiza um estado local `now` para calcular a duração ao vivo — isso dá a sensação de "tempo real" sem depender do servidor para isso.

Sei que polling não é a solução ideal para esse tipo de caso. O correto seria um WebSocket (ou Server-Sent Events), onde o backend notifica o frontend assim que o job termina ou tem uma atualização parcial de progresso. Com WebSocket, a latência seria mínima e não haveria requisições desnecessárias nos períodos em que nada está acontecendo.

O polling foi a escolha aqui por ser suficiente para um MVP: o job de sync não é uma operação contínua e frequente — roda uma vez por dia via cron ou sob demanda manual. O custo de uma requisição a cada 5 segundos durante alguns minutos é totalmente aceitável. Numa versão mais madura do produto, a troca para WebSocket seria o caminho natural.

**Detalhe de implementação**

Os dois `setInterval` (5s para fetch, 1s para duração) são ativados e desativados reativamente via `useEffect` com dependência em `has_running`. Quando todos os logs têm `ended_at` preenchido, ambos param automaticamente — sem polling desnecessário em estado ocioso.

## Problema → direção

| Situação | Direção |
|----------|---------|
| Formulário usado só numa rota | Manter na `page.tsx` ou num colocated module se a página explodir **e** houver sub-blocos testáveis. |
| Label + input + erro/hint repetidos | Atom (`TextInput`) ou molecule, conforme complexidade. |
| “Componentizar para ficar bonito no diagrama” | Evitar; custo de navegação e props sem reuso. |
