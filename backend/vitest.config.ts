import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Las pruebas corren en una zona horaria que NO es la de Bogotá, a
    // propósito, igual que las del frontend. Este lado es el que CALCULA el
    // dinero: las fechas se anclan a medianoche de Bogotá (05:00 UTC) y los
    // días se parten con `toZonedTime`. Si alguien olvida la zona, en la
    // máquina de un desarrollador colombiano la prueba pasa igual y el defecto
    // llega a producción liquidando el día equivocado.
    //
    // Al fijarla se comprobó que la suite entera pasaba así, de modo que no
    // está tapando nada preexistente. Ver la sección 8.1 de CLAUDE.md.
    env: { TZ: 'America/Los_Angeles' },
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
