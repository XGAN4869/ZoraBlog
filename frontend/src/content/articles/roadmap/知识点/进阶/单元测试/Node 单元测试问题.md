## main.js挂载问题
- 如果我们要测试 pinia 中的代码，但是 pinia 在 main.js 中导入，那么用 vite/vitest 跑单元测试时需要 import main.js，**但是 Node 环境无 DOM** ，没有 #app 这个 div，一执行 mount 直接炸
- so, pinia 最好写在 store\index.js，方便单元测试直接测