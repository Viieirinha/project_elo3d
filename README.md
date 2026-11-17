# ELO 3D — Calculadora de Custos de Impressão 3D

## Rodando o projeto

```bash
npm install
npm run dev
```

## Logo

- `src/assets/logo.png` — arte completa (anéis + wordmark), fornecida pela marca.
- `src/assets/logo-mark.png` — recorte quadrado apenas dos anéis, usado no [Header](src/components/Header.jsx) ao lado do texto "ELO 3D".

## Arquitetura

- **Frontend**: React + Vite (PWA), em `src/`. Fala só com `/api` (`src/utils/api.js`).
- **API**: Node + Express em `server/`, login por JWT, dados no **PostgreSQL** (`server/src/schema.sql`).
  Operações de estoque, venda e pedido rodam em transações.
- **Produção**: Nginx serve `dist/` e faz proxy de `/api` para a API (porta 3001, só local).

## Desenvolvimento local

```bash
# 1) Postgres com um banco vazio, depois:
cd server && npm install
export DATABASE_URL=postgres://usuario:senha@127.0.0.1:5432/elo3d
export JWT_SECRET=$(openssl rand -hex 32) CODIGO_CONVITE=meu-convite
npm run migrate && npm start

# 2) Em outro terminal, na raiz:
npm install && npm run dev      # o Vite encaminha /api para :3001
```

Cadastro de novos usuários exige o `CODIGO_CONVITE`; sem essa variável o cadastro fica desativado.

## Publicação (VPS Ubuntu, elo3d.wmbens.cloud)

1. DNS: registro `A` de `elo3d` apontando para o IP do VPS.
2. No VPS, como root, uma única vez: copie a pasta `deploy/` e rode `bash setup-vps.sh`
   (instala Nginx, PostgreSQL, Node; cria banco, segredos em `/etc/elo3d/api.env` e o serviço `elo3d-api`).
3. No seu computador: `./deploy.sh root@IP_DO_VPS` (build, envio, migração e reinício da API).
4. No VPS, com o DNS já propagado: `certbot --nginx -d elo3d.wmbens.cloud`.

Atualizações futuras: só `./deploy.sh root@IP_DO_VPS`.
