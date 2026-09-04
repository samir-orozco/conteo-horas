# Goal

Que un día de trabajo se lea como **una jornada**, no como marcaciones sueltas, y
que **editar un horario nunca reescriba plata ya liquidada**.

Marcar el descanso parte el día en dos tramos, y la tabla de Registros los
mostraba como dos filas —el mismo día repetido, la segunda medio vacía— que se
leían como una marcación duplicada. De ahí salió todo lo demás: el descanso deja
de llamarse almuerzo (falso para un turno nocturno), el formulario edita la
jornada entera, el kiosco ofrece el descanso de frente, y las novedades se
aprueban donde se leen.

Y de ahí, tirando del hilo, salieron las dos fugas que movían dinero. Las dos
están cerradas.

Tres reglas que gobiernan esto y no se tocan sin pensarlo:

- **Un tramo se funde con el siguiente solo si cerró saliendo al descanso.**
  Volver por la tarde a hacer extras sí abre otra jornada.
- **La suma de las jornadas de un día es exactamente `minutosContadosDelDia`.**
  Afirmada en `jornada.test.ts` sobre doce escenarios y verificada contra la base
  real con `backend/prisma/verificar-jornadas.ts`.
- **Todo lo que decide plata sale del día CONGELADO, nunca del horario vigente.**
  Es la razón de existir de `DiaEsperado`, y la última rendija —la clasificación
  de horas extra— se cerró el 14 de agosto.

---

## Current State

Todo el trabajo está en `master` (`c8d570e`), con `develop` alineada. Árbol
limpio. **225 pruebas en verde** · `tsc` limpio en backend y frontend · ESLint en
78 (sin regresión) · diferencial de jornadas sobre datos reales sin descuadres.

### Producción

```
bundle                    → index-DxSI3sYe.js     ✓ al día
api                       → {"status":"ok"}
PUT /registros/jornada/x  → 401                   ✓ el lote de jornadas está arriba
```

### Lo único pendiente de desplegar

`backend-build` (`04787ce`) tiene **dos arreglos compilados y subidos que
producción todavía no corre**. Los dos tocan dinero:

1. `f4816d3` — mover una jornada de día validaba los cruces contra el día de
   ORIGEN. Mudar una jornada del 20 al 21 podía dejar dos solapadas el 21 y
   contar esas horas **dos veces**.
2. `04787ce` — las horas extra se clasificaban con el horario **de hoy**. En modo
   `HORARIO`, cambiar un horario reescribía los extras de períodos ya liquidados.

**El frontend NO cambia**: es un despliegue de solo backend. Comandos exactos en
*Next step*.

### Repositorio

| rama | commit | qué es |
|---|---|---|
| `master` | `c8d570e` | producción + los dos arreglos sin desplegar |
| `develop` | `c8d570e` | integración, alineada |
| `frontend-build` | `49cf253` | **desplegado** |
| `backend-build` | `04787ce` | compilado y subido, **sin desplegar** |
| `prisma-build` | `ae68fdd` | sin cambios: el esquema no se tocó en todo el lote |

Las cinco alineadas con `origin`. Se borraron `mejoras/reportes-y-sedes` y
`mejoras/jornada-una-fila`, fundidas en `master` antes de borrarlas.

### Archivos sueltos en la raíz (no versionados, no míos)

Sin tocar; decidir qué hacer: `ARRANQUE-PROYECTO-WEB.md`,
`PLAYBOOK-BANAHOSTING.md`, `PLAYBOOK-BANAHOSTING-PHP.md` —documentación de
Krumlab, no de HoraPro— y `WhatsApp Video 2026-07-17 at 15.22.42.mp4` (1,5 MB),
que no debería acabar en git.

---

## Files in flight

Ninguno. Todo commiteado.

Los que concentran el cambio:

- `backend/src/utils/jornada.ts` — `partirDiaEnJornadas`, `agruparEnJornadas`,
  `marcacionQueCierra`, `tramoQueChoca`, `instantesDeJornada`, `minutosVentana`,
  `GRACIA_MIN`.
- `backend/src/utils/tardanzas.ts` — `construirExtraConfig`, ahora por FECHA.
- `backend/src/utils/horasColombiana.ts` — `esExtraPorModo` y el tipo
  `ExtraConfig`.
- `backend/src/routes/registros.ts` — `GET /` por jornada, `PUT /jornada/:id`,
  validación de cruces, la novedad del día.
- `backend/src/routes/worker.ts` — kiosco.
- `backend/src/utils/materializarDias.ts` — `diaYaEmpezado` y la regeneración.
- `frontend/src/pages/Registros.tsx` y `pages/registros/ModalJornada.tsx`.

### Scripts de comprobación, ya escritos y reutilizables

- `backend/prisma/verificar-jornadas.ts` — la invariante de las jornadas contra
  la base real.
- `backend/prisma/medir-extras.cjs` — **solo lectura, se puede correr en
  producción.** Dice si a un colaborador le afecta la fuga de extras: compara el
  día congelado contra el horario vigente, día por día.
- `backend/prisma/sembrar-luciana.ts` — reproduce en local a una colaboradora con
  datos reales de producción, con sus días congelados con el horario ORIGINAL.
  Es el escenario que destapó la fuga de extras y sirve para repetir la prueba.

---

## Changed

**Backend**

- `GET /registros` devuelve una entrada por JORNADA, con `marcaciones` dentro,
  `minutosContados`, `minutosAlmuerzoAqui` y la `novedad` del día.
- `PUT /registros/jornada/:id`: entrada, descanso y salida en una transacción,
  con una sola validación sobre el estado final, **contra el día de destino**.
- No se puede guardar un tramo que pise a otro del mismo día, ni una salida
  anterior a su entrada. El 400 trae el conflicto para poder ofrecer «eliminar
  esa y guardar».
- Una salida al descanso **no cierra la jornada** (`marcacionQueCierra`).
- El descanso distingue `EN_CURSO` de `ABIERTO` con una hora de gracia, la misma
  que usa el aviso automático.
- Un cambio de horario aplica **desde hoy** a quien no haya marcado y desde
  mañana a quien ya empezó. Borrar sus marcaciones lo vuelve a evaluar.
- La salida temprana **no se guarda sin motivo**: 409 `REQUIERE_MOTIVO` sin
  escribir nada, y la novedad viaja en la misma llamada que la marca.
- **Las horas extra se clasifican con el día congelado**, por fecha y no por día
  de la semana, con la tolerancia de ese día. Respaldo por día de semana para
  fechas sin fila congelada.

**Frontend**

- Una fila por jornada; ojo + lápiz + papelera en Acciones.
- El formulario edita la jornada: entrada, descanso (salió/regresó) y salida.
- «Almuerzo» → «Descanso» en toda la interfaz. El código y la base siguen
  diciendo `almuerzo` **a propósito**: renombrar columnas es una migración sobre
  una base cuyas migraciones ya están desfasadas de producción.
- Kiosco: «Salgo a mi descanso» en el botón grande dentro de la ventana; la
  salida temprana pide motivo antes de marcar, con «Volver atrás».
- Las novedades se ven, se aprueban y se les cambia el motivo desde el detalle,
  con «se paga / no se paga» resuelto contra la política de la empresa.

---

## Failed attempts

Lo que salió mal, para no repetirlo:

1. **`new Date("2026-08-14")` en `PUT /jornada`** movió la jornada al día **13**:
   es medianoche UTC, que en Bogotá son las 7 p.m. del día anterior. Está en
   CLAUDE.md §4 y aun así se coló. Se ancla a `T05:00:00.000Z`.
2. **`minutosDeMas` usado como «se tomó de más»**. Quien sale 15 min antes y
   vuelve 15 tarde volvió 15 tarde pero se tomó **30** de más. El comentario de
   `ResumenAlmuerzo` advertía justo de eso. Se añadió `minutosVentana`.
3. **Validación de cruces añadida sin mostrar el error**: `guardar()` no tenía
   try/catch, el 400 rompía la promesa y el modal no se cerraba. Sin mensaje.
4. **`otrosDelDia` no excluía las marcaciones propias**, y el registro se avisaba
   a sí mismo con la hora que tenía antes de la última corrección.
5. **Se afirmó que `origen: 'MANUAL'` protegía los turnos rotativos.** Cierto
   pero vacío: nada escribe MANUAL nunca (0 filas de 1.281).
6. **Frontend desplegado antes que el backend** → la pantalla revienta al editar.
   El orden es **backend primero**: el backend nuevo es compatible con el
   frontend viejo, no al revés. Y el **Restart de cPanel no es opcional**: sin él
   el proceso sigue con el código viejo aunque el `dist` esté copiado.
7. **Se estimó la fuga de extras como «un arreglo de una línea».** No lo era: el
   mapa estaba indexado por día de la semana y hubo que pasarlo a fecha, tocando
   el tipo, el constructor, el consumidor y tres llamadores.
8. **La primera versión de ese arreglo dejó al panel de inicio sin días**, y sin
   respaldo habría convertido la jornada entera en horas extra. De ahí el
   `franjaPorDia` de respaldo.
9. **Usar `??` para leer la franja del día** habría hecho que un día congelado
   como «no programado» cayera al respaldo, ignorando justo lo que ese día decía.
   Hay que preguntar si la fecha ESTÁ, no si trae algo.
10. Errores de las propias pruebas: el helper de `ahoraBog` construido con
    aritmética UTC cuando `toZonedTime` devuelve getters **locales**; y un
    `DELETE` de prueba con `Content-Type: application/json` sin cuerpo, que
    Fastify rechaza.
11. **Dos workflows completos fallaron** por límite de sesión; el segundo intento
    sí devolvió resultados.
12. Buena parte de los datos raros de la base local **los generaron los scripts
    de prueba**. En particular, el horario «Semana» se cambió varias veces, así
    que la divergencia entre días congelados y horario vigente allí es
    artificial. Conviene partir de un día limpio antes de volver a probar.
13. **El handoff anterior se sobrescribió sin leerlo primero.** No se perdió nada
    —era del 12 de agosto, sobre la materialización del `DiaEsperado`— y sigue
    recuperable con `git show 3c5521c:handoff.md`.

---

## Next step

**Desplegar `backend-build` (`04787ce`).** Solo backend; el frontend ya está al
día y no cambia.

[EN EL SERVIDOR]

```bash
cd ~/horapro-repo && git fetch origin && git checkout -f backend-build && git pull && rm -rf ~/horapro-co-api/dist && cp -R deploy-backend/dist ~/horapro-co-api/
```

Después, **cPanel → Setup Node.js App → Restart**. No hay comando; es el botón, y
sin él el proceso sigue con el código viejo.

Comprobar que arrancó:

```bash
curl -s https://horapro.co/api/health
```

**No debería mover ningún número.** Medido en producción: Luciana Vargas Tejada
no tiene ningún día en que el congelado y el vigente difieran. Para confirmarlo
sobre los demás, antes o después de desplegar:

```bash
source ~/nodevenv/horapro-co-api/22/bin/activate && cd ~/horapro-co-api && set -a && . ./.env && set +a && node medir-extras.cjs "NOMBRE" 2026-07-01 2026-08-14
```

Cualquiera con «NINGÚN día difiere» está garantizado que no se mueve.

Vuelta atrás:

```bash
cd ~/horapro-repo && git checkout -f backend-build && git reset --hard e4371b4 && rm -rf ~/horapro-co-api/dist && cp -R deploy-backend/dist ~/horapro-co-api/
```

Y Restart otra vez.

---

## Pendiente de fondo

Ya **no queda nada que toque dinero**. Lo que sigue causa confusión o ruido, no
números malos. Cada uno con su comprobación antes de tocarlo.

**El mecanismo del día congelado — el primero cierra casi todos los demás:**

1. **`mantenerVentana` nunca repara una fila ya escrita**
   (`backend/src/utils/materializarDias.ts`): llama a `materializarColaborador`
   sin `pisarExistentes`, así que solo rellena huecos. Un día que quede congelado
   con el horario viejo se queda así hasta que alguien vuelva a guardar el
   horario, sin saber que hace falta. Además su `try` envuelve el bucle entero:
   si un colaborador lanza, los siguientes no se materializan.
2. **La ventana de 18 h caduca sola.** Guardar el horario a las 08:00 difiere a
   mañana a quien tenga un turno nocturno abierto; a las 17:00 ese mismo cambio
   habría aplicado hoy. La decisión no se vuelve a mirar nunca.
3. **El auto-cierre nocturno desempieza el día** (`cierreTurnos.ts`): al escribir
   la salida, la persona deja de tener turno abierto y su día queda sin estrenar
   pero con la fila vieja. Nadie lo reevalúa.
4. **`PUT /registros/:id` no reevalúa** al mover una marcación de fecha o de
   colaborador, como pasaba con el DELETE antes de arreglarlo. Conviene extraer
   un helper único y usarlo desde los tres sitios.
5. **`regenerarVarios` se corta al primer fallo** (`materializarDias.ts`): `for`
   secuencial sin try por colaborador. Si el tercero de cuarenta lanza, los otros
   37 se quedan con el horario viejo 60 días y el administrador no ve nada,
   porque la ruta responde `regeneracion: null`.

**Menores, baratos:**

- `diaYaEmpezado` no exige `r.entrada`, así que registrar una incapacidad sin
  hora hace que a esa persona el cambio de horario se le difiera «porque ya
  empezó su día».
- `regenerarDiasDeColaborador` se llama sin pasar `ahora`: un guardado a las
  23:52 con 80 personas puede cruzar la medianoche y aplicar a unos hoy y a otros
  mañana.
- El comentario de `registros.ts` sobre que «el kiosco guarda `Registro.fecha`
  con la hora real» está desactualizado: `worker.ts` ancla a medianoche.
- **El kiosco permite marcar entrada y salida con segundos de diferencia**, lo
  que llena los días de tramos de 4 segundos. Poner un mínimo evitaría el ruido
  pero bloquearía correcciones rápidas legítimas: es decisión de producto.
- **9 de los 45 días del período de Luciana no tienen fila congelada** en
  producción. Caen al horario vigente por diseño y hoy no causan incoherencia,
  pero son los más expuestos: si le cambian el horario, esos días se mueven
  enteros. Vale la pena averiguar por qué faltan.

### face-api.js: la vulnerabilidad que se atiende cuando se toque el kiosco

**Decisión tomada el 4 de septiembre de 2026: NO se arregla sola, se arregla
junto con las mejoras del reconocimiento facial que ya están pensadas.** Se anota
aquí con todo lo medido para que ese día no haya que volver a investigarlo.

Son las 3 únicas vulnerabilidades que quedan en el frontend después del barrido
de hoy (antes eran 13):

| paquete | severidad | de dónde viene |
|---|---|---|
| `node-fetch` | **alta** | `face-api.js` → `@tensorflow/tfjs-core` → `node-fetch` |
| `@tensorflow/tfjs-core` | baja | la misma cadena |
| `face-api.js` | baja | directa |

**Por qué NO se aplicó `npm audit fix`:** el arreglo que ofrece npm es
`face-api.js@0.20.0`, o sea **BAJAR** desde la 0.22.2 que hay instalada. Cambiar
el reconocimiento facial del kiosco por un aviso de `node-fetch` sería cambiar un
riesgo teórico por uno real y visible.

**Cuánto riesgo real hay hoy, para dimensionarlo:** `node-fetch` es el cliente
HTTP que TensorFlow usa para descargar modelos **en Node**. En el navegador, que
es donde corre el kiosco, esa ruta no se ejecuta: los pesos se sirven desde
`~/horapro.co/models/`. El aviso es real pero el proyecto no lo alcanza. Aun así
no conviene dejarlo: cuenta como alta en cualquier revisión y tapa avisos nuevos.

**Qué mirar el día que se toque, en este orden:**

1. Si `face-api.js` sigue sin publicar (su última versión es de hace años),
   evaluar el reemplazo en vez del parche. Candidatas a medir: `@vladmandic/face-api`
   (mantenido, API compatible, TensorFlow moderno) y MediaPipe Face Detection.
   La comprobación que decide: los descriptores de 128 dimensiones que ya están
   guardados en `Colaborador.rostroDescriptor` **tienen que seguir casando**, o
   habría que reenrolar a todo el mundo. Eso es lo caro, no la biblioteca.
2. `frontend/src/components/camaraRostro/rostroCliente.ts` produce el JPEG que
   valida `backend/src/routes/worker.ts:72-81`. Ese contrato está documentado en
   el código: si se cambia el pipeline, se cambian los dos lados a la vez.
3. Correr `npm audit` después y comprobar que el frontend queda en 0.

**Y de paso hay 507 KB que ganar, que probablemente valgan más que el aviso.**
Medido sobre el build de hoy: `face-api.js` se importa de forma ESTÁTICA en
`CamaraRostro.tsx`, `camaraRostro/rostroCliente.ts` y `lib/faceapi.ts`, así que
va dentro del chunk principal. Resultado: 1,8 MB sin comprimir, 507 KB con gzip,
que descarga **cualquiera que abra horapro.co**, incluido quien solo viene a leer
el blog y nunca va a marcar con la cara. Pasarlo a `await import('face-api.js')`
en los tres sitios es el cambio de más impacto de toda esta lista, y no depende
de resolver la vulnerabilidad.
(`DESPLIEGUE.md` decía que faceapi ya era carga diferida. No lo era; se corrigió
el mismo día.)

**Lo que NO hay que temer, comprobado y no supuesto:** el `node-fetch` vulnerable
no se despliega. Se buscó dentro del chunk que sí contiene face-api y aparece
CERO veces: Vite descarta la rama de Node al empaquetar, porque los modelos se
sirven como archivos estáticos desde `~/horapro.co/models/`. O sea que el aviso
es real en el árbol de dependencias y no alcanzable en el navegador. Eso es lo
que permite aplazarlo sin que sea una deuda peligrosa, pero no lo borra: cuenta
como alta en cualquier revisión y tapa avisos nuevos.

**Comprobación antes de tocar nada:**
```
cd frontend && npm audit --json | python3 -c "import json,sys; d=json.load(sys.stdin)['vulnerabilities']; [print(k, v['severity']) for k,v in d.items()]"
```

---

**De la lista de tareas, sin empezar:** novedades de parte del día. `horaInicio`
y `horaFin` ya existen en el modelo `Permiso` y el detalle las muestra, pero nada
las usa para liquidar.
