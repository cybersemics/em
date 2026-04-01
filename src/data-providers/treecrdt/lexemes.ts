/* eslint-disable import/prefer-default-export */
import type { TreecrdtClient } from '@treecrdt/wa-sqlite/client'
import type Lexeme from '../../@types/Lexeme'

/** Application-owned lexeme rows in the same SQLite DB as TreeCRDT (not part of the CRDT tree). */
const TABLE = 'em_lexemes'

const DDL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL
);
`

/**
 * Injects bound parameters into SQL for `runner.exec`, which does not accept bind args.
 * Only `?1` … `?n` placeholders are supported, in order.
 */
function bindParams(sql: string, params: (string | number | null)[]): string {
  let out = sql
  for (let i = params.length - 1; i >= 0; i--) {
    const p = params[i]
    const lit = p === null ? 'NULL' : typeof p === 'number' ? String(p) : `'${String(p).replace(/'/g, "''")}'`
    out = out.replace(new RegExp(`\\?${i + 1}\\b`, 'g'), lit)
  }
  return out
}

/** Serializes a Lexeme to JSON for storage in `payload_json`. */
function serializeLexeme(lexeme: Lexeme): string {
  return JSON.stringify(lexeme)
}

/** Parses a stored `payload_json` string into a Lexeme. */
function parseLexemeJson(text: string): Lexeme {
  return JSON.parse(text) as Lexeme
}

/** Ensures the lexeme table exists. Safe to call on every init. */
export async function ensureLexemesSchema(client: TreecrdtClient): Promise<void> {
  await client.runner.exec(DDL)
}

/** Loads one lexeme by id (lexeme key / hash). */
export async function getLexemeById(client: TreecrdtClient, id: string): Promise<Lexeme | undefined> {
  await ensureLexemesSchema(client)
  const text = await client.runner.getText(`SELECT payload_json FROM ${TABLE} WHERE id = ?1`, [id])
  if (!text) return undefined
  return parseLexemeJson(text)
}

/** Loads lexemes for the given ids; order matches `ids`. */
export async function getLexemesByIds(client: TreecrdtClient, ids: string[]): Promise<(Lexeme | undefined)[]> {
  if (ids.length === 0) return []
  await ensureLexemesSchema(client)
  const placeholders = ids.map(() => '?').join(',')
  const sql = `SELECT json_group_array(json_object('id', id, 'lexeme', json(payload_json))) FROM ${TABLE} WHERE id IN (${placeholders})`
  const text = await client.runner.getText(sql, ids)
  if (!text) return ids.map(() => undefined)
  const rows = JSON.parse(text) as ({ id: string; lexeme: Lexeme } | null)[]
  const map = new Map<string, Lexeme>()
  for (const row of rows) {
    if (row && row.id) map.set(row.id, row.lexeme)
  }
  return ids.map(id => map.get(id))
}

/** Inserts or replaces a lexeme row. */
export async function upsertLexeme(client: TreecrdtClient, id: string, lexeme: Lexeme): Promise<void> {
  await ensureLexemesSchema(client)
  const sql = `INSERT INTO ${TABLE} (id, payload_json) VALUES (?1, ?2)
    ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json`
  await client.runner.exec(bindParams(sql, [id, serializeLexeme(lexeme)]))
}

/** Deletes a lexeme row by id. */
export async function deleteLexeme(client: TreecrdtClient, id: string): Promise<void> {
  await ensureLexemesSchema(client)
  await client.runner.exec(bindParams(`DELETE FROM ${TABLE} WHERE id = ?1`, [id]))
}

/** Deletes all lexeme rows (table must already be ensured for callers that need it). */
export async function deleteAllLexemes(client: TreecrdtClient): Promise<void> {
  await ensureLexemesSchema(client)
  await client.runner.exec(`DELETE FROM ${TABLE}`)
}
