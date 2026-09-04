# Estrategia de desarrollo — HoraPro

Este archivo se lee al inicio de cada sesión. Define cómo se escribe código aquí.

> **Estado actual (2026-08-15): hay suite, pero solo cubre la lógica pura.**
>
> Vitest corre en el backend con 12 archivos de prueba y 234 casos sobre
> `src/utils/` (`npm test`). El ciclo de la sección 2 **rige de verdad** para todo
> lo que viva ahí: son funciones puras, sin base de datos, y son las que calculan
> el dinero.
>
> Lo que sigue SIN cubrir, y por lo tanto sigue gobernado por la sección 5:
> las rutas de Fastify, el esquema de Prisma y todo el frontend (que tiene ESLint
> pero ningún corredor de pruebas). El backend tampoco tiene linter, y no hay
> medición de cobertura ni pruebas de mutación.
>
> La regla práctica: **si lo que vas a tocar es una función pura, se escribe la
> prueba primero y se la ve fallar.** Si es una ruta o una pantalla, se verifica
> como dice la sección 5 y se dice explícitamente qué se verificó y cómo. No
> finjas que corriste pruebas que no existen.

---

## 1. Mandato

La corrección del código se demuestra sometiéndolo a validación automatizada, no
a que un humano lo lea línea por línea.

Corolario incómodo, y la razón de la advertencia de arriba: **donde no existe
esa validación, el mandato no se cumple.** Hoy se cumple en `src/utils/` y no se
cumple en las rutas ni en el frontend. Decir "está probado" cuando lo único que
se hizo fue mirarlo en el navegador es mentir sobre la garantía. Se dice qué se
verificó y cómo.

Este producto calcula dinero de nómina. Un error no se manifiesta como una
pantalla rota: se manifiesta como un número plausible pero equivocado, que nadie
nota hasta que un trabajador reclama. Esa es la razón de todo lo que sigue.

---

## 2. Ciclo TDD de 4 pasos (en vigor para la lógica pura de `src/utils/`)

### 1. RED — pruebas primero, y verificar que fallan
Escribir o actualizar las pruebas unitarias, de integración y de aceptación
ANTES de escribir código de producción. Correr la suite y **comprobar
explícitamente que las nuevas pruebas fallan con el error esperado** antes de
seguir. Una prueba que nunca se vio fallar no prueba nada.

### 2. GREEN — implementación mínima
Escribir estrictamente el mínimo código necesario para que las pruebas pasen.
Nada de funciones especulativas ni de lógica que nadie pidió.

### 3. THE GAUNTLET — puertas de calidad automatizadas
- `npm test` en el backend, entero en verde (no solo el archivo que tocaste).
- `npx tsc --noEmit` en el backend y `npx tsc -b` en el frontend, sin errores.
- ESLint del frontend sin errores nuevos. Ojo: hay errores preexistentes —
  compruébalo contra `HEAD` antes de dar por tuyo uno que ya estaba.
- Pendientes de montar (sección 6): cobertura >80% y pruebas de mutación.

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
- **La dependencia `xlsx` apunta a `cdn.sheetjs.com`, no a npm, y eso es
  correcto.** SheetJS dejó de publicar en npm y la última versión de allí
  (0.18.5) tiene dos avisos sin parche posible. `npm audit fix` no la arregla y
  devolverla a `^0.18.5` los reabre. Está explicado en
  `formatoImportacion.ts` y en `exportar.ts`, que son sus dos únicos usos.

- **Los cambios de esquema se hablan antes.** Las migraciones de Prisma están
  desfasadas del schema real (se evolucionó con `db push`), así que
  `prisma migrate deploy` no reproduce el estado de producción.

---

## 5. Cómo se verifica lo que la suite todavía no cubre

Rutas, esquema y frontend. No es un sustituto de las pruebas. Es lo que hay, y
hay que ser explícito sobre sus límites.

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

## 6. Cómo terminar de salir del estado actual

Orden propuesto. Cada paso da valor por sí solo. **El paso 1 ya está hecho.**

1. ~~**Vitest en el backend**, con pruebas sobre las funciones puras de
   `src/utils/`~~ — hecho: 12 archivos, 234 casos, `npm test`.
2. **Linter en el backend** (el frontend ya tiene ESLint).
3. **Cobertura**, y recién ahí exigir el >80% de la sección 2.
4. **Pruebas de integración** de las rutas de reportes, con base de datos de
   prueba.
5. **Mutación** (Stryker), al final y solo sobre el motor de horas.

Mientras falten los pasos 2 a 5, la sección 2 rige solo donde hay pruebas, y la
sección 5 cubre el resto.

---

## 7. Actualización: el frontend ya tiene pruebas y hay cobertura

Lo que decía la advertencia del encabezado sobre el frontend dejó de ser cierto
el 26 de agosto de 2026. El estado real ahora:

| | Backend | Frontend |
|---|---|---|
| Pruebas | Vitest, `npm test` | Vitest + Testing Library, `npm test` |
| Tipos | `npx tsc --noEmit` | `npx tsc -b` (más estricto) |
| Linter | **sigue sin haber** | ESLint, `npm run lint` |
| Cobertura | `npm run test:cobertura` | `npm run test:cobertura` |
| Mutación | sigue sin haber | sigue sin haber |

Con eso, el ciclo de la sección 2 **ya puede regir también en los componentes**,
no solo en `src/utils/`. Las pruebas de interfaz se escriben con Testing Library
y consultan por lo que ve una persona (texto, rol), no por clases de CSS: una
prueba que se rompe al renombrar una clase no está probando comportamiento.

### Qué exigir de la cobertura

El número global no sirve como puerta y no se debe usar como tal. Hoy el backend
entero está en 17% porque las rutas no tienen pruebas, mientras el motor de horas
(`jornada`, `saldoTiempo`, `tardanzas`, `almuerzo`, `diasEsperados`) está entre
96% y 100%. Ese contraste es el dato honesto: **lo que calcula dinero está
cubierto, lo que hace de plomería no.**

La puerta es sobre **lo nuevo o lo que se toca**: por encima del 80%. Medirlo
así, apuntando a los archivos del cambio:

```
npx vitest run --coverage --coverage.reporter=text --coverage.include='src/utils/<archivo>.ts'
```

Con un matiz que aprendimos después, en 8.2: la puerta es sobre la **decisión**,
no sobre el archivo. Un archivo que mezcla decisión y plomería no va a llegar al
80% y no debe intentarlo a la fuerza.

### Las pruebas del frontend corren fuera de Bogotá, a propósito

`vite.config.ts` fija `TZ: 'America/Los_Angeles'` en las pruebas. No es un
capricho: todo lo que se le muestra a una persona se formatea en hora de Bogotá,
y las fechas de vinculación se guardan a medianoche de Bogotá (05:00 UTC). Si
alguien olvida el `timeZone` en un `toLocaleDateString`, en la máquina de un
desarrollador colombiano la prueba pasa igual y el error llega a producción
pintando el día anterior.

Al montar esta regla apareció un caso real: la línea de tiempo del colaborador
mostraba un reingreso del 1 de septiembre como 31 de agosto para cualquiera al
occidente de Colombia. El formateo compartido vive en `src/lib/fechas.ts`.

### Lo que sigue pendiente

1. ~~Vitest en el backend~~ — hecho.
2. **Linter en el backend.** Sigue siendo el hueco más grande.
3. ~~Cobertura~~ — hecha en los dos lados.
4. **Pruebas de integración de las rutas**, con base de datos de prueba.
5. **Mutación** (Stryker), al final y solo sobre el motor de horas.

---

## 8. Reglas que salieron de un fallo real (1 de septiembre de 2026)

Las seis salen del mismo incidente y ninguna es teoría: **el auto-cierre de
turnos dejó de cerrar y nadie se enteró durante dos semanas, con la suite en
verde todo el tiempo.** Cuatro turnos del lunes seguían abiertos el martes al
mediodía en producción.

El diagnóstico, para que se entienda de dónde sale cada regla: el barrido corría
cada 24 horas contadas *desde el arranque del proceso*. Como solo toca días ya
pasados, la hora a la que cierra los turnos es la hora a la que arrancó la app.
El despliegue del 31/08 la reinició a las 22:12 y con eso movió el barrido a las
22:12. Encima, cuando no encontraba la franja marcaba el turno y dejaba la hora
en null a propósito, y la ruta perdía esa marca camino al frontend, así que en
la tabla se veía idéntico a un turno que nadie tocó.

Los tres defectos vivían en `index.ts`, `registros.ts` y la plomería de
`cierreTurnos.ts`. **Ninguno en una función pura.** Es decir: exactamente donde
el ciclo de la sección 2 no llega. De ahí las reglas.

### 8.1 Las pruebas del backend corren fuera de Bogotá, igual que las del frontend

La sección 7 ya explica por qué el frontend fija `TZ: 'America/Los_Angeles'`. El
backend tenía la misma exposición y ninguna guarda, siendo que es **el que
calcula el dinero** con fechas ancladas a medianoche de Bogotá (05:00 UTC).

`vitest.config.ts` del backend ahora fija la misma zona. Se comprobó antes de
fijarla que la suite entera pasaba así, de modo que no esconde nada preexistente.

Al escribir una prueba con fechas, darlas en UTC explícito y no con
`new Date(2026, 7, 31)`, que depende del reloj de quien la corre:

```ts
// Un instante dado en hora de Bogotá (UTC-5 todo el año, sin horario de verano).
const bog = (a: number, mes: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));
```

### 8.2 La puerta de cobertura es sobre la DECISIÓN, no sobre el archivo

`cierreTurnos.ts` quedó en 59% después de arreglarlo, y ese es el número
**correcto**: la mitad no cubierta es la que habla con MySQL. Exigirle 80% al
archivo obliga a una de dos cosas malas, bloquear el arreglo o escribir una
prueba de mentira para llegar al número.

La regla: **si un archivo mezcla decisión y plomería, la decisión se saca a una
función pura y es esa la que tiene que pasar del 80%.** La plomería se verifica
como dice la sección 5.

En ese arreglo la decisión salió a `decidirCierre` (qué hora de salida se le
pone a alguien que no marcó), que es justo lo que mueve dinero. Quedó al 100%
mientras el archivo entero está al 59%.

**Se reportan los dos números, no solo el bueno.**

### 8.3 Trabajos periódicos: tres formas de fallar en silencio

Van juntas porque las tres se dieron a la vez en el mismo trabajo.

1. **Un intervalo anclado al arranque corre a la hora del último despliegue.** Si
   la tarea solo actúa sobre días ya pasados, `setInterval(f, 24h)` la deja
   corriendo a la hora en que se reinició el servidor. Anclar al reloj, o correr
   lo bastante seguido para que la hora de arranque no importe.
2. **Un trabajo que solo habla cuando hace algo es indistinguible de uno que
   nunca corrió.** El barrido solo escribía en el log cuando cerraba turnos.
   Registrar siempre, incluida la pasada que no encontró nada.
3. **Un `catch` que devuelve un valor neutro y sigue convierte una caída en un
   silencio.** `cerrarTurnosOlvidados` devolvía 0 tanto si no había nada que
   cerrar como si la consulta explotaba. Si el catch se traga el error, que al
   menos deje huella distinguible del camino normal.

Los otros trabajos diarios (`avisarAlmuerzosSinRegreso`, el aviso de contratos y
`mantenerVentana`) siguen con el patrón de 24 horas anclado al arranque y no se
han revisado con esta vara.

### 8.4 Ninguna consulta de un trabajo periódico o una ruta caliente se da por buena sin ver su `EXPLAIN`

En el commit del arreglo se escribió "es una consulta indexada" sin comprobarlo,
y era falso: `registros`, la tabla que más rápido crece del producto, no tenía
ningún índice que sirviera. El plan real era `Table scan`.

Medido sobre una tabla de prueba con la misma estructura y 1.048.576 filas:

| | plan | tiempo |
|---|---|---|
| sin índice | `Table scan` sobre 1,04M filas | 233 ms |
| con índice | `Covering index range scan`, 30 filas | 0 ms |

Dos corolarios:

- **Un `Table scan` sobre `registros` o `dias_esperados` no se acepta**, ni
  siquiera en un trabajo que corre una vez al día. Crecen con el historial de
  todas las empresas juntas.
- **Los índices se agregan cuando la tabla está pequeña.** El `ALTER` es
  instantáneo con cientos de filas y caro con millones. Esperar a tener el
  problema es esperar a que la cura también duela.

En un índice compuesto el orden no es decorativo: MySQL solo usa todas las
partes si las igualdades van primero y el rango va último. Ver
`sql/indice-turnos-abiertos.sql`.

### 8.5 `prisma` se importa de `./prisma`, nunca de `./index`

`cierreTurnos.ts` traía el cliente de `'../index'`, así que importarlo levantaba
Fastify entero: correr `npm test` abría el puerto 3001 y disparaba las tareas
diarias **contra la base de desarrollo**.

Quedan **18 archivos** con ese import (16 rutas y dos utilidades,
`kioscoConfig.ts` y `capacidades.ts`). Hoy es inofensivo para las rutas, porque
`index.ts` las importa de todas formas. Deja de serlo el día que se escriban las
pruebas de integración de rutas, el pendiente número 4: ese día las 18 levantan
el servidor. Arreglarlas antes de llegar ahí, no después.

### 8.6 Mientras no existan las pruebas de integración, se parte en dos y se dice cuál es cuál

La sección 5 dice cómo verificar lo que la suite no cubre, pero no qué hacer con
el código nuevo que cae en esa zona. El protocolo:

1. Sacar la decisión a una función pura y probarla con el ciclo de la sección 2.
2. Verificar la costura a mano contra datos reales, con un script en
   `backend/prisma/` que cree el caso, corra la función de verdad, compruebe lo
   que escribió y **borre lo que creó**.
3. Decir explícitamente cuál de las dos cosas respalda cada afirmación.

Ejemplo vivo: `backend/prisma/diagnostico-autocierre.ts`, que es de solo lectura
y dice, turno por turno, qué haría el barrido y por qué.
