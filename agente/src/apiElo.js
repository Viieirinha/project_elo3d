// Cliente do servidor ELO 3D (o agente só faz chamadas de SAÍDA: nenhuma porta é aberta no notebook).
export class ErroServidor extends Error {
  constructor(status, mensagem, codigo = null) {
    super(mensagem)
    this.name = 'ErroServidor'
    this.status = status // 0 = sem conexão
    this.codigo = codigo
  }
}

export function criarApiElo({ url, token, timeoutMs = 8000, fetchImpl = fetch }) {
  async function chamar(metodo, caminho, corpo) {
    const controle = new AbortController()
    const temporizador = setTimeout(() => controle.abort(), timeoutMs)
    let resposta
    try {
      resposta = await fetchImpl(`${url}${caminho}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: controle.signal,
      })
    } catch {
      throw new ErroServidor(0, 'Sem conexão com o servidor ELO 3D.')
    } finally {
      clearTimeout(temporizador)
    }
    const dados = await resposta.json().catch(() => ({}))
    if (!resposta.ok) throw new ErroServidor(resposta.status, dados.message || `Erro do servidor (HTTP ${resposta.status}).`, dados.code ?? null)
    return dados
  }

  return {
    obterConfig: () => chamar('GET', '/api/agente/config'),
    enviarSnapshot: (snapshot) => chamar('POST', '/api/agente/estado', { snapshot }),
    enviarFalha: (falha) => chamar('POST', '/api/agente/estado', { falha }),
  }
}
