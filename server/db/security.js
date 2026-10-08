// Reapplied by migrations and runtime setup. Caller owns the transaction.
export const identifier = value => {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid database identifier')
  return `"${value}"`
}

export async function secureDatabase(client, schema = 'public') {
  const s = identifier(schema)
  // Supabase roles do not exist in a plain local PostgreSQL installation.
  const roles = (await client.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') ORDER BY rolname")).rows
  const recipients = ['PUBLIC', ...roles.map(row => identifier(row.rolname))].join(', ')
  for (const table of ['users', 'categories', 'expenses', 'budgets', 'user_sessions', 'schema_migrations']) {
    await client.query(`REVOKE ALL PRIVILEGES ON TABLE ${s}.${identifier(table)} FROM ${recipients}`)
    await client.query(`ALTER TABLE ${s}.${identifier(table)} ENABLE ROW LEVEL SECURITY`)
  }
  await client.query(`REVOKE ALL PRIVILEGES ON SEQUENCE ${s}.users_id_seq, ${s}.categories_id_seq, ${s}.expenses_id_seq FROM ${recipients}`)
  // Migrations run as the object creator (postgres on Supabase).
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${s} REVOKE ALL ON TABLES FROM ${recipients}`)
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${s} REVOKE ALL ON SEQUENCES FROM ${recipients}`)
}
