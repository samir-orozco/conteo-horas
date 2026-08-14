# Goal

Que un día de trabajo se lea como **una jornada**, no como marcaciones sueltas.

Marcar el descanso parte el día en dos tramos, y la tabla de Registros los
mostraba como dos filas —el mismo día repetido, la segunda medio vacía— que se
leían como una marcación duplicada. De ahí salió todo lo demás: el descanso deja
de llamarse almuerzo (falso para un turno nocturno), el formulario edita la
jornada entera, el kiosco ofrece el descanso de frente, y las novedades se
aprueban donde se leen.

Dos reglas que gobiernan todo esto y no se tocan sin pensarlo:

- **Un tramo se funde con el siguiente solo si cerró saliendo al descanso.**
  Volver por la tarde a hacer extras sí abre otra jornada.
- **La suma de las jornadas de un día es exactamente `minutosContadosDelDia`.**
  Afirmada en `jornada.test.ts` sobre doce escenarios y verificada contra la base
  real con `backend/prisma/verificar-jornadas.ts`.

---

## Current State

**El lote de jornadas está desplegado y comprobado en producción** (14 de agosto
de 2026), backend y frontend.

```
health                    → {"status":"ok"}
PUT /registros/jornada/x  → 401     (la ruta nueva existe en el proceso vivo)
bundle servido            → index-BVbUNmj9.js
```

221 pruebas en verde · `tsc` limpio en backend y frontend · ESLint en 78 (sin
regresión) · diferencial de jornadas sobre datos reales sin descuadres.

### Repositorio, ya ordenado

| rama | commit | qué es |
|---|---|---|
| `master` | `179d163` | producción. Alineada con lo desplegado |
| `develop` | `179d163` | integración. Estaba 66 commits atrás; puesta al día |
| `frontend-build` | `49cf253` | artefacto. **Compilado y subido, sin desplegar** |
| `backend-build` | `e4371b4` | artefacto. Desplegado |
| `prisma-build` | `ae68fdd` | artefacto. Sin cambios: el esquema no se tocó |

Locales y `origin` alineadas en las cinco. Se borraron
`mejoras/reportes-y-sedes` (`1d903b3`) y `mejoras/jornada-una-fila` (`179d163`),
las dos completamente fundidas en `master`: ningún commit se perdió.

**Sin cambios de esquema en todo el lote**, así que no hay migración de Prisma ni
cliente que regenerar.

### Lo único que falta desplegar

`frontend-build` tiene compilado el bundle **`index-DxSI3sYe.js`**, que producción
todavía no sirve. Es el respaldo de `marcaciones`: sin él, la ventana entre copiar
el bundle y reiniciar Node vuelve a reventar la pantalla al editar, como pasó en
el despliegue anterior. **No es urgente** —el backend ya manda el campo— pero
conviene cerrarlo. Comandos exactos en *Next step*.

### Archivos sueltos en la raíz (no versionados, no míos)

No se tocaron. Decidir qué hacer con ellos:

- `ARRANQUE-PROYECTO-WEB.md` (361 líneas), `PLAYBOOK-BANAHOSTING.md` (772) y
  `PLAYBOOK-BANAHOSTING-PHP.md` (520) — documentación de Krumlab que no es de
  HoraPro. Se versionan, se mueven a otro repo, o se añaden a `.gitignore`.
- `WhatsApp Video 2026-07-17 at 15.22.42.mp4` (1,5 MB) — no debería acabar en git.

---

## Files in flight

Ninguno. El árbol está limpio y todo commiteado.

Los que concentran el cambio, para orientarse:

- `backend/src/utils/jornada.ts` — el corazón. `partirDiaEnJornadas`,
  `agruparEnJornadas`, `marcacionQueCierra`, `tramoQueChoca`,
  `instantesDeJornada`, `minutosVentana`, `GRACIA_MIN`.
- `backend/src/routes/registros.ts` — `GET /` por jornada, `PUT /jornada/:id`
  transaccional, validación de cruces, la novedad del día.
- `backend/src/routes/worker.ts` — kiosco: descanso en el botón grande, salida
  temprana que no se guarda sin motivo.
- `backend/src/utils/materializarDias.ts` — `diaYaEmpezado` y la regeneración
  desde hoy.
- `frontend/src/pages/Registros.tsx` — tabla por jornada, editor de jornada,
  `marcasDe` como respaldo.
- `frontend/src/pages/registros/ModalJornada.tsx` — el detalle.

---

## Changed

**Backend**

- `GET /registros` devuelve una entrada por JORNADA, con `marcaciones` dentro,
  `minutosContados`, `minutosAlmuerzoAqui` y la `novedad` del día.
- `PUT /registros/jornada/:id`: entrada, descanso y salida en una transacción,
  con **una sola** validación sobre el estado final. Encadenar dos PUT por
  marcación no sirve: mover el descanso hace que el primero pise al segundo.
- No se puede guardar un tramo que pise a otro del mismo día, ni una salida
  anterior a su entrada. El 400 trae el conflicto entero para poder ofrecer
  «eliminar esa y guardar».
- Una salida al descanso **no cierra la jornada** (`marcacionQueCierra`).
- El descanso distingue `EN_CURSO` de `ABIERTO` con una hora de gracia, la misma
  que usa el aviso automático (`GRACIA_MIN` vive en `jornada.ts`).
- `minutosEnVentana` se expone aparte para cobrar el descuento a la jornada que
  de verdad estuvo dentro de la ventana, no siempre a la primera.
- Un cambio de horario aplica **desde hoy** a quien no haya marcado y desde
  mañana a quien ya empezó (`diaYaEmpezado`, con la ventana de 18 h para el turno
  nocturno abierto). Borrar sus marcaciones lo vuelve a evaluar.
- El kiosco materializa el día al marcar; reactivar un colaborador y borrar un
  horario ahora regeneran.
- La salida temprana **no se guarda sin motivo**: 409 `REQUIERE_MOTIVO` sin
  escribir nada, y la novedad viaja en la misma llamada que la marca.

**Frontend**

- Una fila por jornada; ojo + lápiz + papelera en Acciones.
- El formulario edita la jornada: entrada, descanso (salió/regresó) y salida.
- «Almuerzo» → «Descanso» en toda la interfaz. El código y la base siguen
  diciendo `almuerzo` **a propósito**: renombrar columnas es una migración sobre
  una base cuyas migraciones ya están desfasadas de producción, y no le da nada a
  quien usa el producto.
- Kiosco: «Salgo a mi descanso» en el botón grande dentro de la ventana; la
  salida temprana pide motivo **antes** de marcar, con «Volver atrás».
- Las novedades se ven, se aprueban y se les cambia el motivo desde el detalle,
  con «se paga / no se paga» resuelto contra la política de la empresa.

---

## Failed attempts

Lo que salió mal, para no repetirlo:

1. **`new Date("2026-08-14")` en `PUT /jornada`** movió la jornada entera al día
   **13**: es medianoche UTC, que en Bogotá son las 7 p.m. del día anterior. Se
   ancla a `T05:00:00.000Z` explícitamente. Está en CLAUDE.md §4 y aun así se
   coló.
2. **`minutosDeMas` usado como «se tomó de más»**. Son cosas distintas: quien
   sale 15 min antes y vuelve 15 tarde volvió 15 tarde pero se tomó **30** de
   más. El comentario de `ResumenAlmuerzo` advertía justo de eso. Se añadió
   `minutosVentana`.
3. **Validación de cruces añadida sin mostrar el error**: `guardar()` no tenía
   try/catch, así que el 400 rompía la promesa y el modal simplemente no se
   cerraba. Sin mensaje. La validación era correcta y la experiencia quedó peor
   que antes.
4. **`otrosDelDia` no excluía las marcaciones propias** al editar una jornada
   (`editando` queda en null en ese camino), y el registro se avisaba a sí mismo
   con la hora que tenía antes de la última corrección.
5. **Se afirmó que `origen: 'MANUAL'` protegía los turnos rotativos.** Es cierto
   pero vacío: **nada escribe MANUAL nunca** (0 filas de 1.281). La protección
   existe y no tiene nada que proteger.
6. **Al absorber una marcación**, la superviviente conservaba `salidaAlmuerzo`, y
   la columna decía «Sin regreso» sobre un día recién completado.
7. **El botón Editar del detalle** siguió abriendo el formulario viejo por
   marcación después de haberlo quitado de la tabla.
8. **Frontend desplegado antes que el backend** → la pantalla revienta al editar
   con `Cannot read properties of undefined (reading '0')`. El orden es **backend
   primero**: el backend nuevo es compatible con el frontend viejo, no al revés.
   Y el `Restart` de cPanel no es opcional: sin él el proceso sigue con el código
   viejo aunque el `dist` ya esté copiado.
9. Errores de las propias pruebas, no del código: el helper de `ahoraBog` se
   construyó con aritmética UTC cuando `toZonedTime` devuelve una fecha de
   getters **locales**; y un `DELETE` de prueba llevaba
   `Content-Type: application/json` sin cuerpo, que Fastify rechaza.
10. **Dos workflows completos fallaron** por límite de sesión y hubo que
    relanzarlos; el segundo intento sí devolvió resultados.
11. Buena parte de los datos raros de la base local (tramos de 4 segundos,
    jornadas movidas de día, turnos nocturnos sueltos) **los generaron los
    scripts de prueba**. Cada uno restauraba lo suyo, pero conviene partir de un
    día limpio antes de volver a probar el kiosco.
12. **El handoff anterior se sobrescribió sin leerlo primero.** No se perdió nada
    —era del 12 de agosto, sobre la materialización del `DiaEsperado`, ya
    desplegada— y sigue recuperable con `git show 3c5521c:handoff.md`.

---

## Next step

**Desplegar `frontend-build` (`49cf253`), que ya está compilado y subido.**

[EN EL SERVIDOR]

```bash
cd ~/horapro-repo && git fetch origin && git checkout -f frontend-build && git pull && rm -rf ~/horapro.co/assets && cp -R frontend/dist/. ~/horapro.co/
```

Y comprobar. Debe decir **`index-DxSI3sYe.js`**:

```bash
curl -s https://horapro.co/ | grep -o "index-[A-Za-z0-9_-]*\.js"
```

No hace falta reiniciar Node: solo cambia el frontend.

Vuelta atrás, si hiciera falta:

```bash
cd ~/horapro-repo && git checkout -f frontend-build && git reset --hard 79c6717 && rm -rf ~/horapro.co/assets && cp -R frontend/dist/. ~/horapro.co/
```

---

## Pendiente de fondo

Lo encontró un rastreo adversarial y **no entró en el lote**. Cada uno merece su
propia comprobación diferencial antes de tocarlo.

**Los dos que tocan dinero — atacar primero:**

1. **`PUT /registros/jornada/:id` valida el cruce contra el día de ORIGEN, no el
   de destino** (`backend/src/routes/registros.ts`, donde se consulta `delDia`
   con `primera.fecha` antes de resolver `fechaBase`). Mover una jornada del 13 al
   14 valida contra las marcas del 13; si ya había jornada el 14 quedan dos
   solapadas y las horas se cuentan dos veces. **Arreglo:** resolver `fechaBase` y
   `colaboradorId` ANTES de consultar `delDia`. `PUT /:id` sí lo hace bien y sirve
   de modelo.
2. **`construirExtraConfig` clasifica horas extra con el horario VIVO**, no con el
   congelado (`backend/src/routes/reportes.ts`, dos llamadas). Es el mismo
   problema que motivó todo el `DiaEsperado`, pero por otra puerta: editar un
   horario mueve la clasificación de horas extra ya liquidadas.

**El resto, del mecanismo del día congelado:**

3. **`mantenerVentana` nunca repara una fila ya escrita**
   (`backend/src/utils/materializarDias.ts`): llama a `materializarColaborador`
   sin `pisarExistentes`, así que solo rellena huecos. Un día que quede congelado
   con el horario viejo se queda así hasta que alguien vuelva a guardar el
   horario, sin saber que hace falta. **Es el arreglo de fondo: cierra casi todos
   los demás.** Además su `try` envuelve el bucle entero, así que si un
   colaborador lanza, los siguientes no se materializan.
4. **La ventana de 18 h caduca sola.** Guardar el horario a las 08:00 difiere a
   mañana a quien tenga un turno nocturno abierto; a las 17:00 ese mismo cambio
   habría aplicado hoy. La decisión no se vuelve a mirar nunca.
5. **El auto-cierre nocturno desempieza el día** (`cierreTurnos.ts`): al escribir
   la salida, la persona deja de tener turno abierto y su día queda sin estrenar,
   pero con la fila vieja. Nadie lo reevalúa.
6. **`PUT /registros/:id` no reevalúa** al mover una marcación de fecha o de
   colaborador, igual que pasaba con el DELETE antes de arreglarlo. Conviene
   extraer un helper único y usarlo desde los tres sitios.
7. **`regenerarVarios` se corta al primer fallo** (`materializarDias.ts`): `for`
   secuencial sin try por colaborador. Si el tercero de cuarenta lanza, los otros
   37 se quedan con el horario viejo 60 días y el administrador no ve nada,
   porque la ruta responde `regeneracion: null`.

**Menores, baratos:**

- `diaYaEmpezado` no exige `r.entrada`, así que registrar una incapacidad sin
  hora hace que a esa persona el cambio de horario se le difiera «porque ya
  empezó su día».
- `regenerarDiasDeColaborador` se llama sin pasar `ahora`, así que cada iteración
  recalcula el suyo: un guardado a las 23:52 con 80 personas puede cruzar la
  medianoche y aplicar a unos hoy y a otros mañana.
- El comentario de `registros.ts` sobre que «el kiosco guarda `Registro.fecha` con
  la hora real» está desactualizado: `worker.ts` ancla a medianoche desde hace
  tiempo.
- **El kiosco permite marcar entrada y salida con segundos de diferencia**, lo
  que llena los días de tramos de 4 segundos. Poner un mínimo evitaría el ruido
  pero bloquearía correcciones rápidas legítimas: es decisión de producto.

**De la lista de tareas, sin empezar:** novedades de parte del día
(`horaInicio` / `horaFin` en `Permiso` ya existen en el esquema, pero nada los
usa todavía).
