export function parseLocaleNumber(value) {
  if (typeof value === 'number') return value
  if (!value) return 0
  const str = String(value).trim()
  const normalized = str.includes(',') ? str.replace(/\./g, '').replace(',', '.') : str
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? 0 : parsed
}

export function formatBRL(value) {
  const safe = isFinite(value) ? value : 0
  return safe.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatNumber(value, digits = 2) {
  const safe = isFinite(value) ? value : 0
  return safe.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}
