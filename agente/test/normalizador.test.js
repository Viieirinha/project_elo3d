import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizarDetalhe, normalizarEstado, extrairFilamento } from '../src/providers/flashforge/normalizador.js'
import { detalheOciosa, detalheImprimindo, detalheConcluida, listaDeArquivos } from './fixtures.js'

const MEDIDO = '2026-11-20T10:00:00.000Z'

test('imprimindo: converte progresso, camadas, tempos e temperaturas', () => {
  const s = normalizarDetalhe(detalheImprimindo, MEDIDO)
  assert.equal(s.estado, 'imprimindo')
  assert.equal(s.estadoBruto, 'printing')
  assert.equal(s.arquivo, 'suporte_celular.gcode')
  assert.equal(s.progresso, 0.21)
  assert.equal(s.camadaAtual, 42)
  assert.equal(s.camadaTotal, 200)
  assert.equal(s.decorridoSeg, 1260)
  assert.equal(s.restanteSeg, 4740)
  assert.deepEqual(s.temperaturas.bico, { atual: 219.8, alvo: 220 })
  assert.deepEqual(s.temperaturas.mesa, { atual: 60, alvo: 60 })
  assert.equal(s.temperaturas.camara, null) // câmara zerada = sem sensor
  assert.equal(s.temperaturas.bicoDireito, null)
  assert.equal(s.medidoEm, MEDIDO)
})

test('ociosa e concluída', () => {
  const o = normalizarDetalhe(detalheOciosa, MEDIDO)
  assert.equal(o.estado, 'ociosa')
  assert.equal(o.arquivo, null)
  assert.equal(o.codigoErro, null)
  assert.equal(normalizarDetalhe(detalheConcluida, MEDIDO).estado, 'concluida')
})

test('todos os status documentados para a AD5X são mapeados', () => {
  const esperado = { ready: 'ociosa', completed: 'concluida', printing: 'imprimindo', pausing: 'imprimindo', heating: 'aquecendo', pause: 'pausada', canceling: 'cancelando', cancel: 'cancelada', error: 'erro', busy: 'ocupada', calibrate_doing: 'ocupada', downloading: 'ocupada' }
  for (const [bruto, estado] of Object.entries(esperado)) assert.equal(normalizarEstado(bruto).estado, estado, bruto)
  assert.equal(normalizarEstado('PRINTING').estado, 'imprimindo', 'não diferencia maiúsculas')
})

test('STATUS DESCONHECIDO não quebra: vira "desconhecido" e guarda o texto original', () => {
  const e = normalizarEstado('modo_novo_do_firmware')
  assert.equal(e.estado, 'desconhecido')
  assert.equal(e.estadoBruto, 'modo_novo_do_firmware')
  assert.equal(normalizarEstado(undefined).estado, 'desconhecido')
  assert.equal(normalizarEstado(42).estado, 'desconhecido')
})

test('CAMPOS AUSENTES: objeto vazio não lança e tudo vira null', () => {
  const s = normalizarDetalhe({}, MEDIDO)
  assert.equal(s.estado, 'desconhecido')
  for (const k of ['arquivo', 'progresso', 'camadaAtual', 'camadaTotal', 'decorridoSeg', 'restanteSeg', 'codigoErro', 'filamento']) assert.equal(s[k], null, k)
  assert.deepEqual(s.temperaturas, { bico: null, bicoDireito: null, mesa: null, camara: null })
})

test('tipos errados (texto no lugar de número, null, objeto) viram null sem quebrar', () => {
  const s = normalizarDetalhe({ status: 'printing', printProgress: 'metade', printLayer: null, printDuration: '120', estimatedTime: {}, leftTemp: 'quente', printFileName: 123, errorCode: 5 }, MEDIDO)
  assert.equal(s.progresso, null)
  assert.equal(s.camadaAtual, null)
  assert.equal(s.decorridoSeg, null)
  assert.equal(s.restanteSeg, null)
  assert.equal(s.temperaturas.bico, null)
  assert.equal(s.arquivo, null)
  assert.equal(s.estado, 'imprimindo')
})

test('valores negativos e infinitos são descartados; progresso é limitado a 0..1', () => {
  const s = normalizarDetalhe({ status: 'printing', printDuration: -5, estimatedTime: Infinity, printProgress: -0.3 }, MEDIDO)
  assert.equal(s.decorridoSeg, null)
  assert.equal(s.restanteSeg, null)
  assert.equal(s.progresso, 0)
})

test('defesa de firmware: progresso de 1 a 100 é tratado como porcentagem', () => {
  assert.equal(normalizarDetalhe({ status: 'printing', printProgress: 45 }, MEDIDO).progresso, 0.45)
  assert.equal(normalizarDetalhe({ status: 'printing', printProgress: 1 }, MEDIDO).progresso, 1)
  assert.equal(normalizarDetalhe({ status: 'printing', printProgress: 250 }, MEDIDO).progresso, 1)
})

test('código de erro: "0" e vazio não contam; um código real sim', () => {
  assert.equal(normalizarDetalhe({ status: 'error', errorCode: '0' }, MEDIDO).codigoErro, null)
  assert.equal(normalizarDetalhe({ status: 'error', errorCode: 'E0042' }, MEDIDO).codigoErro, 'E0042')
})

test('o snapshot não carrega dados sensíveis do /detail (série, MAC, IP, códigos de registro, câmera)', () => {
  const texto = JSON.stringify(normalizarDetalhe(detalheImprimindo, MEDIDO))
  for (const segredo of ['aa:bb:cc', 'REGISTRO-SECRETO', 'POLAR-SECRETO', '192.168.0.50', 'action=stream', 'AD5X da oficina']) assert.equal(texto.includes(segredo), false, segredo)
})

test('filamento por job: encontra o arquivo e traz total e ferramentas (cor/material/slot)', () => {
  const f = extrairFilamento(listaDeArquivos, 'suporte_celular.gcode')
  assert.equal(f.gramasEstimadas, 31.7)
  assert.equal(f.ferramentas.length, 2)
  assert.deepEqual(f.ferramentas[0], { ferramenta: 0, material: 'PLA', cor: '#ff0000', gramas: 20.5, slot: 1 })
  assert.equal(f.ferramentas[1].slot, 3)
})

test('filamento: slotId 0 vira null; arquivo por nome base e sem diferenciar maiúsculas', () => {
  assert.equal(extrairFilamento(listaDeArquivos, 'OUTRA_PECA.GCODE').ferramentas[0].slot, null)
  assert.equal(extrairFilamento(listaDeArquivos, '/data/pasta/suporte_celular.gcode').gramasEstimadas, 31.7)
})

test('filamento: arquivo fora da lista, lista inválida ou entradas quebradas -> null (custo fica manual)', () => {
  assert.equal(extrairFilamento(listaDeArquivos, 'nao_existe.gcode'), null)
  for (const ruim of [null, undefined, 'x', {}, [null, 5, {}], [{ gcodeFileName: 'a.gcode' }]]) assert.equal(extrairFilamento(ruim, 'a.gcode'), null)
  assert.equal(extrairFilamento(listaDeArquivos, null), null)
  assert.equal(extrairFilamento(listaDeArquivos, ''), null)
})

test('filamento: sem total, soma as ferramentas; cor inválida vira null', () => {
  const lista = [{ gcodeFileName: 'x.gcode', gcodeToolDatas: [{ toolId: 0, materialName: 'PLA', materialColor: 'azul', filamentWeight: 3 }, { toolId: 1, filamentWeight: 4.5 }] }]
  const f = extrairFilamento(lista, 'x.gcode')
  assert.equal(f.gramasEstimadas, 7.5)
  assert.equal(f.ferramentas[0].cor, null)
})
