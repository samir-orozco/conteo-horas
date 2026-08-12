# Goal

Dar **historial a los horarios** de HoraPro. Hoy `Horario`/`FranjaHorario` no tienen
vigencia: editar un horario reescribe el pasado. Los reportes de meses anteriores se
recalculan con la configuración actual y, desde que existe el descuento por tiempo no
remunerado, eso **mueve dinero ya liquidado**.

El dueño lo detectó él mismo: cambió la entrada de 08:00 a 07:00 **el 17 de julio de
2026** y los reportes de fechas anteriores empezaron a mostrar tardanzas falsas.

**Solución elegida (opción B, aprobada):** *materializar el día*. Una fila por
colaborador y día con lo que su horario exigía ESE día. Se genera sola; el admin sigue
editando horarios igual que hoy.

Resuelve las tres causas del mismo síntoma:
1. Editar el contenido de un horario.
2. Cambiar a un colaborador de horario (`Colaborador.horarioId` tampoco tiene historial).
3. Turnos rotativos (queda habilitado: el admin cambia el día suelto).

Decisiones ya tomadas por el dueño:
- Backfill **desde el inicio** ("no hay tanta data").
- Al cambiar un horario: se regeneran los días **futuros**, los pasados no se tocan.
- El pasado ya dañado **no se recupera** y está aceptado ("igual ya se pagó esa nómina").
  No existe el dato de qué decía el horario antes ni cuándo cambió.

---

## Current State

Rama de trabajo: **`mejoras/reportes-y-sedes`**. `master` = producción (alineado y
desplegado). Volver atrás = volver a `master`.

**Los dos cálculos retroactivos ya leen el historial.** El saldo de tiempo
(`GET /liquidacion`) y las tardanzas (`GET /tardanzas` y `/tardanzas-resumen`)
consultan `DiaEsperado` del rango y ya NO recorren el horario vigente. Editar un
horario deja quieto el pasado.

**Hecho y commiteado (7 commits sobre master):**
- `CLAUDE.md` con la estrategia de desarrollo (TDD + ramas + trampas del producto).
- **Vitest montado**: ahora 92 pruebas en verde + 1 fallo esperado a propósito.
- Avisos en la pantalla de horarios (editar y eliminar afectan reportes pasados).
- Tabla `DiaEsperado` en el schema + `calcularDiasEsperados` + `materializarDias.ts`.
- Aviso en Registros cuando el día ya tiene otra entrada.
- **`calcularHorasEsperadas` lee `DiaEsperado`** + `combinarDiasEsperados` + enganche
  en `reportes.ts` + extracción del cliente Prisma a `src/prisma.ts`.
- **`calcularTardanzas` lee `DiaEsperado`**: la hora exigida y la tolerancia salen de
  la fila del día. Las dos rutas de tardanzas enganchadas, y el desglose del frontend
  muestra la tolerancia que se APLICÓ, no la del horario de hoy.

**No desplegado a producción.** La tabla NO existe en el servidor.

### Cómo se comporta ahora

`calcularHorasEsperadas(desde, fin, dias, festivos, permisos, politica, jornadaDe)` y
`calcularTardanzas(registros, dias, festivos, permisos)`. Ninguna recibe ya `horario`:
reciben **días materializados**. Fuera de la fila —y aplicado al leer— siguen los
festivos, el tope semanal legal y los permisos, tal como estaban.

`combinarDiasEsperados(desde, fin, materializados, horario)` cubre el rango completo:
donde HAY fila manda la fila; donde NO la hay cae al horario vigente, que es lo que el
sistema hacía siempre. Por eso el backfill puede ir a su ritmo **sin que nadie vea
números nuevos por sorpresa**, y por eso ningún día se convierte en silencio en 0.

Cada fila de `Tardanza` ahora lleva su propia `toleranciaMin`. La del período (la que
se muestra en la cabecera del desglose) es la del **último día del rango**, mismo
criterio con el que ya se elige la jornada vigente al cierre para el valor hora. No se
exige que ese día sea laborable: los días de descanso también guardan la tolerancia, y
pedirlo dejaba en 0 un rango que cayera entero en fin de semana.

---

## Files in flight

Backend:
- `backend/src/utils/saldoTiempo.ts` — `calcularHorasEsperadas` recorre filas, no el
  horario. Nuevo tipo `DiaEsperadoParaSaldo`. **Terminado.**
- `backend/src/utils/diasEsperados.ts` — `calcularDiasEsperados` + `combinarDiasEsperados`.
  **Terminado.**
- `backend/src/routes/reportes.ts` — `GET /liquidacion` consulta `prisma.diaEsperado` del
  rango y lo combina con el horario. **Terminado.**
- `backend/src/prisma.ts` — **nuevo**. El cliente ya no vive en `index.ts`; `index.ts` lo
  reexporta, así que los `import { prisma } from '../index'` existentes siguen valiendo.
  Hacía falta: importar `index.ts` ARRANCA el servidor, así que ningún script de
  `prisma/` podía usar `materializarDias.ts`, y `index → utils → index` era un ciclo.
- `backend/src/utils/materializarDias.ts` — ahora importa de `../prisma`. **Sin
  enganchar todavía**: nadie la llama automáticamente.
- `backend/src/utils/tardanzas.ts` — `calcularTardanzas` recorre filas, no el horario.
  Nuevo tipo `DiaEsperadoParaTardanza`; `Tardanza` gana `toleranciaMin`. **Terminado.**
- `frontend/src/pages/ReporteLlegadasTarde.tsx` — la cabecera del desglose muestra
  `toleranciaMin` de la respuesta (la aplicada) en vez de `horario.toleranciaMin`
  (la de hoy). **Terminado.**
- `backend/prisma/materializar-julio.ts` — **nuevo**. Siembra julio 2026 de Santiago.
- `backend/prisma/probar-historial-horario.ts` — **nuevo**. Reproduce el bug del dueño
  contra la BD local, sobre el saldo Y sobre las tardanzas, y restaura el horario en un
  `finally`.
- `backend/prisma/verificar-saldo.ts` y `probar-rango.ts` — actualizados a la firma nueva.
  `verificar-saldo.ts` ahora imprime cuántos días salieron de la tabla y cuántos del
  horario.

Sin confirmar en el árbol (**del usuario, NO tocar**): `PLAYBOOK-INICIO.md` modificado,
`PLAYBOOK-BANAHOSTING.md` y `PLAYBOOK-BANAHOSTING-PHP.md` sin seguimiento.

---

## Changed

Pruebas: 75 → **92 en verde** + 1 `it.fails` a propósito.
- `saldoTiempo.test.ts`: el ayudante materializa al vuelo, así que las 15 pruebas de
  siempre ahora recorren el camino nuevo. Cuatro pruebas nuevas: el horario editado no
  mueve el pasado, el día ajustado a mano manda, un día sin materializar no exige nada,
  y las filas fuera de rango se ignoran.
- `diasEsperados.test.ts`: 6 pruebas de `combinarDiasEsperados`.
- `tardanzas.test.ts`: igual, más 7 pruebas nuevas — adelantar la entrada no inventa
  tardanzas viejas, la tolerancia sale del día, cada fila informa la suya, el turno
  rotativo manda, y un rango entero en fin de semana informa la tolerancia vigente.
- `liquidacionJulio.test.ts`: los días llegan materializados. **Los números no se
  movieron**: 167h20 / 176h / 8h40 / $82.540, 184h / 16h40 / $158.730, y 2 días tarde
  con 59 min.

### Cómo se verificó (esto sí se corrió, no es "compiló")

1. `npm test` → 92 verdes + 1 fallo esperado. `tsc --noEmit` del backend y `tsc -b` del
   frontend, limpios. El único error de ESLint del frontend (`set-state-in-effect`) ya
   estaba en `HEAD`: se comprobó con `git stash`.
2. **Comprobación diferencial contra `git HEAD`**, una por cada función: se copió la
   original desde git a un archivo temporal y se compararon las dos implementaciones
   sobre la BD local. Saldo: 12 colaboradores × 5 rangos = **60 comparaciones, 0
   diferencias**. Tardanzas: todos los que tienen horario activo × 5 rangos = **40
   comparaciones, 0 diferencias**, con 14 casos de tardanzas reales y comparando el
   detalle día a día. Los temporales ya se borraron.
   - La primera pasada dio 2 diferencias, y valió la pena: en un rango sin ningún día
     laborable la tolerancia informada caía a 0. De ahí salió la regla del último día
     del rango sin exigir que sea programado.
3. `verificar-saldo.ts` con 0 filas (camino de respaldo) y con las 31 filas de julio:
   salida **idéntica** al baseline previo al cambio.
4. **Por HTTP, con el API real y sesión real**: `GET /liquidacion` de Santiago para julio
   2026 devuelve esperadas 11.040 min (184h), trabajadas 10.040 (167h20), saldo 1.000
   (16h40), monto **$158.730,16** — el mismo número de la prueba unitaria, al centavo.
   `/tardanzas-resumen` da 2 días y 59 min, y `/tardanzas` el detalle 06/07 (22 min) y
   13/07 (37 min) con `toleranciaMin` 3 por fila. Los otros 3 colaboradores, sin
   materializar, siguen dando lo suyo por respaldo: nadie quedó en 0.
5. **El escenario del dueño, contra la BD local** (`probar-historial-horario.ts`),
   con la entrada adelantada a 07:00:
   - Horas esperadas: **184h00 leyendo el historial** contra **192h00 recorriendo el
     horario vigente** (8h de deuda inventada, ≈$76.190).
   - Tardanzas: **2 días y 59 min leyendo el historial** contra **19 días y 1.148 min**
     recorriendo el horario. Ese salto de 2 a 19 días es exactamente lo que él vio.
   - El horario se restauró y se comprobó en la BD.
6. **En el navegador**: el desglose de llegadas tarde abre y muestra
   "Horario QA 7-4 (demo extra) (10 min de tolerancia)" con las filas correctas, sin
   errores en consola.

**Datos locales:** se sembraron 31 filas en `dias_esperados` (julio 2026 de Santiago
Soto García, todas `AUTO`). El resto de colaboradores sigue con 0 filas, o sea con el
camino de respaldo. Los registros del 12/08/2026 de QA Recargos siguen como se dejaron.

---

## Failed attempts

**De esta sesión:**
- El navegador **no se pudo manejar** para llegar a la liquidación en la UI: el
  `<select>` acepta el valor en el DOM pero el estado de React no se entera y "Calcular"
  no dispara. Se verificó llamando el endpoint directo con el token de la sesión, que
  además prueba la ruta completa.
- Los clics por coordenada tampoco abrían el modal de llegadas tarde. Lo que **sí**
  funciona es `elemento.click()` desde la consola: React lo recibe como un evento real.
  Es la diferencia con fijar `.value` a mano, que es lo que nunca funciona.
- `resize_window` después de `navigate` no siempre pega: hay que volver a llamarlo
  DESPUÉS de navegar, o el screenshot sale a escala mínima e ilegible.
- Cuidado con `mysql -e` y comillas en zsh: partir la consulta en varias líneas falla.

**Errores míos en las pruebas (ya corregidos, no repetir):**
- Ayudante `bog()` construyendo la fecha con cadena ISO: para horas ≥ 19, `hora + 5`
  pasa de 24 y genera fechas inválidas. Usar `Date.UTC`, que acarrea el día solo.
- Usé jornada fija de 42h en la prueba de julio. **La Ley 2101 baja de 44h a 42h el 15
  de julio de 2026**, así que las dos primeras semanas del mes tienen otro tope. Da 4h
  de diferencia. El motor resuelve la jornada UNA vez por semana ISO, con el primer día.

**Verificación en navegador:**
- Fijar el estado de React con eventos sintéticos (`.value` + `dispatchEvent`) **no
  funciona de forma fiable**. Se verificó abriendo el registro en **modo edición**, donde
  el propio código llena los campos. El caso "crear desde cero" quedó **sin verificar con
  la misma solidez**.
- Los screenshots escalan a 800px de ancho: con viewports altos el contenido sale
  ilegible. Usar ~1400×900 y, para páginas cortas, alturas menores. `resize_window`
  después de llenar un formulario lo re-renderiza.

**Entorno:**
- `git worktree remove` **no existe** (git 2.15). Usar `rm -rf <ruta>` + `git worktree prune`.
- Una vez se copió el `dist` a `dist/` en la raíz de `frontend-build` en vez de
  `frontend/dist/`. Señal: decenas de "añadidos" y ningún "renombrado" en `git status`.

**Trampas del producto (documentadas en `CLAUDE.md`):**
- `.env.local` gana sobre `.env` incluso al compilar producción: apartarlo antes de
  `npm run build` y verificar que el bundle no tenga `localhost`.
- Las migraciones de Prisma están desfasadas del schema (se evolucionó con `db push`).
  `prisma migrate deploy` NO reproduce producción: el DDL se escribe a mano.

---

## Next step

**Enganchar la generación.** Los dos consumidores ya leen `DiaEsperado`, pero **nadie
la llena automáticamente**: hoy las filas solo existen porque se sembraron a mano.
Mientras siga así, todo el mundo va por el camino de respaldo y la función no sirve
para nada en la práctica.

1. `mantenerVentana` al arrancar y cada 24h, en `index.ts`, al lado de
   `cerrarTurnosOlvidados`. Es idempotente. Ya no hay ciclo de imports que lo estorbe
   (por eso se extrajo `src/prisma.ts`).
2. `regenerarFuturoDeHorario(horarioId)` en el `PUT` de horarios (`routes/horarios.ts`).
   Solo toca de mañana en adelante y nunca pisa un día `MANUAL`.
3. Ojo con lo que HOY no está cubierto: cambiar a un colaborador de horario
   (`PUT /colaboradores/:id` con otro `horarioId`) también debería regenerar su futuro.
   Es la causa nº 2 de las tres que se listaron arriba y no la cubre
   `regenerarFuturoDeHorario`, que va por `horarioId`.

Después:
- **Seeder de backfill** (`backfillColaborador` ya existe) + el **DDL a mano para
  producción**.
  **El DDL va ANTES que el código**: `/liquidacion`, `/tardanzas` y
  `/tardanzas-resumen` ya consultan `dias_esperados`, y si la tabla no existe las tres
  rutas responden 500. No se puede desplegar el backend primero.
- Tapar `almuerzoDelRegistro` (ver los bugs de abajo): es la última fuga retroactiva.

---

## Pendientes con el dueño (sin respuesta todavía)

De la lista de 5 mejoras que pidió (el punto 5 **ya estaba hecho**: Configuración → Novedades):
1. **Fotos en el desglose de Extras.** Bloqueo conocido: `DetalleRegistro`
   (`reportes.ts:44`) no trae el `id` del registro, así que el frontend no puede pedir
   las fotos. Distinguir "no se tomó foto" (marcó con cédula) de "se borró por
   retención a los 2 meses".
2. **Sedes** (solo plan Empresarial). Falta decidir: si un trabajador puede marcar en
   una sede distinta a la suya. Ya pidió que entrada y salida sean en el mismo lugar.
   La geocerca hoy es una sola por empresa en `Configuracion` (`GEO_LAT/LNG/RADIO`):
   hay que migrarla a "Sede principal" para no romper a quien ya usa GPS.
3. **Turnos rotativos.** Pidió **ver un prototipo antes de decidir**. Su idea original
   (adivinar el horario por la hora de entrada) no sirve: en un día de ausencia no hay
   entrada de dónde deducirlo, y es justo el día que genera descuento. La pieza técnica
   ya existe: una fila `DiaEsperado` con `origen = 'MANUAL'` nunca se pisa.
4. **Tolerancia de salida.** Ya decidió: si trabajó unos minutos no autorizados por
   debajo del umbral, se toma la hora de salida programada. **Sin respuesta:** si
   también aplica a las entradas tempranas (hoy sería asimétrico a favor de la empresa),
   y qué modo usan sus clientes (en SEMANAL el problema casi no existe; muerde en HORARIO).

**Bugs conocidos sin corregir:**
- **El almuerzo del pasado todavía se reescribe.** `almuerzoDelRegistro`
  (`reportes.ts:32`) usa el horario ACTUAL para decidir cuánto almuerzo descontar de las
  horas TRABAJADAS. Es la misma fuga que se acaba de tapar del lado esperado, pero del
  otro lado del cálculo: cambiar `almuerzoMin` o `tieneAlmuerzo` mueve meses cerrados.
  La fila `DiaEsperado` ya trae `almuerzoMin` del día; el arreglo es leerlo de ahí.
- `descontarAlmuerzo` (`horasColombiana.ts:151`) busca literalmente `'HOD'`. Un turno
  100% nocturno o dominical **no pierde el almuerzo**: se paga una hora no trabajada.
  Afecta vigilancia y salud. Ya hay prueba escrita en rojo (`it.fails`).
- **La cabecera del desglose de llegadas tarde muestra el rango corrido un día.**
  `ReporteLlegadasTarde.tsx` hace `format(new Date(desde), 'dd/MM/yyyy')`, y
  `new Date("2026-08-01")` es medianoche UTC = 31 de julio 7 p.m. en Bogotá. Con el
  rango 01/08–12/08 el modal dice "31/07/2026 — 11/08/2026". Es la trampa de zona
  horaria de siempre, en el display; los números están bien. No se tocó porque es un
  bug aparte y ya venía de antes.
- `POST /festivos/generar/:anio` (`festivos.ts:39`) lo llama cualquier admin y escribe
  festivos **globales** (`empresaId: null`) que ven todos los clientes. El año no se valida.
- `connection_limit=5&pool_timeout=10` en el `DATABASE_URL` de producción: quedó
  documentado en `DESPLIEGUE.md` pero **el usuario nunca confirmó haberlo aplicado**.
  Sin eso, Prisma dimensiona el pool según las CPU físicas del servidor (64-88).

**Quién usa todavía el horario vigente (para el mapa mental):**
`dashboard.ts`, `registros.ts` y `cierreTurnos.ts` lo usan para **hoy** — ahí el horario
actual es lo correcto y no hay nada que cambiar. De los retroactivos ya solo queda
`almuerzoDelRegistro`.
