import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // Solo lo que este proyecto escribe. Incluir el arranque, los scripts de
      // Prisma y las definiciones de tipos diluye el número hasta que deja de
      // decir nada sobre el código que de verdad calcula dinero.
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/prisma.ts',
        'src/types/**',
      ],
      reporter: ['text-summary', 'html'],
    },
  },
});
