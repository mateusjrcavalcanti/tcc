
Este projeto é um frontend Next.js usado como interface para gerenciar o hub
descrito na pasta `hub/`.

## Início rápido

Instale dependências e rode em modo desenvolvimento:

```bash
npm install
npm run dev
# ou: pnpm install && pnpm dev
```

Abra http://localhost:3000 no navegador.

## Estrutura relevante

- `app/` — rotas e componentes principais do Next.js (app router).
- `components/` — componentes React reutilizáveis.
- `public/` — ativos estáticos.
- `blockly/` — editor Blockly customizado usado pelo app.

## Como contribuir

- Edite componentes em `components/` ou o layout em `app/layout.tsx`.
- Siga as convenções de TypeScript presentes (`tsconfig.json`).

## Deploy

Recomenda-se usar Vercel para um deploy simples, ou construir estático:

```bash
npm run build
npm run start
```

## Recursos

- Documentação Next.js: https://nextjs.org/docs

