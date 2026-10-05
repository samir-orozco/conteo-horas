# Requerimiento — Clima laboral

**Fecha:** 4 de octubre de 2026
**Estado:** Requerimiento acordado con el dueño. Sin código todavía.
**Plan:** solo Empresarial.

---

## 1. Qué es y para qué

Un módulo para que la empresa mida cómo se sienten sus colaboradores, con dos piezas:

1. **Pulso diario** (primera etapa): al marcar la salida, la persona califica su día con cinco
   caritas, y si fue un mal día dice por qué.
2. **Encuestas programadas y eNPS** (segunda etapa): el administrador arma encuestas cortas, las
   programa por fecha y las dirige a una o varias sedes.

Lo que lo hace distinto de una herramienta de clima suelta es que HoraPro ya tiene las horas: el
ánimo se puede cruzar con las horas extra, los turnos y las salidas tarde de cada persona.

---

## 2. Etapas

| Etapa | Qué incluye |
|---|---|
| 1 | Caritas al salir, motivos, observación directa o confidencial, buzón confidencial, panel «Clima laboral», motivos editables por empresa |
| 2 | Encuestas programadas con tipos de pregunta, eNPS con su evolución mensual, cruce del ánimo con las horas |

Cada etapa se despliega por separado.

---

## 3. Primera etapa — Pulso diario

### 3.1 Cuándo aparece

- **Después** de que la salida queda registrada, nunca antes. La marca de salida no depende de la
  calificación.
- En el kiosco y en el marcador por enlace.
- **No** aparece en entradas, pausas, almuerzos, cierres automáticos ni registros cargados a mano.
- Solo si la empresa tiene plan Empresarial.
- Es opcional: tiene «Omitir» y se cierra sola a los pocos segundos si nadie la toca.
- El día que hay una encuesta programada para esa persona (segunda etapa), la encuesta **reemplaza**
  las caritas.

### 3.2 La ventana

Caritas: `frontend/src/assets/caritas/carita-1.svg` (la más triste) a `carita-5.svg` (la más feliz).
Debajo de la carita tocada se muestra su nombre:

| Carita | Nombre | Muestra motivos |
|---|---|---|
| 1 | Muy mal | Sí |
| 2 | Mal | Sí |
| 3 | Normal | Sí |
| 4 | Bien | No |
| 5 | Muy bien | No |

**Al marcar la salida:**
```
┌──────────────────────────────────────┐
│  ✓ Salida registrada · 5:42 p. m.    │
│      ¿Cómo te fue hoy, Andrea?       │
│    (1)   (2)   (3)   (4)   (5)       │
│  [ Omitir ]          se cierra en 8 s│
└──────────────────────────────────────┘
```

**Carita 4 o 5:**
```
┌──────────────────────────────────────┐
│    (1)   (2)   (3)  [(4)]  (5)       │
│                Bien                  │
│  + Agregar observación               │
│                       [ Listo ]      │
└──────────────────────────────────────┘
```

**Carita 1, 2 o 3:**
```
┌──────────────────────────────────────┐
│  [(1)]   (2)   (3)   (4)   (5)       │
│              Muy mal                 │
│  ¿Qué pasó? Puedes marcar varios     │
│  [Mucho trabajo] [Jefe o supervisor] │
│  [Compañeros] [Me tocó quedarme más] │
│  [Algo personal] [Otro]              │
│  + Agregar observación               │
│                       [ Enviar ]     │
└──────────────────────────────────────┘
```

**Con observación abierta** (por «+ Agregar observación», o sola al tocar «Otro»):
```
┌──────────────────────────────────────┐
│  ...                                 │
│  Observación                         │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  └────────────────────────────────┘  │
│  ◯ Enviar como confidencial          │
│    Tu empresa no verá tu nombre.     │
│                       [ Enviar ]     │
└──────────────────────────────────────┘
```

- Los motivos admiten **varios** a la vez.
- El interruptor de confidencial aparece **solo** cuando hay observación, porque es lo único que cubre.
- Se construye **directamente sobre el kiosco**, sin maqueta HTML aparte (CLAUDE.md, sección 13).

### 3.3 Qué se guarda y cuándo

- **La carita se guarda en el momento en que se toca.** Si la persona se va sin terminar, la
  calificación ya quedó.
- La carita y los motivos van **siempre con el nombre** de la persona.
- La observación puede ser:
  - **Directa:** va con la calificación, con nombre.
  - **Confidencial:** se separa del todo (sección 3.4).

### 3.4 Observación confidencial

**Lo que ve la empresa:** solo «Confidencial» y el texto. Sin nombre, hora, carita, motivos ni sede.

**Cómo se muestra:**
- En una sección aparte, el **Buzón confidencial**, separado de las calificaciones.
- Las notas aparecen **al día siguiente**, agrupadas por semana y en orden revuelto. Así no se puede
  saber quién fue por la hora en que apareció la nota.
- No hay aviso cada vez que llega una nota.

**Lo que guarda HoraPro:**
- El nombre de quien la escribió se guarda **cifrado y separado** de la nota. No se borra.
- **Solo el super admin** lo puede descifrar, escribiendo cada vez el motivo. La consulta queda en el
  registro de auditoría.
- El administrador de la empresa no tiene ninguna forma de verlo.
- **Se entrega solo por orden de una autoridad** (juez, Fiscalía, inspector de trabajo), nunca porque
  la empresa lo pida. Razón: quien denuncia acoso está protegido contra represalias (Ley 1010 de 2006).
  Si HoraPro entregara el nombre a pedido del empleador, quedaría expuesto a esa responsabilidad, y el
  buzón dejaría de servir.

**Requisito antes de salir:** revisión del abogado y actualización de la política de privacidad
(versión 1.3) y de los términos para la empresa. El texto de la ventana se queda corto a propósito
(«Tu empresa no verá tu nombre.»), así que el resto tiene que estar en la política.

### 3.5 Motivos

Predeterminados para todas las empresas:

1. Mucho trabajo
2. Jefe o supervisor
3. Compañeros
4. Me tocó quedarme más tiempo
5. Algo personal
6. **Otro** (fijo; abre la observación)

Cada empresa los puede cambiar en Configuración: escoge del catálogo o escribe los suyos, con máximo
cinco más «Otro». Si una empresa cambia un motivo, el histórico del motivo viejo se conserva.

**Catálogo:**

| Tema | Motivos |
|---|---|
| El trabajo | Mucho trabajo · Faltó personal · Desorden o instrucciones poco claras |
| El tiempo | Turno largo · Me tocó quedarme más tiempo · Cambio de horario a última hora |
| Las personas | Jefe o supervisor · Compañeros · Clientes difíciles |
| El lugar | Herramientas o equipos que fallan · Calor, ruido o espacio |
| Yo | Cansancio o salud · No me sentí valorado · Algo personal |
| La plata | Problemas con mi pago |

### 3.6 Panel «Clima laboral»

Va en el menú del administrador como **Clima laboral**. Por ahora lo ve solo el administrador; los
usuarios y jefes por sede quedan para cuando se trabaje el tema de usuarios.

```
┌───────────────────────────────────────────────────────────────┐
│ Clima laboral        [Esta semana ▾]  [Todas las sedes ▾]      │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│ Ánimo prom.  │ Respondieron │ Días malos   │ Buzón            │
│ 3,8  ▲ 0,2   │ 74% de 52    │ 11  (1 y 2)  │ 4 nuevas         │
├──────────────┴──────────────┴─┬────────────┴──────────────────┤
│ Ánimo por semana (línea)      │ Cómo se sintieron (barras     │
│                               │ con los colores de las caritas)│
├───────────────────────────────┼───────────────────────────────┤
│ Por qué fue un mal día        │ Por sede                      │
├───────────────────────────────┴───────────────────────────────┤
│ Necesitan atención                                            │
├───────────────────────────────┬───────────────────────────────┤
│ Calificaciones recientes      │ Buzón confidencial (semana)   │
└───────────────────────────────┴───────────────────────────────┘
```

- **Diseño:** tarjetas como en los ejemplos de referencia, con los colores de HoraPro (amarillo y
  grafito). Las gráficas usan los colores de las caritas, para que cada color signifique siempre la
  misma carita.
- **Necesitan atención:** personas con **3 días seguidos o más** en carita 1 o 2, con su sede, los días
  y el motivo más repetido.
- **No hay ranking de personas.** Fue reemplazado por «Necesitan atención».
- La sede se atribuye con la misma regla de los reportes: un presencial sin sede cuenta en la Sede
  principal al leer (`backend/src/utils/sedePrincipal.ts`).

---

## 4. Segunda etapa — Encuestas y eNPS

### 4.1 Encuestas

- Se ven como **tarjetas**, con nombre, estado, fechas, número de preguntas, avance y si es confidencial.
  Al darle clic a la tarjeta se ven las respuestas.
- **Fecha única o rango.** Con fecha única, el panel avisa: «Quien no trabaje ese día no la verá».
  Con rango, a cada persona le sale en su primera salida dentro del rango, y si la omite le vuelve a
  salir al día siguiente, hasta que la responda o se cierre el rango.
- **No le vuelve a salir a quien ya la respondió.**
- **Máximo 5 preguntas.**
- **Dirigida a todas las sedes, a una o a varias.** Los remotos e híbridos sin sede solo la reciben
  con «Todas las sedes».
- **Confidencial o con nombre** se decide para la encuesta entera al crearla, y la persona lo ve antes
  de responder.
- **Después de la primera respuesta, las preguntas no se editan.** Se puede cerrar y duplicar.
- No hay mínimo de respuestas para mostrar resultados (decisión del dueño, por ahora).

### 4.2 Tipos de pregunta

| Tipo | Ejemplo |
|---|---|
| Texto libre | «¿Qué cambiarías de tu turno?» |
| Sí / No | «¿Tienes las herramientas para tu trabajo?» |
| Una opción | «¿Qué turno prefieres?» |
| Varias opciones | «¿Qué beneficios te interesan?» |
| Deslizador | «¿Qué tan cómodo te sientes en tu sede?» |
| eNPS | «¿Qué tan probable es que recomiendes esta empresa como lugar para trabajar?» |

- **Deslizador:** de izquierda (peor) a derecha (mejor). La persona tiene que tocarlo para poder
  seguir, para que no quede guardado un valor que nadie escogió. Muestra el número mientras se arrastra.
- **eNPS:** redacción fija, de 0 a 10, que el administrador no puede cambiar, para que los meses se
  puedan comparar. Resultado: % de quienes ponen 9 o 10 menos % de quienes ponen de 0 a 6. Se muestra
  con medidor, Detractores · Pasivos · Promotores, y su evolución mes a mes.

### 4.3 Cruce con las horas

El ánimo frente a las horas extra, los turnos nocturnos, los dominicales y las salidas tarde. Ejemplo:
«quienes hicieron más de 10 horas extra esta semana calificaron 2,1; el resto, 3,9». El motivo «Me tocó
quedarme más tiempo» se contrasta con las horas reales de ese día.

---

## 5. Decisiones tomadas

| Fecha | Decisión |
|---|---|
| 3 oct 2026 | La pregunta sale después de registrar la salida, no antes |
| 3 oct 2026 | Encuestas con fecha única o rango, y reemplazan las caritas ese día |
| 3 oct 2026 | Máximo 5 preguntas por encuesta |
| 3 oct 2026 | Solo plan Empresarial; resultados solo para el administrador por ahora |
| 3 oct 2026 | Dos etapas |
| 3 oct 2026 | Motivos con caritas 1, 2 y 3; las caritas 4 y 5 solo con observación |
| 3 oct 2026 | La carita y los motivos van siempre con nombre; solo la observación puede ser confidencial |
| 4 oct 2026 | La observación confidencial guarda el nombre cifrado, visible solo para el super admin, y se entrega solo por orden de autoridad |
| 4 oct 2026 | Buzón confidencial: notas al día siguiente, por semana y en orden revuelto |
| 4 oct 2026 | Texto del interruptor: «Tu empresa no verá tu nombre.» |
| 4 oct 2026 | Motivos: cinco predeterminados, editables por cada empresa |
| 4 oct 2026 | Encuestas a todas, una o varias sedes, sin opción «Sin sede» |
| 4 oct 2026 | Sin mínimo de respuestas en encuestas confidenciales, por ahora |
| 4 oct 2026 | «Necesitan atención» desde 3 días seguidos en carita 1 o 2, en lugar de ranking de personas |
| 4 oct 2026 | El módulo se llama «Clima laboral» |
| 4 oct 2026 | El buzón muestra cada nota al día siguiente, no al cerrar la semana. Se le planteó el riesgo (quien revisa a diario sabe qué día se escribió cada nota) y lo mantuvo |

---

## 6. Abiertos

1. **Abogado:** política de privacidad 1.3, términos para la empresa y el procedimiento de entrega por
   orden de autoridad. **Bloquea la salida de la observación confidencial.**

Resueltos por el dueño el 4 de octubre de 2026, tal como se propusieron:

- **Turno partido:** se pregunta solo en la primera salida del día. Lo garantiza la llave única
  (persona, día) de `calificaciones_clima`.
- **Observación escrita y no enviada:** si la ventana se cierra sola, el texto se descarta.
- **«3 días seguidos»:** se cuentan las tres últimas respuestas de la persona, sin contar los días que
  no trabajó o no respondió.
- **Esquema:** aprobado. Dos tablas nuevas, sin tocar ninguna existente (`sql/clima-laboral.sql`). Los
  motivos de cada empresa van en `configuracion`, con la clave `climaMotivos`.
- **Revelar el autor:** sin pantalla. Es un comando que corre el super admin en el servidor
  (`DESPLIEGUE.md` §6.3), y deja la constancia en el registro del sistema antes de mostrar el nombre.
- **La landing:** lleva una séptima tarjeta, aunque quede sola en su fila.

## 6.1 Cómo quedó construida la primera etapa (4 de octubre de 2026)

- **La ventana escribe con su propio token**, rol `CLIMA`, que firma la salida y dura 15 minutos. Dice de
  quién y de qué jornada es. Con él no se puede marcar, y con el de la sesión no se puede calificar.
- **Las rutas del kiosco van bajo `/api/worker/clima`**, que la auditoría del sistema no registra: si
  la registrara, guardaría el texto confidencial al lado de quién lo mandó. Por la misma razón, un
  error al guardar una nota confidencial no se escribe entero en el registro.
- **Una nota confidencial por salida.** Se controla en la memoria del servidor y no en la base, porque
  guardar en la base que tal persona mandó una sería justo el dato que se esconde.
- **Los colores de las gráficas no son los de las caritas.** Se pasaron por el validador de paletas y no
  sirven como color de barras: sobre fondo blanco son muy pálidos, las dos rosadas casi no se
  distinguen, y la amarilla y la verde se confunden para quien no distingue el rojo del verde. Se usa
  una escala del rosa al verde azulado pasando por un gris, y la carita va siempre dibujada al lado.
- **Respondieron** se compara contra las personas que cerraron al menos una jornada **en el kiosco** en
  el período. No cuentan las salidas a almuerzo o a descanso, las del cierre automático ni las cargadas
  a mano, porque ninguna abre la ventana.

### El panel, después de verlo con tres meses de datos (4 de octubre de 2026)

- **Primero el panorama, después las personas:** debajo de las cuatro tarjetas van «Evolución del
  ánimo» y «Cómo se sintieron»; después «Necesitan atención».
- **«Respondieron» cuenta jornadas, no personas** (por personas, en un rango largo daba casi siempre
  100 %), y **«Respuestas negativas»** es un porcentaje del total, con el número debajo.
- **«Necesitan atención» es una tarjeta compacta:** el indicador «N personas», tres a la vista y el
  resto a un toque. Habla de «respuestas negativas consecutivas», no de días: los días sin respuesta no
  cortan la cuenta. Cada fila tiene «Revisar», que abre a la derecha el historial de esa persona
  (últimas 60 respuestas, motivos y observaciones directas).
- **Por sede** muestra respuestas y participación, destaca la más baja y avisa «Pocas respuestas» con
  menos de 10. Una sede con pocas respuestas no se destaca como la más baja.
- **Pendiente de decisión del dueño:** el seguimiento de cada caso (responsable y estados «Sin revisar»,
  «En seguimiento», «Cerrado») necesita una tabla nueva.

### Lo que cambió con la revisión adversarial (4 de octubre de 2026)

- **«Otro» no se guarda con la carita.** Es el botón que abre la observación, no un motivo. Guardado
  con nombre y sin observación directa al lado, era casi siempre la huella de una nota confidencial, y
  el panel señalaba a su autor. Por eso «Otro» no sale en «Por qué no fue un buen día».
- **Turno partido:** la segunda salida del día no pregunta aunque la primera se haya omitido.
- **«Necesitan atención»** cuenta lo malo que vino después del último buen día de cada persona, por
  viejo que sea. Con una ventana fija de seis semanas, quien responde poco nunca llegaba a tres.
- **Un supervisor no puede cambiar los motivos** por la ruta general de configuración; solo por la del
  módulo, que exige administrador y plan.
- **Dos envíos confidenciales a la vez** con la misma salida ya no pasan los dos.
- **En el kiosco:** una ventana que se cerró no puede cerrarle la sesión a la persona siguiente, la
  ventana solo se muestra a quien marcó la salida, la carita que no se pudo guardar se reintenta al
  tocar «Listo», y un error que no se arregla reintentando deja cerrar sin quedar atrapado.

## 7. Cómo se va a verificar

Las decisiones van en funciones puras, con el ciclo de la sección 2 de CLAUDE.md: prueba primero, verla
fallar.

- Quién necesita atención (3 días seguidos).
- Si la ventana aparece o no según el tipo de marca y el plan.
- Qué notas del buzón se muestran y en qué agrupación.
- Cálculo del eNPS y promedios por semana y sede.
- A quién le corresponde una encuesta según sede, fechas y si ya respondió.

La ventana del kiosco y el panel se prueban con Testing Library, consultando por texto y rol. Las rutas
y el guardado cifrado se verifican con un script en `backend/prisma/` contra datos reales, como dice la
sección 8.6.
