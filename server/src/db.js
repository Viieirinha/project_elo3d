import pg from 'pg'

// numeric/bigint chegam como número (não string) e date como 'YYYY-MM-DD'.
pg.types.setTypeParser(1700, (v) => parseFloat(v))
pg.types.setTypeParser(20, (v) => parseInt(v, 10))
pg.types.setTypeParser(1082, (v) => v)

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

export async function tx(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

const camelKey = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

export function camel(row) {
  if (!row) return null
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [camelKey(k), v]))
}

export const camelAll = (result) => result.rows.map(camel)
