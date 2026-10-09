# Requerimiento — Reseñas de clientes

**Fecha:** 7 de octubre de 2026
**Estado:** Borrador para aprobar. Sin código. Las decisiones abiertas están en la sección 9.
**Plan:** todos los planes. Es un módulo de la plataforma, no una función que se vende.

---

## 1. Qué es y para qué

Las empresas que ya llevan tiempo pagando califican HoraPro con estrellas y un comentario. El dueño
las lee y las administra en el super admin, y decide cuáles salen en la landing, en un carrusel justo
antes de Precios.

Tiene tres piezas:

1. **La ventana en el panel de la empresa**, que pide la reseña una sola vez.
2. **La pantalla «Reseñas» en el super admin**, para leerlas, publicarlas y crear las que llegan por
   otros canales (WhatsApp, Google, una llamada).
3. **El carrusel de la landing**, que reemplaza a los tres testimonios fijos de hoy.

---

## 2. Decisiones ya tomadas por el dueño

| # | Decisión |
|---|---|
| D1 | Una reseña por empresa. |
| D2 | Se pide una sola vez. Lo que la empresa envía no se edita ni se vuelve a pedir. |
| D3 | Plan mensual: después de dos pagos. Plan anual: al segundo mes. |
| D4 | Nada se publica solo: sale en la landing **solo si el dueño quiere**. |
| D5 | Las de 1 y 2 estrellas no avisan por correo ni por Telegram: basta con verlas en el super admin. |
| D6 | El carrusel muestra **tres tarjetas a la vez** y rota entre **15 elegidas al azar** de las publicadas. |
| D7 | La sección va justo antes de Precios, donde ya están los testimonios. |
| D8 | Solo texto, sin logo. |
| D9 | El dueño puede crear reseñas a mano, y los tres testimonios actuales pasan a ser reseñas. |
| D10 | El texto de la ventana es el del dueño (sección 3.2), con los ajustes de la sección 3.3. |

---

## 3. La ventana en el panel de la empresa

### 3.1 A quién le sale y cuándo

**La regla, dicha en una frase:** le sale a una empresa que va en su segundo mes pagado y está al día.

Con más precisión:

- **R1.** La empresa es elegible cuando se cumplen todas estas condiciones:
  - su suscripción está **al día** (ni en prueba, ni en mora, ni suspendida);
  - no es una cuenta de cortesía (sin cobro);
  - está activa;
  - ya pasó **un mes calendario** desde el inicio de su primer pago real (mayor que cero), contado en
    hora de Bogotá.

  Ejemplo: la prueba termina el 28 de octubre y ese día paga los días que faltan del mes. El 28 de
  noviembre, si pagó noviembre, ya es elegible. Si no pagó noviembre, está en mora y no le sale.

- **Por qué esta regla y no «contar dos pagos».** En el sistema, contar pagos engaña:
  - un pago por agregar colaboradores, o por subir de plan, crea una segunda fila **en el mismo mes**;
  - el primer pago puede cubrir solo tres o cuatro días.

  Con «dos pagos», una empresa podría quedar elegible a los tres días de pagar. La regla del mes
  calendario da lo que el dueño pidió para el plan mensual (ya pagó un segundo mes) y para el anual
  (está en su segundo mes), sin depender de la etiqueta de ciclo.

- **Hoy no existe el cobro anual de verdad** (ver la sección 8). La regla queda escrita para que siga
  sirviendo el día que exista.

- **R2.** Solo le sale al **administrador** de la empresa, no al supervisor. El servidor lo comprueba
  leyendo el rol en la base, no en la sesión.

- **R3.** Sale **al entrar a Inicio**, en la primera carga del panel después de volverse elegible. No
  sale en otras pantallas, ni en mitad de un trabajo, ni dos veces en la misma pestaña.

- **R4.** Si en esa carga ya va a salir otro aviso (bloqueo de pago, verificar correo, revisión del
  auxilio, guía de bienvenida o Novedades), la reseña **espera a la siguiente vez** que entre. Hoy esos
  avisos no se coordinan entre ellos, y no se le puede sumar uno más que salga encima de los otros.

### 3.2 Lo que pidió el dueño

```
+-------------------------------------------------------------+
| Hablemos de resultados                                      |
|                                                             |
| ¿Cómo le ha ayudado HoraPro a tu empresa o equipo?          |
| ⭐ ⭐ ⭐ ⭐ ⭐                                                 |
|                                                             |
| [ Escribe tu experiencia aquí...                          ] |
| [ Ej: "Nos ahorró 5 horas a la semana en logística..."    ] |
|                                                             |
| ¿Nos dejas presumir tu opinión en la web?                   |
| (•) Sí, como Juan Pérez      ( ) Prefiero anónimo           |
|                                                             |
|                   [ Omitir ]   [ Enviar ]                   |
+-------------------------------------------------------------+
```

### 3.3 La misma ventana con los ajustes propuestos

```
+-------------------------------------------------------------+
| Hablemos de resultados                                      |
|                                                             |
| ¿Cómo le ha ayudado HoraPro a tu empresa o equipo?          |
| ☆ ☆ ☆ ☆ ☆                                                   |
|                                                             |
| [ Escribe tu experiencia aquí...                          ] |
| Ej: "Nos ahorró 5 horas a la semana en logística..."  0/500 |
|                                                             |
| ¿Nos dejas presumir tu opinión en la web?                   |
| ( ) Sí, como Juan Pérez, de Tuercas SAS                     |
| ( ) Prefiero anónimo (saldría como «Cliente de HoraPro»)    |
|     HoraPro sabrá quién la escribió; en la web, no.         |
|                                                             |
|                   [ Omitir ]   [ Enviar ]                   |
+-------------------------------------------------------------+
```

Qué cambia y por qué:

| Cambio | Por qué |
|---|---|
| **Ninguna opción viene marcada.** «Enviar» se activa cuando hay estrellas y, si hay texto, una opción elegida. | Una autorización que se da con solo no tocar nada no es una autorización expresa (Ley 1581). Quien pulsa «Enviar» sin fijarse quedaría publicado con su nombre. |
| **La opción dice exactamente lo que se va a publicar:** nombre **y empresa**. | La tarjeta muestra la empresa. Si la opción solo dice «como Juan Pérez», se publicaría el nombre de la empresa sin haberlo pedido. |
| **«Anónimo» significa sin nombre y sin empresa.** | En una empresa pequeña con un solo administrador, nombrar la empresa es nombrar a la persona. |
| **La frase «HoraPro sabrá quién la escribió».** | El super admin sí ve quién la envió. La ventana no puede prometer más de lo que hace el sistema. |
| **El ejemplo pasa de ser texto de fondo a una línea de ayuda debajo de la caja, con un contador.** | Un texto de fondo desaparece al escribir y no puede ocupar dos líneas. |
| **Si el texto queda vacío, la pregunta de publicar se oculta.** | Sin comentario no hay nada que publicar (R7). |

### 3.4 Qué hace cada salida

- **R5. Enviar:** guarda la reseña, cierra la ventana y muestra «¡Gracias por contarnos!». Desde ese
  momento no le vuelve a salir a nadie de esa empresa.
- **R6. Omitir:** ver la decisión 9.1.
- **R7. Un clic fuera de la ventana no la cierra: la sacude**, igual que Novedades. Escape tampoco la
  cierra. Como la oportunidad es una sola, solo «Omitir» o «Enviar» la gastan.
- **R8.** Si cierra la pestaña con la ventana abierta, no se gasta nada y le vuelve a salir la próxima
  vez.
- **R9.** Si dos administradores de la misma empresa (o la misma persona en dos pestañas) envían a la
  vez, entra la primera. El segundo ve «Tu empresa ya nos dejó su opinión, gracias», no un error.

### 3.5 Lo que se valida

- **R10.** Estrellas: obligatorias, de 1 a 5.
- **R11.** Texto: opcional, **hasta 500 caracteres**. Se quitan los espacios sobrantes y los
  caracteres invisibles.
- **R12.** La firma se **copia en el momento de enviar**: el nombre del usuario y el de la empresa,
  leídos de la base. Si después la persona cambia su nombre en el panel, lo publicado no cambia.
- **R13.** Junto con la reseña se guardan el **texto exacto de la opción que eligió** («Sí, como Juan
  Pérez, de Tuercas SAS»), la versión de la política de datos vigente y la fecha. Es la constancia de
  la autorización. La Ley 1581 obliga a conservarla, y es la misma idea de la constancia biométrica.

---

## 4. La pantalla «Reseñas» en el super admin

### 4.1 Lo que se ve

```
Reseñas                                             [ + Nueva reseña ]

 De clientes: 4,3 ★ · 23 reseñas      5★ ████████ 12   4★ ████ 6
                                       3★ ██ 2         2★ █ 2   1★ █ 1

 [Todas] [Por revisar 5] [Publicadas 9] [Ocultas] [Archivadas]   ★ [todas ▾]  Origen [todos ▾]

 ★★★★★  "Ya no peleo con el Excel a fin de mes..."   Juan Pérez · Tuercas SAS      Publicada
        Cliente · Profesional · 3 meses pagados · 02/10/2026         [Ocultar]
 ★★☆☆☆  "El kiosco se demora en reconocer..."        Anónimo (Ana R. · Lavandería) Por revisar  ⚑
        Cliente · Esencial · 2 meses pagados · 01/10/2026            [Publicar] [Archivar]
 ★★★★★  "Liquidar la nómina nos tomaba dos días..."  Mateo Vera · CEO Grupo MSM    Publicada
        Manual · WhatsApp · cargada por samir@ · 19/07/2026          [Editar] [Ocultar]
```

- **R14.** Lista con estrellas, comentario, firma tal como saldría, y quién la escribió de verdad si
  es anónima. Debajo: origen (cliente o manual), plan, **meses pagados** (no filas de pago), fecha y
  estado.
- **R15.** Arriba, el promedio y la distribución por estrellas, **calculados solo con las reseñas de
  clientes**, incluidas las archivadas y las de 1 estrella. Las manuales las elige el dueño y
  mezclarlas inflaría el número.
- **R16.** Filtros por estado, estrellas y origen, más un buscador.
- **R17.** Las de 1 y 2 estrellas salen marcadas ⚑ para hacerles seguimiento.
- **R18.** Una marca automática avisa cuando el texto trae un enlace, un teléfono, un correo o un
  @usuario, para que el dueño lo lea antes de publicar.

### 4.2 Estados y acciones

```
             Publicar              Ocultar
 Por revisar ────────▶ Publicada ◀────────▶ Oculta
      │                                       │
      └──────────────── Archivar ─────────────┘──▶ Archivada
```

- **R19.** Toda reseña **nace «Por revisar»**. Publicarla es un clic del dueño (D4).
- **R20.** Solo se puede publicar si tiene **al menos 20 caracteres de texto** y su autor autorizó
  publicarla (sección 3.3 para las de clientes, 4.3 para las manuales). No hay mínimo de estrellas:
  decide el dueño.
- **R21.** Ocultar la saca de la landing en el acto. Una archivada sale de la lista normal y no se
  puede publicar.
- **R22.** El dueño **no edita el texto de un cliente**: se publica tal cual o no se publica.
- **R23. Quitar el nombre.** Si alguien pide que se quite su nombre o que se retire su reseña (por
  correo a privacidad@ o por cualquier canal), el dueño pulsa «Quitar el nombre». Eso borra la firma,
  la reseña pasa a «Cliente de HoraPro», y no se puede deshacer. Es un derecho que da la ley, y no
  contradice D2: no es editar ni volver a preguntar.
- **R24.** Cada acción queda en el registro del sistema, con nombres legibles («Publicó una reseña»),
  no con la ruta técnica.
- **R25.** Al publicar se ve una vista previa de cómo saldría la tarjeta. Esa vista previa usa la
  **misma tarjeta** de la landing, no una copia (CLAUDE.md §13).

### 4.3 Reseñas manuales

```
Nueva reseña
  Estrellas        ☆ ☆ ☆ ☆ ☆   [ ] La fuente no traía calificación
  Texto            [                                            ]
  Nombre           [ Mateo Vera          ]
  Cargo y empresa  [ CEO Grupo MSM       ]
  Es cliente de HoraPro  [ Grupo MSM ▾ ]  (opcional)
  ──── Solo para el super admin, nunca se publica ────
  Canal            [ WhatsApp ▾ ]   Fecha de la opinión [ 19/07/2026 ]
  Dónde quedó      [ chat de WhatsApp del 19/07 con Mateo        ]
  Cómo autorizó    [ dijo que sí por WhatsApp a publicar nombre   ]
                                              [ Cancelar ] [ Guardar ]
```

- **R26.** Campos públicos: estrellas, texto, nombre y cargo con empresa (texto libre). Campos
  internos: canal, fecha de la opinión, **dónde quedó** (enlace o descripción) y **cómo autorizó**.
- **R27.** Una manual **con nombre** no se puede publicar si le faltan «dónde quedó» o «cómo autorizó».
  Que una opinión esté en Google o en WhatsApp no la vuelve un dato que se pueda publicar sin permiso.
- **R28.** Si la fuente no traía estrellas, la tarjeta **no muestra estrellas**. Poner un 5 que nadie
  dio es fabricar un dato.
- **R29.** Las manuales sí se editan, para corregir errores al copiarlas. Quedan registrados quién y
  cuándo, y se guarda «cargada por» con el correo del super admin, como en los pagos manuales.
- **R30.** Si se elige «Es cliente de HoraPro», la reseña cuenta como la única de esa empresa (D1) y
  a esa empresa no le sale la ventana.
- **R31.** La fecha de la opinión se guarda anclada a medianoche de Bogotá (CLAUDE.md §4).

### 4.4 Los tres testimonios de hoy

Hoy están escritos en el código con 5 estrellas fijas:

| Persona | Cargo | Lo que se sabe en el repositorio |
|---|---|---|
| Mateo Vera | CEO Grupo MSM · Founder Fem Probiotics | Grupo MSM es cliente real en producción. |
| Carolina Calle | CEO Tuercas & Pernos | «Tuercas & Pernos» se usa como nombre **ficticio** en las pruebas del código. |
| Santiago Botero | Gerente Lavadora Las Brisas | No aparece en ningún otro lugar. |

- **R32.** Se cargan como manuales **solo los que el dueño confirme uno por uno**: que la persona es
  real, por qué canal lo dijo y cómo autorizó su nombre. Presentar como real un testimonio que no lo es
  puede ser publicidad engañosa ante la SIC (Ley 1480).
- **R33.** Entran con el texto literal (las faltas a propósito del tercero también), la fecha en que
  entraron a la landing (19/07/2026) y el canal que diga el dueño. Las estrellas: las que confirme el
  dueño, o ninguna (R28).
- **R34.** El arreglo de testimonios se **borra del código** en el mismo cambio. Si quedara como
  respaldo, alguien que retire su autorización seguiría en la página hasta el próximo despliegue.

---

## 5. El carrusel de la landing

```
 Computador (3 a la vez)
 ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
 │ ★★★★★         │ │ ★★★★☆         │ │ ★★★★★         │
 │ "Liquidar la  │ │ "Ya no peleo  │ │ "Mis mucha-   │   ‹  ›   (se desliza sola → )
 │ nómina nos…"  │ │ con el Excel…"│ │ chos marcan…" │
 │ Mateo Vera    │ │ Cliente de    │ │ Juan Pérez    │
 │ CEO Grupo MSM │ │ HoraPro       │ │ Tuercas SAS   │
 └───────────────┘ └───────────────┘ └───────────────┘

 Celular (1 a la vez, la siguiente asoma, se desliza)
 ┌──────────────────────┐┌──
 │ ★★★★★                ││ ★
 │ "Liquidar la nómina… ││ "
 └──────────────────────┘└──
            2 / 15
```

- **R35.** En cada visita el servidor elige **15 al azar** entre todas las publicadas. Si hay menos de
  15, van todas, en orden al azar.
- **R36.** Computador: **3 a la vista** y la fila se desliza sola hacia la derecha, **muy despacio**
  (18 px por segundo, una tarjeta cada 20 segundos más o menos) y sin fin: la vuelta no tiene salto.
  Las flechas corren una tarjeta. Sin puntos (cambio del dueño, 8 de octubre de 2026). Las tarjetas entran y
  salen desvanecidas por los costados, en vez de cortarse en seco (9 de octubre de 2026).
- **R37.** Celular: **1 a la vez**, con la siguiente asomada. Se desliza con el dedo y abajo dice
  «2 / 15». En 375 px no caben tres tarjetas.
- **R38.** El movimiento se detiene mientras el mouse está encima o el foco del teclado adentro, y
  unos segundos después de un toque. Sin botón de pausa (cambio del dueño, 8 de octubre de 2026). Con
  «reducir movimiento» activado no se mueve sola; las flechas siguen sirviendo.
- **R39.** Con **3 o menos** publicadas: no se mueve, no hay flechas, y las tarjetas se centran.
  Con **cero**, la sección no aparece.
- **R40.** Cada tarjeta pinta **sus estrellas reales** y un lector de pantalla oye «4 de 5 estrellas».
- **R41.** La landing **no muestra promedio ni cantidad de reseñas**, y no se agrega calificación a los
  datos para Google. Como el dueño elige qué se publica, el promedio de lo publicado sería engañoso.
- **R42.** Lo que llega a la landing es solo lo que se ve en la tarjeta: estrellas, texto y firma.
  La firma la arma el servidor. De una anónima **nunca viaja el nombre**, ni las iniciales, ni la
  empresa.
- **R43.** El texto se muestra como texto plano, con sus saltos de línea. Nunca se interpreta como
  HTML.
- **R44.** Mientras cargan las reseñas, la sección guarda su espacio. Así, quien llega a «Precios»
  desde el blog no queda en medio de las reseñas cuando terminan de cargar.

---

## 6. Qué pasa en los casos de borde

| Caso | Qué pasa |
|---|---|
| Se borra la empresa | Su reseña se borra con ella. Si estaba publicada, sale de la landing. |
| La empresa queda en mora o suspendida | Si no había respondido, no le sale la ventana mientras dure. Si su reseña ya estaba publicada, sigue publicada. En la lista del super admin sale «empresa suspendida» para que el dueño decida. |
| Un pago se reembolsa en Wompi | El sistema no lo registra hoy. El dueño archiva la reseña a mano si hace falta. |
| La empresa Demo | Se excluye: no debe salirle la ventana en plena demostración a un prospecto. |
| Una empresa con cortesía, o traída por un afiliado | Las de cortesía no son elegibles (R1). Las traídas por un afiliado sí, con una marca «referida» en la lista del super admin. |
| El texto trae un enlace o un teléfono | Lo marca R18. Nada se publica sin que el dueño lo vea (R19). |

---

## 7. Lo que hace falta antes de publicar nombres

- **La política de datos 1.2 no cubre esta finalidad.** Las finalidades que declara para quien tiene
  cuenta son cerradas (crear la cuenta, cobrar, dar soporte) y no incluyen publicar su opinión con su
  nombre. La propia política dice que una finalidad nueva necesita una autorización nueva. Hace falta
  una **versión 1.3 revisada por el abogado**, que diga:
  - que se publica en horapro.co la opinión que la persona autorice;
  - qué pasa con quien opina por otro canal (las manuales);
  - cuánto tiempo se guarda;
  - cómo se pide quitarla.

  La ventana enlaza esa política. La decisión 9.4 dice qué hacer mientras tanto.

---

## 8. Hallazgos fuera de este módulo (para decidir aparte)

1. **Seguridad: un administrador de empresa puede darse el rol de super admin.** La ruta que edita
   usuarios acepta cualquier rol. Se comprobó leyendo el código y no se ejecutó. Este módulo depende
   de que solo el dueño publique, así que el arreglo debería ir **antes**. Queda propuesto como tarea
   aparte, junto con una consulta de solo lectura para revisar producción.
2. **El plan anual no se cobra como anual.** Cada pago cubre hasta fin de mes, aunque el valor sea el
   de un año, y la etiqueta «Anual» no cambia nada del cobro. Un cliente que pague el año completo
   caería en mora al mes siguiente. La landing y sus preguntas frecuentes ofrecen el plan anual.

---

## 9. Decisiones abiertas

1. **«Omitir».** Si el administrador pulsa Omitir:
   - **(a)** ¿no se le vuelve a preguntar nunca? (es lo que se lee en «solo una vez»)
   - **(b)** ¿se le pregunta una sola vez más, 30 días después?
2. **Empresa en la firma.** ¿La opción dice «Sí, como Juan Pérez, **de Tuercas SAS**», o solo el
   nombre de la persona, sin la empresa?
3. **Los tres testimonios.** Para cada uno: ¿es real?, ¿por qué canal lo dijo?, ¿cómo autorizó su
   nombre?, ¿cuántas estrellas dio? Y en el de Mateo Vera: ¿se vincula a la empresa Grupo MSM, con lo
   que Grupo MSM ya no recibe la ventana?
4. **Mientras no esté la política 1.3:**
   - **(a)** se sale con todo y se publica solo lo anónimo hasta tener la 1.3;
   - **(b)** se espera a la 1.3 para salir.
5. **Antes de fijar la regla de elegibilidad**, tres consultas de solo lectura en producción:
   - cuántas empresas están marcadas anuales;
   - cuántas empresas verían la ventana el día del despliegue;
   - si la empresa Demo es de cortesía.
6. **El ejemplo de la caja** («Nos ahorró 5 horas a la semana...») invita a escribir cifras. Una cifra
   publicada por HoraPro pasa a ser publicidad suya. ¿Se queda, o se cambia por uno sin números, como
   «Ej: Ya no peleamos con el Excel a fin de mes»?

---

## 10. Cómo se construye (técnico)

### 10.1 Datos

Una tabla nueva `resenas` y ningún cambio a tablas existentes:

| Campo | Para qué |
|---|---|
| `origen` | CLIENTE o MANUAL. |
| `estado` | OMITIDA, POR_REVISAR, PUBLICADA, OCULTA o ARCHIVADA. «Omitir» se guarda como una fila OMITIDA sin estrellas, así que la misma restricción sostiene D1 y D2. |
| `empresaId` | Opcional y **único**: una por empresa. Las manuales sin empresa lo dejan vacío. Se borra en cascada con la empresa. |
| `usuarioId` | Quién la envió. Va sin llave hacia usuarios. |
| `estrellas` | 1 a 5, o vacío (omitida, o manual sin calificación). |
| `texto` | Hasta 500 caracteres. |
| `comoFirma` | CON_NOMBRE o ANONIMA. |
| `firmaNombre`, `firmaCargo` | Copias tomadas al enviar. Se borran con «Quitar el nombre». |
| `textoAutorizacion`, `versionPolitica` | La constancia de R13. |
| `canal`, `referencia`, `autorizacion`, `fechaOpinion` | Solo las manuales. |
| `registradaPor` | Correo del super admin, en las manuales. |
| `planAlEnviar`, `mesesPagadosAlEnviar` | Cómo estaba la empresa cuando opinó. |
| `nombreRetiradoEn` | Cuándo se quitó el nombre. |
| `publicadaEn`, `creadoEn`, `actualizadoEn` | Fechas de control. |

- Al cambiar el esquema aplican §4 y §11: el SQL va a mano en `sql/resenas.sql`, se prueba en la
  MariaDB local del puerto 3310 (incluido que el índice único admita varios vacíos), y se despliega
  **prisma-build antes que backend-build**.
- La tabla entra en `borrarEmpresaEnCascada.ts`, en `verificar-eliminar-empresa.ts` y en el resumen
  de lo que se pierde al borrar una empresa.

### 10.2 Decisiones como funciones puras (ciclo de la sección 2)

| Función | Decide |
|---|---|
| `elegibleParaResena(empresa, suscripcion, pagos, ahora)` | R1. Usa `estadoEfectivo`, no el estado guardado. Excluye cortesía, empresas inactivas y pagos de 0. |
| `sumarMesesBogota(instante, n)` | El mes calendario de R1, con tope al fin de mes (31 de enero más un mes da 28 o 29 de febrero). |
| `limpiarResena(cuerpo)` | R10 a R12. Evita un `any` nuevo (el linter del backend está en 173 de 173). |
| `esPublicable(resena)` | R20, R27 y R21. |
| `aTarjetaPublica(resena)` | R42: la forma exacta de lo que viaja a la landing. |
| `elegirAlAzar(lista, n, aleatorio)` | R35, con el generador inyectado para poder probarla. |
| `debeMostrarResena(...)` (frontend) | R2 a R4, con el mismo patrón que `debeMostrarNovedades`. |
| Movimiento del carrusel (frontend): `derivar`, `envolver`, `suavizar` | R36, R37 y R39. |

### 10.3 Rutas

- `GET /api/resenas/pendiente` (empresa): responde sí o no, solo para la propia empresa.
- `POST /api/resenas` (empresa): envío u omisión. Lee de la base el rol y la firma. Si la empresa ya
  tiene reseña, responde 409. Queda fuera de la auditoría automática, porque esa auditoría copiaría el
  nombre y el texto a un registro que no se borra, y «Quitar el nombre» no llegaría hasta ahí.
- `GET /api/resenas/publicas` (pública): con límite de peticiones propio y caché corta en memoria. Las
  15 se eligen en el servidor y no con `ORDER BY RAND()`. Se revisa su `EXPLAIN` (§8.4).
- `/api/admin/resenas` (super admin): lista, crear, editar manual, cambiar estado y quitar el nombre.

### 10.4 Trampas conocidas en el frontend

- **Animaciones de entrada de la landing.** `useReveal` solo anima lo que existe al cargar la página.
  Si las tarjetas que llegan del servidor llevan `hp-reveal`, se quedan invisibles. O no lo llevan, o
  se vuelven a observar cuando llegan.
- **El carrusel.** Se hace reutilizando la fila con desplazamiento de `BlogReciente`, sin agregar una
  biblioteca.
- **La tarjeta.** Sale a `features/landing/TarjetaResena.tsx` y la usan la landing y la vista previa
  del super admin. La clave de cada tarjeta es el id de la reseña, no el nombre.
- **La ventana.** Accesible con teclado:
  - foco inicial en las estrellas;
  - las estrellas como opciones de radio;
  - la caja de texto con su etiqueta;
  - el foco no sale de la ventana mientras está abierta;
  - «Enviar» protegido contra el doble clic.

### 10.5 Cómo se va a verificar

- **Funciones puras:** pruebas primero, vistas en rojo antes de pasar a verde. Fechas en UTC
  explícito, con la suite en la zona de Los Ángeles (§8.1).
- **Rutas:** pruebas con `app.inject` y la base simulada, como `admin.eliminar.test.ts`. Una de ellas
  comprueba las llaves exactas del JSON público.
- **Costura con la base de datos (§8.6):** un script en `backend/prisma/` que hace lo siguiente y
  después borra lo que creó:
  1. crea una empresa con pagos;
  2. corre la elegibilidad;
  3. envía la reseña;
  4. la publica;
  5. borra la empresa.
- **Landing y super admin:** pruebas con el servidor simulado en sus tres estados (con reseñas, sin
  reseñas, con error). Una de ellas comprueba que un texto con `<img onerror>` se ve literal.
- **En el navegador, con el servidor local** y recargando antes (§12.8), lo que las pruebas no pueden
  medir: que las tarjetas se vean (la opacidad), el carrusel en computador y en 375 px, y el modo de
  reducir movimiento.
- **Cobertura** reportada de la decisión y del archivo, los dos números (§8.2).
