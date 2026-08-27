// `defineConfig` sale de vitest/config y no de vite: es el mismo tipo de Vite
// más la sección `test`. Con el de vite, tsc rechaza `test` como propiedad
// desconocida, y este proyecto compila con `tsc -b`, que es estricto.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom y no el entorno de Node: aquí se prueban componentes, y sin un DOM
    // no hay dónde montarlos.
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/pruebas/preparar.ts',
    // El blog es HTML estático generado por su propio script y no tiene nada
    // que Vitest pueda montar.
    exclude: ['node_modules', 'dist', 'blog'],
    coverage: {
      provider: 'v8',
      // Solo lo que este proyecto escribe. Sin esto, la cobertura la diluyen
      // los archivos de arranque y de configuración y el número deja de decir
      // nada sobre el código que importa.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/pruebas/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      reporter: ['text-summary', 'html'],
    },
  },
})
