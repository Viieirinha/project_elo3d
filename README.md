# ELO 3D — Calculadora de Custos de Impressão 3D

## Rodando o projeto

```bash
npm install
npm run dev
```

## Logo

- `src/assets/logo.png` — arte completa (anéis + wordmark), fornecida pela marca.
- `src/assets/logo-mark.webp` — recorte quadrado dos anéis (192 px, 10 KB), usado no menu e no login ([AppShell](src/components/AppShell.jsx)).

## Interface

- **Design system** em `src/components/ui/` (Button, Field, Modal, Toast, Segmented, Badge, StatCard, ...) e tokens
  de cor/sombra/tipografia em `src/index.css` (tema claro e escuro). Fontes Inter e Space Grotesk embutidas no app.
- **Navegação** em `AppShell`: menu lateral no desktop; barra superior + barra inferior (com "Mais") no celular.
- Telas carregam dados com `useCarregar` (estados de carregando, erro e "tentar novamente"); ações avisam por toast.
- Modais são acessíveis: foco preso, `Esc` fecha, o foco volta ao botão de origem; no celular viram folha deslizante.

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

### Esqueci a senha

Não há envio de e-mail configurado, então a tela de login tem **"Esqueci a senha"**: quem tem o código de convite
informa o e-mail, o código e uma nova senha (mínimo 8 caracteres) e já entra no sistema. Ao trocar, as sessões
anteriores daquele usuário deixam de valer. Sem `CODIGO_CONVITE` configurado, a redefinição fica desativada.

Atenção: quem souber o código de convite pode redefinir a senha de qualquer usuário. Mantenha o código restrito à equipe.
O administrador também pode redefinir direto no servidor (não depende do código):

```bash
cd /opt/elo3d/server && set -a && . /etc/elo3d/api.env && set +a
read -rs NOVA_SENHA && export NOVA_SENHA
node scripts/redefinir-senha.js usuario@exemplo.com
unset NOVA_SENHA
```

## Publicação (VPS Ubuntu, elo3d.wmbens.cloud)

1. DNS: registro `A` de `elo3d` apontando para o IP do VPS.
2. No VPS, como root, uma única vez: copie a pasta `deploy/` e rode `bash setup-vps.sh`
   (instala Nginx, PostgreSQL, Node; cria banco, segredos em `/etc/elo3d/api.env` e o serviço `elo3d-api`).
3. No seu computador: `./deploy.sh root@IP_DO_VPS` (build, envio, migração e reinício da API).
4. No VPS, com o DNS já propagado: `certbot --nginx -d elo3d.wmbens.cloud`.

Atualizações futuras: só `./deploy.sh root@IP_DO_VPS`.

Sem SSH (web console do VPS)? Clone o repositório em `/opt/elo3d-src`, rode `bash deploy/setup-vps.sh` e,
a cada atualização, `bash deploy/deploy-no-servidor.sh` (faz `git pull`, build e publicação no próprio servidor).

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

## Backup do banco (VPS)

O `setup-vps.sh` instala um backup **diário às ~03:30** (timer do systemd). Cada backup é um dump comprimido,
verificado, em `/var/backups/elo3d/`, e os arquivos com mais de 14 dias são apagados.

```bash
systemctl start elo3d-backup && ls -lh /var/backups/elo3d   # rodar um backup agora
systemctl list-timers elo3d-backup.timer                     # ver o próximo agendado
journalctl -u elo3d-backup -n 20                             # ver o resultado dos últimos
```

**Restaurar** (substitui o conteúdo atual do banco pelo do backup):

```bash
systemctl stop elo3d-api
zcat /var/backups/elo3d/elo3d-AAAAMMDD-HHMMSS.sql.gz | runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d elo3d
systemctl start elo3d-api
```

Os backups ficam no mesmo servidor, então não protegem contra perda do VPS. Copie-os de tempos em tempos para
fora, por exemplo no seu computador: `rsync -az root@IP_DO_VPS:/var/backups/elo3d/ ./backups-elo3d/`.
Opções por variável de ambiente no script: `BACKUP_DIR`, `BACKUP_DB`, `BACKUP_DIAS`.
