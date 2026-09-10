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
| `master` | `584cc0f` | la política publicada; **le falta todo el lote del 10 de septiembre** |
| `develop` | `584cc0f` | igual que master |
| `mejoras/rostro-vida-y-consentimiento` | `67d6fe6` | el lote biométrico entero, desplegado |
| `frontend-build` | `dd9a3cd` | **desplegado el 10 de septiembre de 2026** |
| `backend-build` | `25f6516` | **desplegado el 10 de septiembre de 2026** |
| `prisma-build` | `e3aeb52` | **desplegado**, y se me olvidó en el primer intento: tumbó el kiosco |

Todas subidas a `origin`. **`master` y `develop` están atrás y hay que fundir el
lote ahora que está desplegado y comprobado.**

**Ojo con `master`:** la rama de la política está desplegada y verificada en
producción, pero todavía no se fundió en `master`. Según la sección 3 del
CLAUDE.md, ese es justo el momento en que `master` debe avanzar. Está pendiente
de aprobación del dueño.

**Ojo con `develop`:** quedó atrás de `master`. Hay que alinearla.

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

> **Lo que decía antes esta sección quedó viejo y se corrigió el 9 de septiembre
> de 2026.** Decía «desplegar `backend-build` (`04787ce`)», pero `04787ce` y
> `f4816d3` son commits de la rama de ARTEFACTOS, no de la fuente: su código
> fuente ya está en `master` y en producción. `backend-build` avanzó desde
> entonces hasta `9b38f87`, que es lo que corre hoy. La prueba de que está
> desplegado es que el 8 de septiembre se subió un `.docx` en producción, y esa
> validación es de backend. Los comandos de abajo se dejan porque la mecánica
> sigue siendo la buena para el próximo despliegue de backend.

**Lo que sigue de verdad:** fundir la política en `master` y alinear `develop`.
Después, los prerrequisitos biométricos de la sección de más abajo.

<details><summary>Mecánica del despliegue de backend, para la próxima vez</summary>

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

</details>

---

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
