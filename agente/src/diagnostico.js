// Diagnóstico: consulta a impressora UMA vez e mostra o que a API realmente devolve, para validar os nomes de campo
// da documentação comunitária contra o seu firmware. Grava um arquivo com os valores sensíveis ocultados.
import { normalizarDetalhe } from './providers/flashforge/normalizador.js'

const CAMPOS_ESPERADOS = ['status', 'printFileName', 'printProgress', 'printDuration', 'printLayer', 'targetPrintLayer', 'estimatedTime', 'leftTemp', 'leftTargetTemp', 'platTemp', 'platTargetTemp']
// Campos que identificam a sua impressora/rede: ocultados no arquivo gerado.
const SENSIVEIS = ['serialNumber', 'checkCode', 'macAddr', 'ipAddr', 'flashRegisterCode', 'polarRegisterCode', 'cameraStreamUrl', 'location', 'name', 'printFileThumbUrl']

const tipoDe = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

export function ocultarSensiveis(valor) {
  if (Array.isArray(valor)) return valor.map(ocultarSensiveis)
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, SENSIVEIS.includes(k) ? '<oculto>' : ocultarSensiveis(v)]))
  }
  return valor
}

export function montarRelatorio(detalhe, medidoEm = new Date().toISOString()) {
  const chaves = Object.keys(detalhe).sort()
  const ausentes = CAMPOS_ESPERADOS.filter((c) => !(c in detalhe))
  const normalizado = normalizarDetalhe(detalhe, medidoEm)
  const linhas = [
    `Campos recebidos em /detail (${chaves.length}):`,
    ...chaves.map((k) => `  ${k}: ${tipoDe(detalhe[k])}${SENSIVEIS.includes(k) ? '  (valor oculto)' : typeof detalhe[k] !== 'object' ? `  = ${JSON.stringify(detalhe[k])}` : ''}`),
    '',
    ausentes.length ? `ATENÇÃO: campos esperados que NÃO vieram: ${ausentes.join(', ')}` : 'Todos os campos esperados vieram.',
    `Estado reconhecido: "${normalizado.estadoBruto}" -> ${normalizado.estado}${normalizado.estado === 'desconhecido' ? '  (status não mapeado: envie este relatório)' : ''}`,
    '',
    'Como o sistema interpreta:',
    JSON.stringify(normalizado, null, 2),
  ]
  return { texto: linhas.join('\n'), ausentes, normalizado, arquivo: ocultarSensiveis(detalhe) }
}
