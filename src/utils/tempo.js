/** "agora", "há 12 s", "há 3 min", "há 2 h", "há 3 dias". */
export function tempoRelativo(iso, agora = Date.now()) {
  if (!iso) return null
  const s = Math.round((agora - new Date(iso).getTime()) / 1000)
  if (!Number.isFinite(s)) return null
  if (s < 5) return 'agora'
  if (s < 60) return `há ${s} s`
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  const d = Math.floor(s / 86400)
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
}
