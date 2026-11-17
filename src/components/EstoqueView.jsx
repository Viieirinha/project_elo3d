import { useMemo, useState } from 'react'
import { Package, Trash2, Pencil, AlertTriangle, ArrowDownCircle, Search, Ruler, Boxes } from 'lucide-react'
import { formatBRL, formatNumber } from '../utils/format.js'
import { formatarMedidas } from '../utils/medidas.js'
import { getProdutos, removerProduto, registrarMovimentacao, atualizarProduto } from '../utils/estoque.js'
import { getEstoqueMinimo } from '../utils/config.js'
import { getCategorias } from '../utils/categorias.js'
import { useCarregar } from '../utils/useCarregar.js'
import EntradaEstoqueModal from './EntradaEstoqueModal.jsx'
import EditarProdutoModal from './EditarProdutoModal.jsx'
import ConfirmDialog from './ui/ConfirmDialog.jsx'
import PageHeader from './ui/PageHeader.jsx'
import Button, { IconButton } from './ui/Button.jsx'
import Badge from './ui/Badge.jsx'
import EmptyState, { ErroCarregamento } from './ui/EmptyState.jsx'
import { SkeletonCards } from './ui/Skeleton.jsx'
import { Input, Select } from './ui/Field.jsx'
import { useToast } from './ui/Toast.jsx'

// Foto do produto; sem foto (ou se a imagem falhar) mostra a inicial do nome sobre um fundo suave.
function FotoProduto({ produto }) {
  const [falhou, setFalhou] = useState(false)
  if (produto.foto && !falhou) {
    return <img src={produto.foto} alt={produto.nome} loading="lazy" onError={() => setFalhou(true)} className="h-full w-full object-cover" />
  }
  return (
    <div aria-hidden="true" className="flex h-full items-center justify-center bg-gradient-to-br from-elo-blue/12 via-transparent to-elo-magenta/12">
      <span className="font-display text-5xl font-semibold text-elo-blue/40">{produto.nome.trim()[0]?.toUpperCase() ?? '?'}</span>
    </div>
  )
}

// Botões de ação: sempre visíveis no toque; em telas com mouse, aparecem ao passar/focar.
const ACOES_VISIVEIS =
  'transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:!opacity-100'

export default function EstoqueView() {
  const toast = useToast()
  const { dados: produtos, setDados: setProdutos, carregando, erro, recarregar } = useCarregar(() => getProdutos())
  const { dados: categorias } = useCarregar(getCategorias)
  const { dados: estoqueMinimo } = useCarregar(getEstoqueMinimo)
  const [entradaAberta, setEntradaAberta] = useState(false)
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null)
  const [produtoParaEditar, setProdutoParaEditar] = useState(null)
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  const minimo = estoqueMinimo ?? 5
  const lista = produtos ?? []

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return lista.filter((p) => {
      if (termo && !p.nome.toLowerCase().includes(termo)) return false
      if (categoriaFiltro && (p.categoria?.trim() || 'Sem categoria') !== categoriaFiltro) return false
      return true
    })
  }, [lista, busca, categoriaFiltro])

  // Ações da tela: avisam o resultado por toast. Com `propagar`, o erro sobe para o formulário
  // (que o mostra dentro da própria janela) em vez de virar toast.
  async function executar(acao, sucesso, { propagar = false } = {}) {
    try {
      await acao()
      toast.sucesso(sucesso)
    } catch (e) {
      if (propagar) throw e
      toast.erro(e.message || 'Não foi possível concluir a ação.')
    }
  }

  const handleExcluir = () =>
    executar(async () => {
      setProdutos(await removerProduto(produtoParaExcluir.id))
      setProdutoParaExcluir(null)
    }, 'Produto excluído.')

  const handleSalvarEdicao = (dados) =>
    executar(
      async () => {
        setProdutos(await atualizarProduto(produtoParaEditar.id, dados))
        setProdutoParaEditar(null)
      },
      'Produto atualizado.',
      { propagar: true }
    )

  const handleEntrada = ({ produtoId, quantidade, motivo }) =>
    executar(async () => {
      const { produtos: novos } = await registrarMovimentacao({ produtoId, tipo: 'entrada', quantidade, motivo })
      setProdutos(novos)
      setEntradaAberta(false)
    }, 'Entrada registrada.')

  const totalUnidades = lista.reduce((acc, p) => acc + p.quantidade, 0)
  const baixos = lista.filter((p) => p.quantidade <= minimo)

  return (
    <div className="animate-fade-in">
      <PageHeader
        titulo="Estoque"
        subtitulo={
          carregando
            ? 'Carregando produtos...'
            : lista.length === 0
              ? 'Nenhum produto registrado ainda.'
              : `${lista.length} produto(s) · ${totalUnidades} unidade(s) no total`
        }
        acoes={
          <Button variante="primary" icone={ArrowDownCircle} onClick={() => setEntradaAberta(true)} disabled={lista.length === 0}>
            Registrar entrada
          </Button>
        }
      />

      {lista.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input aria-label="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." className="!pl-10" />
          </div>
          <div className="w-full sm:w-56">
            <Select aria-label="Filtrar por categoria" value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
              <option value="">Todas as categorias</option>
              {(categorias ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Sem categoria">Sem categoria</option>
            </Select>
          </div>
        </div>
      )}

      {baixos.length > 0 && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-elo-yellow/30 bg-elo-yellow/10 px-4 py-3 text-sm text-elo-yellow">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">{baixos.length}</span> produto(s) com estoque baixo: {baixos.map((p) => p.nome).join(', ')}.
          </p>
        </div>
      )}

      {carregando && !produtos ? (
        <SkeletonCards />
      ) : erro && !produtos ? (
        <ErroCarregamento erro={erro} onTentar={recarregar} />
      ) : lista.length === 0 ? (
        <EmptyState
          icone={Package}
          titulo="Seu estoque está vazio"
          texto="Calcule o preço de uma peça na Calculadora e use “Registrar produto” para ela aparecer aqui."
        />
      ) : filtrados.length === 0 ? (
        <EmptyState icone={Search} titulo="Nada encontrado" texto="Nenhum produto corresponde a esse filtro." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((produto) => {
            const semEstoque = produto.quantidade === 0
            const baixo = produto.quantidade <= minimo
            const medidas = formatarMedidas(produto)
            const margem = produto.custoUnitario > 0 ? ((produto.precoVenda - produto.custoUnitario) / produto.custoUnitario) * 100 : null
            return (
              <li key={produto.id}>
                <article className={`card group h-full overflow-hidden ${baixo ? '!border-elo-yellow/40' : ''}`}>
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface-subtle">
                    <FotoProduto produto={produto} />
                    <div className={`absolute right-2.5 top-2.5 flex gap-1.5 ${ACOES_VISIVEIS}`}>
                      <IconButton icone={Pencil} rotulo={`Editar ${produto.nome}`} tamanho="sm" onClick={() => setProdutoParaEditar(produto)} className="bg-elo-card/90 shadow-card backdrop-blur" />
                      <IconButton icone={Trash2} rotulo={`Excluir ${produto.nome}`} tamanho="sm" variante="danger" onClick={() => setProdutoParaExcluir(produto)} className="bg-elo-card/90 shadow-card backdrop-blur" />
                    </div>
                    <div className="absolute bottom-2.5 left-2.5">
                      <Badge tom={semEstoque ? 'perigo' : baixo ? 'alerta' : 'marca'} icone={baixo ? AlertTriangle : undefined} className="shadow-card backdrop-blur [&]:bg-elo-card/90">
                        {semEstoque ? 'Sem estoque' : `${produto.quantidade} em estoque`}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="truncate font-display text-base font-semibold text-ink-primary">{produto.nome}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      {produto.categoria && <span className="rounded-full bg-surface-hover px-2 py-0.5 font-medium text-ink-secondary">{produto.categoria}</span>}
                      {medidas && (
                        <span className="flex items-center gap-1">
                          <Ruler size={12} />
                          {medidas}
                        </span>
                      )}
                    </div>

                    {produto.partes?.length > 0 && (
                      <details className="mt-3 rounded-lg border border-elo-border bg-surface-subtle px-3 py-2 text-xs text-ink-secondary">
                        <summary className="flex cursor-pointer items-center gap-1.5 font-medium">
                          <Boxes size={12} className="shrink-0 text-ink-muted" />
                          {produto.partes.length} parte(s)
                        </summary>
                        <ul className="mt-2 flex flex-col gap-1.5 pb-0.5">
                          {produto.partes.map((parte, i) => (
                            <li key={i} className="flex justify-between gap-2">
                              <span className="truncate">
                                {parte.nome}
                                {parte.quantidade > 1 && ` ×${parte.quantidade}`} · {formatNumber(parte.gramas, 0)} g
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-ink-primary">{formatBRL(parte.precoUnitario)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-elo-border pt-3">
                      <div>
                        <dt className="text-[11px] font-medium text-ink-muted">Custo</dt>
                        <dd className="text-sm font-semibold tabular-nums text-ink-secondary">{formatBRL(produto.custoUnitario)}</dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-[11px] font-medium text-ink-muted">
                          Venda{margem !== null && <span className="text-elo-green"> · +{formatNumber(margem, 0)}%</span>}
                        </dt>
                        <dd className="text-sm font-semibold tabular-nums text-ink-primary">{formatBRL(produto.precoVenda)}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      <EntradaEstoqueModal open={entradaAberta} produtos={lista} onClose={() => setEntradaAberta(false)} onConfirm={handleEntrada} />
      <EditarProdutoModal open={Boolean(produtoParaEditar)} produto={produtoParaEditar} onClose={() => setProdutoParaEditar(null)} onSave={handleSalvarEdicao} />
      <ConfirmDialog
        open={Boolean(produtoParaExcluir)}
        title="Excluir produto?"
        message={`"${produtoParaExcluir?.nome}" será removido do estoque permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleExcluir}
        onCancel={() => setProdutoParaExcluir(null)}
      />
    </div>
  )
}
