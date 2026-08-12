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

**Hecho y commiteado (5 commits sobre master):**
- `CLAUDE.md` con la estrategia de desarrollo (TDD + ramas + trampas del producto).
- **Vitest montado**: 75 pruebas en verde + 1 fallo esperado a propósito.
- Avisos en la pantalla de horarios (editar y eliminar afectan reportes pasados).
- Tabla `DiaEsperado` en el schema + `calcularDiasEsperados` (función pura, 11 pruebas)
  + `materializarDias.ts` (servicio de generación).
- Aviso en Registros cuando el día ya tiene otra entrada.

**Estado de la materialización: a mitad.** La tabla existe en la BD **local** (aplicada
con `prisma db push`) y el servicio que la llena está escrito, pero **NADA la lee
todavía**. El sistema sigue calculando desde el horario actual, igual que antes.
Funcionalmente no ha cambiado nada para el usuario.

**No desplegado a producción.** La tabla NO existe en el servidor.

---

## Files in flight

Backend:
- `backend/prisma/schema.prisma` — modelo `DiaEsperado` agregado (aplicado solo en local).
- `backend/src/utils/diasEsperados.ts` — función pura que calcula los días. **Terminada.**
- `backend/src/utils/materializarDias.ts` — generación, regeneración y backfill.
  **Escrita, sin usar todavía.**
- `backend/src/utils/saldoTiempo.ts` — `calcularHorasEsperadas` **todavía recorre el
  horario**; es lo que hay que cambiar para que lea `DiaEsperado`.
- `backend/src/utils/tardanzas.ts` — `calcularTardanzas` y `franjaDelDia`, idem.
- `backend/src/routes/reportes.ts` — consumidor principal.

Pruebas (no se compilan, excluidas en `tsconfig.json`):
- `fechas.test.ts`, `saldoTiempo.test.ts`, `horasColombiana.test.ts`,
  `tardanzas.test.ts`, `diasEsperados.test.ts`, `liquidacionJulio.test.ts`.

Sin confirmar en el árbol (**del usuario, NO tocar**): `PLAYBOOK-INICIO.md` modificado,
`PLAYBOOK-BANAHOSTING.md` y `PLAYBOOK-BANAHOSTING-PHP.md` sin seguimiento.

---

## Changed

- **Vitest** + script `npm test`. `tsconfig.json` excluye `src/**/*.test.ts` para que
  `tsc` no copie las pruebas a `dist/` y viajen al servidor.
- Prueba de extremo a extremo de **julio 2026** con los números verificados a mano:
  167h20 trabajadas, 176h esperadas, 8h40 de saldo, $82.540 (y 16h40 / $158.730 con el
  permiso PERSONAL marcado como no remunerado). **Es el criterio de aceptación del
  siguiente paso: estos números NO pueden cambiar.**
- `descontarAlmuerzo` tiene una prueba marcada `it.fails` documentando un bug real sin
  corregir (ver abajo).
- Datos locales: se borraron los 2 registros del 12/08/2026 de QA Recargos y se dejó uno
  limpio 08:00–16:00 para que el usuario pruebe la tardanza cambiándolo a 09:00 (debe
  dar 50 min: 60 de retraso − 10 de tolerancia).

---

## Failed attempts

**Errores míos en las pruebas (ya corregidos, no repetir):**
- Ayudante `bog()` construyendo la fecha con cadena ISO: para horas ≥ 19, `hora + 5`
  pasa de 24 y genera fechas inválidas. Usar `Date.UTC`, que acarrea el día solo.
- Usé jornada fija de 42h en la prueba de julio. **La Ley 2101 baja de 44h a 42h el 15
  de julio de 2026**, así que las dos primeras semanas del mes tienen otro tope. Da 4h
  de diferencia. El motor resuelve la jornada UNA vez por semana ISO, con el primer día.

**Verificación en navegador:**
- Fijar el estado de React con eventos sintéticos (`.value` + `dispatchEvent`) **no
  funciona de forma fiable** en el modal de Registros: la petición sale bien pero el
  `<select>` vuelve a "Seleccionar…". Se verificó abriendo el registro en **modo
  edición**, donde el propio código llena los campos. El caso "crear desde cero" quedó
  **sin verificar con la misma solidez**.
- Los screenshots escalan a 800px de ancho: con viewports altos el contenido sale
  ilegible. Usar ~1400×900 y, para páginas cortas, alturas menores.

**Entorno:**
- `git worktree remove` **no existe** (git 2.15). Usar `rm -rf <ruta>` + `git worktree prune`.
- Una vez se copió el `dist` a `dist/` en la raíz de `frontend-build` en vez de
  `frontend/dist/`. Señal: decenas de "añadidos" y ningún "renombrado" en `git status`.
- Un agente del workflow murió a media respuesta ("Connection closed"); hubo que
  relanzar ese análisis por separado.

**Trampas del producto (documentadas en `CLAUDE.md`):**
- `.env.local` gana sobre `.env` incluso al compilar producción: apartarlo antes de
  `npm run build` y verificar que el bundle no tenga `localhost`.
- Las migraciones de Prisma están desfasadas del schema (se evolucionó con `db push`).
  `prisma migrate deploy` NO reproduce producción: el DDL se escribe a mano.

---

## Next step

**Hacer que `calcularHorasEsperadas` (`backend/src/utils/saldoTiempo.ts`) lea las filas
de `DiaEsperado` en vez de recorrer el horario actual.**

Concretamente:
1. Sembrar los días esperados de julio 2026 para Santiago Soto García en la BD local
   (usar `materializarColaborador` de `materializarDias.ts`).
2. Cambiar la firma para recibir los días materializados en lugar de `horario`.
   Mantener fuera de la fila —y aplicar al leer— los festivos, el tope semanal legal y
   los permisos, tal como está hoy.
3. Actualizar `reportes.ts` para consultar `DiaEsperado` del rango y pasárselo.
4. **Criterio de aceptación, no negociable:** `npm test` debe seguir dando los mismos
   números de julio (167h20 / 176h / 8h40 / $82.540). Si se mueve un minuto, algo se
   rompió. Esa prueba es la que protege este cambio.

Después de eso, en orden: `calcularTardanzas`, luego enganchar la generación
(`mantenerVentana` al arrancar y cada 24h, `regenerarFuturoDeHorario` en el `PUT` de
horarios), y por último el seeder de backfill + el SQL a mano para producción.

---

## Pendientes con el dueño (sin respuesta todavía)

De la lista de 5 mejoras que pidió (el punto 5 **ya estaba hecho**: Configuración → Novedades):
1. **Fotos en el desglose de Extras.** Bloqueo conocido: `DetalleRegistro`
   (`reportes.ts:43`) no trae el `id` del registro, así que el frontend no puede pedir
   las fotos. Distinguir "no se tomó foto" (marcó con cédula) de "se borró por
   retención a los 2 meses".
2. **Sedes** (solo plan Empresarial). Falta decidir: si un trabajador puede marcar en
   una sede distinta a la suya. Ya pidió que entrada y salida sean en el mismo lugar.
   La geocerca hoy es una sola por empresa en `Configuracion` (`GEO_LAT/LNG/RADIO`):
   hay que migrarla a "Sede principal" para no romper a quien ya usa GPS.
3. **Turnos rotativos.** Pidió **ver un prototipo antes de decidir**. Su idea original
   (adivinar el horario por la hora de entrada) no sirve: en un día de ausencia no hay
   entrada de dónde deducirlo, y es justo el día que genera descuento.
4. **Tolerancia de salida.** Ya decidió: si trabajó unos minutos no autorizados por
   debajo del umbral, se toma la hora de salida programada. **Sin respuesta:** si
   también aplica a las entradas tempranas (hoy sería asimétrico a favor de la empresa),
   y qué modo usan sus clientes (en SEMANAL el problema casi no existe; muerde en HORARIO).

**Bugs conocidos sin corregir:**
- `descontarAlmuerzo` (`horasColombiana.ts:151`) busca literalmente `'HOD'`. Un turno
  100% nocturno o dominical **no pierde el almuerzo**: se paga una hora no trabajada.
  Afecta vigilancia y salud. Ya hay prueba escrita en rojo (`it.fails`).
- `POST /festivos/generar/:anio` (`festivos.ts:39`) lo llama cualquier admin y escribe
  festivos **globales** (`empresaId: null`) que ven todos los clientes. El año no se valida.
- `connection_limit=5&pool_timeout=10` en el `DATABASE_URL` de producción: quedó
  documentado en `DESPLIEGUE.md` pero **el usuario nunca confirmó haberlo aplicado**.
  Sin eso, Prisma dimensiona el pool según las CPU físicas del servidor (64-88).
