import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarSnapshot, validarFalha, ipLocalValido, gerarToken, hashToken } from '../src/impressora/validacao.js'

const base = { estado: 'imprimindo', medidoEm: '2026-11-20T10:00:00.000Z' }
const agora = new Date('2026-11-20T10:00:30.000Z')

test('snapshot mínimo é aceito e os campos ausentes viram null (não quebra)', () => {
  const s = validarSnapshot(base, agora)
  assert.equal(s.arquivo, null)
  assert.equal(s.progresso, null)
  assert.equal(s.decorridoSeg, null)
  assert.deepEqual(s.temperaturas, { bico: null, bicoDireito: null, mesa: null, camara: null })
  assert.equal(s.filamento, null)
})

test('campos desconhecidos são descartados e tipos errados viram null', () => {
  const s = validarSnapshot({ ...base, segredo: 'x', checkCode: 'abcd1234', progresso: 'muito', camadaAtual: 'a', decorridoSeg: -5 }, agora)
  assert.equal('segredo' in s, false)
  assert.equal('checkCode' in s, false)
  assert.equal(s.progresso, null)
  assert.equal(s.camadaAtual, null)
  assert.equal(s.decorridoSeg, null)
})

test('progresso fora de 0..1 é limitado', () => {
  assert.equal(validarSnapshot({ ...base, progresso: 7 }, agora).progresso, 1)
  assert.equal(validarSnapshot({ ...base, progresso: -1 }, agora).progresso, 0)
})

test('estado inválido, data inválida ou no futuro são recusados', () => {
  assert.throws(() => validarSnapshot({ ...base, estado: 'voando' }, agora), { status: 400 })
  assert.throws(() => validarSnapshot({ ...base, medidoEm: 'ontem' }, agora), { status: 400 })
  assert.throws(() => validarSnapshot({ ...base, medidoEm: '2026-11-21T10:00:00Z' }, agora), { status: 400 })
  assert.throws(() => validarSnapshot(null, agora), { status: 400 })
  assert.throws(() => validarSnapshot([], agora), { status: 400 })
})

test('filamento: limita a 8 ferramentas e valida cor/gramas', () => {
  const ferramentas = Array.from({ length: 12 }, (_, i) => ({ ferramenta: i, material: 'PLA', cor: i === 0 ? 'vermelho' : '#00ff00', gramas: i === 1 ? -3 : 5, slot: i }))
  const f = validarSnapshot({ ...base, filamento: { gramasEstimadas: 40, ferramentas } }, agora).filamento
  assert.equal(f.ferramentas.length, 8)
  assert.equal(f.ferramentas[0].cor, null)
  assert.equal(f.ferramentas[1].gramas, null)
})

test('falha: código desconhecido vira "servico" e a mensagem é limitada', () => {
  assert.equal(validarFalha({ codigo: 'credencial', mensagem: 'x' }).codigo, 'credencial')
  assert.equal(validarFalha({ codigo: 'qualquer' }).codigo, 'servico')
  assert.equal(validarFalha({ codigo: 'offline', mensagem: 'a'.repeat(1000) }).mensagem.length, 300)
  assert.throws(() => validarFalha('oi'), { status: 400 })
})

test('IP: aceita só rede local', () => {
  for (const ok of ['192.168.0.50', '10.0.0.7', '172.16.5.5', '172.31.255.1', '169.254.1.1', '127.0.0.1']) assert.equal(ipLocalValido(ok), true, ok)
  for (const ruim of ['8.8.8.8', '172.32.0.1', '172.15.0.1', '192.169.0.1', '300.1.1.1', '192.168.0', 'impressora.local', '', null, 42, '192.168.0.1:8898', '192.168.0.1/8']) assert.equal(ipLocalValido(ruim), false, String(ruim))
})

test('token do agente: aleatório, com prefixo, e só o hash é comparável', () => {
  const a = gerarToken(), b = gerarToken()
  assert.match(a, /^elo3d_ag_[A-Za-z0-9_-]{40,}$/)
  assert.notEqual(a, b)
  assert.equal(hashToken(a), hashToken(a))
  assert.notEqual(hashToken(a), hashToken(b))
  assert.match(hashToken(a), /^[0-9a-f]{64}$/)
  assert.equal(hashToken(a).includes(a), false)
})
