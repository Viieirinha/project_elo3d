import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ClienteFlashforge } from '../src/providers/flashforge/cliente.js'
import { ErroImpressora } from '../src/providers/flashforge/erros.js'
import { iniciarImpressoraFalsa, portaFechada } from './helpers.js'
import { CHECK_CODE, SERIAL, detalheImprimindo, ok } from './fixtures.js'

const alvoDe = (porta) => ({ ip: '127.0.0.1', porta, numeroSerie: SERIAL })
const cliente = (extra = {}) => new ClienteFlashforge({ checkCode: CHECK_CODE, timeoutMs: 400, ...extra })

async function comImpressora(resposta, fn) {
  const imp = await iniciarImpressoraFalsa(resposta)
  try { return await fn(imp) } finally { await imp.fechar() }
}
async function erroDe(promessa) {
  try { await promessa } catch (e) { return e }
  assert.fail('deveria ter falhado')
}

test('/detail com sucesso devolve o estado e envia serialNumber + checkCode no corpo', async () => {
  await comImpressora(() => ({ json: ok({ detail: detalheImprimindo }) }), async (imp) => {
    const d = await cliente().detalhe(alvoDe(imp.porta))
    assert.equal(d.status, 'printing')
    assert.equal(imp.requisicoes[0].caminho, '/detail')
    assert.equal(imp.requisicoes[0].metodo, 'POST')
    assert.deepEqual(imp.requisicoes[0].corpo, { serialNumber: SERIAL, checkCode: CHECK_CODE })
  })
})

test('CREDENCIAL INVÁLIDA (code 1) -> erro "credencial", sem vazar o checkCode', async () => {
  await comImpressora(() => ({ json: { code: 1, message: 'Access code is different' } }), async (imp) => {
    const e = await erroDe(cliente().detalhe(alvoDe(imp.porta)))
    assert.ok(e instanceof ErroImpressora)
    assert.equal(e.codigo, 'credencial')
    assert.match(e.message, /checkCode incorretos/)
    assert.equal(e.message.includes(CHECK_CODE), false)
  })
})

test('modo LAN desativado (code -2) -> erro "lan" com instrução', async () => {
  await comImpressora(() => ({ json: { code: -2, message: 'Lan mode error' } }), async (imp) => {
    const e = await erroDe(cliente().detalhe(alvoDe(imp.porta)))
    assert.equal(e.codigo, 'lan')
    assert.match(e.message, /LAN Only/)
  })
})

test('parâmetros recusados (code -1) e código desconhecido -> "firmware"', async () => {
  for (const code of [-1, 99, 'x']) {
    await comImpressora(() => ({ json: { code, message: 'qualquer' } }), async (imp) => {
      assert.equal((await erroDe(cliente().detalhe(alvoDe(imp.porta)))).codigo, 'firmware', String(code))
    })
  }
})

test('resposta que não é JSON, JSON de outro formato, HTTP 500 e "detail" ausente -> "firmware"', async () => {
  const casos = [{ texto: '<html>erro</html>' }, { texto: '[1,2]' }, { texto: 'null' }, { status: 500, json: {} }, { json: ok({}) }, { json: ok({ detail: 'texto' }) }, { json: ok({ detail: [1] }) }]
  for (const c of casos) {
    await comImpressora(() => c, async (imp) => {
      const e = await erroDe(cliente().detalhe(alvoDe(imp.porta)))
      assert.equal(e.codigo, 'firmware', JSON.stringify(c))
    })
  }
})

test('IMPRESSORA OFFLINE: conexão recusada -> erro "offline" (não lança outra coisa)', async () => {
  const porta = await portaFechada()
  const e = await erroDe(cliente().detalhe(alvoDe(porta)))
  assert.equal(e.codigo, 'offline')
  assert.match(e.message, /não respondeu/)
  assert.equal(e.message.includes(CHECK_CODE), false)
})

test('IMPRESSORA TRAVADA: sem resposta dentro do tempo limite -> "offline" rápido', async () => {
  await comImpressora(() => ({ semResposta: true }), async (imp) => {
    const t0 = Date.now()
    const e = await erroDe(cliente({ timeoutMs: 250 }).detalhe(alvoDe(imp.porta)))
    assert.equal(e.codigo, 'offline')
    assert.ok(Date.now() - t0 < 1500, 'respeitou o timeout curto')
  })
})

test('IP público ou inválido nunca é consultado (o checkCode não sai da rede local)', async () => {
  let chamou = false
  const c = new ClienteFlashforge({ checkCode: CHECK_CODE, fetchImpl: async () => { chamou = true } })
  for (const ip of ['8.8.8.8', 'exemplo.com', '', undefined]) {
    const e = await erroDe(c.detalhe({ ip, porta: 8898, numeroSerie: SERIAL }))
    assert.equal(e.codigo, 'offline')
  }
  assert.equal(chamou, false)
})

test('lista de arquivos: devolve as entradas; resposta sem lista vira vazio', async () => {
  await comImpressora(({ caminho }) => ({ json: ok({ gcodeListDetail: [{ gcodeFileName: 'a.gcode' }] }) }), async (imp) => {
    assert.equal((await cliente().listaDeArquivos(alvoDe(imp.porta))).length, 1)
    assert.equal(imp.requisicoes[0].caminho, '/gcodeList')
  })
  await comImpressora(() => ({ json: ok({}) }), async (imp) => {
    assert.deepEqual(await cliente().listaDeArquivos(alvoDe(imp.porta)), [])
  })
})
