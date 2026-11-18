# Guia passo a passo: Flashforge AD5X + ELO 3D

Este guia leva você da impressora até o sistema funcionando, **testando primeiro em desenvolvimento** e só depois em produção.

> **Sobre os menus da impressora:** não consegui confirmar o caminho exato dos menus da **AD5X** (as páginas oficiais não estavam acessíveis). Os caminhos abaixo vêm de guias da
> comunidade e de um modelo irmão (Creator 5). **Confira na tela da sua impressora**; se o menu for diferente, tire uma foto e me envie. Os trechos marcados com ⚠️ são os não confirmados.

## Visão geral

```
 AD5X  ──(Wi‑Fi da casa, porta 8898)──  notebook (agente)  ──(internet, só de saída)──>  servidor ELO 3D  <── navegador
```

- Só o **notebook** precisa estar na mesma rede (Wi‑Fi) da impressora.
- O servidor (de teste ou de produção) e o seu navegador podem estar em **qualquer outra rede**. Por isso dá para testar em desenvolvimento mesmo com o seu computador em outro Wi‑Fi.

**Ordem recomendada** (cada fase só começa quando a anterior deu certo):

| Fase | O que faz | Precisa do servidor? |
|---|---|---|
| A | Preparar a impressora (modo LAN, IP, série, código) | não |
| B | Testar a conversa notebook ↔ impressora (diagnóstico) | **não** |
| C | Testar o sistema completo em **desenvolvimento** | servidor de teste |
| D | Colocar em **produção** | servidor de produção (VPS) |

---

## Fase A: preparar a impressora

### A1. Antes de mexer
- Anote a **versão do firmware** (nas informações da impressora). Firmwares muito antigos (1.0.x) podem ter a API local bloqueada; se for o caso, atualize o firmware.
- **O que o modo LAN faz:** a API local só funciona com o modo **LAN** ligado. Segundo a FAQ da Flashforge, o app **Flash Maker não conecta** com a impressora em modo LAN. Confirme que o seu jeito de imprimir
  pelo notebook continua funcionando depois (veja A4). Faça isto **sem nenhuma impressão em andamento**.
- Para **desfazer**: é só desligar o modo LAN no mesmo menu.

### A2. Ativar o modo LAN e ver o código ⚠️
Caminho mais provável (não confirmado na AD5X):

1. Na tela inicial da impressora, toque na **engrenagem (Configurações)**.
2. Abra **Rede** (ícone de Wi‑Fi).
3. Procure **Modo de rede** / **LAN Only** / **Somente LAN** e **ative**.
4. Depois de ativar, a tela deve mostrar o **IP** e um **código de acesso/verificação** (a documentação chama de `checkCode`, às vezes "Check Code" ou "Verify Code").
5. **Reinicie a impressora** (desligue e ligue). A documentação da comunidade recomenda reiniciar depois de trocar o modo; sem isso a API pode continuar bloqueada.

### A3. Anotar os 3 dados (guarde em um lugar seguro)
| Dado | Onde achar | Observação |
|---|---|---|
| **IP** (ex.: `192.168.0.50`) | tela de Rede da impressora | pode mudar; veja A5 |
| **Número de série** | informações do aparelho (Sobre) ou etiqueta na impressora ⚠️ | não é secreto |
| **Código (`checkCode`)** | tela de Rede, no modo LAN | **é secreto**: só vai no notebook. A documentação cita 8 caracteres (letras a–f e números); outras fontes citam menos. O agente aceita de 4 a 64 caracteres. Se você gerar outro, o antigo para de funcionar |

### A4. Conferir que o notebook ainda imprime
Mande uma impressão pequena pelo programa que você usa hoje. Se ele perdeu a conexão depois do modo LAN, readicione a impressora nele usando o **IP e o código** (o nome do botão
depende do programa). Se não der, desligue o modo LAN e me avise: a integração precisa dele, mas vemos como conciliar.

### A5. Reservar o IP no roteador (recomendado)
Para o IP não mudar: no painel do roteador (geralmente `192.168.0.1` ou `192.168.1.1`), procure **DHCP > Reserva de endereço / IP estático / Address reservation**, escolha a impressora (pelo nome ou MAC)
e fixe o IP atual. Se não conseguir, tudo bem: o sistema permite **editar o IP** a qualquer momento (Configurações > Impressora).

---

## Fase B: testar notebook ↔ impressora (sem servidor)

Esta é a fase **mais importante**: a API da Flashforge não é oficial e os nomes de campo foram escritos a partir de documentação, não de uma AD5X real.

1. No notebook, instale o **Node.js LTS** (https://nodejs.org). Abra o PowerShell e confira: `node -v` (precisa ser 20 ou mais).
2. Copie a pasta `agente` do projeto para o notebook (ex.: `C:\elo3d\agente`).
3. Na pasta `agente`, crie um arquivo chamado `.env` com **só esta linha** (troque pelo seu código):
   ```
   FF_CHECK_CODE=SEU_CODIGO_AQUI
   ```
4. Confira se o notebook enxerga a impressora (troque pelo IP):
   ```powershell
   Test-NetConnection 192.168.0.50 -Port 8898
   ```
   Precisa mostrar `TcpTestSucceeded : True`. Se der `False`: impressora desligada, IP errado, modo LAN desligado/sem reiniciar, ou notebook em outro Wi‑Fi.
5. Rode o diagnóstico (troque IP e série):
   ```powershell
   cd C:\elo3d\agente
   node src\index.js --diagnostico --ip 192.168.0.50 --serial SEU_NUMERO_DE_SERIE
   ```
6. O que esperar:
   - **Lista de campos** que a impressora devolveu e a linha `Estado reconhecido: "ready" -> ociosa` (ou outro estado).
   - **"Todos os campos esperados vieram"**. Se aparecer *"campos esperados que NÃO vieram"*, o firmware é diferente da documentação: **me envie o resultado**.
   - Foi gerado `diagnostico-detail.json` (serial, IP, MAC e códigos de registro já vêm ocultados). **Envie este arquivo para mim**: com ele eu confirmo se o sistema interpreta a sua AD5X corretamente.
7. **Repita com a impressora imprimindo** (uma peça pequena, de uns 5 minutos) e salve o diagnóstico de novo. É durante a impressão que aparecem progresso, camadas e tempos.

Mensagens possíveis do diagnóstico:

| Mensagem | O que significa | O que fazer |
|---|---|---|
| A impressora não respondeu | Offline, IP errado, outra rede | Passo 4 |
| Número de série ou checkCode incorretos | Dados errados | Confira série e código na tela da impressora |
| Modo LAN desativado | API local bloqueada | Ative o modo LAN e **reinicie a impressora** (A2) |
| Resposta inesperada / firmware incompatível | Firmware diferente da documentação | Me envie a mensagem |

---

## Fase C: testar o sistema em desenvolvimento

O objetivo é testar tudo **sem tocar na produção**. Você escolhe **uma** das duas formas:

- **Forma 1: tudo no notebook** (mais simples, sem rede para configurar). O servidor de teste roda no próprio notebook, que já está na rede da impressora.
- **Forma 2: servidor de teste no seu computador, em outro Wi‑Fi**, usando um **túnel** para o notebook alcançá-lo.

### C1. Preparar o servidor de teste (nas duas formas)
Na máquina que vai rodar o servidor (notebook na Forma 1; seu computador na Forma 2):

1. Instale o **Node.js LTS**, o **Git** e o **PostgreSQL** (https://www.postgresql.org/download/windows/). Anote a senha do usuário `postgres` e deixe a porta `5432`.
   - Alternativa com Docker: `docker run --name elo3d-db -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=elo3d_dev -p 5432:5432 -d postgres:16`
2. Crie o banco de teste (menu Iniciar > **SQL Shell (psql)**, ou `psql -U postgres`):
   ```sql
   CREATE DATABASE elo3d_dev;
   ```
3. Baixe o projeto **na branch com a integração** (ela ainda não está na `main`):
   ```powershell
   git clone -b claude/affectionate-johnson-3jm0ts https://github.com/Viieirinha/project_elo3d.git
   cd project_elo3d
   ```
4. Servidor:
   ```powershell
   cd server
   npm install
   copy .env.example .env
   notepad .env        # ajuste DATABASE_URL (sua senha do postgres), JWT_SECRET e CODIGO_CONVITE
   npm run migrate:dev
   npm run dev         # deixe esta janela aberta
   ```
5. Em **outra** janela do PowerShell, na pasta do projeto, o site:
   ```powershell
   npm install
   npm run dev         # abre em http://localhost:5173
   ```
6. Abra http://localhost:5173, **crie a sua conta** (use o `CODIGO_CONVITE` do `.env`).

### C2. Cadastrar a impressora no sistema de teste
1. Menu **Configurações > Impressora > Adicionar**.
2. Preencha **IP**, **nome** e **número de série** (porta 8898). O sistema **não pede o código**.
3. **Copie o token do agente** que aparece (só aparece uma vez).

### C3. Ligar o agente apontando para o servidor de teste
No notebook, na pasta `agente`, edite o `.env`:

- **Forma 1 (servidor no próprio notebook):**
  ```
  ELO_API_URL=http://localhost:3001
  ELO_AGENT_TOKEN=elo3d_ag_COLE_O_TOKEN
  FF_CHECK_CODE=SEU_CODIGO_AQUI
  ```
- **Forma 2 (servidor no seu computador, outro Wi‑Fi):** o notebook não alcança o `localhost` do seu computador. Use um túnel **no computador que roda o servidor**:
  ```powershell
  winget install --id Cloudflare.cloudflared
  cloudflared tunnel --url http://localhost:3001
  ```
  Ele imprime um endereço `https://alguma-coisa.trycloudflare.com`. No `.env` do notebook:
  ```
  ELO_API_URL=https://alguma-coisa.trycloudflare.com
  ```
  (o agente exige `https://` para endereços remotos). Alternativa: Tailscale/ngrok.
  **Segurança:** o túnel deixa o servidor de teste acessível pela internet enquanto estiver aberto. Antes de abri-lo, **crie a sua conta e depois apague a linha `CODIGO_CONVITE`
  do `server\.env` e reinicie o servidor**: sem ela, cadastro e redefinição de senha ficam desativados. Feche o túnel (Ctrl+C) quando terminar.

Rode o agente com a janela aberta (para ver as mensagens):
```powershell
cd C:\elo3d\agente
node src\index.js
```
Deve aparecer `Agente ELO 3D iniciado.` sem erros.

### C4. Roteiro de testes (marque cada item)
Abra a tela **Impressora** no sistema de teste.

| # | O que fazer | O que deve acontecer |
|---|---|---|
| 1 | Impressora ociosa, agente rodando | Selo **Ociosa**, temperaturas, "atualizado há poucos segundos" |
| 2 | Inicie uma impressão pequena (~5 min) | **Aquecendo** → **Imprimindo**, nome do arquivo, barra de progresso, camada atual/total, decorrido e restante |
| 3 | Compare com a tela da impressora | Progresso, camada e temperaturas batem (pequena diferença é normal) |
| 4 | Espere terminar | Em até ~30 s aparece **uma** linha em *Histórico de impressões*, "Concluído", com a duração real |
| 5 | Compare a duração | Bate com o tempo mostrado pela impressora (±1 min) |
| 6 | Na linha do job, **Usar na calculadora** | Abre a calculadora com **horas e minutos** preenchidos e (se informado) as **gramas** |
| 7 | Preencha preço do rolo e **Depreciação da máquina** | Energia, depreciação e material usam o tempo real do job |
| 8 | **Vincular a um produto** no histórico | Aparece "Produto vinculado ao job." |
| 9 | Desligue a impressora (ou tire do Wi‑Fi) | Aviso vermelho *"A impressora não respondeu"*; o cartão fica esmaecido como **Último estado conhecido** |
| 10 | Ligue de novo | O aviso some sozinho em até ~1 min |
| 11 | Em Configurações, **mude o IP para um errado**, salve, depois volte ao certo | Dá erro de "não respondeu" e **volta ao normal sozinho**, sem mexer no notebook |
| 12 | Feche o agente (Ctrl+C) | Em ~1,5 min aparece *"Sem sinal do agente"* |
| 13 | Imprima duas vezes o mesmo arquivo em seguida | **Dois** jobs, cada um com a sua duração |

Se algo falhar, me envie: **a mensagem na tela**, o arquivo `agente\agente.log`, um novo `diagnostico-detail.json` e, se der, uma foto da tela da impressora naquele momento.

---

## Fase D: produção

Só depois de a Fase C passar inteira.

1. **Subir o código:** abrir o pull request para a `main` e fazer o merge (peça a mim).
2. **Deploy no VPS** (web console da Hostinger):
   ```bash
   cd /opt/elo3d-src && git pull && bash deploy/deploy-no-servidor.sh
   ```
   Ele cria as tabelas novas sem apagar dados.
3. No sistema de **produção**, cadastre a impressora de novo (Configurações > Impressora > Adicionar) e copie o **novo token** (o de teste não vale em produção).
4. No notebook, edite o `.env` da pasta `agente`: `ELO_API_URL=https://elo3d.wmbens.cloud` e o `ELO_AGENT_TOKEN` novo. O `FF_CHECK_CODE` continua o mesmo.
5. Instale para iniciar sozinho com o Windows (⚠️ script não testado em Windows real):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\instalar-windows.ps1
   ```
   Acompanhe em `agente\agente.log`. Se o script falhar, use o `iniciar.cmd` (janela aberta).
6. Deixe o notebook **sem suspender** na tomada (PowerShell como administrador):
   ```powershell
   powercfg /change standby-timeout-ac 0
   powercfg /change hibernate-timeout-ac 0
   ```
7. Repita rapidamente os itens 1, 2 e 4 do roteiro em produção.

---

## Fontes consultadas
- Documentação comunitária da API: https://github.com/parallel-7/flashforge-api-docs/wiki/Authentication
- Guia da comunidade para a AD5X (onde ver o código): https://revspace.nl/Flashforge_AD5X
- Guia SimplyPrint para a AD5X (modo LAN, IP e código na tela): https://simplyprint.io/setup-guide/flashforge/ad5x/client/connect
- Menu de rede do Creator 5 (modelo irmão): https://wiki.flashforge.com/en/creator-series/creator-5-series/manual/network-setup
- FAQ do Flash Maker (não conecta em modo LAN): https://www.flashforge.com/a/docs/preview/layout_1/flash-maker/faq-for-flash-maker
