# Agente ELO 3D (impressora Flashforge AD5X)

Pequeno programa que roda **no notebook** da sua rede local, consulta a impressora e envia o estado ao sistema ELO 3D.

```
 AD5X  <──(rede local, porta 8898)──  notebook (este agente)  ──(HTTPS, só de saída)──>  ELO 3D (VPS)
```

- O sistema roda na internet e **não alcança** a impressora (IP de rede local). Por isso o agente fica do lado de dentro e
  só faz chamadas **de saída**: nenhuma porta é aberta no notebook nem no roteador.
- O **checkCode da impressora fica só neste notebook** (arquivo `.env`). Ele nunca é enviado ao sistema, ao banco, à tela nem aos logs.
- Somente leitura: o agente **não** pausa, cancela, move eixos nem envia arquivos para a impressora.
- Sem dependências para instalar: precisa apenas do Node.js.

## 1. Preparar a impressora
1. No menu da impressora (Configurações / Rede), ative o modo **LAN** ("LAN Only" / modo local). Com o modo nuvem ligado, a API local
   responde "Lan mode error" e o agente mostra "modo LAN desativado". Depois de trocar o modo, **reinicie a impressora**.
2. Anote o **código de verificação** (8 caracteres, o `checkCode`) e o **número de série**. Se você gerar um código novo, o antigo para de funcionar.
3. Anote o **IP** da impressora (aparece nas informações de rede). Se o roteador mudar o IP, basta editá-lo no sistema (veja abaixo).
   O ideal é reservar o IP da impressora no roteador (reserva DHCP).

> Os nomes exatos dos menus variam conforme a versão do firmware.

## 2. Cadastrar no sistema
No ELO 3D: **Configurações > Impressora > Adicionar**. Informe nome, **IP**, **número de série** e salve. O sistema mostra o **token do agente**
**uma única vez** (copie). O IP pode ser editado a qualquer momento ali; o agente passa a usar o novo IP na consulta seguinte, sem mexer no notebook.

## 3. Instalar no notebook (Windows)
1. Instale o **Node.js LTS** (https://nodejs.org). Confirme em um terminal: `node -v` (precisa ser 20 ou mais).
2. Copie a pasta `agente` para o notebook (por exemplo `C:\elo3d\agente`).
3. Copie `.env.example` para `.env` e preencha:
   - `ELO_API_URL`: endereço do sistema (https).
   - `ELO_AGENT_TOKEN`: o token mostrado no passo 2.
   - `FF_CHECK_CODE`: o código de verificação da impressora.
4. **Teste primeiro** (mostra o que a impressora devolve e valida a configuração):
   ```
   node src\index.js --diagnostico
   ```
5. Se o diagnóstico estiver ok, instale para iniciar sozinho com o Windows:
   ```
   powershell -ExecutionPolicy Bypass -File .\instalar-windows.ps1
   ```
   O agente roda escondido, reinicia sozinho se falhar e registra tudo em `agente.log`. Para desinstalar, use `-Remover`.
6. Deixe o notebook sem suspender enquanto estiver ligado na tomada (PowerShell como administrador):
   ```
   powercfg /change standby-timeout-ac 0
   powercfg /change hibernate-timeout-ac 0
   ```
   Se for usar com a tampa fechada: `powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0` e depois `powercfg /setactive SCHEME_CURRENT`.

## Diagnóstico (validar contra a SUA impressora)
A API da Flashforge é **não oficial** e muda entre versões de firmware; os nomes de campo vêm de documentação da comunidade e foram
validados apenas com respostas de exemplo. Rode `node src\index.js --diagnostico` para ver:
- todos os campos que a sua AD5X realmente devolve em `/detail`, com o tipo de cada um;
- quais campos esperados **não** vieram (o sistema trata como "sem informação", mas me avise para ajustar);
- como o sistema interpreta o estado (e se algum `status` não é reconhecido).

Ele grava `diagnostico-detail.json` com serial, IP, MAC, códigos de registro, nome e local **ocultados**. Pode enviá-lo para validarmos.
Sem o servidor: `node src\index.js --diagnostico --ip 192.168.0.50 --serial SEU_SERIAL` (precisa só de `FF_CHECK_CODE`).

## Problemas comuns
| Mensagem no sistema | Causa | O que fazer |
|---|---|---|
| Impressora não respondeu | Desligada, IP trocado, fora da rede | Confira o IP em Configurações > Impressora e se o notebook alcança a impressora: `Test-NetConnection 192.168.0.50 -Port 8898` |
| Número de série ou checkCode incorretos | Dados errados ou código regenerado | Confira o código no menu da impressora e atualize `FF_CHECK_CODE` no `.env`; reinicie a tarefa |
| Modo LAN desativado | Impressora no modo nuvem | Ative o modo LAN e reinicie a impressora |
| Firmware incompatível | Resposta diferente da documentação | Rode o diagnóstico e envie o arquivo gerado |
| Agente sem sinal | Notebook desligado/suspenso, sem internet ou token inválido | Veja o `agente.log`; se o token foi recusado, gere outro em Configurações > Impressora |

## Como o agente consulta
O ritmo é definido pelo sistema: a cada ~7 s quando há impressão em andamento ou a tela da impressora está aberta, e a cada ~30 s quando
está ociosa e ninguém olha. Em caso de falha ele espera mais a cada tentativa (5, 10, 20, 40 e 60 s) para não sobrecarregar a impressora.
Timeout de 4 s por chamada (`FF_TIMEOUT_MS`).

## Limitações conhecidas
- **Sem ID/hora de início do job**: a API não informa. O sistema usa "arquivo + início estimado" (hora da consulta menos o tempo decorrido).
  Se o agente só vir o job já em andamento, o início é marcado como estimado.
- **Filamento é uma estimativa do fatiador**, não o consumo real. A lista de arquivos da impressora traz os gramas por ferramenta/slot; se o
  arquivo não estiver na lista, o campo fica vazio e o custo de material é manual. (Os campos `estimatedLeft*` do `/detail` não têm unidade
  documentada e **não são usados**.)
- Com o agente desligado, o estado não atualiza; jobs terminados nesse período são registrados quando o agente voltar, se a impressora ainda
  mostrar o resultado, e o tempo pode ser aproximado.
- Os fixtures dos testes são **não validados** contra hardware (veja `test/fixtures.js`).

## Trocar de marca/firmware (ex.: Moonraker)
O agente só conhece a interface `PrinterProvider` (documentada em `src/providers/provider.js`). Para usar outro firmware (por exemplo Klipper/Moonraker,
porta 7125): crie `src/providers/moonraker/index.js` com uma classe que implemente `obterSnapshot(alvo)` devolvendo o mesmo "snapshot" neutro e
registre-a em `PROVIDERS`. O servidor, a tela e a calculadora não mudam.

## Segurança
- `.env` contém segredos: não compartilhe nem coloque no Git (já está no `.gitignore`).
- O agente só envia a impressoras com IP de **rede local**; recusa endereços públicos.
- O token do agente dá acesso apenas ao envio do estado **daquela** impressora. Se vazar, gere outro em Configurações (o antigo deixa de valer).

## Testes
```
npm test
```
Usa o executor nativo do Node (`node --test`), com uma impressora falsa local. Não precisa de impressora nem de internet.
