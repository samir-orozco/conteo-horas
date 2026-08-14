# Goal

Que un día de trabajo se lea como **una jornada**, no como marcaciones sueltas.

Marcar el descanso parte el día en dos tramos, y la tabla de Registros los
mostraba como dos filas —el mismo día repetido, la segunda medio vacía— que se
leían como una marcación duplicada. De ahí salió todo lo demás: el descanso deja
de llamarse almuerzo (falso para un turno nocturno), el formulario edita la
jornada entera, el kiosco ofrece el descanso de frente, y las novedades se
aprueban donde se leen.

Regla que gobierna la agrupación: **un tramo se funde con el siguiente solo si
cerró saliendo al descanso.** Volver por la tarde a hacer extras sí abre otra
jornada.

Invariante que no se puede romper: **la suma de las jornadas de un día es
exactamente `minutosContadosDelDia`.** Está afirmada en `jornada.test.ts` sobre
doce escenarios y verificada contra la base real con
`backend/prisma/verificar-jornadas.ts`.

---

## Current State

**Desplegado y comprobado en producción el 14 de agosto de 2026.** Backend y
frontend, los dos.

```
health                    → {"status":"ok"}
PUT /registros/jornada/x  → 401     (la ruta nueva existe en el proceso vivo)
bundle servido            → index-BVbUNmj9.js
```

Rama `mejoras/jornada-una-fila`, **16 commits**, todo en verde: 221 pruebas ·
`tsc` limpio en backend y frontend · ESLint en 78 (sin regresión) · diferencial
de jornadas sobre datos reales sin descuadres.

| | commit | estado |
|---|---|---|
| `master` | `e926246` | **avanzado**, ya que se desplegó y se comprobó |
| `frontend-build` | `79c6717` | desplegado |
| `backend-build` | `e4371b4` | desplegado |
| `prisma-build` | `ae68fdd` | sin cambios: el esquema no se tocó |

Queda **un commit sin compilar** al frontend: `e926246`, el respaldo de
`marcaciones`. No corre prisa —el backend ya manda el campo—, pero evita que la
próxima ventana de despliegue vuelva a tumbar la pantalla, así que conviene que
entre en el siguiente lote.

Durante el despliegue **sí se rompió**: el frontend se subió antes que el backend
y editar un registro reventaba con `Cannot read properties of undefined
(reading '0')`. Se resolvió con el Restart de cPanel. El orden es **backend
primero**: el backend nuevo es compatible con el frontend viejo, no al revés.

---

## Files in flight

Ninguno a medio editar: el árbol está limpio y todo commiteado.

Los que concentran el cambio:

- `backend/src/utils/jornada.ts` — el corazón. `partirDiaEnJornadas`,
  `agruparEnJornadas`, `marcacionQueCierra`, `tramoQueChoca`,
  `instantesDeJornada`, `minutosVentana`, `GRACIA_MIN`.
- `backend/src/routes/registros.ts` — `GET /` por jornada,
  `PUT /jornada/:id` transaccional, validación de cruces, la novedad del día.
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
  que usa el aviso automático (`GRACIA_MIN` se movió a `jornada.ts`).
- `minutosEnVentana` se expone aparte para repartir el descuento a la jornada que
  de verdad estuvo dentro de la ventana.
- Un cambio de horario aplica **desde hoy** a quien no haya marcado y desde
  mañana a quien ya empezó (`diaYaEmpezado`, con la ventana de 18 h para el turno
  nocturno abierto). Borrar sus marcaciones lo vuelve a evaluar.
- El kiosco materializa el día al marcar; reactivar un colaborador y borrar un
  horario ahora regeneran.

**Frontend**

- Una fila por jornada; ojo + lápiz + papelera en Acciones.
- El formulario edita la jornada: entrada, descanso (salió/regresó) y salida.
- «Almuerzo» → «Descanso» en toda la interfaz. El código y la base siguen
  diciendo `almuerzo` **a propósito**: renombrar columnas es una migración sobre
  una base cuyas migraciones ya están desfasadas, y no le da nada al usuario.
- Kiosco: «Salgo a mi descanso» en el botón grande dentro de la ventana; la
  salida temprana pide motivo **antes** de marcar, con «Volver atrás».
- Las novedades se ven, se aprueban y se les cambia el motivo desde el detalle,
  con «se paga / no se paga» resuelto contra la política de la empresa.

---

## Failed attempts

Lo que se intentó y salió mal, para no repetirlo:

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
8. **Frontend desplegado antes que el backend** → la pantalla revienta al editar.
   El orden es **backend primero**: el backend nuevo es compatible con el
   frontend viejo, no al revés.
9. Errores de las propias pruebas, no del código: el helper de `ahoraBog` se
   construyó con aritmética UTC cuando `toZonedTime` devuelve una fecha de
   getters **locales**; y un `DELETE` de prueba llevaba
   `Content-Type: application/json` sin cuerpo, que Fastify rechaza.
10. **Dos workflows completos fallaron** por límite de sesión y hubo que
    relanzarlos; el segundo intento sí devolvió resultados.
11. Buena parte de los datos raros del día (tramos de 4 segundos, jornadas
    movidas de día, turnos nocturnos sueltos) **los generaron los scripts de
    prueba** contra la base local. Cada uno restauraba lo suyo, pero conviene
    partir de un día limpio antes de volver a probar.

---

## Next step

**Compilar `e926246` a `frontend-build` y desplegarlo** — es lo único de este
lote que falta, y no es urgente.

[EN TU MÁQUINA] apartar `.env.local`, `npm run build` en `frontend/`, comprobar
que el bundle no contenga `localhost` y que apunte a `https://horapro.co/api`,
copiar el `dist` a la rama `frontend-build` y subirla.

[EN EL SERVIDOR] `cd ~/horapro-repo && git fetch origin && git checkout -f
frontend-build && git pull && rm -rf ~/horapro.co/assets && cp -R frontend/dist/.
~/horapro.co/`, y comprobar el nombre del bundle con
`curl -s https://horapro.co/ | grep -o "index-[A-Za-z0-9_-]*\.js"`.

Después, lo que de verdad importa:

### Pendiente, con su propio diferencial

Lo encontró un rastreo adversarial y **no entra en este lote**:

- `mantenerVentana` (`materializarDias.ts`) **nunca repara una fila ya escrita**:
  llama sin `pisarExistentes`, solo rellena huecos. Un día congelado con el
  horario viejo se queda así hasta que alguien vuelva a guardar el horario, sin
  saber que hace falta. Es el arreglo de fondo: cierra casi todos los demás.
- **La ventana de 18 h caduca sola.** Guardar el horario a las 08:00 difiere a
  mañana; a las 17:00 habría aplicado hoy. Esa decisión no se revisa nunca.
- **El auto-cierre nocturno desempieza el día** y nadie lo vuelve a preguntar.
- **`PUT /jornada` valida el cruce contra el día de ORIGEN, no el de destino**:
  mover una jornada del 13 al 14 puede dejar dos solapadas y contar las horas dos
  veces. Es anterior a este lote y **es el que toca dinero**.
- `construirExtraConfig` (`reportes.ts`) clasifica horas extra con el horario
  **vivo**, no con el congelado. También anterior, también dinero.

El informe completo está en
`/private/tmp/claude-501/-Users-mac-Documents-Krumlab-Conteo-Horas/0fadea18-bca8-4223-a93a-f913da6778bb/tasks/w9yrkwmgg.output`
(temporal: si se pierde, se vuelve a generar).
