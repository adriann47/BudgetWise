import { fileURLToPath } from 'node:url'
// This deployment serves the real API on the same origin as the Vite client.
process.env.VITE_USE_MOCK_API = 'false'
process.env.VITE_API_BASE_URL = ''
process.env.VITE_BASE_PATH = '/'
const { build } = await import('../client/node_modules/vite/dist/node/index.js')
await build({ root: fileURLToPath(new URL('../client/', import.meta.url)), configLoader: 'native', resolve: { preserveSymlinks: process.platform === 'win32' } })
