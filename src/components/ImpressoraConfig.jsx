import { useId, useState } from 'react'
import { Printer, Plus, Pencil, KeyRound, Trash2, Copy, Check, ShieldCheck } from 'lucide-react'
import { tempoRelativo } from '../utils/tempo.js'
import { useCarregar } from '../utils/useCarregar.js'
import { getImpressoras, criarImpressora, atualizarImpressora, regenerarTokenAgente, removerImpressora, ipLocalValido } from '../utils/impressora.js'
import Modal from './ui/Modal.jsx'
import Button, { IconButton } from './ui/Button.jsx'
import Badge from './ui/Badge.jsx'
import ConfirmDialog from './ui/ConfirmDialog.jsx'
import Skeleton from './ui/Skeleton.jsx'
import { ErroCarregamento } from './ui/EmptyState.jsx'
import { Campo, Input } from './ui/Field.jsx'
import { useToast } from './ui/Toast.jsx'

const VAZIO = { nome: '', ip: '', porta: '8898', numeroSerie: '', ativa: true }

function StatusAgente({ i }) {
  if (i.agenteOnline) return <Badge tom="sucesso">Agente online</Badge>
  if (i.recebidoEm) return <Badge tom="alerta">Sem sinal {tempoRelativo(i.recebidoEm)}</Badge>
  return <Badge>Aguardando o agente</Badge>
}

// O corpo do formulário só existe enquanto a janela está aberta: a cada abertura ele é montado do zero já com os
// valores certos (sem useEffect de "reiniciar", que deixaria uma janela de tempo em que o que se digita é apagado).
function FormularioImpressora({ aberto, impressora, onFechar, onSalvar }) {
  if (!aberto) return null
  return <CorpoDoFormulario impressora={impressora} onFechar={onFechar} onSalvar={onSalvar} />
}

function valoresIniciais(impressora) {
  return impressora
    ? { nome: impressora.nome, ip: impressora.ip, porta: String(impressora.porta), numeroSerie: impressora.numeroSerie, ativa: impressora.ativa }
    : VAZIO
}

function CorpoDoFormulario({ impressora, onFechar, onSalvar }) {
  const formId = useId()
  const edicao = Boolean(impressora)
  const [dados, setDados] = useState(() => valoresIniciais(impressora))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const ipOk = ipLocalValido(dados.ip)
  const porta = Number(dados.porta)
  const portaOk = Number.isInteger(porta) && porta >= 1 && porta <= 65535
  const podeSalvar = dados.nome.trim() && ipOk && portaOk && /^[A-Za-z0-9_-]{1,64}$/.test(dados.numeroSerie.trim())
  const set = (campo) => (e) => setDados((d) => ({ ...d, [campo]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    if (!podeSalvar || salvando) return
    setSalvando(true)
    setErro('')
    try {
      await onSalvar({ nome: dados.nome.trim(), ip: dados.ip.trim(), porta, numeroSerie: dados.numeroSerie.trim(), ativa: dados.ativa })
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open
      onClose={onFechar}
      titulo={edicao ? 'Editar impressora' : 'Adicionar impressora'}
      icone={Printer}
      rodape={
        <Button type="submit" form={formId} variante="primary" tamanho="lg" bloco carregando={salvando} disabled={!podeSalvar}>
          {edicao ? 'Salvar alterações' : 'Adicionar impressora'}
        </Button>
      }
    >
      <form id={formId} onSubmit={enviar} className="flex flex-col gap-4">
        <Campo
          rotulo="Endereço IP"
          dica="Se o roteador mudar o IP da impressora, edite aqui: o agente passa a usar o novo IP sozinho, sem mexer no notebook."
          erro={dados.ip && !ipOk ? 'Use um IP da rede local, como 192.168.0.50.' : undefined}
        >
          <Input value={dados.ip} onChange={set('ip')} placeholder="192.168.0.50" inputMode="decimal" autoComplete="off" data-autofocus={edicao || undefined} />
        </Campo>
        <Campo rotulo="Nome">
          <Input value={dados.nome} onChange={set('nome')} placeholder="Ex: AD5X da oficina" data-autofocus={!edicao || undefined} />
        </Campo>
        <Campo rotulo="Número de série" dica="Está nas informações da impressora ou na etiqueta. Não é secreto.">
          <Input value={dados.numeroSerie} onChange={set('numeroSerie')} placeholder="Ex: SNADVXX0000000" autoComplete="off" />
        </Campo>
        <Campo rotulo="Porta" dica="Normalmente 8898 (não precisa mudar).">
          <Input value={dados.porta} onChange={(e) => setDados((d) => ({ ...d, porta: e.target.value.replace(/[^0-9]/g, '') }))} inputMode="numeric" className="!w-28" />
        </Campo>
        {edicao && (
          <label className="flex items-center gap-2.5 text-sm text-ink-secondary">
            <input type="checkbox" checked={dados.ativa} onChange={(e) => setDados((d) => ({ ...d, ativa: e.target.checked }))} className="h-4 w-4 accent-[#5D5FEF]" />
            Monitorar esta impressora
          </label>
        )}
        <p className="flex items-start gap-2 rounded-xl border border-elo-border bg-surface-subtle px-3.5 py-3 text-xs leading-relaxed text-ink-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-elo-green" />
          O <strong className="font-semibold text-ink-secondary">checkCode</strong> da impressora <strong className="font-semibold text-ink-secondary">não é informado aqui</strong>: ele fica só no
          arquivo <code>.env</code> do agente, no notebook, e nunca é enviado ao sistema.
        </p>
        {erro && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-400">
            {erro}
          </p>
        )}
      </form>
    </Modal>
  )
}

function TokenDoAgente({ token, onFechar }) {
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(token)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.erro('Não foi possível copiar. Selecione o texto e copie manualmente.')
    }
  }

  return (
    <Modal open={Boolean(token)} onClose={onFechar} titulo="Token do agente" icone={KeyRound} tamanho="md">
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border border-elo-yellow/30 bg-elo-yellow/10 px-3.5 py-3 text-[13px] leading-relaxed text-elo-yellow">
          <strong>Copie agora: este token aparece uma única vez.</strong> Se perder, gere outro (o anterior deixa de valer).
        </p>
        <div className="flex items-stretch gap-2">
          <code className="min-w-0 flex-1 select-all break-all rounded-xl border border-elo-border bg-surface-subtle px-3.5 py-3 text-xs text-ink-primary" data-autofocus tabIndex={0}>
            {token}
          </code>
          <Button icone={copiado ? Check : Copy} onClick={copiar} aria-label="Copiar token">
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink-secondary">
          <li>No notebook, abra o arquivo <code>.env</code> da pasta do agente.</li>
          <li>
            Cole em <code>ELO_AGENT_TOKEN=</code> o token acima.
          </li>
          <li>
            Em <code>FF_CHECK_CODE=</code> coloque o código de verificação da impressora (ele fica só no notebook).
          </li>
          <li>
            Rode <code>node src\index.js --diagnostico</code> para testar e depois instale o agente (veja o README da pasta <code>agente</code>).
          </li>
        </ol>
        <Button variante="primary" bloco onClick={onFechar}>
          Já copiei
        </Button>
      </div>
    </Modal>
  )
}

export default function ImpressoraConfig() {
  const toast = useToast()
  const { dados, setDados, carregando, erro, recarregar } = useCarregar(getImpressoras)
  const [formAberto, setFormAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState(null)
  const [token, setToken] = useState(null)
  const [paraRemover, setParaRemover] = useState(null)
  const [paraNovoToken, setParaNovoToken] = useState(null)

  const lista = dados ?? []

  function abrirForm(impressora = null) {
    setEmEdicao(impressora)
    setFormAberto(true)
  }

  async function salvar(valores) {
    if (emEdicao) {
      await atualizarImpressora(emEdicao.id, valores)
      toast.sucesso('Impressora atualizada.')
    } else {
      const r = await criarImpressora(valores)
      setToken(r.token)
    }
    setFormAberto(false)
    setDados(await getImpressoras())
  }

  async function novoToken() {
    try {
      const r = await regenerarTokenAgente(paraNovoToken.id)
      setParaNovoToken(null)
      setToken(r.token)
      setDados(await getImpressoras())
    } catch (e) {
      toast.erro(e.message || 'Não foi possível gerar o token.')
    }
  }

  async function remover() {
    try {
      setDados(await removerImpressora(paraRemover.id))
      toast.sucesso('Impressora removida.')
      setParaRemover(null)
    } catch (e) {
      toast.erro(e.message || 'Não foi possível remover.')
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-elo-blue/10 text-elo-blue">
          <Printer size={18} />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-[15px] font-semibold text-ink-primary">Impressora</h2>
          <p className="text-xs text-ink-muted">Estado ao vivo e histórico de impressões (somente leitura)</p>
        </div>
        {lista.length === 0 && !carregando && (
          <Button variante="primary" tamanho="sm" icone={Plus} onClick={() => abrirForm()}>
            Adicionar
          </Button>
        )}
      </div>

      {carregando && !dados ? (
        <Skeleton className="h-20" />
      ) : erro && !dados ? (
        <ErroCarregamento erro={erro} onTentar={recarregar} />
      ) : lista.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhuma impressora cadastrada. Adicione a sua e instale o agente no notebook que fica na mesma rede da impressora.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((i) => (
            <li key={i.id} className="rounded-xl border border-elo-border bg-surface-subtle p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-primary">{i.nome}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-ink-muted">
                    IP {i.ip}:{i.porta} · série {i.numeroSerie}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!i.ativa && <Badge tom="alerta">Pausada</Badge>}
                  <StatusAgente i={i} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button tamanho="sm" icone={Pencil} onClick={() => abrirForm(i)}>
                  Editar IP / dados
                </Button>
                <Button tamanho="sm" icone={KeyRound} onClick={() => setParaNovoToken(i)}>
                  Novo token do agente
                </Button>
                <IconButton icone={Trash2} rotulo={`Remover ${i.nome}`} tamanho="sm" variante="danger" onClick={() => setParaRemover(i)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormularioImpressora aberto={formAberto} impressora={emEdicao} onFechar={() => setFormAberto(false)} onSalvar={salvar} />
      <TokenDoAgente token={token} onFechar={() => setToken(null)} />

      <ConfirmDialog
        open={Boolean(paraNovoToken)}
        title="Gerar novo token?"
        message="O token atual deixa de funcionar. O agente no notebook para de enviar dados até você colar o novo token no arquivo .env e reiniciá-lo."
        confirmLabel="Gerar novo token"
        variante="primary"
        onConfirm={novoToken}
        onCancel={() => setParaNovoToken(null)}
      />
      <ConfirmDialog
        open={Boolean(paraRemover)}
        title="Remover impressora?"
        message={`"${paraRemover?.nome}" será removida junto com o histórico de impressões dela. Essa ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={remover}
        onCancel={() => setParaRemover(null)}
      />
    </section>
  )
}
