// Funções puras de filamento (sem React), para poderem ser usadas e testadas fora dos componentes.
function gerarIdFilamento() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function criarFilamentoVazio() {
  return { id: gerarIdFilamento(), nome: '', precoRolo: '', pesoRolo: '', filamentoUsado: '' }
}
