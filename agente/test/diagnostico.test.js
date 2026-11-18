import { test } from 'node:test'
import assert from 'node:assert/strict'
import { montarRelatorio, ocultarSensiveis } from '../src/diagnostico.js'
import { detalheImprimindo } from './fixtures.js'

test('o arquivo do diagnóstico oculta serial, MAC, IP, códigos de registro, câmera, nome e local', () => {
  const r = montarRelatorio(detalheImprimindo)
  const texto = JSON.stringify(r.arquivo)
  for (const segredo of ['aa:bb:cc', 'REGISTRO-SECRETO', 'POLAR-SECRETO', '192.168.0.50', 'action=stream', 'AD5X da oficina', 'Brasilia']) assert.equal(texto.includes(segredo), false, segredo)
  assert.equal(r.arquivo.status, 'printing') // o que importa para validar continua visível
  assert.equal(r.arquivo.printProgress, 0.21)
})

test('o relatório em texto também não mostra valores sensíveis', () => {
  const t = montarRelatorio(detalheImprimindo).texto
  for (const segredo of ['aa:bb:cc', 'REGISTRO-SECRETO', 'POLAR-SECRETO', 'action=stream']) assert.equal(t.includes(segredo), false, segredo)
  assert.match(t, /\(valor oculto\)/)
})

test('aponta os campos esperados que a impressora NÃO enviou (firmware diferente)', () => {
  const { printProgress, printDuration, ...incompleto } = detalheImprimindo
  const r = montarRelatorio(incompleto)
  assert.deepEqual(r.ausentes.sort(), ['printDuration', 'printProgress'])
  assert.match(r.texto, /NÃO vieram: printDuration, printProgress|NÃO vieram: printProgress, printDuration/)
})

test('status não mapeado é sinalizado no relatório', () => {
  const r = montarRelatorio({ ...detalheImprimindo, status: 'novo_estado' })
  assert.equal(r.normalizado.estado, 'desconhecido')
  assert.match(r.texto, /não mapeado/)
})

test('ocultarSensiveis percorre listas e objetos aninhados', () => {
  const r = ocultarSensiveis({ a: [{ macAddr: 'x', ok: 1 }], b: { serialNumber: 'y', n: 2 } })
  assert.deepEqual(r, { a: [{ macAddr: '<oculto>', ok: 1 }], b: { serialNumber: '<oculto>', n: 2 } })
})
