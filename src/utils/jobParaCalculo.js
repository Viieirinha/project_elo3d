// Leva um job de impressão (vindo da impressora) para os campos da calculadora.
// Funções puras: recebem o formulário atual e devolvem o novo, sem tocar em React.
import { criarFilamentoVazio } from './filamento.js'

/** Segundos -> { horas, minutos } (minutos arredondados; um job curto nunca vira 0 min). */
export function duracaoParaHorasMinutos(segundos) {
  const total = Math.max(0, Math.round(Number(segundos) || 0))
  let minutos = Math.round(total / 60)
  if (minutos === 0 && total > 0) minutos = 1
  return { horas: Math.floor(minutos / 60), minutos: minutos % 60 }
}

const gramasParaTexto = (g) => String(Math.round(g * 10) / 10).replace('.', ',')

/**
 * Preenche o tempo de impressão REAL (usado em energia e depreciação) e, se a impressora informou, as gramas de
 * filamento (estimadas pelo fatiador). O job é uma impressão de UMA execução: a calculadora volta para "Peça única".
 *
 * @returns {{ form: object, avisos: string[] }}
 */
export function aplicarJobNoForm(form, job) {
  const avisos = []
  const { horas, minutos } = duracaoParaHorasMinutos(job.duracaoSegundos)
  const novo = { ...form, modoPartes: false, quantidadePecas: '1', horas: String(horas), minutos: String(minutos) }

  const ferramentas = (Array.isArray(job.materiais) ? job.materiais : []).filter((f) => Number.isFinite(f?.gramas) && f.gramas > 0)
  const total = Number(job.gramasEstimadas)
  let filamentos = form.filamentos.map((f) => ({ ...f }))

  if (ferramentas.length > 0) {
    while (filamentos.length < ferramentas.length) filamentos.push(criarFilamentoVazio())
    filamentos = filamentos.map((f, i) => {
      const ferramenta = ferramentas[i]
      if (!ferramenta) return { ...f, filamentoUsado: '' } // sobra de impressão anterior: zera para não somar à toa
      return { ...f, filamentoUsado: gramasParaTexto(ferramenta.gramas), nome: f.nome || [ferramenta.material].filter(Boolean).join(' ') }
    })
    novo.filamentos = filamentos
    avisos.push('Gramas de filamento são estimativas do fatiador (não o consumo medido). Informe o preço do rolo para calcular o material.')
  } else if (Number.isFinite(total) && total > 0) {
    filamentos[0] = { ...filamentos[0], filamentoUsado: gramasParaTexto(total) }
    for (let i = 1; i < filamentos.length; i++) filamentos[i] = { ...filamentos[i], filamentoUsado: '' }
    novo.filamentos = filamentos
    avisos.push('Gramas de filamento são estimativas do fatiador (não o consumo medido).')
  } else {
    avisos.push('A impressora não informou o filamento deste arquivo: informe as gramas manualmente.')
  }
  if (job.inicioEstimado) avisos.push('O início deste job foi estimado (o sistema o viu já em andamento), então a duração pode ser aproximada.')
  return { form: novo, avisos }
}

/** "1 h 28 min", "42 min", "35 s". */
export function formatarDuracao(segundos) {
  const s = Math.max(0, Math.round(Number(segundos) || 0))
  if (s < 60) return `${s} s`
  const { horas, minutos } = duracaoParaHorasMinutos(s)
  return horas > 0 ? `${horas} h${minutos ? ` ${minutos} min` : ''}` : `${minutos} min`
}
