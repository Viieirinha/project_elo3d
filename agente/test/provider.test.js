import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ProviderFlashforge } from '../src/providers/flashforge/index.js'
import { iniciarImpressoraFalsa } from './helpers.js'
import { CHECK_CODE, SERIAL, detalheOciosa, detalheImprimindo, listaDeArquivos, ok } from './fixtures.js'

const alvoDe = (porta) => ({ ip: '127.0.0.1', porta, numeroSerie: SERIAL })

test('imprimindo: o snapshot traz o filamento do arquivo (buscado em /gcodeList)', async () => {
  const imp = await iniciarImpressoraFalsa(({ caminho }) => ({ json: caminho === '/detail' ? ok({ detail: detalheImprimindo }) : ok({ gcodeListDetail: listaDeArquivos }) }))
  try {
    const p = new ProviderFlashforge({ checkCode: CHECK_CODE, timeoutMs: 500 })
    const s = await p.obterSnapshot(alvoDe(imp.porta))
    assert.equal(s.estado, 'imprimindo')
    assert.equal(s.filamento.gramasEstimadas, 31.7)
    assert.equal(s.filamento.ferramentas.length, 2)
  } finally { await imp.fechar() }
})

test('ociosa: não consulta a lista de arquivos (evita sobrecarregar a impressora)', async () => {
  const imp = await iniciarImpressoraFalsa(() => ({ json: ok({ detail: detalheOciosa }) }))
  try {
    const p = new ProviderFlashforge({ checkCode: CHECK_CODE, timeoutMs: 500 })
    const s = await p.obterSnapshot(alvoDe(imp.porta))
    assert.equal(s.filamento, null)
    assert.deepEqual(imp.requisicoes.map((r) => r.caminho), ['/detail'])
  } finally { await imp.fechar() }
})

test('o filamento é buscado uma vez por arquivo (cache), não a cada consulta', async () => {
  const imp = await iniciarImpressoraFalsa(({ caminho }) => ({ json: caminho === '/detail' ? ok({ detail: detalheImprimindo }) : ok({ gcodeListDetail: listaDeArquivos }) }))
  try {
    const p = new ProviderFlashforge({ checkCode: CHECK_CODE, timeoutMs: 500 })
    for (let i = 0; i < 5; i++) await p.obterSnapshot(alvoDe(imp.porta))
    assert.equal(imp.requisicoes.filter((r) => r.caminho === '/gcodeList').length, 1)
    assert.equal(imp.requisicoes.filter((r) => r.caminho === '/detail').length, 5)
  } finally { await imp.fechar() }
})

test('LISTA DE ARQUIVOS INDISPONÍVEL: o estado continua funcionando e o filamento fica null (manual)', async () => {
  const imp = await iniciarImpressoraFalsa(({ caminho }) => (caminho === '/detail' ? { json: ok({ detail: detalheImprimindo }) } : { status: 500, texto: 'erro' }))
  try {
    const p = new ProviderFlashforge({ checkCode: CHECK_CODE, timeoutMs: 500 })
    const s = await p.obterSnapshot(alvoDe(imp.porta))
    assert.equal(s.estado, 'imprimindo')
    assert.equal(s.filamento, null)
  } finally { await imp.fechar() }
})

test('tenta a lista de arquivos no máximo 3 vezes por arquivo, com espera entre as tentativas', async () => {
  let agora = 1_000_000
  const imp = await iniciarImpressoraFalsa(({ caminho }) => (caminho === '/detail' ? { json: ok({ detail: detalheImprimindo }) } : { json: ok({ gcodeListDetail: [] }) }))
  try {
    const p = new ProviderFlashforge({ checkCode: CHECK_CODE, timeoutMs: 500, agora: () => agora })
    for (let i = 0; i < 10; i++) { await p.obterSnapshot(alvoDe(imp.porta)); agora += 31_000 }
    assert.equal(imp.requisicoes.filter((r) => r.caminho === '/gcodeList').length, 3)
  } finally { await imp.fechar() }
})
