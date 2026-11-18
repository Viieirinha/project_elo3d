import { useState } from 'react'
import { Printer, Settings, Trash2, Calculator, Thermometer, Layers, Clock, Timer, WifiOff, AlertTriangle, History } from 'lucide-react'
import { formatNumber } from '../utils/format.js'
import { formatarDuracao } from '../utils/jobParaCalculo.js'
import { tempoRelativo } from '../utils/tempo.js'
import { getProdutos } from '../utils/estoque.js'
import { useCarregar } from '../utils/useCarregar.js'
import { usePolling } from '../utils/usePolling.js'
import {
  getImpressoras,
  getEstadoImpressora,
  getJobs,
  atualizarJob,
  removerJob,
  ESTADOS_IMPRESSORA,
  MENSAGENS_ERRO_IMPRESSORA,
  RESULTADOS_JOB,
} from '../utils/impressora.js'
import PageHeader from './ui/PageHeader.jsx'
import Button, { IconButton } from './ui/Button.jsx'
import Badge from './ui/Badge.jsx'
import EmptyState, { ErroCarregamento } from './ui/EmptyState.jsx'
import Skeleton from './ui/Skeleton.jsx'
import ConfirmDialog from './ui/ConfirmDialog.jsx'
import { Select } from './ui/Field.jsx'
import { useToast } from './ui/Toast.jsx'

const INTERVALO_ESTADO_MS = 7000 // 5 a 10 s, só enquanto esta tela está aberta
const INTERVALO_JOBS_MS = 20000

const formatarData = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const temperatura = (t) => (t && t.atual !== null && t.atual !== undefined ? `${formatNumber(t.atual, 0)} °C${t.alvo ? ` / ${formatNumber(t.alvo, 0)} °C` : ''}` : '—')

function Metrica({ icone: Icone, rotulo, valor }) {
  return (
    <div className="rounded-xl border border-elo-border bg-surface-subtle px-4 py-3">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        <Icone size={12} /> {rotulo}
      </span>
      <p className="mt-1 font-display text-base font-semibold tabular-nums text-ink-primary">{valor}</p>
    </div>
  )
}

function Aviso({ tom = 'alerta', icone: Icone, titulo, children }) {
  const cores = tom === 'perigo' ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-elo-yellow/30 bg-elo-yellow/10 text-elo-yellow'
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${cores}`}>
      <Icone size={17} className="mt-0.5 shrink-0" />
      <div>
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className="text-[13px] leading-relaxed opacity-95">{children}</div>
      </div>
    </div>
  )
}

function PainelDeEstado({ estado, carregando, erroRede }) {
  if (carregando && !estado) return <Skeleton className="h-64 rounded-2xl" />
  const { snapshot, agenteOnline, recebidoEm, erro, jobAtual } = estado ?? {}
  const s = snapshot
  const info = ESTADOS_IMPRESSORA[s?.estado] ?? ESTADOS_IMPRESSORA.desconhecido
  const imprimindo = ['imprimindo', 'aquecendo', 'pausada'].includes(s?.estado)
  // Sem sinal do agente ou com erro de comunicação, o que aparece é o ÚLTIMO estado conhecido, não o estado atual.
  const desatualizado = !agenteOnline || Boolean(erro)
  const percentual = s?.progresso != null ? Math.round(s.progresso * 100) : null

  return (
    <div className="flex flex-col gap-4">
      {erroRede && (
        <Aviso icone={WifiOff} titulo="Sem conexão com o sistema">
          Não foi possível atualizar o estado agora. Tentando de novo automaticamente.
        </Aviso>
      )}
      {!agenteOnline && !recebidoEm && (
        <Aviso icone={WifiOff} titulo="Aguardando o primeiro sinal do agente">
          Instale e inicie o agente no notebook (veja <strong>Configurações &gt; Impressora</strong> e o README da pasta <code>agente</code>). Assim que ele se conectar, o estado aparece aqui.
        </Aviso>
      )}
      {!agenteOnline && recebidoEm && (
        <Aviso icone={WifiOff} titulo={`Sem sinal do agente ${tempoRelativo(recebidoEm)}`}>
          Confira se o notebook está ligado, com internet, e se o agente está em execução. O estado abaixo é o último conhecido.
        </Aviso>
      )}
      {agenteOnline && erro && (
        <Aviso tom="perigo" icone={AlertTriangle} titulo="Não foi possível falar com a impressora">
          {MENSAGENS_ERRO_IMPRESSORA[erro.codigo] ?? erro.mensagem}
        </Aviso>
      )}

      {s ? (
        <section className={`card p-5 transition-opacity sm:p-6 ${desatualizado ? 'opacity-60' : ''}`} aria-label="Estado da impressora">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Badge tom={info.tom}>{info.rotulo}</Badge>
              {s.arquivo && <p className="min-w-0 truncate font-display text-base font-semibold text-ink-primary">{s.arquivo}</p>}
            </div>
            {desatualizado ? (
              <Badge tom="alerta">Último estado conhecido</Badge>
            ) : (
              recebidoEm && <span className="text-xs text-ink-muted">atualizado {tempoRelativo(recebidoEm)}</span>
            )}
          </div>

          {imprimindo && percentual !== null && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-xs font-medium text-ink-muted">Progresso</span>
                <span className="font-display text-2xl font-semibold tabular-nums text-ink-primary">{percentual}%</span>
              </div>
              <div role="progressbar" aria-valuenow={percentual} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da impressão" className="h-2.5 overflow-hidden rounded-full bg-surface-hover">
                <div className="h-full rounded-full bg-elo-brand transition-[width] duration-500" style={{ width: `${percentual}%` }} />
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metrica icone={Layers} rotulo="Camada" valor={imprimindo && s.camadaAtual != null && s.camadaTotal ? `${s.camadaAtual} / ${s.camadaTotal}` : '—'} />
            <Metrica icone={Clock} rotulo="Decorrido" valor={imprimindo && s.decorridoSeg != null ? formatarDuracao(s.decorridoSeg) : '—'} />
            <Metrica icone={Timer} rotulo="Restante" valor={imprimindo && s.restanteSeg != null ? formatarDuracao(s.restanteSeg) : '—'} />
            <Metrica icone={Thermometer} rotulo="Bico" valor={temperatura(s.temperaturas?.bico)} />
            <Metrica icone={Thermometer} rotulo="Mesa" valor={temperatura(s.temperaturas?.mesa)} />
            {s.temperaturas?.bicoDireito && <Metrica icone={Thermometer} rotulo="Bico direito" valor={temperatura(s.temperaturas.bicoDireito)} />}
            {s.temperaturas?.camara && <Metrica icone={Thermometer} rotulo="Câmara" valor={temperatura(s.temperaturas.camara)} />}
          </div>

          {s.codigoErro && <p className="mt-4 text-xs text-red-400">Código de erro da impressora: {s.codigoErro}</p>}
          {jobAtual?.inicioEstimado && imprimindo && (
            <p className="mt-4 text-xs text-ink-muted">O início deste job foi estimado (o sistema o viu já em andamento).</p>
          )}
          {s.estado === 'desconhecido' && s.estadoBruto && (
            <p className="mt-4 text-xs text-ink-muted">Status não reconhecido pelo sistema: “{s.estadoBruto}”.</p>
          )}
        </section>
      ) : (
        agenteOnline &&
        !erro && <EmptyState icone={Printer} titulo="Sem dados ainda" texto="O agente está conectado e deve enviar o estado em instantes." />
      )}
    </div>
  )
}

export default function ImpressoraView({ onUsarNaCalculadora, onNavegar }) {
  const toast = useToast()
  const impressorasReq = useCarregar(getImpressoras)
  const produtosReq = useCarregar(() => getProdutos({ comFoto: false }))
  const [idEscolhido, setIdEscolhido] = useState(null)
  const [jobParaExcluir, setJobParaExcluir] = useState(null)

  const impressoras = impressorasReq.dados ?? []
  const impressora = impressoras.find((i) => i.id === idEscolhido) ?? impressoras[0]
  const ativo = Boolean(impressora)

  const estadoReq = usePolling(() => getEstadoImpressora(impressora.id), { intervaloMs: INTERVALO_ESTADO_MS, ativo, chave: impressora?.id })
  const jobsReq = usePolling(() => getJobs(impressora.id), { intervaloMs: INTERVALO_JOBS_MS, ativo, chave: impressora?.id })
  const jobs = jobsReq.dados ?? []
  const produtos = produtosReq.dados ?? []

  async function vincular(job, produtoId) {
    try {
      await atualizarJob(job.id, { produtoId: produtoId || null })
      jobsReq.recarregar()
      toast.sucesso(produtoId ? 'Produto vinculado ao job.' : 'Vínculo removido.')
    } catch (e) {
      toast.erro(e.message || 'Não foi possível vincular o produto.')
    }
  }

  async function excluir() {
    try {
      await removerJob(jobParaExcluir.id)
      jobsReq.recarregar()
      toast.sucesso('Job removido do histórico.')
      setJobParaExcluir(null)
    } catch (e) {
      toast.erro(e.message || 'Não foi possível remover.')
    }
  }

  if (impressorasReq.carregando && !impressorasReq.dados) {
    return (
      <div className="animate-fade-in">
        <PageHeader titulo="Impressora" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }
  if (impressorasReq.erro && !impressorasReq.dados) {
    return (
      <div className="animate-fade-in">
        <PageHeader titulo="Impressora" />
        <ErroCarregamento erro={impressorasReq.erro} onTentar={impressorasReq.recarregar} />
      </div>
    )
  }
  if (!impressora) {
    return (
      <div className="animate-fade-in">
        <PageHeader titulo="Impressora" subtitulo="Acompanhe a impressão ao vivo e o histórico de jobs." />
        <EmptyState
          icone={Printer}
          titulo="Nenhuma impressora cadastrada"
          texto="Cadastre a sua impressora e instale o agente no notebook para ver o estado ao vivo e registrar as impressões."
          acao={
            <Button variante="primary" icone={Settings} onClick={() => onNavegar?.('configuracoes')}>
              Cadastrar impressora
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        titulo="Impressora"
        subtitulo={`${impressora.nome} · ${impressora.ip}`}
        acoes={
          <>
            {impressoras.length > 1 && (
              <div className="w-48">
                <Select aria-label="Impressora" value={impressora.id} onChange={(e) => setIdEscolhido(e.target.value)} className="!py-2 !text-[13px]">
                  {impressoras.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <Button icone={Settings} onClick={() => onNavegar?.('configuracoes')}>
              Configurar
            </Button>
          </>
        }
      />

      <PainelDeEstado estado={estadoReq.dados} carregando={estadoReq.carregando} erroRede={Boolean(estadoReq.erro)} />

      <section className="card mt-6 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <History size={16} className="text-elo-blue" />
          <h2 className="font-display text-[15px] font-semibold text-ink-primary">Histórico de impressões</h2>
        </div>

        {jobsReq.carregando && !jobsReq.dados ? (
          <Skeleton className="h-32" />
        ) : jobs.length === 0 ? (
          <EmptyState icone={History} titulo="Nenhuma impressão registrada" texto="Quando uma impressão terminar, ela aparece aqui com a duração real." />
        ) : (
          <ul className="flex flex-col divide-y divide-elo-border">
            {jobs.map((job) => {
              const r = RESULTADOS_JOB[job.resultado] ?? RESULTADOS_JOB.interrompido
              return (
                <li key={job.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-ink-primary">{job.arquivo}</p>
                      <Badge tom={r.tom}>{r.rotulo}</Badge>
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-ink-muted">
                      {formatarData(job.concluidoEm)} · {job.inicioEstimado ? '≈ ' : ''}
                      {formatarDuracao(job.duracaoSegundos)}
                      {job.gramasEstimadas ? ` · ${formatNumber(Number(job.gramasEstimadas), 1)} g (estimado)` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-44">
                      <Select aria-label={`Produto vinculado a ${job.arquivo}`} value={job.produtoId ?? ''} onChange={(e) => vincular(job, e.target.value)} className="!py-1.5 !text-xs">
                        <option value="">Sem produto</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button tamanho="sm" variante="soft" icone={Calculator} onClick={() => onUsarNaCalculadora?.(job)}>
                      Usar na calculadora
                    </Button>
                    <IconButton icone={Trash2} rotulo={`Remover ${job.arquivo} do histórico`} tamanho="sm" variante="danger" onClick={() => setJobParaExcluir(job)} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-ink-muted">A duração é o tempo real medido pela impressora. O filamento é a estimativa do fatiador, não o consumo medido.</p>
      </section>

      <ConfirmDialog
        open={Boolean(jobParaExcluir)}
        title="Remover do histórico?"
        message={`O registro de "${jobParaExcluir?.arquivo}" será removido do histórico. Isso não afeta nenhum cálculo já feito.`}
        confirmLabel="Remover"
        onConfirm={excluir}
        onCancel={() => setJobParaExcluir(null)}
      />
    </div>
  )
}
