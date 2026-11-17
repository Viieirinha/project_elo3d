import { Component } from 'react'
import { TriangleAlert } from 'lucide-react'

// Evita a "tela preta" quando um componente quebra: mostra uma mensagem e permite recarregar.
export default class ErrorBoundary extends Component {
  state = { erro: null }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    console.error('Erro de interface:', erro, info?.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <TriangleAlert size={26} />
        </span>
        <h1 className="font-display text-xl font-semibold text-ink-primary">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-ink-muted">
          Ocorreu um erro inesperado nesta tela. Seus dados estão salvos. Recarregue para continuar.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-10 rounded-xl bg-elo-brand px-5 text-sm font-semibold text-white shadow-brand"
        >
          Recarregar
        </button>
      </div>
    )
  }
}
