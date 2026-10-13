//不要在 main.js 中引入 store！
import { createPinia } from 'pinia'
const store = createPinia()
export { store }
export default store
export * from './modules/account.js'
export * from './modules/tab.js'

