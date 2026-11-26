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

> Dica: no servidor, `cp .env.example .env` (ajuste os valores) e use `npm run migrate:dev` e `npm run dev`, que leem o arquivo `.env`.

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

### Testes

```bash
npm test                                   # cálculo, detector de jobs, validações, agente (com impressora falsa)
DATABASE_URL=postgres://... npm test       # inclui os testes de integração com o PostgreSQL (sem a variável, são pulados)
```

Usa o executor nativo do Node (`node --test`), sem dependências novas. O projeto não usa ESLint nem TypeScript; como verificações
básicas, rode também `npm run build` (compila o front) e `node --check arquivo.js` nos arquivos do servidor e do agente.

### Expiração da sessão

A sessão expira por **inatividade** e tem um **limite máximo** de duração; depois disso é preciso entrar de novo (a tela de login avisa
"Sua sessão expirou").

| Regra | Padrão | Variável (em `/etc/elo3d/api.env`) |
|---|---|---|
| Tempo sem usar o sistema até expirar | **60 minutos** | `SESSAO_INATIVIDADE_MIN` |
| Duração máxima, mesmo usando sem parar | **12 horas** | `SESSAO_MAXIMA_HORAS` |

Para mudar: edite o arquivo e reinicie com `systemctl restart elo3d-api`. Exemplo (30 min / 8 h): `SESSAO_INATIVIDADE_MIN=30` e `SESSAO_MAXIMA_HORAS=8`.
Valores inválidos impedem o servidor de iniciar, com uma mensagem clara.

- "Usar" significa mexer no mouse, teclar, rolar ou tocar na tela: enquanto isso a sessão é **renovada sozinha**. Consultas automáticas, como a da tela
  da Impressora (a cada 7 s), **não** renovam a sessão: sem ninguém usando, ela expira mesmo com essa tela aberta.
- Sair em uma aba desconecta as outras abas. Trocar a senha encerra as sessões antigas daquele usuário (com aviso próprio).
- Na primeira atualização com esta função, todos precisam entrar de novo uma vez (as sessões antigas, de 30 dias, deixam de valer).
- O agente da impressora **não** usa esta sessão: ele tem o próprio token e não expira por inatividade.

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

## Integração com a impressora (Flashforge AD5X)

Mostra o **estado ao vivo** da impressora (estado, arquivo, progresso, camada, tempo decorrido/restante e temperaturas), registra cada impressão
concluída com a **duração real** e leva esse tempo para a calculadora (energia e depreciação da máquina). **Somente leitura**: nada de pausar,
cancelar, mover eixos ou enviar arquivos.

```
 AD5X ──(rede local, porta 8898)── notebook (agente) ──(HTTPS, só de saída)──> ELO 3D (VPS) ──> navegador
```

O VPS fica na internet e **não alcança** o IP local da impressora, e o navegador também não deve falar com ela. Por isso um **agente** roda no notebook
da rede local (pasta [`agente/`](agente/README.md), sem dependências além do Node), consulta a impressora e envia o estado ao sistema.
O **checkCode fica só no `.env` do notebook**: não vai ao banco, à tela, aos logs nem ao repositório.

> **Passo a passo completo** (impressora, notebook, teste em desenvolvimento e produção): [docs/GUIA-PASSO-A-PASSO.md](docs/GUIA-PASSO-A-PASSO.md).

### Como configurar IP, número de série e checkCode
1. **Na impressora**: ative o modo **LAN** (veja abaixo) e anote o **número de série**, o **IP** e o **código de verificação** (`checkCode`, 8 caracteres).
2. **No sistema**: *Configurações > Impressora > Adicionar*: nome, **IP**, **número de série** (a porta é 8898). O sistema mostra o **token do agente** uma única vez.
3. **No notebook** (Windows): siga o [passo a passo do agente](agente/README.md): `.env` com o token e o `checkCode`, `node src\index.js --diagnostico`
   para validar, e `instalar-windows.ps1` para iniciar junto com o Windows.

O **IP é editável** em *Configurações > Impressora > Editar IP / dados*: se o roteador mudar o IP da impressora, basta atualizar ali; o agente usa o novo
IP na consulta seguinte, sem mexer no notebook. (O ideal é reservar o IP da impressora no roteador.)

### Como ativar o modo LAN na impressora
No menu da impressora (Configurações / Rede), escolha o modo **LAN** ("LAN Only" / modo local) e **reinicie a impressora**. No modo nuvem a API local responde
"Lan mode error" e o sistema mostra *"O modo LAN está desativado na impressora"*. Os nomes dos menus variam conforme o firmware. O `checkCode` aparece nesse menu;
se você gerar outro, o anterior para de funcionar.

### Como usar
- **Impressora** (menu): estado ao vivo (atualiza a cada ~7 s enquanto a tela está aberta) e histórico de impressões.
- Em cada job: **vincular a um produto** e **Usar na calculadora**, que preenche horas e minutos reais e, se a impressora informou, as gramas de filamento.
- A calculadora ganhou o campo **Depreciação da máquina (R$/h)**: é multiplicado pelo tempo de impressão (vazio = sem efeito nos valores de antes).
- Falhas aparecem com orientação: impressora offline, número de série/checkCode errado, modo LAN desativado, firmware incompatível e agente sem sinal.

### Limitações conhecidas
- **A API é não oficial** (documentação da comunidade, firmware AD5X 1.2.1) e muda entre versões de firmware. Os nomes de campo foram escritos a partir da
  documentação e **não foram validados contra uma AD5X real**: rode `node src\index.js --diagnostico` no notebook e confira. Campos ausentes ou desconhecidos
  não quebram nada (viram "sem informação"). Os fixtures dos testes estão marcados como **não validados**.
- **Sem ID nem hora de início do job**: a chave do job é *arquivo + início estimado* (instante da consulta menos o tempo decorrido, com precisão de minuto).
  Se o sistema só vir o job já em andamento, o início é marcado como estimado (≈) e a duração pode ser aproximada.
- **Filamento é estimativa do fatiador**, não o consumo medido: vem da lista de arquivos da impressora (gramas por ferramenta/slot do IFS) cruzada pelo nome do
  arquivo. Se o arquivo não estiver na lista, o campo fica manual. Os campos `estimatedLeft*` do `/detail` não têm unidade documentada e **não são usados**.
- Depende do **notebook ligado**, na rede da impressora e com internet. Com o agente parado o estado não atualiza; quando volta, o job que terminou nesse intervalo
  é registrado se a impressora ainda mostrar o resultado.
- O `instalar-windows.ps1` **não foi testado em um Windows real**.
- O IP aceita apenas endereços da rede local (IPv4).

### Como trocar o provider (ex.: Moonraker/Klipper)
O agente só conhece a interface `PrinterProvider` ([`agente/src/providers/provider.js`](agente/src/providers/provider.js)): `obterSnapshot(alvo)` devolve um
"snapshot" neutro (estado, arquivo, progresso, camadas, tempos, temperaturas, filamento). Para outro firmware (por exemplo Moonraker, porta 7125, se você instalar
o Zmod), crie `agente/src/providers/moonraker/index.js` implementando isso e registre em `PROVIDERS`; no servidor, acrescente o nome em `PROVIDERS`
(`server/src/impressora/servico.js`). O detector de jobs, a tela e a calculadora **não mudam**.

### Segurança
- O agente só faz chamadas **de saída** (nenhuma porta aberta). O token dele vale só para enviar o estado **daquela** impressora; fica no banco apenas o hash,
  e pode ser regenerado (o anterior deixa de valer).
- O agente recusa IPs fora da rede local (o `checkCode` não sai da rede doméstica) e oculta segredos nos logs.
- Tudo que vem do agente é validado e limitado no servidor (campos extras são descartados).

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
