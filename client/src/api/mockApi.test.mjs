import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Load the adapter without Vite's JSON import transform.
const seed = JSON.parse(await readFile(new URL('./seed.json', import.meta.url)))
const source = (await readFile(new URL('./mockApi.js', import.meta.url), 'utf8')).replace("import seed from './seed.json'", `const seed=${JSON.stringify(seed)}`)
const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const saved = new Map()
globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key,value) => saved.set(key,value) }

test('legacy demo migration, category rename, archive and restore preserve records', async () => {
  const legacy=[{id:'old',title:'Lunch',category:'Food',amount_centavos:20000,spent_on:'2026-10-01'}]
  saved.set('budgetwise:expenses:v1',JSON.stringify(legacy))
  saved.set('budgetwise:budgets:v1',JSON.stringify([{month:'2026-10',category:'Food',amount_centavos:15000}]))
  const categories=await api.listCategories(), food=categories.find(c=>c.name==='Food')
  assert.equal(categories.length,6)
  await api.updateCategory(food.id,{name:'Meals',description:'Daily meals'})
  assert.equal((await api.listExpenses())[0].category,'Meals')
  assert.equal((await api.listBudgets())[0].category,'Meals')
  assert.deepEqual(JSON.parse(saved.get('budgetwise:expenses:v1')),legacy)
  await assert.rejects(api.createCategory({name:' meals '}),/already have/)
  await api.updateCategory(food.id,{name:'Meals',archived:true})
  await assert.rejects(api.createExpense({...legacy[0],category_id:food.id}),/active category/)
  await assert.rejects(api.saveBudget({month:'2026-10',category_id:food.id,amount_centavos:100}),/active category/)
  assert.equal((await api.listExpenses())[0].amount_centavos,20000)
  await api.updateCategory(food.id,{name:'Meals',archived:false})
  const custom=await api.createCategory({name:'Hobbies'})
  await api.createExpense({...legacy[0],category_id:custom.id})
  assert.equal((await api.listExpenses()).length,2)
  await assert.rejects(api.createExpense({...legacy[0],category_id:custom.id,spent_on:'2026-02-30'}),/valid expense date/)
})
test('corrupted data is not silently replaced', async () => {
  saved.set('budgetwise:demo:v2','invalid json')
  await assert.rejects(api.listCategories(),/not been overwritten/)
  assert.equal(saved.get('budgetwise:demo:v2'),'invalid json')
})
