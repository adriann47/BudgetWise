import * as validate from './validation.js'
import { hashPassword, verifyPassword } from './passwords.js'

export function addAccountRoutes(app, pool, { route, signIn, authLimit }) {
  const id = (value) => {
    if (!/^[1-9]\d{0,9}$/.test(String(value)) || Number(value) > 2147483647) throw validate.failure('Record not found.', 404)
    return Number(value)
  }
  async function category(userId, value, active = true) {
    const byId = Number.isInteger(value) || /^[1-9]\d*$/.test(String(value))
    const result = await pool.query(`SELECT * FROM categories WHERE user_id=$1 AND ${byId ? 'id=$2' : 'name=$2'} ${active ? 'AND NOT archived' : ''}`, [userId, byId ? id(value) : validate.category(value)])
    if (!result.rowCount) throw validate.failure('Category unavailable. Choose an active category from your account.', 400)
    return result.rows[0]
  }
  const categoryInput = (body = {}) => {
    const name = validate.category(body.name)
    if (body.description !== undefined && typeof body.description !== 'string') throw validate.failure('Enter a valid description.')
    const description = (body.description || '').trim()
    if (description.length > 200) throw validate.failure('Use at most 200 characters for the description.')
    if (body.archived !== undefined && typeof body.archived !== 'boolean') throw validate.failure('Invalid archive setting.')
    return { name, description }
  }
  async function categoryWrite(query, args) {
    try { return await pool.query(query, args) }
    catch (error) { if (error.code === '23505') throw validate.failure('You already have a category with that name, including archived categories.', 409); throw error }
  }
  app.get('/api/categories', route(async (req,res) => {
    res.json((await pool.query('SELECT id,name,description,archived FROM categories WHERE user_id=$1 ORDER BY id', [req.session.userId])).rows)
  }))
  app.post('/api/categories', route(async (req,res) => {
    const data = categoryInput(req.body)
    const result = await categoryWrite('INSERT INTO categories(user_id,name,description) VALUES($1,$2,$3) RETURNING id,name,description,archived', [req.session.userId,data.name,data.description])
    res.status(201).json(result.rows[0])
  }))
  app.put('/api/categories/:id', route(async (req,res) => {
    const data = categoryInput(req.body)
    const result = await categoryWrite('UPDATE categories SET name=$1,description=$2,archived=COALESCE($3,archived) WHERE id=$4 AND user_id=$5 RETURNING id,name,description,archived', [data.name,data.description,req.body.archived ?? null,id(req.params.id),req.session.userId])
    if (!result.rowCount) throw validate.failure('Category not found.',404)
    res.json(result.rows[0])
  }))
  app.get('/api/profile', route(async (req,res) => {
    res.json((await pool.query('SELECT id,name,email,created_at FROM users WHERE id=$1',[req.session.userId])).rows[0])
  }))
  app.patch('/api/profile', route(async (req,res) => {
    res.json((await pool.query('UPDATE users SET name=$1 WHERE id=$2 RETURNING id,name,email,created_at',[validate.name(req.body?.name),req.session.userId])).rows[0])
  }))
  app.post('/api/profile/password', authLimit, route(async (req,res) => {
    const current = validate.password(req.body?.currentPassword)
    const next = validate.password(req.body?.newPassword)
    if (next !== req.body?.confirmPassword) throw validate.failure('The new passwords do not match.')
    if (next === current) throw validate.failure('Choose a different new password.')
    const user = (await pool.query('SELECT password_hash FROM users WHERE id=$1',[req.session.userId])).rows[0]
    if (!user || !await verifyPassword(current,user.password_hash)) throw validate.failure('Current password is incorrect.',400)
    const hash = await hashPassword(next)
    const updated = await pool.query('UPDATE users SET password_hash=$1,auth_version=auth_version+1 WHERE id=$2 AND password_hash=$3 RETURNING id,name,email,created_at,auth_version',[hash,req.session.userId,user.password_hash])
    if (!updated.rowCount) throw validate.failure('Your password changed in another session. Log in again.',409)
    await signIn(req,res,updated.rows[0])
  }))
  const columns = "e.id,e.title,e.amount_centavos,e.category_id,c.name AS category,to_char(e.spent_on,'YYYY-MM-DD') AS spent_on"
  async function expenseRow(userId, expenseId) {
    return (await pool.query(`SELECT ${columns} FROM expenses e JOIN categories c ON c.id=e.category_id AND c.user_id=e.user_id WHERE e.user_id=$1 AND e.id=$2`,[userId,expenseId])).rows[0]
  }
  app.get('/api/expenses',route(async(req,res)=>res.json((await pool.query(`SELECT ${columns} FROM expenses e JOIN categories c ON c.id=e.category_id AND c.user_id=e.user_id WHERE e.user_id=$1 ORDER BY e.spent_on DESC,e.id DESC`,[req.session.userId])).rows)))
  app.post('/api/expenses',route(async(req,res)=>{
    const data=validate.expense(req.body || {})
    const cat=await category(req.session.userId,req.body.category_id ?? req.body.category)
    const result=await pool.query('INSERT INTO expenses(user_id,title,amount_centavos,category_id,spent_on) VALUES($1,$2,$3,$4,$5) RETURNING id',[req.session.userId,data.title,data.amount_centavos,cat.id,data.spent_on])
    res.status(201).json(await expenseRow(req.session.userId,result.rows[0].id))
  }))
  app.put('/api/expenses/:id',route(async(req,res)=>{
    const expenseId=id(req.params.id)
    if (!await expenseRow(req.session.userId,expenseId)) throw validate.failure('Expense not found.',404)
    const data=validate.expense(req.body || {})
    const cat=await category(req.session.userId,req.body.category_id ?? req.body.category)
    await pool.query('UPDATE expenses SET title=$1,amount_centavos=$2,category_id=$3,spent_on=$4 WHERE id=$5 AND user_id=$6',[data.title,data.amount_centavos,cat.id,data.spent_on,expenseId,req.session.userId])
    res.json(await expenseRow(req.session.userId,expenseId))
  }))
  app.delete('/api/expenses/:id',route(async(req,res)=>{
    const result=await pool.query('DELETE FROM expenses WHERE id=$1 AND user_id=$2 RETURNING id',[id(req.params.id),req.session.userId])
    if (!result.rowCount) throw validate.failure('Expense not found.',404)
    res.status(204).end()
  }))
  app.get('/api/budgets',route(async(req,res)=>res.json((await pool.query('SELECT b.month,b.category_id,c.name AS category,b.amount_centavos FROM budgets b JOIN categories c ON c.id=b.category_id AND c.user_id=b.user_id WHERE b.user_id=$1 ORDER BY b.month DESC,c.name',[req.session.userId])).rows)))
  app.put('/api/budgets/:month/:category',route(async(req,res)=>{
    const month=validate.month(req.params.month), amount=validate.amount(req.body?.amount_centavos)
    const cat=await category(req.session.userId,req.params.category)
    const result=await pool.query('INSERT INTO budgets(user_id,month,category_id,amount_centavos) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,month,category_id) DO UPDATE SET amount_centavos=EXCLUDED.amount_centavos RETURNING month,category_id,amount_centavos',[req.session.userId,month,cat.id,amount])
    res.json({...result.rows[0],category:cat.name})
  }))
  app.delete('/api/budgets/:month/:category',route(async(req,res)=>{
    const cat=await category(req.session.userId,req.params.category,false)
    const result=await pool.query('DELETE FROM budgets WHERE user_id=$1 AND month=$2 AND category_id=$3 RETURNING month',[req.session.userId,validate.month(req.params.month),cat.id])
    if (!result.rowCount) throw validate.failure('Budget not found.',404)
    res.status(204).end()
  }))
}
