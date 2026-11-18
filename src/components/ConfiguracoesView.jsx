import { useEffect, useState } from 'react'
import { AlertTriangle, Tag, Plus, X, Package, Check } from 'lucide-react'
import { getEstoqueMinimo, setEstoqueMinimo } from '../utils/config.js'
import { getCategorias, adicionarCategoria, removerCategoria } from '../utils/categorias.js'
import { useCarregar } from '../utils/useCarregar.js'
import PageHeader from './ui/PageHeader.jsx'
import Button from './ui/Button.jsx'
import Skeleton from './ui/Skeleton.jsx'
import { ErroCarregamento } from './ui/EmptyState.jsx'
import { Campo, Input } from './ui/Field.jsx'
import ImpressoraConfig from './ImpressoraConfig.jsx'
import { useToast } from './ui/Toast.jsx'

function Secao({ icone, titulo, subtitulo, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-elo-blue/10 text-elo-blue">{icone}</span>
        <div>
          <h2 className="font-display text-[15px] font-semibold text-ink-primary">{titulo}</h2>
          {subtitulo && <p className="text-xs text-ink-muted">{subtitulo}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export default function ConfiguracoesView() {
  const toast = useToast()
  const minimoReq = useCarregar(getEstoqueMinimo)
  const categoriasReq = useCarregar(getCategorias)
  const [minimo, setMinimo] = useState('5')
  const [minimoSalvo, setMinimoSalvo] = useState(null)
  const [novaCategoria, setNovaCategoria] = useState('')

  useEffect(() => {
    if (minimoReq.dados !== null) {
      setMinimo(String(minimoReq.dados))
      setMinimoSalvo(minimoReq.dados)
    }
  }, [minimoReq.dados])

  const minimoNumero = parseInt(minimo, 10)
  const minimoValido = !isNaN(minimoNumero) && minimoNumero >= 0
  const alterado = minimoValido && minimoNumero !== minimoSalvo

  async function salvarMinimo(e) {
    e.preventDefault()
    if (!alterado) return
    try {
      await setEstoqueMinimo(minimoNumero)
      setMinimoSalvo(minimoNumero)
      toast.sucesso('Estoque mínimo salvo.')
    } catch (err) {
      toast.erro(err.message || 'Não foi possível salvar.')
    }
  }

  async function adicionar(e) {
    e.preventDefault()
    if (!novaCategoria.trim()) return
    try {
      categoriasReq.setDados(await adicionarCategoria(novaCategoria))
      setNovaCategoria('')
    } catch (err) {
      toast.erro(err.message || 'Não foi possível adicionar a categoria.')
    }
  }

  async function remover(nome) {
    try {
      categoriasReq.setDados(await removerCategoria(nome))
    } catch (err) {
      toast.erro(err.message || 'Não foi possível remover a categoria.')
    }
  }

  const categorias = categoriasReq.dados ?? []

  return (
    <div className="animate-fade-in">
      <PageHeader titulo="Configurações" subtitulo="Preferências gerais do sistema." />

      <div className="flex max-w-xl flex-col gap-6">
        <Secao icone={<Package size={18} />} titulo="Estoque" subtitulo="Quando o sistema deve avisar que um produto está acabando">
          {minimoReq.carregando && minimoReq.dados === null ? (
            <Skeleton className="h-20" />
          ) : minimoReq.erro && minimoReq.dados === null ? (
            <ErroCarregamento erro={minimoReq.erro} onTentar={minimoReq.recarregar} />
          ) : (
            <form onSubmit={salvarMinimo} className="flex flex-col gap-3">
              <Campo
                rotulo="Alertar quando o estoque de um produto for igual ou menor que"
                dica="Os produtos nesse nível aparecem com aviso de estoque baixo."
              >
                <div className="flex items-center gap-2">
                  <Input className="!w-28" inputMode="numeric" sufixo="un." value={minimo} onChange={(e) => setMinimo(e.target.value.replace(/[^0-9]/g, ''))} />
                  <Button type="submit" variante={alterado ? 'primary' : 'secondary'} icone={alterado ? undefined : Check} disabled={!alterado}>
                    {alterado ? 'Salvar' : 'Salvo'}
                  </Button>
                </div>
              </Campo>
              {!minimoValido && (
                <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                  <AlertTriangle size={13} /> Informe um número de 0 em diante.
                </p>
              )}
            </form>
          )}
        </Secao>

        <Secao icone={<Tag size={18} />} titulo="Categorias" subtitulo="Organize produtos de nichos diferentes">
          <form onSubmit={adicionar} className="flex items-center gap-2">
            <Input aria-label="Nova categoria" value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Ex: Chaveiros, Miniaturas, Decoração..." />
            <Button type="submit" variante="primary" icone={Plus} disabled={!novaCategoria.trim()}>
              Adicionar
            </Button>
          </form>

          {categoriasReq.carregando && !categoriasReq.dados ? (
            <Skeleton className="mt-4 h-10" />
          ) : categoriasReq.erro && !categoriasReq.dados ? (
            <div className="mt-4">
              <ErroCarregamento erro={categoriasReq.erro} onTentar={categoriasReq.recarregar} />
            </div>
          ) : categorias.length === 0 ? (
            <p className="mt-4 text-xs text-ink-muted">Nenhuma categoria cadastrada ainda.</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {categorias.map((c) => (
                <li key={c} className="flex items-center gap-1 rounded-full border border-elo-border bg-surface-subtle py-1 pl-3.5 pr-1.5 text-[13px] font-medium text-ink-secondary">
                  {c}
                  <button
                    type="button"
                    onClick={() => remover(c)}
                    aria-label={`Remover categoria ${c}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <ImpressoraConfig />
      </div>
    </div>
  )
}
