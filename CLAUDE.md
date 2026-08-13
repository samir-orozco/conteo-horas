# Estrategia de desarrollo — HoraPro

Este archivo se lee al inicio de cada sesión. Define cómo se escribe código aquí.

> **Estado actual (2026-08-11): el proyecto NO tiene infraestructura de pruebas.**
> Cero corredor de tests, cero archivos de prueba, cero cobertura, y el backend
> ni siquiera tiene linter. El ciclo de la sección 2 **no se puede ejecutar
> todavía**. Hasta que exista la suite (sección 6), rige la sección 5, que es lo
> que de verdad se ha estado haciendo. No finjas que corriste pruebas que no
> existen.

---

## 1. Mandato

La corrección del código se demuestra sometiéndolo a validación automatizada, no
a que un humano lo lea línea por línea.

Corolario incómodo, y la razón de la advertencia de arriba: **mientras no exista
esa validación, el mandato no se cumple.** Decir "está probado" cuando lo único
que se hizo fue mirarlo en el navegador es mentir sobre la garantía. Se dice qué
se verificó y cómo.

Este producto calcula dinero de nómina. Un error no se manifiesta como una
pantalla rota: se manifiesta como un número plausible pero equivocado, que nadie
nota hasta que un trabajador reclama. Esa es la razón de todo lo que sigue.

---

## 2. Ciclo TDD de 4 pasos (obligatorio en cuanto exista la suite)

### 1. RED — pruebas primero, y verificar que fallan
Escribir o actualizar las pruebas unitarias, de integración y de aceptación
ANTES de escribir código de producción. Correr la suite y **comprobar
explícitamente que las nuevas pruebas fallan con el error esperado** antes de
seguir. Una prueba que nunca se vio fallar no prueba nada.

### 2. GREEN — implementación mínima
Escribir estrictamente el mínimo código necesario para que las pruebas pasen.
Nada de funciones especulativas ni de lógica que nadie pidió.

### 3. THE GAUNTLET — puertas de calidad automatizadas
- 100% de las pruebas unitarias y de integración en verde.
- Cero advertencias y cero errores en el verificador de tipos y en el linter.
- Cobertura alta sobre la lógica nueva (>80%).
- Pruebas de mutación donde aplique, para descartar pruebas que no prueban nada.

### 4. REFACTOR — código limpio
Refactorizar manteniendo todo en verde. Principios SOLID, funciones pequeñas,
cero código muerto.

---

## 3. Ramas

| Rama | Qué es |
|---|---|
| `master` | **Producción.** Refleja lo que está desplegado y verificado. Solo se actualiza después de desplegar y comprobar. |
| `develop` | Integración de lo que ya se probó. |
| `mejoras/*`, `feature/*` | Trabajo en curso. Todo cambio nace aquí. |
| `backend-build`, `frontend-build`, `prisma-build` | Artefactos compilados. No se editan a mano. |

**Volver atrás = volver a `master`.** Por eso `master` no avanza hasta que algo
está desplegado y comprobado en producción, no cuando "ya quedó listo".

Nunca se trabaja directo sobre `master` ni sobre `develop`.

---

## 4. Reglas específicas de este producto

Son las que ya nos han mordido. No son teoría.

- **Nada llega a producción sin permiso explícito.** Se compila y se dejan los
  comandos listos; el usuario los corre.
- **Un comando de terminal por bloque** cuando el usuario los va a ejecutar en el
  servidor, para que pueda revisar cada resultado.
- **La trampa del `.env.local`:** Vite lo prioriza sobre `.env` incluso al
  compilar para producción. Antes de `npm run build` hay que apartarlo, y después
  verificar que el bundle no contenga `localhost`.
- **Zona horaria:** `new Date("2026-07-01")` es medianoche **UTC**, que en Bogotá
  es el 30 de junio a las 7 p.m. Las fechas de rango se anclan a medianoche de
  Bogotá (05:00 UTC). Y `toZonedTime` no se aplica dos veces sobre la misma
  fecha.
- **El array `liquidacion` es sagrado:** alimenta `totalRecargos`,
  `totalAdicional` y los totales de horas. No se le agregan filas sintéticas; lo
  que no sea una hora liquidable viaja en su propio campo.
- **Antes de copiar a una rama de artefactos, verificar la ruta destino** con
  `git show --stat`. Un diff con decenas de "añadidos" y ningún "renombrado"
  significa que se copió al lugar equivocado.
- **Los cambios de esquema se hablan antes.** Las migraciones de Prisma están
  desfasadas del schema real (se evolucionó con `db push`), así que
  `prisma migrate deploy` no reproduce el estado de producción.

---

## 5. Cómo se verifica HOY, mientras no hay suite

No es un sustituto de las pruebas. Es lo que hay, y hay que ser explícito sobre
sus límites.

1. **`npx tsc --noEmit` en backend y frontend.** Obligatorio, siempre.
   Ojo: el build del frontend (`tsc -b`) es **más estricto** que `--noEmit` y
   detecta variables sin uso. Compilar antes de dar algo por terminado.
2. **Verificación numérica con datos reales.** Para cualquier cambio en el motor
   de horas o en la liquidación: un script en `backend/prisma/` que imprima el
   resultado, y cotejarlo **a mano** contra el cálculo esperado. Ejemplos vivos:
   `verificar-saldo.ts` y `probar-rango.ts`.
3. **Comprobación diferencial.** Antes de tocar el cálculo, guardar el resultado
   del período actual. Después, volver a correrlo y comparar. Si cambió algo que
   no se esperaba que cambiara, se revierte.
4. **Verificación en el navegador** con el servidor local, para lo que se ve.
5. **Nunca reportar como probado lo que solo compiló.**

---

## 6. Cómo salir del estado actual (pendiente, no hecho)

Orden propuesto. Cada paso da valor por sí solo:

1. **Vitest en el backend** + las primeras pruebas sobre `horasColombiana.ts`,
   `saldoTiempo.ts` y `tardanzas.ts`. Son funciones puras, sin base de datos:
   las más fáciles de probar y las que calculan el dinero. Los valores esperados
   ya existen y están verificados a mano en `verificar-saldo.ts` y
   `probar-rango.ts` — esos son los primeros casos de prueba, ya escritos.
2. **Linter en el backend** (el frontend ya tiene ESLint).
3. **Cobertura**, y recién ahí exigir el >80% de la sección 2.
4. **Pruebas de integración** de las rutas de reportes, con base de datos de
   prueba.
5. **Mutación** (Stryker), al final y solo sobre el motor de horas.

Hasta el paso 1, la sección 2 es una intención, no una regla en vigor.
