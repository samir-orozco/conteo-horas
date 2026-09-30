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

**Actualizado el 30 de septiembre de 2026, con todo medido después de un `git
fetch` y no leído de memoria.** Lo que decía antes llevaba 64 commits siendo
falso, que es el mismo defecto que este archivo ya se había denunciado a sí mismo
dos veces. Ver *Por qué este archivo se desactualiza*, al final.

`develop` va **69 commits por delante de `master`** y su punta es `a3176a2`.
`origin/develop` está en `6df5e43`: faltan por subir los tres commits de hoy.

| | backend | frontend |
|---|---|---|
| pruebas | **83 archivos / 1490** (+1 fallo esperado) | **149 archivos / 1735** |
| tipos | `tsc --noEmit` limpio | `tsc -b` limpio |
| lint | 173 avisos, 0 errores — su tope | 65 errores / 6 avisos, la línea base |

El árbol **no** está limpio: `.claude/launch.json` se queda fuera a propósito.

### Las ramas, medidas el 30 de septiembre

```
master           1bc2620  =  origin          ← lo que hay en producción
develop          a3176a2  ≠  origin 6df5e43  ← faltan 3 commits por subir
backend-build    942435e  =  origin
frontend-build   4bb51c2  =  origin
prisma-build     8842cac  ≠  origin f743ab4  ← el ref local está atrasado
```

Ojo con `prisma-build`: el local va detrás de `origin`. Un `git show
prisma-build:<archivo>` lee el artefacto VIEJO. Se alinea antes de inspeccionarlo
(§12.7).

### Producción

```
bundle                    → index-DxSI3sYe.js     ✓ al día
api                       → {"status":"ok"}
PUT /registros/jornada/x  → 401                   ✓ el lote de jornadas está arriba
```

### Lo pendiente de desplegar — 30 de septiembre de 2026

**Son 71 commits**, desde `7c427e3` (el auxilio de transporte, 17 de septiembre,
que es lo que corre hoy) hasta `a3176a2`. Ya no es «un despliegue de solo
backend»: es el módulo de turnos entero, el registro del sistema, el modelo nuevo
del día de descanso y el renombre del concepto dominical.

**Dos SQL, en este orden, ANTES de tocar ningún artefacto:**

1. `sql/dia-esperado-descanso.sql` — crea `dias_esperados.esDescanso`. Comprobado
   contra `information_schema` el 30 de septiembre: **no existe en producción**.
   Sin esto el backend nuevo revienta, porque la ruta de liquidación la pide por
   nombre.
2. `sql/nombre-descanso-obligatorio.sql` — renombra el concepto en `tipos_hora`.
   Probado en local con el texto exacto del archivo: 16 filas, cero con el nombre
   viejo después, recargos intactos.

**Cuatro ramas y no tres**, porque el diff toca `schema.prisma`. Lo decide el
comando, no la memoria (§11):

```
git diff --name-only 7c427e3..HEAD | grep -q 'schema.prisma' \
  && echo "OBLIGATORIO actualizar prisma-build" || echo "prisma-build no se toca"
```

Orden: **SQL → `prisma-build` → `backend-build` → `frontend-build`.**
`prisma-build` va antes que el backend; al revés hay una ventana con el código
nuevo contra el cliente viejo, que es lo que tumbó el kiosco el 10 de septiembre.

**Lo que cambia para el kiosco:** un solo cambio, en `backend/src/routes/worker.ts`
— una cédula que no existe queda registrada en el registro del sistema. Entró con
`3b5eeb4`.

**Lo que cambia para la nómina, y hay que saberlo antes de subir:**

- El día de descanso pasa a salir de las FRANJAS del horario. Medido contra
  producción: **8 personas activas** tienen un horario cuyo día libre no es el
  domingo (WE HOSPITALITY con COCINA 1 los lunes y BUFFET los martes, Beaujon,
  Nature Smith). A esas les cambia qué día lleva recargo.
- **105 personas activas no tienen horario**, en 14 empresas. Con la regla
  vigente, una semana suya sin programar **no tiene día de descanso obligatorio**.
  De ellas, 25 han trabajado 28 domingos: unos **2,7 millones** de recargo que
  dejan de pagarse. Es una decisión del dueño, reafirmada dos veces con el número
  delante, y el argumento en contra está escrito en `descansoDelHorario.ts`.

### Repositorio

**Medido el 23 de septiembre de 2026 después de `git fetch origin`.** La tabla
anterior estaba mal en las CINCO filas, y no por poco: ninguno de los seis hashes
que listaba existe ya como punta de su rama. Por eso se mide y no se recuerda.

| rama | local | origin | qué es |
|---|---|---|---|
| `master` | `1bc2620` | `1bc2620` | al día con origin |
| `develop` | *(la punta, ver abajo)* | `f0dbe33` | **el módulo de turnos, commiteado y SIN SUBIR** |
| `backend-build` | `4cb7eee` | `4cb7eee` | compilado el 19/09 (los barridos a hora fija) |
| `frontend-build` | `9d56f9b` | `9d56f9b` | compilado el 17/09 (auxilio de transporte) |
| `prisma-build` | `8842cac` | `8842cac` | compilado el 17/09 (cliente con auxilio) |

Los **2 commits** que `develop` le lleva a `master` son el de documentación
(`f0dbe33`) y el del módulo de turnos, que es la punta.

**Por qué la punta de `develop` NO lleva su hash escrito aquí.** Este archivo va
DENTRO de ese commit, y un documento no puede citar el hash del commit que lo
contiene: cambiar el documento cambia el hash. Se escribió una vez, se enmendó el
commit para corregir esta misma sección, y la cita quedó apuntando a un commit que
ya no existía. La punta se lee con `git log -1`, que no se desactualiza nunca.

**Los tres artefactos son del 17 y el 19 de septiembre, o sea ANTERIORES a todo el
módulo de turnos.** Dicho de otro modo: lo que se acaba de commitear no está
compilado ni desplegado, y cuando toque hacerlo serán **cuatro ramas** porque
`schema.prisma` cambió (CLAUDE.md §11).

### Archivos sueltos en la raíz (no versionados, no míos)

**Revisado el 23 de septiembre de 2026.** Son cinco, y se dejaron FUERA del commit
del módulo de turnos a propósito:

- `ARRANQUE-PROYECTO-WEB.md`
- `PLAYBOOK-BANAHOSTING.md`
- `PLAYBOOK-BANAHOSTING-PHP.md`
- `PLAYBOOK-CRM-MENSAJERIA.md` (nuevo desde la última vez que se miró)
- `.claude/launch.json`, **modificado**, no sin seguimiento

Los cuatro primeros son documentación de Krumlab, no de HoraPro. El dueño decide
si van a este repo, a otro, o a ninguno.

El `WhatsApp Video 2026-07-17 at 15.22.42.mp4` que este párrafo listaba **ya no
está** en la raíz: comprobado, no supuesto.

---

## Files in flight

Ninguno del módulo de turnos: **todo commiteado el 23 de septiembre de 2026** en
la punta de `develop`, 91 archivos y 10.977 líneas nuevas. Quedan fuera solo los
cinco de *Archivos sueltos*, a propósito.

**Ese commit NO está subido.** Vive únicamente en el disco de esta máquina. Si le
pasa algo a la carpeta, se pierde entero.

La lista de abajo es de un lote ANTERIOR (el de jornadas) y se conserva porque
sigue describiendo dónde vive esa lógica:

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

## El despliegue del 10 de septiembre, y cómo se cayó el kiosco

**Qué quedó en producción:** las cuatro columnas de método y distancia en
`registros` con su índice `(colaboradorId, fecha)`, la pantalla de Revisión de
marcaciones, el reto de giro del kiosco (APAGADO por defecto), nodemailer 9.1.1 y
el `package.json` de producción.

**LO QUE SALIÓ MAL.** Se desplegó SQL, backend y frontend, y el kiosco dejó de
marcar. Causa: el esquema cambió y **no se actualizó `prisma-build`**, así que el
backend nuevo le pedía `metodoEntrada` a un cliente de Prisma que no la conocía.
Comprobado en el servidor: `grep -c metodoEntrada .../.prisma/client/index.d.ts`
respondía 0. Con el cliente nuevo responde 48 y el kiosco volvió a marcar.

La regla que salió de ahí está en la sección 11 del CLAUDE.md, con su comando de
decisión y su comprobación numérica. No se repite aquí para que haya un solo
sitio donde vivir.

**LO QUE SE EVITÓ POR POCO.** La primera compilación del backend salió del árbol
de trabajo y barrió trabajo SIN COMMITEAR del dueño: la ruta de borrado en
cascada de empresas sobre 20 tablas, con sus dos módulos y el diálogo del
frontend. Se detectó con un `grep` sobre el artefacto antes de subirlo y se
recompiló desde un `git worktree` limpio. Desde entonces, los tres artefactos se
compilan así.

**LO QUE QUEDÓ SIN EXPLICAR, y conviene no olvidarlo.** Durante la caída, el XHR
de `POST /marcar` devolvió **403**, no 500. Un cliente de Prisma desactualizado da
500. El 403 puede haber sido otra petición distinta que el panel no mostró, o
**Imunify360**. No se reprodujo después del arreglo. Si vuelve a aparecer, el log
del app root es lo primero que hay que mirar.

**HALLAZGO SOBRE EL PROBLEMA DE WHATSAPP.** Al intentar comprobar una ruta con
`curl` desde fuera, el servidor respondió:

    403 {"message": "Access denied by Imunify360 bot-protection.
         IPs used for automation should be whitelisted"}

Eso **nombra el mecanismo** que produce el «One moment, please...» de la sección
de más abajo: es Imunify360, y en cPanel suele tener ajustes donde se permiten
rastreadores conocidos. AVISO IMPORTANTE, por la lección de
`horapro-nada-a-terceros-sin-verificar`: esto demuestra que bloquea MI
automatización, que es su trabajo. NO demuestra que bloquee al rastreador de
WhatsApp; eso se probó el 9 de septiembre con el User-Agent real y pasó limpio
(HTTP 200, con og:title y og:image correctos). Sigue sin haber nada que
reportarle al hosting.

---

## Next step

**El despliegue de la noche del 30 de septiembre de 2026.** Los 71 commits de
arriba, con sus dos SQL y sus cuatro ramas. Lo primero, subir `develop` a
`origin`: van tres commits de hoy sin empujar.

El orden y las comprobaciones están en *Lo pendiente de desplegar* y la mecánica
en `DESPLIEGUE.md`. Las tres que no se pueden saltar:

1. **El SQL va ANTES del código.** `dias_esperados.esDescanso` no existe en
   producción y el backend nuevo la pide por nombre.
2. **`prisma-build` va ANTES de `backend-build`.** Se comprueba en el servidor con
   un número y no con una impresión, ANTES del restart:
   `grep -c "esDescanso" ~/horapro-co-api/node_modules/.prisma/client/index.d.ts`
   — cero significa que el cliente es el viejo y que el kiosco se va a caer.
3. **Los artefactos se compilan desde un árbol limpio**, nunca desde el de
   trabajo, y se inspeccionan por `origin/<rama>` después de un `fetch`.

Después del despliegue: alinear `master` con lo desplegado, que es lo que hace que
«volver atrás» signifique algo.

## La política de privacidad está publicada

**9 de septiembre de 2026, versión 1.0.** Vive en
`frontend/blog/legal/privacidad.mjs` y se publica en
<https://horapro.co/legal/privacidad/>. Verificado en producción: 15 secciones,
`index, follow`, sin el aviso de borrador, en el sitemap, y enlazada desde el pie
de la landing y el de todas las páginas estáticas.

El interruptor es `borrador` en ese archivo, y `src/lib/legal.ts` lleva una copia
de dos datos suyos para no arrastrar los 35 kB del documento al bundle de React
por un enlace de dos palabras. `src/lib/legal.test.ts` se pone rojo si las dos
copias se separan: sin esa prueba, publicar dejaría el pie sin el enlace y nadie
se enteraría, porque no se rompe nada, simplemente no aparece.

### Lo que el documento promete y ningún software cumple

Son obligaciones vivas de una persona, no del producto. Si no se cumplen, el
incumplimiento no es del software sino de la propia política, que es peor, porque
la política está escrita y publicada.

1. **Leer `privacidad@horapro.co` a diario.** Desde que llega el mensaje corren
   los plazos del punto 12: 2 días hábiles para trasladar un reclamo sobre datos
   de los que HoraPro no es responsable, 10 para una consulta y 15 para un
   reclamo. El de 2 días es el que muerde: un mensaje que llega el viernes vence
   el martes.
2. **Llevar el registro interno de solicitudes**, por fuera del producto, donde
   el punto 12.3 dice que queda la constancia del reclamo en trámite. Una carpeta
   o una hoja de cálculo basta. El sistema no tiene dónde escribir esa anotación
   y el documento no dice que lo tenga.

### Deuda que la política deja anotada

- **El artículo 18 literal g) de la Ley 1581 le exige al encargado registrar la
  leyenda «reclamo en trámite» EN LA BASE DE DATOS.** Hoy no existe: `grep -rn
  reclamo backend/src backend/prisma/schema.prisma` no devuelve nada. La política
  describe el registro interno en su lugar, que es lo honesto, pero la deuda
  técnica queda.
- **El alcance real de la revisión jurídica** está anotado en la cabecera de
  `privacidad.mjs`: el abogado aprobó el texto del commit `08beabb` y encargó los
  siete ajustes, pero dos correcciones que aparecieron al redactarlos no las
  revisó una por una. Son la de transmisión contra transferencia (sección 8) y la
  del reclamo en trámite (sección 12).

---

## QA de nómina: lo que está cubierto y lo que no

`backend/prisma/qa-nomina-septiembre.ts` siembra dos personas —ANA con horario
fijo L-V, BRUNO sin horario con turnos de noche y el miércoles marcado— con doce
casos, y `qa-nomina-verificar.ts` pide la liquidación por las rutas reales y la
imprime al lado de lo calculado a mano. Se deshacen con `--borrar` (cédulas 88*).

Cubierto y cotejado el 30 de septiembre: jornada con almuerzo, almuerzo sin
regreso, llegada tarde sin justificar y con permiso, salida temprana con permiso,
horas hasta las 19:30 (el nocturno empieza a las 7 p.m.), festivo trabajado,
domingo trabajado por quien descansa el domingo, y el descanso trabajado de quien
no tiene horario. Y el caso que de verdad importa: **los domingos de Bruno salen
HON y no dominical**, porque su descanso es el miércoles.

### Lo que NO está en el guion: trabajar el sábado siendo de lunes a viernes

Pregunta del dueño el 30 de septiembre, medida ese día pero **no incorporada al
guion**, por decisión suya: «déjemoslo así por el momento».

A alguien de L-V le sobran DOS días libres, y el descanso obligatorio es **uno**:
el domingo, por el art. 172. El sábado no es descanso. Medido:

| día trabajado (8 h) | se liquida | adicional |
|---|---|---|
| sábado | `HOD` ×1 | 0 |
| domingo | `HDD` ×1,9 | 60.000 |

Pero el sábado **no sale gratis**: en la semana completa empujó 6 h por encima de
las 42 y salieron como `HED`. Y el domingo, al haberse pasado ya el tope, salió
como `HEDD` —extra Y de descanso— en vez de `HDD`.

**Para agregarlo:** dos registros más en el reparto de ANA, un sábado y su
domingo, con la semana de L-V completa para que se vea el tope. Cambia los
totales del Excel de muestra.

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

### Nada que toque cientos de filas puede ir en una sola petición

**Anotado el 24 de septiembre de 2026 a petición del dueño**, mientras se diseñaba
la programación masiva de turnos. Aplica a **dos** cosas: la asignación en bloque
que está por construirse y **los reportes**, que ya existen.

El tamaño real: 150 personas por 31 días son **4.650 jornadas**. Y cada jornada
escrita no es un `INSERT` suelto: `pintarDiaDeColaborador` recalcula la semana de
esa persona (`reescribirSemanaDe`), así que el costo por fila es varias consultas,
no una.

Lo que tiene que cumplir cualquier operación de ese tamaño:

1. **Ir por bloques**, con su tamaño explícito, y no en una petición única. El
   hosting es compartido y tiene límite de procesos (ver `cpanel-ops` y la sección
   de las 4 vulnerabilidades: ahí ya se vio a ese servidor atragantarse).
2. **Mostrar pantalla de carga con progreso real**, bloque N de M y cuántas
   jornadas van. Una barra indeterminada durante treinta segundos se lee como
   «se colgó», y quien mira recarga la página a la mitad.
3. **Decir qué pasa si se corta.** Una escritura por bloques es parcial por
   naturaleza: si se detiene en el bloque 7 de 10, esas 280 jornadas ya están
   escritas. Eso NO es un error que ocultar, pero obliga a lo de abajo.
4. **Marcar el lote.** Cada aplicación masiva deja su identificador en los días
   que escribió, para poder revertir la operación entera con una sola acción. Sin
   eso, un bloque a medias se corrige a mano fila por fila.

**En los reportes el problema es el mismo pero al leer**, y ahí no hay lote que
valga: lo que hace falta es paginar o transmitir por partes, y que la pantalla
diga por dónde va en vez de quedarse en blanco.

**Lo que NO está medido, y conviene medirlo antes de elegir el tamaño del bloque:**
cuánto tarda hoy un reporte de un mes sobre la empresa más grande de producción, y
cuántas filas por segundo aguanta el servidor escribiendo días esperados. El
número 40 que usa la maqueta es una suposición, no una medición.

### Antes de tocar lo biométrico: lo que hay que arreglar primero

**Anotado el 6 de septiembre de 2026, a peticion del dueno.** El trabajo de
deteccion de vida y consentimiento vive en la rama
`mejoras/rostro-vida-y-consentimiento`, y NO debe avanzar hasta resolver lo de
abajo, porque construir encima empeora la exposicion en vez de reducirla.

El detonante: el dueno reporto que un trabajador marcaba mostrando la foto de un
companero en el celular, y que **pasaba siempre**. Al estudiarlo aparecio que ese
no es el agujero mas ancho, y que hay un problema legal mayor detras.

**1. La puerta de la cedula esta abierta POR DEFECTO.** `kioscoConfig.ts:19`
hace `cfg?.valor !== '0'`, asi que toda empresa que nunca toco ese ajuste la
tiene activa. `POST /worker/login` (worker.ts:246) autentica **con la cedula
sola**, sin PIN ni nada, y el kiosco ofrece ese boton a los 8 segundos
(`SEG_FALLBACK_CEDULA`). Cualquier prueba de vida que se despliegue sin cerrar
esto no elimina el fraude: lo muda al camino mas comodo.

**2. No se puede medir el problema.** `Registro` no guarda por que metodo se
marco, y `Marcador.tsx:272` guarda la misma `fotoEntrada` por los dos caminos.
Hoy es imposible responder "cuantas marcaciones del mes pasado entraron sin
camara". Es lo primero que hay que hacer, porque cuesta cero riesgo y decide
todo lo demas.

**3. EL CONSENTIMIENTO BIOMETRICO NO SE GUARDA.** El checkbox de la Ley 1581 que
existe en `ColaboradorDetalle.tsx:535` es decorativo: `capturarRostro`
(ColaboradorDetalle.tsx:239-247) manda `{ descriptores, foto, fotoMini }` y nada
mas. El comentario de `schema.prisma:210` afirma que `rostroEnroladoEn` es "la
evidencia del consentimiento" y NO LO ES. Hoy HoraPro no puede demostrar que
ningun trabajador autorizo el tratamiento de su dato biometrico.

**4. El vector facial se guarda sin cifrar.** `rostroDescriptor` es una columna
`Json` en texto plano. La normativa que reviso el dueno exige "almacenamiento
cifrado del vector facial (no de la foto abierta)". Ademas
`Registro.fotoEntrada`/`fotoSalida` guardan la foto abierta de cada marcacion.
Es la brecha mas grande de las cuatro y merece consulta con un abogado antes de
seguir construyendo encima. Las sanciones de la SIC llegan a 2.000 SMMLV.

**5. `PUT /colaboradores/:id` deja escribir el biometrico a mano.** Hallazgo
lateral y preexistente: `colaboradores.ts:370-385` hace spread ciego del cuerpo
hacia `prisma.colaborador.update`, y `normalizar` (colaboradores.ts:155-161) no
filtra campos. O sea que hoy se puede escribir `rostroDescriptor` y
`rostroEnroladoEn` por esa ruta. Hay que blindarla con una lista de campos no
editables.

**6. Falta la politica de privacidad publicada.** En curso al momento de
escribir esto: pagina estatica enlazada desde el pie del inicio.

**7. El RNBD.** Registro Nacional de Bases de Datos ante la SIC. Es tramite, no
codigo, pero conviene saber si aplica segun los umbrales vigentes.

**LO QUE SI ESTA BIEN, comprobado y no supuesto:** la retencion de 2 meses de las
fotos de marcacion es REAL. `limpiarFotosAntiguas` (index.ts:169) borra las fotos
de registros de mas de 60 dias, corre al arrancar y cada 24 horas, y su `catch`
deja huella distinguible del camino normal. La politica puede afirmarlo.
Dos matices menores: solo escribe en el log CUANDO borra algo, asi que si dejara
de funcionar nadie se enteraria (regla 8.3.2); y filtra por `creadoEn` sobre
`registros`, la tabla que mas crece, sin que nadie haya visto su `EXPLAIN`
(regla 8.4).

**Orden propuesto:** politica de privacidad, luego telemetria (punto 2), luego
consentimiento (punto 3), y solo despues la deteccion de vida. El cifrado (punto
4) va en paralelo y depende de la respuesta del abogado.

---

### WhatsApp muestra "One moment, please..." al compartir el link

**Reportado el 5 de septiembre de 2026 con captura.** Al pegar
`https://horapro.co/#precios` en WhatsApp, la vista previa no muestra el título
ni la descripción del sitio: muestra **"One moment, please..."** y `horapro.co`.

**Por qué importa comercialmente y no es cosmético:** el canal principal del
producto es WhatsApp (la propia landing dice "soporte por WhatsApp"). Cada link
que se comparta a un prospecto llega con esa tarjeta en vez del titular y la
promesa. Es la primera impresión, y hoy dice algo que parece un error del sitio.

**Qué es esa página.** Es el interstitial de protección de bots del hosting
(Banahosting). Trae `<title>One moment, please...</title>` y un
`setTimeout(() => window.location.reload(), 5000)`: espera cinco segundos y
recarga. Un navegador humano pasa sin enterarse; un rastreador que solo pide el
HTML una vez se queda con esa página y la usa como vista previa.

---

**ANTES DE TOCAR NADA, LEER ESTO.** El 3 de septiembre se diagnosticó esta misma
página como "el hosting bloquea a los rastreadores", se redactó un ticket y se
envió a Banahosting. **No pudieron reproducirlo, y tenían razón**: el desafío lo
había disparado la propia sesión con unas quince peticiones `curl` seguidas.
Está en la memoria del proyecto como `horapro-nada-a-terceros-sin-verificar`.

La diferencia esta vez es que la evidencia NO viene de nuestra actividad: es una
captura de WhatsApp haciendo la petición. Eso hace el reporte creíble, pero **no
convierte la hipótesis en causa**. Sigue sin saberse si le pasa a toda petición
de rastreador, solo a algunas, o solo cuando la IP viene de cierto rango.

**Nada se le manda al hosting hasta haber reproducido el problema
deliberadamente, desde un estado limpio y descartando que la causa seamos
nosotros.**

---

**Cómo diagnosticarlo cuando se retome, en este orden:**

1. **El fragmento `#precios` es irrelevante.** No viaja al servidor: los
   fragmentos son del lado del cliente. No perder tiempo ahí.
2. **Una sola petición, con el User-Agent real del rastreador de WhatsApp**, y
   comparar con una con User-Agent de navegador. Si el interstitial sale solo con
   el UA de bot, la causa es la regla de protección y no el ritmo de peticiones.
   Esperar entre intentos: el objetivo es medir el comportamiento del servidor,
   no volver a disparar la protección como la vez pasada.
3. **Probar con otras herramientas que consultan como bot**, para tener más de
   una fuente: el depurador de enlaces de Facebook (que usa el mismo rastreador
   que WhatsApp), o pedir la página desde otra red.
4. **Mirar primero lo que se puede tocar sin ticket:** en cPanel suele haber
   ajustes de seguridad (ImunifyAV / protección de bots) donde se puede permitir
   rastreadores conocidos. Si el arreglo está ahí, no hace falta involucrar a
   nadie.
5. Solo si queda demostrado que es una regla del hosting que no se puede tocar
   desde cPanel, escribir el ticket, y escribirlo con la reproducción incluida.

**Trampa al verificar el arreglo:** WhatsApp guarda en caché la vista previa de
cada URL. Después de corregirlo, el mismo link va a seguir mostrando la tarjeta
vieja durante un tiempo. Para comprobar de verdad hay que usar una URL que
WhatsApp no haya visto todavía (por ejemplo agregándole un parámetro
`?v=2`), o esperar a que su caché expire.

**Dato a favor de que sí hay algo que arreglar:** el mismo interstitial apareció
en dos días distintos y en dos contextos distintos (curl desde consola y el
rastreador de WhatsApp). Que la primera vez la causa fuera nuestra no significa
que esta también lo sea.

---

### Las 4 vulnerabilidades del backend: diagnosticadas, sin aplicar

**Estado al 4 de septiembre de 2026: el código está desplegado y verificado; esto
quedó pendiente y NO es urgente.** Son avisos de dependencias en un servidor cuyo
`node_modules` funciona, no un agujero abierto. Se intentó aplicar en el
despliegue de ese día y se paró a propósito.

**Actualización del 9 de septiembre de 2026.** Al revisar el árbol de producción
apareció un aviso que no estaba en la lista y que pesa más que los cuatro: cuatro
advisories de severidad alta sobre **nodemailer <= 9.1.0**, que es el paquete con
el que salen todos los correos transaccionales del producto. Se subió a **9.1.1**
en el lockfile, y npm elevó el rango de `^9.0.3` a `^9.1.1`, con lo que una
instalación limpia ya no puede resolver hacia atrás. Solo se movió ese paquete:
cero añadidos, cero quitados. Suite en verde y `tsc` limpio con la versión nueva.

Y un hallazgo que cambia la urgencia de la lista original: **los tres primeros ya
estaban parcheados en el lockfile del repo** (fastify 5.12.3, find-my-way 9.9.0,
fast-uri 3.1.7). Nunca fue un problema de versión: era que el servidor no podía
instalarlas. El cuarto, `brace-expansion`, ni siquiera existe en el árbol de
producción, era transitiva de desarrollo.

La lista original decía:

Lo que se quiere: subir `fastify` 5.8.5 a 5.12.3, `find-my-way` 9.6.0 a 9.9.0,
`fast-uri` 3.1.2 a 3.1.7 y `brace-expansion` 5.0.6 a 5.0.9. Ninguna cambia de
major y ninguna toca `package.json`: las versiones parcheadas viven solo en el
lockfile, así que el artefacto (que lleva únicamente el `dist`) no las arrastra.

**POR QUÉ FALLA, ya diagnosticado con el log en la mano.** `npm install` en el
servidor muere con:

    npm error Cannot read properties of null (reading 'edgesOut')

El mensaje no dice nada, pero el log sí. Las tres líneas anteriores al error:

    idealTree:node_modules/vitest
    silly fetch manifest vitest@4.1.11
    silly fetch manifest @vitest/coverage-v8@4.1.11
       at #loadPeerSet (build-ideal-tree.js:1289)

Es el npm 10.9.8 del servidor atragantándose con el grafo de dependencias PEER de
**vitest**, que es una herramienta de pruebas que el servidor no debería tener
instalada. `--omit=dev` NO lo arregla: npm construye el árbol ideal completo
desde el `package.json` y solo después omite las de desarrollo, así que la
resolución que revienta ocurre igual.

**Dos hipótesis que se descartaron por el camino, para no repetirlas:**
- No es el archivo oculto `node_modules/.package-lock.json`.
- No es el campo `libc` de npm 11, aunque ESE sí era un problema real y ya está
  arreglado en el repo (ver CLAUDE.md 9.7). Arreglarlo no hizo que el install
  pasara: eran dos cosas distintas y solo una era la causa.

**LA SALIDA, ya construida el 9 de septiembre de 2026.** El servidor no tiene por
qué resolver devDependencies. `backend/scripts/generar-paquete-produccion.mjs`
escribe un `package.json` sin ese bloque, con solo el script `start` (los demás
necesitan herramientas que ya no van a estar, así que dejarlos escritos sería
ofrecer comandos que fallan). La decisión vive en la función pura
`paqueteDeProduccion`, probada en `src/utils/paqueteProduccion.test.ts` con seis
casos, dos de ellos vistos rojos por mutación.

Medido, no supuesto: **223 paquetes en el árbol completo contra 88 en el de
producción.** Instalación limpia con npm 10.9.8, la versión exacta del servidor:
`added 87 packages, found 0 vulnerabilities`, salida 0.

**LO QUE ESTA SOLUCIÓN NO PRUEBA, y hay que decirlo antes de cantar victoria.**
No se pudo reproducir el error del servidor en la máquina de desarrollo: con
npm 10.9.8 y el `package.json` COMPLETO, el install también termina bien (198
paquetes, salida 0). O sea que la causa lleva algo del estado del servidor que
aquí no existe: el `node_modules` que ya estaba, el lockfile a medio sobrescribir
después del `cp`, o el límite de memoria del hosting compartido. **La única
prueba de que la cura funciona es correr el install allá.** Lo que sí está
demostrado es que al servidor deja de llegarle nada de desarrollo, que es lo que
señalaba el log.

Alternativas peores, por si acaso: subir el npm del servidor (es hosting
compartido, no conviene) o bajar vitest de versión (castigar el desarrollo por un
problema del servidor).

**Estado real en el que quedó el servidor:** `node_modules` intacto y la app
funcionando (comprobado con `/api/health`). El `package.json` y el
`package-lock.json` de `~/horapro-co-api` quedaron sobrescritos con los del
repo, que es una situación coherente y no estorba: solo se consultan al
instalar. Las versiones que corren siguen siendo las de antes.

---

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

---

### Los tres regímenes de jornada, y cuál soporta hoy el motor

**Verificado el 21 de septiembre de 2026 a petición del dueño**, contra el texto
del artículo 161 del CST y fuentes secundarias. **Esto no es concepto jurídico:**
antes de que cualquiera de estos números liquide dinero de un trabajador, lo
valida un abogado laboral.

| régimen | tope | recargos | ¿lo soporta el motor? |
|---|---|---|---|
| Ordinaria / flexible (art. 161) | 42 h/semana desde el 15 de julio de 2026; entre 4 y **9** horas diarias, repartidas en 5 o 6 días, con día de descanso obligatorio | los normales | **sí**, es lo único que hay |
| Turnos sucesivos de 36 h (art. 161) | 6 h/día y 36 h/semana, operación continua los 7 días, por acuerdo expreso | **ninguno**: ni nocturno, ni dominical, ni festivo, ni extras. El día de descanso remunerado se sigue debiendo | **no** |
| Salud, sector **público** (Ley 269 de 1996, art. 2) | hasta 12 h/día sin pasar de 66 h/semana, para personal asistencial con más de una vinculación al Estado | los del régimen público | **no**, y probablemente no aplica: los clientes de HoraPro son empresas privadas |

**El número que hay que corregir:** la jornada flexible permite hasta **nueve**
horas diarias sin recargo por trabajo suplementario, no diez. Una fuente
secundaria decía diez; el articulado dice nueve. A partir de la décima hay extra.

**Lo que NO se pudo confirmar, y por eso no entra al motor.** El dueño recordaba
que un turno de 12 horas obliga a dar **dos días de descanso seguidos**. Tres
búsquedas y dos lecturas del articulado no lo encuentran. Lo que sí existe y se
le parece son dos reglas distintas:

- entre el fin de un turno y el comienzo del siguiente deben mediar **12 horas de
  descanso** (aparece en la regulación de turnos de entidades públicas);
- los turnos de 12 horas del sector **público** de salud (Ley 269 de 1996).

Parece ser esas dos juntas. Mientras no aparezca la norma con su número y año, no
se implementa.

Fuentes: [art. 161 CST](https://leyes.co/codigo_sustantivo_del_trabajo/161.htm) ·
[el límite al trabajo suplementario en salud, ACHC](https://revistahospitalaria.org/nos-preguntan/el-limite-al-trabajo-suplementario-en-el-sector-salud/) ·
[jornada laboral 2026, actualícese](https://actualicese.com/jornada-laboral/)

---

### Los factores de recargo ya son datos, y les falta una pantalla

**Pedido por el dueño el 21 de septiembre de 2026**, después de una falsa alarma
mía: creí que el 90% del artículo 179 estaba horneado en el código y no lo está.

**Estado real, medido:** `tipos_hora` **no tiene `empresaId`** (es una tabla
global, no una por empresa) y lleva `vigenteDesde` / `vigenteHasta`. La escalera
del artículo 179 ya está escrita entera, incluida la fila que todavía no rige:

| codigo | factor | desde | hasta | |
|---|---|---|---|---|
| HDD | 1,8 | 2025-07-01 | 2025-12-25 | 80% |
| HDD | 1,8 | 2025-12-25 | 2026-07-01 | 80%, y `horaFin` pasa de 21 a 19 (ventana nocturna, Ley 2466 de 2025) |
| HDD | **1,9** | **2026-07-01** | **2027-07-01** | **90%, la vigente hoy** |
| HDD | 2,0 | 2027-07-01 | sin fin | 100%, ya cargada |

O sea que el 1 de julio de 2027 **no hay que tocar nada**: la fila ya existe y el
motor la va a tomar sola por fecha.

**Lo que falta es la pantalla, no el dato.** Hoy esos factores solo se cambian
por SQL. Va en el superadministrador, con una fila por vigencia.

**NO se haga con variable de entorno**, aunque fue la primera idea. Una variable
es un valor único sin fechas: al cambiarla se reescribiría también el pasado, que
es exactamente lo que el día congelado existe para impedir (ver la tercera regla
del *Goal*). El valor de esta tabla es que tiene vigencias; una env var las
perdería.

**La trampa al construir esa pantalla:** editar una fila ya vencida cambia
liquidaciones viejas. La pantalla tiene que dejar **agregar** vigencias nuevas
con facilidad y hacer difícil (o imposible) editar una cuyo rango ya pasó.

---

### Turnos rotativos: el motor está completo y verificado hasta el dinero

**22 de septiembre de 2026. SIN COMMITEAR**, a la espera de que el dueño pruebe.

Antes de esto, `ROTATIVO` era un valor de enum sin nada detrás: `esDescansoObligatorio`
tenía su rama y **los cinco llamadores le pasaban `null`**, así que un rotativo
descansaba el domingo igual que todo el mundo. Es el mismo patrón que ya está
anotado en *Failed attempts* nº 5 con `origen: 'MANUAL'`: mecanismo declarado y
vacío.

**Lo que hay ahora, en cuatro piezas:**

| pieza | qué hace | respaldo |
|---|---|---|
| la celda | un día programado por el horario muestra **su nombre**, no «Sin asignar» | `rotuloDeCelda`, 7 pruebas, 4 mutaciones rojas |
| 1 | `descansoDeLaSemana` y `rangoSemanaBogota` (el backend no tenía noción de semana), más `diaValido` extraída a `diasDeLaSemana` | 11+8+7 pruebas, 9 mutaciones rojas |
| 2 | pintar un día **reescribe la semana**: poner el descanso en miércoles apaga el domingo | `reescrituraDeSemana`, 10 pruebas, 4 mutaciones rojas |
| 3 | la materialización **consulta el plan**, así guardar un horario ya no lo deshace | `descansosPlanificadosPorSemana`, 9 pruebas, 3 mutaciones rojas |

La pieza 1 incluye una deuda que salió al paso: `diaValido` estaba escrita **tres
veces** (en `descansoObligatorio`, en `cuerpoDeRespuestaDescanso`, y una tercera
SIN NOMBRE, inline dentro de `revisionDescanso`, que no aparecía buscando el
nombre y la cazó el grep del PATRÓN). Las tres migradas en el mismo commit, como
pide §9.3; hoy queda una sola definición en todo el backend.

**20 mutaciones en total, 20 rojas, cero sobrevivientes.** Puertas al cerrar:
`tsc` limpio, **78 archivos / 1381 pruebas** en el backend, lint en **173 con
cero errores** (sin subir el tope), frontend en 110 archivos / 1086 pruebas.

**La verificación que cierra la garantía** (`8.6`, guion en el scratchpad: crea el
caso, corre la función de verdad, compara y borra lo que creó). Misma persona,
misma semana, misma jornada de 08:00 a 16:00, y como control el día siguiente:

| día | horas | código | factorPagado | subtotal |
|---|---|---|---|---|
| miércoles con descanso pintado | 8 | HDD | 0,9 | **$78.857** |
| jueves (control) | 7 | HOD | 0 | $0 |

Y regenerar la semana con `pisarExistentes` —lo que corre al guardar un horario—
la dejó **idéntica**: escribió 6 filas de 7 y se saltó el miércoles por estar
marcado `MANUAL`.

**Decisiones tomadas con el dueño, para no volver a discutirlas:**

- **NO se agrega `Horario.tipo`.** `descansoTipo` (PRESUMIDO/FIJO/ROTATIVO) ya
  distingue los dos escenarios, y una segunda copia del mismo hecho es el error
  que este trabajo vino a quitar.
- **Un día EN BLANCO no se asume como descanso.** El olvido de planificar y la
  decisión de dejar libre producen el mismo dato, así que asumir dejaría de pagar
  un recargo por deducción propia. El planificador debe PROPONER cuando sobre
  exactamente un día, y una persona confirma.
- **Cero o más de un descanso en la semana ⇒ se cae al domingo.** Es la dirección
  segura: un turno pintado puede agregar un recargo, nunca quitarlo.

**Lo que queda abierto, y conviene decidirlo antes de seguir:**

1. **El almuerzo de un descanso trabajado no se descuenta.** Por eso el miércoles
   cuenta 8 horas y el jueves 7. La causa está leída, no supuesta: un turno de
   descanso llega sin ventana de almuerzo, `liquidarRegistros:217` cae entonces a
   `descontarAlmuerzo`, y esa función **solo resta de HOD** (`horasColombiana:244`),
   mientras el día solo tiene HDD. La otra (`descontarAlmuerzoOrdinarias`) sí sabe
   restar de HDD. **Es decisión de producto, no defecto:** ¿ocho horas u ocho menos
   el almuerzo?
2. **Planificar después de que pasó el domingo deja la semana con DOS descansos**,
   porque el domingo ya está congelado y no se toca. Paga de más, nunca de menos,
   pero se ve raro en pantalla.
3. ~~Falta la pantalla que propone~~ **HECHA el 22 de septiembre de 2026, con una
   verificación pendiente.** Cuando una semana rotativa queda con seis turnos
   pintados y **exactamente un día en blanco**, el resumen ofrece
   «¿Descansa el jueves?» y un clic lo confirma pintando el turno de descanso del
   catálogo. Cuatro estados, cada uno con su mensaje (`propuestaDeDescanso`, 11
   pruebas, 4 mutaciones rojas):

   | estado | qué se ve |
   |---|---|
   | `PROPUESTA` | el botón con el día, o —si el catálogo no tiene turno de descanso— el aviso de que falta, sin botón muerto |
   | `RESUELTA` | nada: el calendario ya la muestra pintada |
   | `SIN_DESCANSO` | «Sin descanso asignado: se está tomando el domingo» |
   | `AMBIGUA` | «Hay dos descansos esta semana», distinto a propósito del anterior |
   | `NO_APLICA` | nada: sin acuerdo escrito, pintar no mueve el descanso de nadie |

   La ruta la resuelve **solo cuando el rango pedido es una semana** (sobre tres
   semanas, un único valor diría «ambigua» sobre dos que están claras) y manda la
   FECHA ya resuelta, para que la pantalla no haga aritmética de días. La pantalla
   conserva **un solo** camino de escritura (`pintarEn`): el selector de la celda
   y el botón de la propuesta lo comparten.

   **LO QUE FALTA VERIFICAR, y no es menor:** la costura de la ruta contra datos
   reales. Se montó el escenario (persona ROTATIVA, seis días pintados, jueves en
   blanco) pero la sesión del navegador había caducado y no se consulta la ruta
   sin iniciar sesión. La base quedó restaurada y verificada. Para retomarlo, con
   la sesión abierta:

   ```
   npx tsx <scratchpad>/escenario-propuesta.ts montar
   # pedir /api/turnos/calendario?desde=…&hasta=… y comprobar propuesta.fecha
   npx tsx <scratchpad>/escenario-propuesta.ts restaurar
   ```

   Las dos cosas que esa prueba cubriría y que hoy solo están respaldadas por
   `tsc`: que `plantilla.esDescanso` llegue de verdad desde la consulta, y que
   `JUEVES` se traduzca a la fecha correcta. Una fecha mal resuelta pintaría el
   descanso en el día equivocado, y eso mueve un recargo.
4. **El modal del descanso trabajado: BACKEND HECHO el 22 de septiembre de 2026,
   falta la pantalla.** Decidido con el dueño: editable y libre (no se le bloquea
   corregir un error), advirtiendo qué tipo de cambio es y dejando rastro.

   **TOCA EL ESQUEMA, así que el despliegue lleva CUATRO ramas y no tres**, con
   `prisma-build` antes del backend (§11, la regla que salió de tumbar el kiosco).
   SQL en `sql/descanso-trabajado.sql`, ya aplicado y comprobado en local: las dos
   tablas existen, la clave del colaborador es RESTRICT, la de cambios CASCADE, y
   el índice único va `(colaboradorId, fecha)` EN ESE ORDEN, que es de lo que
   depende que MySQL use las dos partes (§8.4).

   **DOS DIVERGENCIAS que `prisma migrate diff` propuso y que se EXCLUYERON a
   propósito**, porque no son de este cambio y las dos revierten decisiones
   tomadas. Medidas contra la base, no deducidas:

   | lo que proponía | lo que hay de verdad | por qué se excluyó |
   |---|---|---|
   | `dias_esperados.plantillaId` FK a `ON DELETE SET NULL` | la base tiene **RESTRICT** | se puso RESTRICT a propósito (ver `dia-esperado-plantilla.sql`); el desfasado es el esquema |
   | `MODIFY plantillas_turno.descansos VARCHAR(191)` | la base tiene **text** | habría TRUNCADO cualquier lista de más de 191 caracteres |

   **RESUELTO el 22 de septiembre de 2026, y sin tocar la base.** No hacía falta
   ningún SQL: la base ya tenía `RESTRICT` y `text`, el desfasado era el esquema.
   Se le declaró `onDelete: Restrict` a la relación y `@db.Text` a la columna.

   La prueba es que `prisma migrate diff` pasó a devolver **«This is an empty
   migration»**: ya no propone esas dos cosas, y además esquema y base coinciden
   por completo.

   **La lección, que es lo que conviene no perder:** el `onDelete` estaba escrito
   solo en un COMENTARIO («RESTRICT a propósito»), al lado de una relación que no
   lo declaraba. Cualquiera que leyera el comentario habría creído que estaba
   resuelto. Un comentario no es una garantía; hay que declararla.

   **Dato del repaso que se hizo después, sin consecuencia hoy:** 22 de las 35
   relaciones con clave foránea no declaran `onDelete` y viven del valor por
   defecto de Prisma (`Restrict` si el campo es obligatorio, `SetNull` si es
   opcional). El `migrate diff` vacío prueba que la base coincide con todos, así
   que no hay nada roto. Ninguna otra tiene un comentario que prometa una regla
   que el esquema no declare: eso sí se comprobó.

   **Lo construido, todo puro, probado y mutado:**

   | módulo | qué decide | pruebas | mutaciones |
   |---|---|---|---|
   | `descansoCompensatorio` | qué opciones caben según la clase, si hay que revisar una decisión vieja, y las dos guardas que LEEN de la base | 20 | 8 rojas |
   | `cuerpoDeDecisionDeDescanso` | el único camino de escritura: valida el cuerpo que llega de la red | 12 | 5 rojas |
   | `cambiosDeDescansoTrabajado` | qué cambió, para el rastro (calcado de `cambiosRegistro`) | 10 | 3 rojas |

   Ruta: `GET /turnos/descanso-trabajado` (lo que el modal necesita para abrirse,
   incluido el historial) y `PUT` (guarda y anota). `claseAlDecidir` **la escribe
   el servidor**, nunca el cuerpo: si la mandara el cliente, cualquiera podría
   declarar «era ocasional» para justificar una decisión que no correspondía.

   **La ley, ya citada en el código:** art. 179 §1 (hasta 2 ocasional, 3 o más
   habitual, por mes calendario), art. 180 (siendo ocasional elige EL TRABAJADOR)
   y art. 181 (siendo habitual van los dos, «sin perjuicio de»).

   **LA PANTALLA, hecha el 22 de septiembre de 2026.** La celda de un descanso
   trabajado es su PROPIO botón y abre el modal. No cuelga del botón de pintar, y
   ese fue el hallazgo que definió el diseño: la rejilla solo envuelve en botón lo
   que cumple `sePuedePintar` (hoy o futuro), pero un descanso trabajado es por
   definición pasado o de hoy, porque alguien ya marcó. Colgándolo de ahí, casi
   ninguno habría sido alcanzable. Decidir la compensación de un día pasado es
   legítimo; repintarlo no.

   El modal muestra lo que la ley obliga (ocasional: dos opciones y «elige el
   trabajador»; habitual: sin elección, el día va «sin perjuicio de» el dinero),
   exige el día antes de guardar un compensatorio, avisa cuando el mes cambió de
   clase, y lista el rastro.

   **Y LA CELDA AVISA LO QUE FALTA**, pedido del dueño el 22 de septiembre de
   2026: un descanso trabajado sin decidir muestra «Pendiente» en la propia
   rejilla, sin abrir nada. Antes había que abrir el modal uno por uno para
   saberlo.

   La regla que lo gobierna es `decisionDelDia` (4 pruebas, 2 mutaciones rojas) y
   no es obvia: **un descanso trabajado SIN fila guardada está pendiente**. La
   fila nace al decidir, así que su ausencia ES el pendiente. Confundirla con «no
   aplica» escondería justo los días que falta atender. Un día ya decidido no dice
   nada extra: la ausencia de la palabra es la señal de que está atendido, y poner
   también un «resuelto» haría que «pendiente» dejara de saltar a la vista.

   En total 12 pruebas de pantalla para esta pieza, y 24 en `descansoCompensatorio`
   con 10 mutaciones rojas.

   **LO QUE NO ESTÁ VERIFICADO, y conviene no perderlo de vista:**

   - **La costura HTTP de la ruta no se ha ejercitado nunca.** Necesita sesión
     abierta en el navegador, el mismo bloqueo que la propuesta de la pieza
     anterior. Todo lo que la respalda hoy es `tsc` y las pruebas de los módulos
     puros. Sin esa prueba no está comprobado que el `upsert`, el rastro y el
     alcance por empresa hagan lo que se cree.
   - **El camino de error del modal** (la consulta que falla al abrirlo) no tiene
     prueba: está marcado así en el propio código.

   **Y SIGUE SIN RESOLVER** la pregunta jurídica: si un mes que cruza a habitual
   reabre las decisiones anteriores. El sistema NO elige: guarda la clase con la
   que se decidió y avisa cuando la actual ya no coincide. Reabrir hacia atrás es
   un interruptor, no un rediseño.

### El panel de la celda: el modal pasó a ser un panel anclado

Pedido del dueño del 22 de septiembre de 2026, con dos maquetas. Cuatro puntos;
tres están hechos y el cuarto (día / semana / mes) está empezado.

**Lo que cambió, en una frase:** hacer clic en una jornada ya no abre un modal que
tapa la rejilla, sino un panel pegado a la celda que además **cuenta las reglas de
ese día**.

**El backend manda ahora las reglas del día** en `GET /turnos/calendario`:
`toleranciaMin`, `toleranciaSalidaMin`, `ajustaEntrada`, `almuerzoMin`,
`almuerzoInicio`, `almuerzoFin` y `descansos`. **No costó ni una consulta más**:
esas columnas ya se consultaban desde antes y `combinarDiasEsperados` las calcula
del horario para los días sin fila. Viajan ahora y no antes porque hasta hoy no
había quién las leyera. Los descansos salen ya convertidos a `{inicio, fin}[]` con
`leerDescansos`, igual que hace `franjaParaResponder`: el formato de la columna es
cosa de la base, no de la pantalla.

Salen de la **fila del día** y no del horario vigente, por la misma razón que
`horarioNombre`: son las reglas con las que ESE día se liquida.

**Tres módulos puros, todos probados antes de existir y todos mutados:**

| módulo | qué decide | pruebas | mutaciones |
|---|---|---|---|
| `lib/posicionDePanel.ts` | dónde cabe un panel sin salirse de la pantalla | 8 | 4 rojas |
| `pages/turnos/detalleDeJornada.ts` | cómo se le redactan las reglas a una persona | 13 | 6 rojas |
| `CalendarioDeTurnos.panel.test.tsx` | el panel, desde la pantalla | 11 | 4 rojas |

`posicionDePanel` vive en `lib/` a propósito: el dueño lo pidió para **toda** esta
clase de elementos («no deben de ocultarse con la pantalla, que se acomode al
espacio»), no solo para este panel. Es una decisión pura porque el defecto solo
aparece en los bordes —el domingo es la última columna y la última persona la
última fila—, o sea justo donde nadie prueba a mano. Su parte delicada es el
**orden del ajuste**: se ajusta contra el tope y DESPUÉS contra el margen; al
revés, un panel más alto que la ventana termina en coordenada negativa, cortado
por arriba y sin forma de llegar a su primer control.

`detalleDeJornada` existe porque los números crudos mienten por omisión: una
tolerancia de cero no se escribe «0 minutos» sino «sin tolerancia», un almuerzo
sin ventana no puede inventarse una, y «1 descansos» delata que nadie pensó en el
caso de uno.

**Un panel y no un modal, y la diferencia se afirma en la prueba:** el panel no
lleva `aria-modal`, no oscurece la rejilla, se cierra con Escape y con un clic
afuera. Se está comparando días entre sí; taparlos para elegir un turno obliga a
cerrar y volver a abrir para mirar el de al lado.

**El hueco** (punto 4): donde no hay nada, la raya `—` pasó a ser un recuadro gris
punteado con un `+` y la palabra «Agregar». **Solo donde de verdad se puede
pintar**: un día pasado también llega a esa rama, y ofrecerle un «+» sería prometer
un clic que el servidor rechaza con un 400.

**CUATRO de las once pruebas de pantalla nacieron VERDES**, y hay que saber cuáles:
tres son guardas de regresión legítimas (el panel abre, ofrece el catálogo, elegir
pinta: lo que el modal ya hacía). La cuarta, «un día sin horas no inventa reglas»,
era el defecto del §9.1 —una aserción sobre la ausencia de algo que aún no
existía—; queda respaldada por la mutación C1, que hace que el panel se invente
horas y la pone roja.

**Trampa encontrada en los fixtures, y sigue viva:** `montar` recibe `unknown[]` a
propósito (así se puede probar que un payload viejo al que le falta un campo no
tumba la pantalla), y el precio es que **TypeScript no tipa ningún fixture**.
Agregar campos a la respuesta no rompe `tsc`: las pruebas siguen verdes
ejercitando un día que no existe. Ya había pasado: `horarioNombre` y `decision` se
agregaron a la respuesta y el fixture de `planificar` se quedó sin ellos. Los tres
fixtures están ahora al día y con el aviso escrito encima.

**Puertas:** frontend 115 archivos / 1139 pruebas, `tsc -b` limpio, lint 65/6 (sin
moverse). Backend 82 archivos / 1438 pruebas, `tsc` limpio, lint 173 (en el tope,
sin subirlo).

**LO QUE NO ESTÁ VERIFICADO:**

- **Nada de esto se ha visto en un navegador.** La sesión del navegador está
  vencida y no se va a iniciar sesión por el dueño. Es un cambio de diseño: la
  posición real del panel, los colores y el recuadro gris solo están respaldados
  por pruebas de comportamiento, no por haberlos mirado.
- **La costura HTTP de los campos nuevos** no se ha ejercitado. Que viajan lo
  respalda `tsc` contra `DiaEsperadoCalculado`, y nada más.
- En jsdom todos los rectángulos miden cero, así que **la geometría no se prueba
  desde la pantalla**: se prueba en `posicionDePanel` y punto.

### Día, semana y mes en el calendario

El cuarto punto del pedido del 22 de septiembre: «que la parte de arriba quede
así, que podamos ver día, Semana y Mes». Hecho y en verde.

**El mes cabe, y no hizo falta inventar otro diseño.** El backend acepta hasta 62
días por consulta (`DIAS_MAXIMOS`, una guarda de tamaño y no una regla de
negocio), y la rejilla ya tenía `overflow-x-auto` con la columna de la persona
fija (`sticky left-0`), así que 31 columnas se recorren a lo ancho sin perder de
vista de quién es cada fila.

**Dos decisiones puras más, probadas antes de existir y mutadas:**

| módulo | qué decide | pruebas | mutaciones |
|---|---|---|---|
| `vistaDelCalendario.ts` | qué rango, qué días y qué rótulo lleva cada modo | 15 | 6 rojas |
| `inicialDeDia` (en `semana.ts`) | la inicial de una columna, sacada de la fecha | 3 | 3 rojas |
| `CalendarioDeTurnos.vista.test.tsx` | que la pantalla los aplica | 9 | 4 rojas |

**La simplificación que sostiene todo lo demás:** el ancla es CUALQUIER día dentro
del período, no su primer día. Con eso «Hoy» es siempre `hoy` en los tres modos,
cambiar de modo no obliga a recalcular nada por fuera, y «¿estoy viendo el período
actual?» es preguntar si `hoy` está entre los días mostrados.

**EL DEFECTO QUE ESTE TRABAJO CASI INTRODUCE, y cómo se cazó.** El tope legal es
de 42 horas **semanales**, y se comparaba contra él en **TRES** sitios: la tarjeta
del promedio, la fila de la rejilla y la del resumen. En la vista de mes cualquier
persona pasa de 42 horas, así que la pantalla habría pintado a la empresa entera
en ámbar diciendo que se pasaron del tope: un número plausible y falso, que es la
forma exacta en que este producto se rompe según la cabecera de su CLAUDE.md.

De memoria yo había contado **dos** de los tres. Aparecieron buscando el patrón
`tope * 60` en vez del nombre, que es lo que manda el §9.3. Ahora los tres miran
la misma bandera, `topeAplica`.

Lo mismo con los **rótulos que mienten**: «en la semana», «Resumen de la semana»,
«Total semanal» y las flechas «Semana anterior / siguiente» estaban escritos fijos
y son falsos en cuanto se muestra un mes. Salen de una tabla `PERIODO` con un caso
por modo, porque el español tampoco deja resolverlo con un ternario: es «de la
semana» pero «del mes».

**UNA MUTACIÓN SOBREVIVIÓ, y el hueco era de la prueba.** `moverVista` en modo mes
se mutó a «sumar 31 días» y la suite siguió verde. Hacia adelante esa mutación es
código equivalente (desde el día 1, sumar 31 siempre cae en el mes siguiente);
hacia atrás no lo es, pero el único caso que yo había escrito iba de **enero a
diciembre, y diciembre tiene 31 días**. Había elegido justo el mes que no
distingue. Se agregó el caso de marzo a febrero (y el de un año bisiesto), y con
eso la mutación muere. El arreglo fue completar la prueba, no ablandar la
mutación.

**Y OTRA TRAMPA DEL MISMO TIPO, más sutil:** las 8 pruebas de pantalla que nacieron
rojas fallaban TODAS en el mismo punto, al no encontrar el botón «Mes». Ninguna
llegó nunca a su propia aserción, así que la del tope —la que protege el número
falso— nunca se había visto roja por su motivo. Lo arregla la mutación W1, que
quita la bandera y la pone roja de verdad.

**Puertas:** 117 archivos / 1166 pruebas (antes de esta pieza, 116 / 1157: la
cuenta cuadra exacta y no desapareció ninguna), `tsc -b` limpio, lint 65/6.

**Herramienta, para la próxima:** en `perl -pi -e "s/.../.../"` una barra **en el
patrón** cierra el delimitador antes de que `\Q` cite nada, así que mutar JSX
(`<Celda ... />`) falla con `syntax error near "/>"`. Se usa `s|...|...|`. Lo cazó
la puerta del guion —exigir que la cadena vieja DESAPAREZCA— y no la lectura: sin
ella, perl falla, el archivo queda intacto, la prueba pasa y la mutación se anota
como «roja» sin haber mutado nada, o sea una cobertura inventada.

### El encabezado con la maqueta, y la vista de día en horas

Dos pedidos más del dueño el mismo 22 de septiembre, con maqueta: el encabezado
con esa distribución, y la vista de día en horas. **Los dos hechos, y esta vez
SÍ verificados en el navegador**, porque apareció un servidor de vista previa
corriendo con sesión abierta. Hasta entonces todo lo de esta pieza estaba
respaldado solo por pruebas.

**El encabezado**: título grande a la izquierda, el selector `Mes · Semana · Día`
centrado sobre una pista gris, y `‹ Hoy ›` agrupado a la derecha. El orden del
selector es de MAYOR a menor, como la maqueta, y no al revés como estaba.

Tres columnas (`sm:grid-cols-[1fr_auto_1fr]`) y no `justify-between`: con
`between` el selector se corre de sitio cada vez que el título cambia de largo,
y de «Septiembre de 2026» a «28 de septiembre al 4 de octubre» hay bastante.

**«Hoy» va siempre, y entre las dos flechas.** Antes solo aparecía cuando hoy no
estaba a la vista, y eso tiene un costo que no se ve hasta que se usa: un botón
que aparece y desaparece EMPUJA a las flechas de sitio justo mientras se hace
clic repetido en ellas.

**El rótulo pasó a empezar con mayúscula** («Septiembre de 2026», no «septiembre
de 2026»). El español escribe los meses en minúscula dentro de una oración, pero
esto es un título, y al agrandarlo la minúscula se leía como descuido.

**La columna de persona** se llevaba un tercio de la pantalla para un nombre
corto. Con `w-px` + `whitespace-nowrap` se ajusta al contenido, con un tope de
180 px para que un nombre larguísimo no vuelva a robársela. **Medido en el
navegador: 162 px, el 18 % de la tabla.**

**LA VISTA DE DÍA EN HORAS.** La rejilla deja de tener una columna por día y pasa
a tener un eje de horas, con la jornada de cada quien dibujada como una barra del
color de su turno, del ancho de su rango.

| módulo | qué decide | pruebas | mutaciones |
|---|---|---|---|
| `ejeDeHoras.ts` | qué horas se muestran y dónde va cada barra | 17 | 6 rojas |
| `CalendarioDeTurnos.dia.test.tsx` | que la pantalla lo aplica | 7 | 4 rojas |

**LA DECISIÓN QUE SE ROMPE SOLA SI SE ESCRIBE A OJO: EL TURNO NOCTURNO.** Este
producto tiene guardas de 22:00 a 06:00. Esa jornada cruza la medianoche, y se
dibuja como **UNA barra continua**, con el eje estirado más allá de las 24 horas
y los rótulos de después rotulados 00, 01, 02. Partida en dos se leería como si
la persona trabajara dos veces ese día, y el segundo pedazo aparecería a la
IZQUIERDA del primero, antes de haber entrado.

**El eje se calcula con las jornadas de TODAS las personas del día**, no una por
fila: con un eje por fila, dos barras del mismo largo significarían horarios
distintos y la pantalla dejaría de poder compararse de un vistazo, que es para
lo que sirve.

**UN DEFECTO REAL que la prueba cazó:** la barra salió como un `div` y con eso la
vista de día se quedó **sin clic** (ni panel, ni pintar). La salida no fue
envolverla en otro botón —eso habría dejado los tres casos de una celda escritos
dos veces—, sino que las dos vistas pasen por el MISMO envoltorio con otro
contenido. De paso, el tono de color se sacó de `Celda` a `tonoDeJornada`, porque
la barra tiene que llevar exactamente el mismo color que la celda de la semana.

**DOS RÓTULOS FALSOS MÁS, que la primera búsqueda no cazó:**

- El encabezado de la columna de totales decía `Semana` fijo, también en la vista
  de día. Se encontró **midiendo los anchos de las columnas en el navegador**, no
  leyendo: la búsqueda anterior había buscado «Total semanal» y «Resumen de la
  semana», y este es un «Semana» pelado que no coincidía con ninguno.
- `const COLUMNAS = 9` («la persona + los siete días + el total»), usado en dos
  `colSpan`. Con un día son 3 y con un mes 33.

**Puertas:** 119 archivos / 1190 pruebas, `tsc -b` limpio, lint 65/6.

**VERIFICADO EN EL NAVEGADOR, y esto es lo nuevo:** la vista de mes con datos
reales muestra a una persona con 154,6 h **sin ninguna alarma ámbar**, que es
exactamente el defecto del tope semanal que se evitó. Y en la vista de día se
midió que la regla de horas y la pista de cada fila comparten caja
(`mismaCaja: true`, 463 px de origen y 207 de ancho), con el rótulo `10` en
27,27 % y el `16` en 81,82 %, que es (10−7)/11 y (16−7)/11.

**Tres instrumentos propios que midieron otra cosa, el mismo día:** un
`if grep -q ... | head -1` que lee el código de salida de `head` y siempre dice
que sí; un ayudante de prueba que esperaba por un nombre que su propio fixture no
tenía, con lo que dos pruebas fallaban sin llegar a su aserción; y un
`querySelector('div[style*="left"]')` que agarró la primera guía de hora en vez
de la barra. Ninguno de los tres dio un error: los tres dieron un número
equivocado con cara de bueno.

(Y un cuarto, del mismo día: un `grep` que buscaba `'no corre el detector'` sobre
un nombre de prueba que dice `NO` en mayúscula. `grep` distingue mayúsculas, así
que devolvió vacío. No se leyó como «no existe» solo porque el guion tenía la
guarda de no concluir nada desde un vacío.)

### Una prueba INESTABLE que no es de este trabajo

**`frontend/src/pages/RevisionMarcaciones.test.tsx:271`**, «el barrido NO corre el
detector hasta que se le pide, aunque las fotos ya estén».

Falló **una vez** en una pasada de la suite completa el 22 de septiembre de 2026,
en medio del trabajo de turnos, y conviene saber que no tiene nada que ver:

- El archivo está **limpio en git**: ni modificado ni nuevo. Es código commiteado
  el **10 de septiembre**, del barrido de revisión facial (`20a355c`, `1a8fbf0`,
  `fe25466`, `9f75523`).
- **Aislada pasa 4 de 4** (22 pruebas cada vez).
- La suite completa, antes y después de ese fallo, dio **1190 de 1190 en verde**.

Tardó 1021 ms, que es cara de espera agotada: bajo la carga de la suite entera se
le acaba el tiempo. **No está diagnosticada**, solo acotada. Si vuelve a salir en
rojo, el sitio donde mirar es cómo espera esa prueba, no el módulo de turnos.

---

## Por qué este archivo se desactualiza, y qué hacer con eso

Pregunta del dueño el 30 de septiembre de 2026: «cuando hacemos los cambios
pendientes del handoff, ¿este se actualiza para que no los repitamos?».

**No se actualiza solo.** Lo actualiza quien trabaja, cuando se acuerda, y la
prueba de que eso no basta está en este mismo archivo: se tocó por última vez el
25 de septiembre y desde entonces habían entrado **64 commits**. Dos secciones
llevaban encima su propio aviso de «esto quedó viejo» —uno del 9 y otro del 23 de
septiembre— sin que nadie las arreglara. O sea que el archivo ya sabía que mentía
y siguió mintiendo.

Y hay un segundo problema, más silencioso: cuando algo queda viejo, aquí se le ha
puesto un aviso ENCIMA en vez de reescribirlo. Es honesto, pero el archivo crece y
hay que leer avisos de avisos para saber qué es cierto. **Lo viejo se reescribe,
no se anota.**

Las tres reglas, para que esto deje de pasar:

1. **Un commit que cambia el estado del despliegue toca este archivo en el MISMO
   commit.** Si el diff mueve una rama de artefacto, un SQL pendiente o el número
   de commits sin desplegar, `handoff.md` entra con él.
2. **Nada de estado escrito de memoria.** Las ramas, las pruebas y el lint se
   miden con un comando y se pegan medidos, con la fecha. Este archivo denunció
   dos veces haber escrito de memoria datos que llevaban semanas siendo falsos.
3. **Lo que se hace, se borra de aquí.** Un pendiente que ya se hizo y sigue
   escrito cuesta más que no haberlo escrito: la próxima sesión lo va a volver a
   hacer, o va a perder el tiempo comprobando que ya está.
