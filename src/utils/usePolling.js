import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Consulta periódica MODERADA: só roda enquanto a tela está aberta e a aba visível, nunca sobrepõe duas consultas e
 * recua (2x, 4x, 8x, até 30 s) quando há erros. Ao voltar para a aba, atualiza na hora.
 * `chave` reinicia tudo (ex.: trocou a impressora selecionada).
 */
export function usePolling(buscar, { intervaloMs = 7000, ativo = true, chave = null } = {}) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const buscarRef = useRef(buscar)
  buscarRef.current = buscar
  const agoraRef = useRef(() => {})

  useEffect(() => {
    setDados(null)
    setErro(null)
    setCarregando(true)
    if (!ativo) return undefined
    let parar = false
    let timer = null
    let falhas = 0

    async function ciclo() {
      clearTimeout(timer)
      if (parar) return
      if (document.visibilityState === 'hidden') {
        timer = setTimeout(ciclo, intervaloMs) // aba escondida: não consulta, só reagenda
        return
      }
      try {
        const resultado = await buscarRef.current()
        if (!parar) {
          setDados(resultado)
          setErro(null)
        }
        falhas = 0
      } catch (e) {
        falhas += 1
        if (!parar) setErro(e.message || 'Erro ao consultar.')
      } finally {
        if (!parar) setCarregando(false)
      }
      if (!parar) timer = setTimeout(ciclo, Math.min(30_000, intervaloMs * 2 ** Math.min(falhas, 3)))
    }

    agoraRef.current = ciclo
    const aoVoltar = () => document.visibilityState === 'visible' && ciclo()
    document.addEventListener('visibilitychange', aoVoltar)
    ciclo()
    return () => {
      parar = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [intervaloMs, ativo, chave])

  const recarregar = useCallback(() => agoraRef.current(), [])
  return { dados, erro, carregando, recarregar }
}
