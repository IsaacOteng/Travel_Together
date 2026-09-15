import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
          tailwindcss(),
  ],
  // Always use 5173. If it's taken, fail loudly instead of silently moving to 5174.
  server: {
    port: 5173,
    strictPort: true,
  },
})

