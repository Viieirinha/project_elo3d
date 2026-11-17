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

## Migrando os dados do Firebase para o Postgres

Duas etapas, para que sua senha do Firebase nunca vá para o servidor. Não altera nada no Firebase.

```bash
# 1) No seu computador (Node 18+, dentro de server/). Use a conta que você usa no sistema atual.
read -rsp "Senha: " FIREBASE_SENHA; export FIREBASE_SENHA
FIREBASE_EMAIL=voce@exemplo.com node scripts/exportar-firebase.js dump.json

# 2) Envie o dump ao VPS e importe (depois do primeiro ./deploy.sh, para o schema existir):
scp dump.json root@IP_DO_VPS:/opt/elo3d/server/
ssh root@IP_DO_VPS
  cd /opt/elo3d/server && set -a && . /etc/elo3d/api.env && set +a
  node scripts/importar.js dump.json --simular   # confere o resumo, não grava
  node scripts/importar.js dump.json             # importa
  shred -u dump.json                              # apague o dump do servidor
```

- A importação é uma única transação: se algo falhar, nada é gravado. Ela recusa banco com dados;
  `--limpar` substitui produtos/vendas/pedidos (os usuários são mantidos).
- Guarde o `dump.json` como backup num lugar seguro (ele tem dados reais e fica fora do Git).
- Senhas não migram: cada pessoa cria a conta de novo com o código de convite.
