import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Carrega dados de uma função assíncrona com estados de carregando/erro e "tentar de novo".
 * `setDados` permite atualizar o resultado localmente depois de uma ação (ex.: a API devolve a lista nova).
 */
export function useCarregar(buscar, inicial = null) {
  const [dados, setDados] = useState(inicial)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const buscarRef = useRef(buscar)
  buscarRef.current = buscar
  const montado = useRef(true)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const resultado = await buscarRef.current()
      if (montado.current) setDados(resultado)
    } catch (e) {
      if (montado.current) setErro(e.message || 'Erro ao carregar.')
    } finally {
      if (montado.current) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    montado.current = true
    recarregar()
    return () => {
      montado.current = false
    }
  }, [recarregar])

  return { dados, setDados, carregando, erro, recarregar }
}
