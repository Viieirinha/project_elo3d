export default function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton rounded-xl ${className}`} />
}

export function SkeletonCards({ quantidade = 6, altura = 'h-64' }) {
  return (
    <div role="status" aria-label="Carregando" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: quantidade }, (_, i) => (
        <Skeleton key={i} className={`${altura} rounded-2xl`} />
      ))}
    </div>
  )
}
