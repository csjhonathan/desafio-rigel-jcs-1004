# Notas sobre uso de IA

Registo de como utilizei IA durante o desenvolvimento, o que funcionou bem e onde precisei intervir manualmente.

## 1) Ponto de partida: requisitos e regras do projeto

A primeira ação foi usar o PDF de requisitos como insumo para o Claude gerar um `CLAUDE.md` completo. Em seguida, aproveitei esse conteúdo no `.cursorrules` para orientar os agentes com contexto consistente do desafio.

Depois disso, revisei manualmente ambos os arquivos (`CLAUDE.md` e `.cursorrules`) para remover instruções que eram mais preferências pessoais de trabalho do que requisitos de entrega.

## 2) Scaffolding inicial e revisão crítica

Com as regras definidas, usei tanto o Cursor (Agent/Auto) quanto o Claude para gerar o scaffold do projeto (backend + frontend). O objetivo foi acelerar a construção da base sem perder controle de qualidade.

Mesmo com o scaffold pronto, fiz revisão arquivo por arquivo para validar:

- aderência aos requisitos;
- coerência entre camadas;
- padrão de código que eu queria manter no projeto.

Ou seja, a IA acelerou a produção inicial, mas a validação final de arquitetura e consistência ficou comigo.

## 3) Maior desafio: seed e volume de dados

O ponto mais difícil foi o seed por causa do volume de dados da API e limites do ambiente gratuito.

Tentei abordagens diferentes:

- paginação ampla por dia (de 5 em 5 itens, resultando em milhares de páginas);
- paginação por dia + tribunal.

Na prática, mesmo assim esbarrei em limites de infraestrutura (especialmente banco gratuito no Railway) muito cedo. Nesse ponto, em vez de ficar apenas no ciclo de escrever/reescrever código manualmente, usei prompts para os agentes me ajudarem a testar estratégias e iterar mais rápido nas alternativas delegáveis.

## 4) Onde a IA não entregou o esperado

Um ponto negativo relevante foi a fidelidade de interface.

Mesmo com MCP do Figma configurado no Claude, o resultado não atingiu o nível de fidelidade que eu esperava: alguns botões sem ação, estados de interface não tratados e lacunas de UX.

Nesses casos, precisei intervir diretamente. Minha percepção é que a IA ajuda bastante em execução, mas ainda tem limitação quando o problema exige sensibilidade de produto e acabamento visual fino.

## 5) Onde a IA foi muito útil

A IA foi especialmente útil em tarefas de aceleração técnica, por exemplo:

- implementação de partes repetitivas que eu já sabia fazer;
- apoio na lógica de polling de logs;
- geração e expansão de testes automatizados;
- aceleração da documentação de componentes com Storybook.

## 6) Balanço final

Meu balanço do uso de IA neste projeto foi aproximadamente **50/50**:

- **muito boa** para trabalho pesado, repetitivo e parte da lógica delegável;
- **limitada** em pontos que exigem sensibilidade de interface, acabamento e validação contextual.

Em resumo, a IA funcionou como multiplicador de produtividade, mas não substituiu revisão crítica, decisões de produto e intervenção manual nas partes mais sensíveis.
