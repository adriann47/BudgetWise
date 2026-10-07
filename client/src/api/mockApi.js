import seed from './seed.json'
const KEY = 'budgetwise:demo:v2'
const defaults = ['Food','Transport','School','Bills','Personal','Other']
function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) {
      const data=JSON.parse(raw)
      if (!Array.isArray(data.categories) || !Array.isArray(data.expenses) || !Array.isArray(data.budgets)) throw new Error()
      return data
    }
    const categories=defaults.map((name,index)=>({id:index+1,name,description:'',archived:false}))
    const expenses=JSON.parse(localStorage.getItem('budgetwise:expenses:v1') ?? JSON.stringify(seed))
    const budgets=JSON.parse(localStorage.getItem('budgetwise:budgets:v1') ?? '[]')
    if (!Array.isArray(expenses) || !Array.isArray(budgets)) throw new Error()
    const convert=rows=>rows.map(row=>{
      const cat=categories.find(c=>c.name===row.category)
      if (!cat) throw new Error()
      return {...row,category_id:cat.id}
    })
    const data={categories,expenses:convert(expenses),budgets:convert(budgets)}
    write(data)
    return data
  } catch { throw new Error('Saved demo data could not be read. Your existing data has not been overwritten.') }
}
const write=data=>localStorage.setItem(KEY,JSON.stringify(data))
const rows=(data,key)=>data[key].map(row=>({...row,category:data.categories.find(c=>c.id===row.category_id)?.name || row.category}))
function active(data,id) {
  const cat=data.categories.find(c=>c.id===Number(id) && !c.archived)
  if (!cat) throw new Error('Choose an active category.')
  return cat
}
function amount(value) { if (!Number.isSafeInteger(value) || value<1 || value>100000000) throw new Error('Enter an amount between PHP 0.01 and PHP 1,000,000.') }
function categoryInput(data,input,id) {
  const name=String(input.name || '').trim(), description=String(input.description || '').trim()
  if (!name || name.length>40) throw new Error('Use a category name with 1-40 characters.')
  if (description.length>200) throw new Error('Use at most 200 characters for the description.')
  if (data.categories.some(c=>c.id!==id && c.name.toLowerCase()===name.toLowerCase())) throw new Error('You already have a category with that name, including archived categories.')
  return {name,description}
}
export async function listCategories() { return read().categories }
export async function createCategory(input) {
  const data=read(), item={...categoryInput(data,input),id:Math.max(0,...data.categories.map(c=>c.id))+1,archived:false}
  data.categories.push(item);write(data);return item
}
export async function updateCategory(id,input) {
  const data=read(), item=data.categories.find(c=>c.id===id)
  if (!item) throw new Error('Category not found.')
  Object.assign(item,categoryInput(data,input,id),{archived:input.archived ?? item.archived})
  write(data);return item
}
export async function listExpenses() { const data=read();return rows(data,'expenses').sort((a,b)=>b.spent_on.localeCompare(a.spent_on)) }
export async function createExpense(input) {
  const data=read(),cat=active(data,input.category_id),title=String(input.title || '').trim()
  if (!title || title.length>120) throw new Error('Enter a description with 1-120 characters.')
  amount(input.amount_centavos)
  const date=new Date(input.spent_on+'T12:00:00Z')
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(input.spent_on) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==input.spent_on) throw new Error('Choose a valid expense date.')
  const item={id:crypto.randomUUID(),title,category_id:cat.id,category:cat.name,amount_centavos:input.amount_centavos,spent_on:input.spent_on}
  data.expenses.push(item);write(data);return item
}
export async function deleteExpense(id) {
  const data=read();if (!data.expenses.some(e=>e.id===id)) throw new Error('Expense not found.')
  data.expenses=data.expenses.filter(e=>e.id!==id);write(data)
}
export async function listBudgets() { const data=read();return rows(data,'budgets') }
export async function saveBudget(input) {
  const data=read(),cat=active(data,input.category_id);amount(input.amount_centavos)
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(input.month)) throw new Error('Choose a valid month.')
  const saved={month:input.month,category_id:cat.id,category:cat.name,amount_centavos:input.amount_centavos}
  data.budgets=data.budgets.filter(b=>!(b.month===saved.month && b.category_id===saved.category_id));data.budgets.push(saved);write(data);return saved
}
