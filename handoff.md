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

**Medido el 7 de octubre de 2026, con `git fetch` delante y las puertas corridas ese mismo
día. No escrito de memoria.** La medición anterior de esta sección era del 1 de octubre. Desde
entonces entraron **43 commits** y hubo tres despliegues más (4, 5 y 6 de octubre), y este
archivo no se tocó en ninguno: la regla 1 del final se incumplió tres veces seguidas. Esto lo
corrige.

| rama | hash | de qué fuente |
|---|---|---|
| `master` | `e70468d` | **lo desplegado y verificado.** Alineado el 9 de octubre a pedido del dueño: avance limpio de 6 commits desde `31f9698`, sin `--force`, leído en `origin`. Los 13 archivos de código de ese rango son exactamente los ya desplegados (`b1a09ac` y `1d563f4`); el resto es documentación |
| `develop` | el commit de este handoff, sobre `fb46212`; **`origin/develop` = `01aa7e9`** (lo subió la otra sesión el 9 de octubre, y su push arrastró `5dfc0af` y `1ba9a8c`, míos): **3 commits locales sin subir**: `fb46212` y dos del handoff | le lleva a `master`: el handoff, la regla del 403 ampliada y el cierre de turnos (frontend, desplegados el 8) y el arreglo de la escalada a `SUPER_ADMIN`, `2063dd4` (backend, **desplegado el 9**) |
| `frontend-build` | `b1a09ac` | de `f2a4678`, desplegado el 8 de octubre (antes: `95f694a` solo se publicó, nunca se copió; `82f2776` fue el de `31f9698`) |
| `backend-build` | `1d563f4` | de `240ec6b` (backend = `2063dd4` sobre `b0d91f1`), desplegado el 9 de octubre. Solo cambian 2 archivos respecto de `2f36b2f`: `dist/routes/auth.js` y `dist/utils/rolDeEmpresa.js` |
| `prisma-build` | `9507d82` | de `b0d91f1`; no se tocó el 9: `git diff --name-only b0d91f1..240ec6b` no incluye `schema.prisma` (la puerta de CLAUDE.md §11) |
| bundle público | `index-ommmrJo5.js` | comprobado el 8 de octubre: el `index.html` del docroot lo pide, trae el texto nuevo y el sitio lo entrega por HTTPS (`curl` desde el servidor) |

`prisma-build` no se movió desde la noche del 4 de octubre **porque el esquema no cambió**
(`schema.prisma` no sale en `git diff --name-only b0d91f1..develop`). `backend-build` se movió el 9
de octubre, con el único cambio de backend desde entonces: `2063dd4`, el arreglo de la escalada a
`SUPER_ADMIN` (`routes/auth.ts`, `utils/rolDeEmpresa*`, el tope del lint a 168 en `package.json`).
**Código commiteado de `develop` sin desplegar (9 de octubre): 1 commit, de frontend, `5dfc0af`** (el Excel de Registros con dos columnas de sede; ver *Lo pendiente de desplegar*).

Qué llevan, según los mensajes de los propios artefactos: el backend y el esquema, el clima
laboral y el kiosco que se pausa si no se paga; el frontend, además, lo que se hizo del 4 al 6
de octubre (ver *Next step* nº 4 y `docs/PENDIENTES.md`).

| | backend | frontend |
|---|---|---|
| pruebas | **102 archivos / 1750** (+1 fallo esperado), a `31f9698`; **sin re-medir tras `2063dd4`** | **189 / 2272**, medido el 8 de octubre en un árbol limpio en `f2a4678` |
| tipos | `tsc --noEmit`, código 0 | `tsc -b`, código 0 |
| lint | **173 avisos, 0 errores** — su tope | 65 errores / 6 avisos, la línea base |

**El backend se midió en un `git worktree` limpio sobre `31f9698`, no en la carpeta de trabajo**: ese
día la carpeta tenía trabajo de OTRA sesión sin commitear (un arreglo en `routes/auth.ts` con
`utils/rolDeEmpresa*` y el tope del lint bajado a 168), y medido ahí daba 104 / 1764 y 168 avisos:
números que no son de lo que está en `develop`. Es la regla de *Dos sesiones armando artefactos*
aplicada a las puertas: un verde solo vale si el árbol estaba limpio. El frontend no tenía
nada ajeno (`git diff --stat -- frontend` salía vacío).

### El recargo dominical se rompió y se arregló (1 de octubre de 2026)

Hay que leer esto antes de tocar nada del motor de horas.

El despliegue de la madrugada llevaba una regla nueva para el día de descanso, y
estaba mal leída. La regla del dueño es «solo cuando se programa se pone el día de
descanso», que responde **cuál** día es el descanso. Se implementó como si
respondiera **si hay** uno: a quien no tiene horario ni semana pintada, el motor
dejó de verle descanso ningún día. Su domingo trabajado pasó de `HDD` a `HOD` y el
recargo del 90% **no se mudó de día, desapareció**. Esa persona podía trabajar los
siete días sin disparar un solo recargo.

Medido en producción: **37 personas en septiembre, unos 3,34 millones**, sobre un
mes YA CERRADO. Concentrado en EMERGENCIAS VETERINARIAS y POSTRE DE PESCADO, que
trabajan todos los días.

Arreglado el mismo día en `df4f0c4`, una línea en `esDescansoObligatorioDe`:
`hoy === (diaValido(descansoProgramado) ?? DOMINGO)`. Sin programación válida manda
la presunción legal (art. 172 del CST, que la Ley 2466 de 2025 no tocó). En cuanto
se pinta la semana, la programación decide y puede llevarse el descanso al
miércoles: la regla del dueño queda intacta donde de verdad aplica.

**Por qué no lo cazó la suite:** la decisión tenía prueba unitaria desde el primer
día; el CABLE que la lleva al dinero no tenía ninguna. Nadie había liquidado un
domingo con `fuente = PROGRAMACION` de punta a punta, que es justo lo que pasa
`routes/reportes.ts` para alguien sin horario. Ahora sí, en
`liquidarRegistros.descanso.test.ts`, junto con dos turnos nocturnos que cruzan el
domingo (la forma real de esas dos empresas, que tampoco estaba probada).

**Y hubo un segundo frente, que no caza ninguna prueba:** el panel de la semana del
calendario de turnos seguía diciendo «esta semana queda sin descanso» mientras la
nómina pagaba el domingo. La pantalla afirmaba lo contrario del dinero. Corregido en
`839591b`. Ese texto ya se había desincronizado dos veces en direcciones opuestas:
**si la regla se mueve, la frase se mueve en el MISMO commit.**

Hay dos SQL de este arreglo y los dos están **aplicados**:
`sql/domingos-congelados.sql` (devolvió a NULL los domingos futuros que el código
roto congeló en 0; comprobado por el efecto, de más de cien filas a cero, con los
310 descansos marcados intactos). Septiembre no necesitó SQL: sus filas estaban en
NULL porque la columna se creó esa misma madrugada.

### Lo que se verificó del despliegue de la noche del 1 de octubre, y cómo

```
grep '?? exports.DOMINGO'    en ~/horapro-co-api/dist → 1   (0 en el artefacto anterior)
grep 'cruzarExtrasConSaldo'  en ~/horapro-co-api/dist → 3   (0 en el artefacto anterior)
health                                               → 200
lsnode de horapro-co-api                             → UNO solo, el nuevo
```

Más, en el navegador y por el dueño: el recargo vuelve a salir en el reporte de
septiembre, y el panel de turnos dice «esta semana descansa el domingo».

**Este despliegue NO agregaba ninguna ruta, así que el truco del 404→401 no sirve
para él.** Lo único que distingue «desplegado» de «copiado» aquí es el `grep` dentro
del `dist` vivo más la pantalla.

### Los diez SQL de la madrugada del 1 de octubre, todos aplicados

`plantillas_turno`, `dias_esperados.plantillaId` (en tres pasos), `esDescanso`,
`descansoPintado`, `descansos_trabajados` + `_cambios`, `eventos_sistema`,
`colaboradores.numeroContrato`, y el renombre de `tipos_hora`. Más los dos del
arreglo de la noche. Cerrado con `prisma/sql-contra-esquema.ts`, que compara el
esquema entero contra la base: **cero faltantes de 371 columnas.**

`esDescanso` quedó **nullable con default NULL**, que era el punto delicado: con
`NOT NULL DEFAULT 0` habría afirmado sobre 27.611 filas que ninguno de esos domingos
era descanso.

### DOS SESIONES ARMANDO ARTEFACTOS A LA VEZ (1 de octubre): lo que más cerca estuvo de salir mal

No fue el código. Ese día hubo dos sesiones trabajando sobre `develop` en la misma
carpeta, y las dos armaron artefactos de las MISMAS ramas. Salió bien **por suerte de
orden**: la segunda compiló después del commit de la primera, así que su artefacto
incluyó los dos cambios.

Lo que se vio en el camino: una suite reportada verde que incluía trabajo ajeno sin
commitear; un `frontend-build` que quedó superado antes de usarse y cuyos comandos,
de haberse corrido, **habrían retrocedido producción sin un solo error**. Lo destapó
mirar el `index.html` del docroot y ver un bundle que no era ninguno de los dos
esperados.

**La regla: una sola sesión arma artefactos; la otra solo commitea a `develop`.** Y
antes de dar comandos de servidor, releer `origin/*-build` con `fetch`: el artefacto
de hace diez minutos puede ya no ser la cabeza.

### Lo pendiente de desplegar

**Todo esto está commiteado en `develop` y NADA está desplegado: el dueño pidió esperar a que terminen las reseñas y
subir todo completo (9 de octubre).** A `origin/develop` ya subieron `5dfc0af` y `01aa7e9` (los subió la otra sesión, con mis
commits debajo, sin que yo lo pidiera: es el mismo efecto del 8 de octubre al revés); `fb46212` sigue local. Son tres cosas,
en este orden de commits: el Excel de Registros (`5dfc0af`), las
reseñas de la otra sesión (`01aa7e9`, ya commiteadas) y la hoja «Entradas por día» (`fb46212`).

**1. El Excel de Registros, `5dfc0af`** (9 de octubre, petición del dueño). La columna
«Sede» pasa a ser la sede a la que PERTENECE la persona (la asignada; si no tiene, la atribuida) y se añade
«Marcó en», a su derecha, con dónde marcó esa jornada: una sede, «A → B» si cruzó, «Cerró en B» si solo se
conoce el cierre, vacía si no quedó registrada. Antes una sola columna mezclaba las dos («No marcó · cuenta en
X»). Solo cambia `features/registros/exportarRegistros.ts` y la llamada en `pages/Registros.tsx`; la TABLA de la
pantalla no cambia. Respaldo: 14 pruebas rojas antes y 8 mutaciones muertas.

**2. La hoja «Entradas por día», `fb46212`** (9 de octubre, petición del dueño: la tabla dinámica de personas por días
con la hora de entrada, que armaba a mano con el Excel de Registros). Es una SEGUNDA HOJA del mismo archivo y sigue lo
que se está viendo: una fila por persona, una columna por día del rango (también los días en que nadie marcó) y, en la
celda, la primera entrada del día en hora de Bogotá. Sin filtros de jornada suma a las personas activas sin ninguna
marcación, con la fila en blanco (con una persona elegida, solo a ella); con un filtro puesto NO las suma, porque ahí un
blanco querría decir «la filtré» y no «faltó». Una marcación fuera del rango agrega su día y no se pierde. **La celda
vacía no distingue descanso, novedad y falta**: eso necesita los días esperados del servidor y sería otro reporte, que
el dueño no ha pedido. Respaldo: 19 pruebas rojas antes; 11 mutaciones, y **una sobrevivió a la primera ronda** (la
pantalla mandaba las jornadas sin filtrar, y la prueba del filtro no lo distinguía porque las dos jornadas eran de la
misma persona): se reescribió con tres personas y ahora muere. Con las reseñas incluidas, en un árbol limpio sobre
`fb46212`: `tsc -b` en 0, **197 archivos / 2527 pruebas** y lint limpio en lo nuevo (`Registros.tsx` conserva sus 2
errores heredados, no uno más).

**3. Las reseñas, `01aa7e9`** (de la otra sesión, 43 archivos, commiteadas el 9 de octubre a las 16:17). **Traen cambio de
esquema y tabla nueva**, así que el despliegue de «todo completo» lleva LAS CUATRO ramas, en este orden (CLAUDE.md §11):
(1) `sql/resenas.sql` en phpMyAdmin; (2) `prisma-build`; (3) `backend-build`; (4) `frontend-build`. `schema.prisma` suma
74 líneas, solo aditivas: el modelo `Resena` y su relación con `Empresa`. Las pruebas del frontend de las reseñas pasan
dentro de las 2527. **El backend no se midió con ellas**: antes de armar `backend-build` hay que correr sus puertas en un
árbol limpio (la última medida, 104 archivos / 1764 pruebas y lint 168, es de antes de las reseñas).

Hasta aquí, el 9 de octubre en la mañana, nada de lo commiteado estaba sin desplegar: el frontend quedó al día el 8
(`b1a09ac`) y el backend el 9 (`1d563f4`, el arreglo de la escalada a `SUPER_ADMIN`; ver *El despliegue del backend
del 9 de octubre*).

**Antes de subir `develop`: `git log origin/develop..HEAD`.** Hoy llevaría tres commits: `fb46212` y dos de handoff, todos míos.

### El despliegue del backend del 9 de octubre: la escalada a `SUPER_ADMIN`

**Qué cambió en producción:** `routes/auth.js` (modificado) y `utils/rolDeEmpresa.js` (nuevo). `POST` y
`PUT /api/auth/usuarios` solo aceptan `ADMIN` o `SUPERVISOR`. Copiado el 8 de octubre (`cp -R` al app root
real, `/home/ewyfwxbg/horapro-co-api`, leído con `PassengerAppRoot`) y **reiniciado el 9** con
`touch tmp/restart.txt`, con un «sí» del dueño por cada uno de los dos pasos.

**Cómo se comprobó, por efecto:** antes de copiar, el `auth.js` vivo traía 0 menciones de
`rolPermitidoParaEmpresa`; `diff -rq` entre artefacto y app vivos mostró SOLO esos dos archivos; después de
copiar, 2 menciones y `diff` vacío. Tras el reinicio: `/api/health` → `{"status":"ok"}` (prueba que el
módulo nuevo carga), `PUT /api/auth/usuarios/x` sin token → 401, y **un proceso `lsnode` nuevo** (3416140)
nació después de la copia, así que ejecuta los archivos nuevos. **NO se probó la escalada contra
producción**, ni se debe: el arreglo se respalda con sus pruebas (`rolDeEmpresa.test.ts`,
`auth.usuarios.test.ts`) y con esta comparación de código.

**El proceso viejo.** El 3277445 (21 h, código anterior en memoria) **siguió vivo** tras el reinicio.
Con 40 peticiones de lectura, solo el nuevo cambió de CPU y de memoria; el viejo quedó idéntico (22 s de CPU,
99 528 KB), o sea que no atendía. LiteSpeed no apaga los procesos viejos al reiniciar (visto el 13 de
septiembre y otra vez ahora). El otro viejo (506758, de casi dos días) sí desapareció solo.
**El dueño dio el «sí» y se ejecutó `kill 3277445` el 9 de octubre** (antes se releyó el listado: el número
seguía siendo el viejo, con 22 s de CPU y sin moverse). Volvió sin error, **pero el efecto NO está verificado**:
la herramienta de seguridad del navegador denegó el Enter del listado de comprobación, y no se reintentó. Para
cerrarlo: `ps -u ewyfwxbg -o pid,etime,time,rss,cmd --sort=-etime | grep lsnode` (el 3277445 no debe salir, y el
3416140 sí) y `curl -s https://horapro.co/api/health` → `{"status":"ok"}`.

**La revisión de si alguien usó el hueco** (`sql/revision-escalada-super-admin.sql`, solo lectura, corrida
el 9 de octubre en phpMyAdmin): 1 `SUPER_ADMIN` (la del dueño), **0 con empresa**, **0 cuentas de empresa con
un rol que no sea ADMIN ni SUPERVISOR**, **0 llamadas auditadas a `/api/auth/usuarios`**, con 814 eventos de
auditoría como control. Límites: la auditoría empieza el **1 de octubre de 2026** (antes no hay rastro), solo
registra lo que salió bien, y no ve a quien se subió, entró, guardó su token de 7 días y se bajó. Es decir:
sin señales, no prueba de ausencia. No se corrieron las consultas 2 y 3 del archivo porque con los conteos en
cero habrían listado solo la cuenta del dueño.

**Del cPanel en el navegador, aprendido en este despliegue:** la terminal se queda muerta tras unos 10 minutos
de inactividad (no redibuja ni con `Ctrl+C`): se recarga la página y se teclea de nuevo, y como la línea
nunca recibió Enter, no hay nada que repetir. La flecha `Up` sí trae el historial. `find` es una herramienta
aparte de `computer`. Un Enter puede fallar por una caída de la herramienta que lo autoriza: la línea sigue en
pantalla y se reintenta una vez.

### Cerrar un turno olvidado: la entrada reenviada sin segundos (8 de octubre de 2026)

**Qué pasó.** El modal «Cerrar turno» (`features/dashboard/components/ModalCerrarTurno.tsx`) mandaba la
entrada como `HH:mm`, sin segundos, aunque nadie la tocara. Una persona marcó salida a las 16:42:40 y una
entrada a las 16:42:54: la entrada viajaba como 16:42:00, quedaba DENTRO del tramo anterior y el
servidor la rechazaba por cruce de marcaciones (400). El modal tragaba el motivo y decía «No pudimos
guardar. Intenta de nuevo.». Se encontró leyendo las marcaciones en producción con un `SELECT` (solo
lectura) a partir del id que salía en DevTools.

**El arreglo** (`f2a4678`, desplegado como `b1a09ac`): la entrada solo viaja si se corrigió la fecha o la
hora; una salida con hora menor que la entrada es del día siguiente y el modal lo dice («Salida el 8 de
octubre»); el motivo del servidor se muestra. La decisión vive en `features/dashboard/cierreDeTurno.ts`
(función pura, 11 pruebas) y el modal tiene 8. Las pruebas se vieron rojas antes; 9 mutaciones, todas muertas.
**No se vio en el navegador**, solo por pruebas de componente.

**Los datos de ese caso no se tocaron.** El segundo tramo (14 segundos después de la salida) parece una
entrada por error; **borrarlo lo hace el dueño desde Registros**, no un `DELETE` por SQL.

**Dos trampas del build que casi se cuelan** (las dos cazadas por una guarda, no por casualidad):
1. **En un árbol limpio no hay `.env`** (está en `.gitignore`), así que `VITE_API_URL` cae a su valor de
   desarrollo y el bundle sale con `http://localhost:3001/api` en tres sitios. Se compila con
   `VITE_API_URL="https://horapro.co/api" npm run build` y se comprueba `grep -c 'localhost:300'` = 0
   (el bundle de producción tiene 3 `https://horapro.co/api` y 4 líneas con `localhost`, todas de librerías).
2. **`frontend/dist` está en el `.gitignore` de la rama del artefacto**: `git add -A frontend/dist` sin `-f`
   prepara los borrados pero NO los archivos nuevos, y deja un índice a medias que parece válido. Con `-f`
   salen 4 renombrados y 1 modificado, que es la forma correcta.

Lo que este apartado tenía como «listo para desplegar» —la confirmación de identidad del kiosco
y la política de privacidad 1.2— **ya está en producción**, y se comprobó por el historial y por
el artefacto, no por memoria: `79ce047` es ancestro de las fuentes del backend (`b0d91f1`) y del
frontend (`31f9698`), y el `frontend-build` publicado trae `legal/privacidad/index.html` con
«Versión 1.2» y «4 de octubre de 2026».

### Archivos sueltos en la raíz (medido el 7 de octubre)

**Los playbooks de Krumlab ya están versionados**, desde el 27 de septiembre (`3ed4df8`):
`ARRANQUE-PROYECTO-WEB.md` y los `PLAYBOOK-*.md`. Este apartado decía lo contrario («no
versionados») hasta hoy, y los daba por sueltos en la raíz.

Lo que sí sigue fuera de git, y **no entra en ningún commit**:

- `.claude/launch.json`, modificado: configuración de entorno de las sesiones, no del producto.
- Tres grabaciones de pantalla en la raíz (`*.mov`, del 2 de octubre): no consta quién las puso,
  y el dueño decide si se borran.
- `docs/RESENAS.md`, sin versionar y de **otra sesión**. No se tocó.

---

## Files in flight

**De esta sesión, ninguno sin commitear:** todo lo suyo está commiteado, subido y desplegado al 9 de
octubre de 2026.

**El arreglo de la escalada a `SUPER_ADMIN` (`2063dd4`) es de la otra sesión**: lo commiteó ella el 8 de
octubre, y el `push` de `develop` para el cierre de turnos lo subió sin proponérselo, porque iba debajo. Se
desplegó el 9 (*El despliegue del backend del 9 de octubre*). La regla para la próxima vez: antes de subir
`develop`, `git log origin/develop..HEAD` y mirar QUÉ más va en el viaje.

**El trabajo de la otra sesión (las reseñas) ya está COMMITEADO, no sube ni se despliega todavía** (`01aa7e9`, 9 de octubre
a las 16:17; el detalle y el orden de despliegue, en *Lo pendiente de desplegar*, punto 3). Hasta las 16:08 de ese día seguía
sin commitear y mezclado en la misma carpeta: es la razón por la que los artefactos siempre se compilan en un `git worktree`
limpio y por la que una prueba de «¿la puerta ve un intruso?» puede quedarse sin intruso (ver *Lo que NO hay que volver a hacer*).

**Con el árbol de trabajo hoy, `git status` solo muestra `.claude/launch.json` y tres grabaciones de pantalla** (los
`*.mov`): nada de código suelto.

El hueco de `PUT /usuarios/:id` (escribía el `rol` del cuerpo, `SUPER_ADMIN` incluido) **está cerrado en
producción desde el reinicio del 9 de octubre**; ver *El despliegue del backend del 9 de octubre* para qué
se comprobó y qué no.

Lo demás sin commitear es lo de *Archivos sueltos en la raíz*, más arriba.

La lista de abajo NO es trabajo pendiente: es el mapa de dónde vive cada pieza de la
lógica de jornadas, que sigue valiendo:

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
- `backend/prisma/diferencial-dominical.ts` — **la foto para la comprobación
  diferencial del §5.3 de la LIQUIDACIÓN.** Imprime los códigos y los totales de cada
  persona en cuatro rangos; se corre antes y después de tocar el motor y se comparan
  con `diff`. **No usar `foto-reportes.ts` para esto:** mira esperadas, permisos y
  tardanzas, no imprime un solo código de la liquidación, y saldría «sin diferencias»
  sin probar nada.
- `backend/prisma/diagnostico-domingo-sin-horario.ts` — solo lectura. Dice qué paga un
  domingo trabajado según de dónde salga el descanso de esa persona: sin horario y sin
  programar, sin horario con la semana pintada, y con horario. Las tres respuestas en
  una pantalla.
- `backend/prisma/sql-contra-esquema.ts` — genera un SELECT que compara las 371
  columnas del `schema.prisma` contra la base real. Es lo que cerró el 500 del
  despliegue de la madrugada.

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

**No hay nada pendiente de desplegar.** Lo que sigue, por orden de lo que más duele
si se olvida:

### 1. Avisarle a las empresas afectadas por el recargo dominical (no es técnico)

Es lo único con fecha. Durante unas horas del 1 de octubre, el reporte de nómina de
septiembre mostró los domingos trabajados como horas ordinarias para quien no tiene
horario asignado. Si alguna empresa descargó el reporte en esas horas y liquidó con
él, pagó de menos.

Las más expuestas: **EMERGENCIAS VETERINARIAS** y **POSTRE DE PESCADO**, que entre
las dos tienen la mayoría de las 37 personas. También salieron Grupo Fidaga, RED OHM,
ROSA DE CASTRO y la que aparece con NIT 3044058718.

El número exacto por empresa sale de esta consulta, probada en local, en phpMyAdmin
de producción:

```sql
SELECT e.nombre AS empresa,
       COUNT(DISTINCT c.id) AS personas,
       COUNT(DISTINCT r.fecha) AS domingos_distintos
FROM registros r
JOIN colaboradores c ON c.id = r.colaboradorId
JOIN empresas e      ON e.id = c.empresaId
LEFT JOIN dias_esperados d ON d.colaboradorId = c.id AND d.fecha = r.fecha
WHERE DAYOFWEEK(r.fecha) = 1
  AND r.entrada IS NOT NULL AND r.salida IS NOT NULL
  AND r.fecha >= '2026-09-01' AND r.fecha < '2026-10-01'
  AND (CASE WHEN d.id IS NULL THEN c.horarioId ELSE d.horarioId END) IS NULL
GROUP BY e.nombre
ORDER BY personas DESC
```

**Ojo con `c.horarioId`: se lee HOY, no en septiembre.** Por eso la consulta mira
`dias_esperados.horarioId`, que dice qué horario tenía esa persona ESE día. Un primer
recuento hecho con la columna del colaborador dio 24 personas en vez de 37.

El mensaje para mandarles está redactado; si no quedó en ningún lado, se vuelve a
escribir: qué pasó, a cuántas personas, que ya está corregido, que las marcaciones
nunca se tocaron, y que vuelvan a descargar el reporte y comparen el total. **Sin
cifras de dinero**: el número bueno es el que da el reporte.

### 2. Los dos pendientes de fondo del CLAUDE.md, que llevan meses

Son el 4 y el 5 de su lista, y el incidente de hoy es exactamente el argumento a
favor del primero:

- **Pruebas de integración de las rutas**, con base de datos de prueba. Lo que falló
  hoy vivía en la costura entre una ruta y una función pura, que es justo donde no
  llega el ciclo de la sección 2.
- **Mutación** (Stryker), al final y solo sobre el motor de horas.

Y el §8.5, que bloquea el primero: quedan **18 archivos** importando `prisma` de
`'../index'` en vez de `'./prisma'`. Hoy es inofensivo; el día que se escriban las
pruebas de integración, esas 18 levantan el servidor entero al correr `npm test`.
Arreglarlas ANTES de llegar ahí.

### 3. Lo que NO hay que volver a hacer

- **No armar artefactos desde dos sesiones a la vez.** Ver *Current State*.
- **No compilar desde el árbol de trabajo** si hay algo modificado que no sea tuyo.
  Worktree del scratchpad sobre el commit, y se borra en el mismo paso.
- **No dar por verificado un despliegue porque el comando no se quejó.** Se hace
  `grep` de una cadena del cambio DENTRO del `dist` o del bundle que está vivo.
- **No pasar `git push` por `| tail`: el código de salida es el de `tail`.** El 5 de octubre
  GitHub rechazó un push a `develop` («remote rejected … fatal error in commit_refs») y el
  comando salió con 0. Se comprueba leyendo `origin`. El reintento, con los objetos ya subidos
  a otra rama, entró.
- **`GIT_CURL_VERBOSE=0` no apaga nada: cualquier valor lo enciende.** Volcó la cabecera
  `Authorization` con un token personal de GitHub a un archivo temporal. Ese archivo se borró y no
  queda copia, pero el token está en la transcripción de la sesión: **hay que rotarlo, y a 7 de
  octubre no se ha hecho.**
- **No teclear los signos por nombre en la terminal de cPanel** (`minus`, `slash`): se pierden
  en silencio. Llegan LITERALES (`-` `/` `.` `'` `|` `&` `;` `$` `>`). Y se evita el `~`: la
  terminal arranca en el home, así que se usan rutas relativas. La pantalla puede dibujar con más
  de 5 segundos de retraso: si «falta» una letra, esperar 10 s y recapturar ANTES de teclearla
  otra vez (el 6 de octubre una `l` extra dejó `index.htmll`). `wait` admite 10 s como máximo.
  Lo demás está en CLAUDE.md §4.
- **Una fecha futura clavada en un fixture se vuelve «ahora» un día.** `Marcador.test.tsx` salió
  rojo el 5 de octubre entre las 08:00 y las 08:15 de Bogotá: `anaAdentro()` fijaba la entrada en
  `2026-10-05T13:00Z`, y el kiosco pide el sostenido reforzado si alguien sale a menos de 15 min
  de entrar. Arreglado en `cfc4139`, con la entrada relativa al reloj. Hermana de
  `src/pruebas/reloj.ts`.
- **«Probar la puerta con un intruso» solo vale si el intruso quedó preparado de verdad.** El 9 de octubre
  se hizo `git add frontend/src/App.tsx` para ver saltar la puerta, y la puerta dijo «sin intrusos, 4
  preparados» con exit 0: la otra sesión acababa de commitear ese archivo, el `git add` no hizo nada y
  la prueba no probó nada, pero con un 0 que parece un aprobado. Antes de correr la puerta, comprobar que
  el intruso está en el índice (`git diff --cached --name-only | grep -Fx <archivo>`); si no, la prueba
  es inválida y se dice. Esa vez el commit se verificó por nombre, con `git show --name-only`, que
  mostró exactamente los 4 archivos propios: es la misma regla de CLAUDE.md §12.1 (el efecto, no la
  salida) aplicada a la propia puerta (§12.10).

### 4. El backlog del dueño vive en `docs/PENDIENTES.md`

Las 33 peticiones del 4 de octubre de 2026 quedaron ordenadas por dificultad en
`docs/PENDIENTES.md`, sin repetidas, con lo que hay hoy en el código citado por archivo y línea y
lo que falta de cada una. **Ese archivo es el único sitio donde vive la lista: aquí no se
copia.**

Medido el 9 de octubre: **38 entradas, 10 tachadas** (nº 9, 10, 18, 19, 20, 21, 23, 24, 25 y 27). La nº 38 es de ese día y **espera una decisión del dueño** (la columna «Sede» de Registros).
De la 29 a la 37 no son de esa lista: las agregó otra sesión tras revisar los planes y la landing.

- **En pausa por decisión del dueño, con el análisis ya escrito: el nº 11**, marcar fuera del
  área y dejar la ubicación en un mapa. La política de privacidad 1.2 promete que la coordenada
  **no se guarda**; guardarla pide abogado y política 1.3 antes de escribir código.
- **Dicho «todavía no» o «de momento no» por el dueño:** nº 22 y nº 26.
- **Frenados por una decisión o por un tercero**, en el orden en que bloquean: nº 3 (los números
  de la incapacidad de EPS, con el contador), nº 6 parte 3 (la llave del super admin sobre las
  notas anónimas, con el abogado), nº 1 (qué es un permiso en el módulo de usuarios), nº 4 (si una
  extra sin aprobar cuenta en el reporte) y nº 8 (si se paga WhatsApp teniendo Telegram).

### 5. Lo abierto del 403 del login

Ver *El 403 del login*, más abajo, en *Pendiente de fondo*. Lo que falta, en orden: (1) ~~desplegar el
frontend con la regla ampliada~~ — hecho el 8 de octubre; (2) la cabecera `server` y el cuerpo de
un 403 real, del navegador del dueño; (3) solo con (2) en la mano, el ticket a Banahosting. Aparte, sin explicar y sin tocar: 51 `GET /api/notificaciones` rechazados con 403
desde el Mac del dueño entre el 1 y el 5 de octubre (`Layout` solo se dibuja con el rol ya
conocido, así que el origen no se encontró), y centenares de «sesión inválida» por IP en Accesos
que no vienen del cliente web, que redirige al primer 401: puede ser el kiosco.

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

Lo único que toca dinero es **la pausa sin regreso** (abajo), y en producción **no ha
pasado nunca**: medido el 4 de octubre de 2026. Lo demás causa confusión o ruido, no
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

### La pausa sin regreso y la entrada horas después (4 de octubre de 2026): NO TOCAR sin el dueño

**El defecto, medido con las funciones reales y no supuesto.** `minutosTomadosEnLaPausa`
(`backend/src/utils/almuerzo.ts`) mide la pausa hasta la SIGUIENTE entrada del día, sin
límite de horas. Quien sale al descanso a las 15:00, se va a la casa y vuelve a las 19:00
a hacer extras queda como «se demoró 4 horas», y la nómina no le descuenta lo fijado del
descanso. Si no hubiera vuelto, sí se lo descontaría: es la regla del dueño, «una pausa
sin regreso cuesta lo fijado». Con 1.423.500, 15 min son 1.694,64 de más; con el almuerzo,
60 min son 6.778,57. Solo se vuelve plata si el período tiene faltante, es festivo o cruza
el tope semanal.

**Lo más caro es otra cosa:** el kiosco espera el regreso del ALMUERZO 18 horas, así que a
las 19:00 le pregunta a quien salió a almorzar a las 12:00 «¿a qué hora regresaste?» y le
ofrece «A las 13:00» (`regresoSugerido` en `worker.ts`). Si lo toca, ese día se le pagan
unos 50.839 de más. El descanso no tiene ese problema: el kiosco ya deja de esperarlo al
fin del turno más una hora (`limiteDeEsperaDelDescanso`).

**En producción, 0 casos**, con la consulta `sql/pausas-sin-regreso-resumen.sql` (y
`-detalle.sql`): de 248 salidas a almorzar (15/08 al 04/10) y 152 al descanso (07/09 al
22/09), ninguna volvió después del límite, ninguna entrada del día siguiente quedó pegada
y nadie aceptó la hora propuesta tarde. La consulta está validada contra las funciones
reales (9.261 casos y 12 sabotajes en una MariaDB desechable) y tarda 0,07 s en
producción. **Volver a correrla cada uno o dos meses**; si aparece un caso, se retoma con
los números.

**Las tres decisiones que el dueño dejó abiertas, por si se retoma:**
1. ¿Cobrar lo fijado también a quien estuvo presente sin pausa y volvió a otro turno?
2. ¿El almuerzo con el mismo límite que el descanso? Cierra el «A las 13:00» tardío, pero
   quien de verdad volvió a la 1 y no lo arregló antes de la hora límite tendría que
   pedírselo al administrador.
3. ¿Desde qué fecha? La liquidación se recalcula en vivo: cambiar la regla mueve períodos
   ya pagados si alguien los vuelve a abrir. Lo razonable es desde el día del despliegue.

**Si se arregla, en TODAS las copias a la vez (CLAUDE.md §9.3):** la medida de la nómina
(`minutosTomadosEnLaPausa`), la agrupación (`agruparEnJornadas` y sus derivadas), el
resumen de la pausa (`resumirSalida`), el kiosco (`pausaQueEsperaRegreso`) y la campana
(`cierreAlmuerzo.ts`). Arreglar solo la agrupación sería cosmético y dejaría la pantalla
contradiciendo a la nómina.

**Una observación sin resolver:** la última salida al descanso de producción es del 22 de
septiembre. Puede ser normal; si se esperaban descansos después, mirar si el kiosco los
está ofreciendo.

### Confirmación de identidad en el kiosco: lo que quedó para después

**Origen, 1 de octubre de 2026, Grupo MSM, sede LA DOCE.** Una persona —casi seguro
sin rostro registrado: ese día había 7 activos sin rostro— marcó como Lina
Fernanda Mazabuel a las 08:49 con distancia **0,464**. A las 08:52 llegó Lina, el
kiosco la reconoció bien (0,266), le ofreció «Registrar Salida» y lo oprimió; a las
08:56 pasó «Ya registraste tu jornada» y confirmó otra entrada. La distribución de
MSM desde el 10/09 (888 marcas): a partir de 0,44 queda el 4 %, y la legítima más
alta de esa mañana dio 0,460. **La distancia sola no separa a la impostora de la
gente honesta**: por eso lo nuevo pide atención y no rechaza.

**Lo que se hizo** (commit de este día): botón que se sostiene con el nombre
dentro (0,8 s; 1,6 s reforzada —eran 1,5 y 3, y luego 1 y 2; el 3 de octubre el dueño los
sintió largos— si la salida es a menos de 15 min de la entrada o si
la distancia es ≥ 0,44), foto de la ficha al lado de la de ahora (solo cuando se
entró con el rostro), «No soy X» visible que pasa a la cédula, «Salir sin marcar»
siempre a mano (para que nadie diga «No soy» solo para irse), cierre de sesión a
los 30 s sin tocar —que limpia también la pantalla del motivo y la del regreso
olvidado, que si no le quedaban a la siguiente persona—, cédula sin
autocompletar, revisión del rostro nuevo (tomas coherentes contra el frente,
parecido a otra persona) y avisos en el modal de fotos del panel. En el servidor, en modo de
SOLO MEDICIÓN: la segunda persona más cercana y la distancia contra la captura
anterior de la misma persona van al log `login-rostro`.

**Pendiente, en orden:**

1. **«No fui yo» — lo dejó el dueño para después, a propósito.** Diseño aprobado
   en la conversación: aparece en la pantalla reforzada cuando la persona
   encuentra una marca suya de hace pocos minutos («Tu entrada figura a las 08:49,
   hace 3 minutos»). Si la toca: **no se marca nada**, su turno sigue abierto, el
   kiosco le dice «Le avisamos a tu empresa», y a la campana del administrador
   llega «Lina dice que no marcó la entrada de las 08:49» con enlace a ese día. El
   administrador corrige a mano. **No borra ni mueve marcas por su cuenta**: un
   toque en el kiosco no debe cambiar horas de nómina. No necesita esquema (la
   campana admite tipos nuevos y enlaza a `registro`). Hoy, en su lugar, la
   pantalla dice «Si no marcaste a esa hora, no registres nada y avísale a tu
   administrador» y ofrece «Salir sin marcar».
2. **Resuelto el 2 de octubre: `MAX_ENTRE_TOMAS` medido en producción.** De 86
   personas de Grupo MSM la toma más alejada del frente dio 0,537 (luego 0,519);
   ninguna atípica, así que no hay registros con la cara de otra persona, y el de
   Lina da 0,289. Se dejó en 0,6. Lo que sigue es el detalle de cómo se midió:
   `sql/tomas-contra-el-frente.sql`. La regla mide cada
   toma contra la de FRENTE, no todas contra todas: en local, la misma persona dio
   0,513 todas contra todas (un giro contra el giro opuesto) y 0,419 contra el
   frente. La consulta da al tercer decimal lo mismo que el código. El corte va por
   encima del máximo honesto; una fila muy por encima del resto es un registro con
   la cara de otra persona. `UMBRAL_PARECIDO_AL_REGISTRAR` (0,45) solo avisa, así
   que puede esperar. Las dos revisiones dejan su huella en el log
   (`"evento":"revision-rostro"`, con distancias e ids, sin nombres).
3. **La política de privacidad (resuelta y desplegada el 4 de octubre).** El punto 4 dice «Quién ve
   estos datos: los usuarios de la propia empresa con rol de administrador o de
   supervisor», y ahora el kiosco le muestra la foto de perfil a quien reconoce,
   incluida la persona con la que confunda a alguien. Y la revisión del rostro
   nuevo lo compara con los demás registros de la empresa. **Resuelto:** el dueño
   aprobó el texto el 2 de octubre y quedó como versión 1.2 (puntos 4 y 5.1). Con
   la cédula NO viaja la foto (bastaría el enlace del kiosco y una lista de cédulas
   para cosechar caras). El 5.1 dice además que el servidor registra qué tan
   parecido dio cada rostro, sin la imagen ni el descriptor (aprobado el mismo día).
   Lo que sigue impreciso, y ya lo estaba: la fila «Registros técnicos del servidor»
   de la tabla de conservación dice que los conserva el proveedor de hosting, pero el
   log de la app (`LOG_FILE`) es nuestro y no tiene borrado automático.
4. **Leer el modo de solo medición** después de unas semanas: `grep
   '"evento":"login-rostro"'` en el log de producción. Con `distanciaALaAnterior`
   y `segunda` medidas, decidir si (a) una cara lejana de la captura anterior
   dispara la reforzada, y (b) el margen se mide contra la segunda persona aunque
   esté por encima del umbral. Las líneas `no-soy-yo` son identificaciones falsas
   confesadas: el mejor dato para calibrar.
5. **Empresas solo con rostro:** «No soy X» vuelve a la cámara, que reconocerá a
   la misma persona otra vez. Falta excluirla en el reintento, con un umbral más
   estricto para que el segundo candidato no gane por descarte.
6. **Operación, sin código:** registrar el rostro de los 7 activos sin rostro de
   MSM; volver a registrar a quien sale alto una y otra vez (en la lista de
   distancias ≥ 0,46: Jhoes Contreras ×4, Gustavo Corrales ×3, Yesika Moncada y
   Carlos Fernando Silva ×2); corregir el día de Lina del 1/10 (un solo turno
   08:52 → 18:34) y la entrada que le falta a quien marcó a las 08:49; revisar a
   ojo las 23 fotos con distancia ≥ 0,46 (la salida de Lina del 23/09 a 0,497 es
   la primera).
7. **No verificado en una tableta Android real:** el botón sostenido (se probó con
   eventos de puntero en el navegador del escritorio y en jsdom) y que
   `autoComplete="off"` apague de verdad las sugerencias de cédula.

### El ingreso facial, con ideas de dos apps de verificación (2 de octubre de 2026)

El dueño mandó dos videos de referencia: la verificación con selfie de Google en el
computador y una app de celular. De cinco ideas pidió empezar por tres, que quedaron hechas
en `CamaraRostro.tsx` (sobre el componente real, sin maqueta):

1. **«Verificando…» hasta que responda el servidor.** Antes salía «¡Rostro verificado!» con
   un chulo verde ANTES de preguntarle. Ahora la foto tomada queda de fondo, desenfocada, y
   la cara se entrega de una vez (sin los 400 ms de la animación).
2. **La regla del giro** (`MedidorDeGiro.tsx`, `lecturaDelGiro` en `reto.ts`): marcas junto
   al óvalo que se encienden a medida que se gira, en ámbar si se pasa, y el texto dice si
   falta, si sobra o si va al otro lado. Sale de los MISMOS límites que `poseCumple`, y una
   prueba lo comprueba en todo el recorrido.
3. **Cuenta 3, 2, 1** en la esquina en vez de la barrita del borde. `MS_QUIETO_LOGIN` pasó de
   1 s a 1,5 s para que cada número dure medio segundo. El registro guiado sigue con la barra.

Pendientes de esa lista, en el orden en que se hablaron:

4. En el registro del rostro (ficha y enlace), una tarjeta de consejos antes de la cámara,
   con «que no haya nadie más frente a la cámara».
5. «Mira al frente» en rojo cuando la cara está muy de lado o tomada desde abajo. **El dueño
   pidió que, como en la de Google, la imagen haga zoom sobre la cara en ese momento.** Hoy
   no se mide qué tan de abajo está la cara (el cabeceo): es lo nuevo que hay que medir.

**Cómo se probó con una cara de verdad, porque el panel del navegador no tiene cámara:** un
recorte del video del dueño convertido a MJPEG y Chrome sin ventana con
`--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<archivo.mjpeg>
--use-fake-ui-for-media-stream --headless=new --remote-debugging-port=<puerto>`, manejado
desde Node 25 con su `WebSocket` nativo por el protocolo de DevTools (Page.navigate,
Runtime.evaluate, Page.captureScreenshot). El detector de caras real corrió sobre esos
cuadros: la regla subió, dijo «Hacia el otro lado», «¡Así!», pidió volver al frente, contó
3-2-1 y entró. «Verificando…» no alcanzó a verse porque el servidor local responde en menos
de 150 ms; en producción sí se verá. Falta probarlo en la tableta.

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

### El 403 del login: no es de la app, y el arreglo desplegado tiene un hueco

**Visto el 6 de octubre de 2026** por el dueño, que ya lo conocía de antes («muy seguido»): al
iniciar sesión sale «Request failed with status code 403», y recargando la página vuelve a
entrar. Le pasó **en un perfil de su navegador y en los otros no**: es estado del navegador, no
su IP.

**Qué se comprobó**, todo desde el código y el registro del sistema; no se reprodujo en vivo:

- El único 403 del login es «Empresa inactiva», con su mensaje. **Todos los 403 que escribe el
  backend llevan un campo `error` de texto** (revisados uno por uno el 7 de octubre). Si fuera de
  la app, la pantalla mostraría ese texto.
- `/admin/registro` → Accesos: 9 eventos de `/auth/login`, **los 9 «Contraseña incorrecta»**
  (401), ninguno 403. El enganche global sí anota los 403 de la app en otras rutas.
- Desde la Mac del dueño, una petición sin la cookie del navegador a `/api/health` recibe la
  página «One moment, please…» (HTTP 200, se recarga a los 5 s) con `server: openresty`,
  mientras la API contesta `server: LiteSpeed`. Hay otra capa delante.
- Descartado el service worker: solo toca `/models/`.

**Lo que ya estaba escrito en este mismo archivo y no se había cruzado:** el 10 de septiembre,
con `curl`, el servidor respondió `403 {"message": "Access denied by Imunify360 bot-protection.
IPs used for automation should be whitelisted"}` (sección *El despliegue del 10 de septiembre*).
Es una respuesta **JSON y sin campo `error`**, y con ella `axios` muestra el texto que vio el
dueño. También la caída de ese día: el `POST /marcar` devolvió 403 y no 500.

**La regla** (`frontend/src/lib/bloqueoDelHosting.ts`): `esBloqueoDelHosting` reconoce un 403
**sin un `error` de texto en el cuerpo** —HTML, vacío, o un JSON propio como el de Imunify—, porque
todos los 403 que escribe el backend lo llevan (revisados uno por uno el 7 de octubre). Es el mismo
criterio con el que `mensajeDeError` decide si hay un mensaje del servidor. Solo el 403: un 500 o
un 429 con `{"message": …}` no cuenta. Entonces el login recarga la página UNA vez (guarda de un
minuto contra el bucle), precarga el correo, **no guarda la contraseña**, y `mensajeDeError` dice «El
servicio de seguridad detuvo la solicitud. Recarga la página e inténtalo de nuevo.» Solo recarga en
el login; el mensaje vale para todas las pantallas.

**Dónde está cada versión.** La primera (6 de octubre) solo reconocía HTML o vacío y trataba todo
JSON como de la app (`31f9698`, artefacto `82f2776`); el JSON de Imunify del 10 de septiembre se le
escapaba: no recargaba y mostraba el texto de axios. La de arriba, que cubre los dos casos, se escribió
el 7 de octubre a pedido del dueño y **está desplegada desde el 8** (`develop` `6152993`, publicada en el
artefacto `b1a09ac`, bundle `index-ommmrJo5.js`). Respaldo de ambas: pruebas en `bloqueoDelHosting.test.ts`, `errores.test.ts` y
`Login.test.tsx`, y 16 mutaciones, todas muertas (10 de la primera, 6 de la ampliación).

**Sin confirmar:** qué recibe de verdad el navegador del dueño cuando falla. DevTools → Network
→ la petición `login` en rojo → la cabecera `server` y el cuerpo (HTML, JSON o vacío). De eso
depende también si hay ticket a Banahosting, y **no se manda nada antes**: ver la advertencia de
la sección de WhatsApp, donde el 3 de septiembre un ticket salió de la propia actividad.

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

**22 de septiembre de 2026.** Entonces estaba sin commitear; hoy ya está commiteado (la primera
pieza, `rotuloDeCelda`, es de `8bc2b20`, del 23 de septiembre) y dentro del despliegue del 1 de
octubre: ese commit es ancestro de `64cb610`.

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
