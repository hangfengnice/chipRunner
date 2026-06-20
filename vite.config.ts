import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
// 纯前端项目:状态持久化在浏览器 localStorage,无服务端 /api。
export default defineConfig({
  plugins: [vue()],
})
