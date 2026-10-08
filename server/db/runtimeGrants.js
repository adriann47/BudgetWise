// Explicit grants: newly added tables do not automatically become accessible.
import { identifier, secureDatabase } from './security.js'

export async function grantRuntimeAccess(client, role, schema = 'public') {
  const r = identifier(role), s = identifier(schema)
  await secureDatabase(client, schema)
  await client.query(`GRANT USAGE ON SCHEMA ${s} TO ${r}`)
  await client.query(`GRANT SELECT, INSERT, UPDATE ON ${s}.users, ${s}.categories TO ${r}`)
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${s}.expenses, ${s}.budgets, ${s}.user_sessions TO ${r}`)
  await client.query(`GRANT USAGE ON SEQUENCE ${s}.users_id_seq, ${s}.expenses_id_seq, ${s}.categories_id_seq TO ${r}`)
  // This role is used only by Express, which enforces ownership using user_id.
  // It is never assigned to Supabase browser/API users.
  for (const table of ['users', 'categories', 'expenses', 'budgets', 'user_sessions']) {
    await client.query(`DROP POLICY IF EXISTS budgetwise_server_access ON ${s}.${identifier(table)}`)
    await client.query(`CREATE POLICY budgetwise_server_access ON ${s}.${identifier(table)} TO ${r} USING (true) WITH CHECK (true)`)
  }
}
