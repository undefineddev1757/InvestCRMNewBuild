import { Pool } from 'pg'

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'investcrm',
  password: 'postgres',
  port: 5433,
})

export interface QueryResult<T = any> {
  rows: T[]
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return { rows: res.rows as T[] }
  } finally {
    client.release()
  }
}

export default { query }


