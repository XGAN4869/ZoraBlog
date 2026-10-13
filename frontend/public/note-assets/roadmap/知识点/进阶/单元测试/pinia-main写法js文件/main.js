import { createApp } from 'vue'
// 引入组件库的少量全局样式变量
import 'tdesign-vue-next/es/style/index.css'
import './style/core/tailwindcss.css'
// Cascade 样式覆盖
import './style/index.less'

import router from './router'
import axios from '@/utils/request/axios.js'
import pinia from './store'
import App from './App.vue'

const app = createApp(App)

// 先注册pinia、路由
app.use(pinia).use(router)

// 路由挂载完成后，再加载路由守卫
import './router/permission.js'

//TODO 我们把 main.js 的 pinia 解耦出去了, 这样当我们想直接使用 pinia 实例的时候，不会加载 #app
app.mount('#app')
