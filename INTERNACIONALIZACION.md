# Estrategia de internacionalización de HoraPro

*Documento de decisión. Lo técnico está subordinado a lo comercial: el orden de las secciones no es casual.*

---

## 0. La conclusión primero

**El motor de horas no está atado a Colombia por los números. Está atado por la forma.** Los porcentajes, la jornada, la frontera nocturna y los festivos ya son datos con vigencia por fecha, y eso está genuinamente bien hecho. Lo que está cableado es la *estructura*: 8 códigos fijos, domingo como único día de descanso, extra definida solo por tope semanal, factor plano sin escalones.

De ahí sale la única pregunta que importa antes de escribir código:

**Si el próximo país es Perú o Ecuador, esto son semanas de trabajo y cero riesgo para los clientes actuales. Si es México, es un producto distinto disfrazado de configuración. Si es Chile, súmale el peor cambio del frente de tiempo.**

Mi recomendación concreta: **no internacionalizar la instalación. Clonarla.** Y hacerlo solo cuando haya un cliente extranjero que ya pagó. Los argumentos están abajo.

---

## 1. La pieza que bloquea todo

No es la zona horaria ni el motor. Es esto:

**La instalación entera *es* Colombia, y no hay dónde escribir que no lo sea.**

Dos hechos que juntos forman un solo problema:

- `Empresa` no tiene país, ni zona horaria, ni moneda, ni locale (`backend/prisma/schema.prisma:13-42`). Verifiqué: `pais` no aparece ni una vez en todo el schema.
- Las tres tablas que codifican la ley —`TipoHora`, `JornadaVigencia`, y los festivos nacionales de `DiaFestivo` con `empresaId: null`— son **globales de instalación**. Se leen con `findMany()` sin filtro en ~12 rutas.

La consecuencia práctica es más dura de lo que suena: **hoy no puedes tener una empresa peruana y una colombiana en la misma base de datos sin romper a la colombiana.** Sembrar 48h para Perú le cambia la jornada al cliente de Bogotá. No es que sea difícil; es que es físicamente imposible sin migración de esquema.

Y hay una prueba de que la separación de reglas ya está rota *hoy, con un solo país*: `POST /festivos/generar/:anio` (`backend/src/routes/festivos.ts:39-51`) está detrás de `requireEmpresa`, pero la línea 46 escribe `create({ data: { fecha, nombre } })` **sin `empresaId`** — o sea, festivo global. Cualquier admin de cualquier cliente inyecta filas en el calendario que ven todos los demás tenants. Eso hay que arreglarlo aunque nunca vendas fuera de Colombia.

**Pero el bloqueo real tiene una salida lateral, y es la parte que hay que entender:** si la instalación es la jurisdicción, la opción barata no es pelearlo — es aceptarlo. Ver sección 3.

---

## 2. El segundo bloqueo, que sí es de código y no tiene salida lateral

Colombia define la hora extra por **tope semanal**. Casi nadie más en la región lo hace así:

| País | Tope | ¿Lo expresa el motor hoy? |
|---|---|---|
| Colombia | semanal (42h) | Sí |
| Perú | **diario** (8h) + escalones 25%/35% | No |
| Ecuador | **diario** (8h), máx 4h/día | No |
| Chile | **diario** (2h/día sobre 8) | No |
| México | **diario** (8h) + escalones 200%/300% | No |

`backend/src/utils/horasColombiana.ts:79` solo tiene `maxOrdinariosSemana = jornadaSemanalHoras * 60`, y el bucle solo lleva `minutosOrdAcum` semanal. Alguien que trabaja 10h el lunes y 6h el martes genera 2h extra en cualquiera de esos cuatro países y **cero** en HoraPro.

Léelo al revés: **el tope diario no es una feature para México, es la feature que abre cuatro países a la vez.** Y es la más barata de las tres grandes (un contador de minutos del día en el bucle, más un campo en `ExtraConfig`).

Los otros dos cambios del motor son de otra magnitud:

- **Escalones de extras** (Perú, México): hoy el minuto se clasifica sin saber cuántas extras lleva acumuladas. `calcularLiquidacion` aplica un factor plano por código (`horasColombiana.ts:179`). Es el cambio conceptual más profundo del sistema.
- **Motor dirigido por datos**: `clasificarMinuto` (`:35-44`) devuelve 8 literales desde un if/else de 3 dimensiones fijas. El campo `TipoHora.aplica` existe, se siembra, se muestra en pantalla y **nunca se lee** — es decorativo, y hace parecer configurable algo que no lo es.

---

## 3. Instalación separada por país: por qué probablemente es la respuesta correcta

Antes de las fases, la decisión arquitectónica, porque cambia todo lo demás.

**A favor de una instalación por país:**

1. **Es la arquitectura que el código ya tiene.** El aislamiento transaccional por `empresaId` está bien resuelto (Colaborador, Registro, Permiso, Horario, Notificacion). Lo único globalizado es exactamente lo que cambia por país. El código ya se comporta como "una instalación = una jurisdicción".
2. **Elimina el riesgo #1 sobre los clientes actuales**: no hay que tocar la base colombiana. Cero `DROP INDEX` en producción, cero backfill, cero SQL a mano sobre datos que producen números de nómina.
3. **`Empresa.nit @unique` es global** (`schema.prisma:16`). En instalación única, dos empresas de países distintos con el mismo string chocan. Separadas, no existe el problema.
4. **Perú y Ecuador comparten UTC-5 con Colombia y no tienen DST.** Todo el frente de zona horaria —16 archivos, ~14 puntos de aritmética con offset fijo, los dos bucles que suman milisegundos— **desaparece** para esos dos países. Sigue siendo deuda, deja de ser bloqueante.
5. El deploy por ramas build ya existe y ya está documentado. Otra BD MySQL, otro subdominio, el mismo build.

**En contra (el costo real, no lo minimices):**

- Se parten en dos el panel de super admin, la facturación y el programa de afiliados.
- Dos despliegues, dos backups, dos seeds que mantener sincronizados.
- Un bug de motor hay que desplegarlo N veces.
- Hay que confirmar que Banahosting aguanta una segunda app Node.

**Mitigación del costo:** con 3–10 clientes en un país nuevo, llevar esa facturación en una hoja de cálculo durante un año cuesta menos que la migración de esquema. Y el cobro ya soporta ese modo sin tocar código: todo el flujo verifica `wompiConfigurado()` (`backend/src/utils/wompi.ts:13-15`) y cae a pago `MANUAL` si no hay llaves.

**Lo que la instalación separada NO resuelve:** nada del motor. El tope diario y los escalones hacen falta igual. Separar la base compra tiempo en el problema de *datos*; no compra ni un día en el problema de *código*.

---

## 4. Fases, cada una con valor propio

### Fase 0 — Higiene que hay que hacer aunque nunca vendas fuera *(1–2 semanas, cero cambios de esquema)*

Valor para el cliente colombiano actual, hoy:

1. **Bug de cobro que existe ya**: `descontarAlmuerzo` busca literalmente `'HOD'` (`horasColombiana.ts:151`). Un turno 100% nocturno o de domingo **no pierde el almuerzo**. Vigilancia, salud, manufactura: sectores enteros donde eso es plata mal calculada todos los días. Descontar del código de menor recargo presente, no de un literal.
2. **`registros.ts:102-106` y `:123-127`** hacen `toZonedTime(...)` seguido de `.setHours(0,0,0,0)`: eso da medianoche del **servidor**, no de Bogotá. No hay `TZ` fijado en `Dockerfile` ni en `.env.example`, así que el comportamiento depende de cómo esté configurado Banahosting. Usar `rangoDiaBogota()`, que existe justamente para eso.
3. **Unificar la convención de `Registro.fecha`**: el kiosco guarda el ancla de día (`worker.ts:341-346`), el reloj del panel guarda el instante crudo (`registros.ts:111`). Dos convenciones en la misma columna, y coinciden por casualidad. Esto hay que decidirlo **antes** de tocar zona horaria; si no, se internacionaliza encima de un dato inconsistente.
4. **Quitar el fallback `?? 42`** de `vigencias.ts:9` y fallar explícito. Ver sección 6.
5. **Mover `/festivos/generar/:anio` a super admin.** Fuga de escritura entre tenants.
6. **Centralizar el formateador de moneda y de fecha** en `frontend/src/lib/moneda.ts` y `lib/fecha.ts`. 17 copias del mismo one-liner → 1. Cero cambio funcional, convierte 17 archivos en un punto de cambio.
7. **Arreglar `parsearMiles`** (`Colaboradores.tsx:20`): `replace(/\D/g,'')` borra los decimales. En COP nadie lo nota; en cualquier moneda con centavos es un error de 100x silencioso, y es la función que captura salarios y precios.

### Fase 1 — Tope diario de extras *(la de mejor relación valor/costo de todo el plan)*

Un contador de minutos ordinarios del día en el bucle, más `topeDiarioHoras` en `ExtraConfig`.

- **Se vende en Colombia hoy**: el límite legal colombiano de 2h extra/día no se aplica en ningún lado. "Alerta si un colaborador pasó de 2h extra hoy" es una feature que el cliente actual entiende y quiere.
- **Abre Perú, Ecuador y Chile** a nivel conceptual, sin tocar el esquema.
- Es el mismo contador que después necesitan los escalones y los topes legales.

### Fase 2 — Piloto extranjero en instalación clonada

Sin migración en Colombia. Clonar, sembrar `TipoHora`/`JornadaVigencia` del país nuevo, cargar sus festivos, cobrar `MANUAL`, cambiar el catálogo de etiquetas (ver Fase 3). **Valor: el primer euro/sol/dólar de fuera.**

Corrección que sí hace falta aquí: `horasMesDeJornada` (`vigencias.ts:21-22`) devuelve `jornada × 5`. Para Perú (48h → 240) coincide. Para Ecuador (40h → daría 200, y lo correcto es 240) **no**. Es un campo en la tabla de jornada o una regla por país, no una fórmula.

### Fase 3 — Catálogo de país (etiquetas, no traducción)

~30 strings, no un sistema de i18n: `NIT`→RFC/RUC/RUT, `Cédula`→Documento, `INCAPACIDAD_EPS`/`INCAPACIDAD_ARL`→`INCAPACIDAD_COMUN`/`INCAPACIDAD_LABORAL`, el footer `'HoraPro · Control de horas laborales para Colombia'` (`backend/src/utils/correo.ts:44`), y —el importante— **el texto de consentimiento biométrico que cita la Ley 1581** (`ColaboradorDetalle.tsx:332`). Ese último no es cosmético: es dato biométrico, y una cita legal incorrecta puede invalidar el consentimiento. Es el mayor riesgo jurídico del producto al cruzar frontera.

### Fase 4 — Motor dirigido por datos

Conectar `TipoHora.aplica` al clasificador, agregar `esExtra` como flag (elimina el `CODIGOS_EXTRA` duplicado en dos archivos), quitar el privilegio de `'HOD'` y su fallback `?? 6 / ?? 21`. Aquí muere "domingo = día de descanso".

### Fase 5 — Escalones de extras

Solo si el país elegido los necesita (Perú, México).

### Fase 6 — Consolidación multipaís en una sola instalación

`paisId` en `Empresa` + en las 3 tablas de ley, reindexado, filtrado en las 12 rutas. **Se hace cuando el dolor operativo de N instalaciones supere el riesgo de la migración**, no antes. Con menos de ~30 clientes extranjeros, no supera.

---

## 5. Decisiones que el dueño tiene que tomar antes de codificar

1. **¿Hay un cliente extranjero concreto, o es una apuesta?** Si es apuesta: no escribir una línea. Regla dura: cero código de internacionalización hasta que alguien haya pagado (aunque sea por transferencia) o firmado carta de intención.
2. **¿Cuál es el primer país?** No es intercambiable. México = producto distinto (tope diario + escalones + jornada mixta de 3 tramos + prima dominical por *día*, concepto que el motor no tiene: `TipoHoraCalculo` es código+minutos, no puede representar "25% de un día"). Perú/Ecuador = semanas. Chile = súmale DST, que obliga a rezonificar dentro del bucle de `horasColombiana.ts:133` y `saldoTiempo.ts:178`.
3. **¿HoraPro es una calculadora legal o una herramienta configurable?** La decisión más importante y la que nadie ve. Si es calculadora legal, cada país es un proyecto de investigación jurídica con responsabilidad sobre el número. Si es herramienta configurable —"tú cargas tus reglas, tu contador valida"— se puede vender fuera meses antes y con una fracción del riesgo. *Nota: las cifras legales de este documento son de referencia; validarlas con un contador local del país es un costo real que nadie presupuesta.*
4. **¿Una instalación por país o una multipaís?** Sección 3. Si eliges separada, asúmelo explícitamente y deja de tratar `paisId` como deuda urgente.
5. **¿Cobras en moneda local o en COP/USD?** Si local, hace falta otra pasarela (Wompi es solo Colombia y Costa Rica). Si aceptas transferencia manual el primer año, el frente de pagos se pospone entero.
6. **¿El programa de afiliados sale de Colombia?** Hoy la comisión se acumula en la misma moneda del pago sin conversión (`suscripcion.ts:242-243`) y los métodos son NEQUI/BANCOLOMBIA/DAVIPLATA. Recomiendo congelarlo a Colombia: es el módulo más caro de generalizar y el que menos ingresos aporta por unidad de esfuerzo.
7. **¿Factura fiscal local o exportación de servicios desde Colombia?** Decide si hace falta registro fiscal en cada país. Hoy el documento dice "RECIBO DE PAGO", no factura, lo que evita el problema. Es decisión de contador.

---

## 6. Lo que NO vale la pena hacer todavía

- **i18n de idioma (i18next).** ~120 archivos, más de mil literales. México, Perú, Chile, Ecuador y Argentina hablan español. **Ganancia: cero clientes.** Es la peor inversión disponible. Lo que sí hace falta son etiquetas por país (Fase 3), que es otra cosa y cuesta 100 veces menos.
- **Abstraer la pasarela de pagos.** El modo MANUAL ya funciona. Posponer hasta que cobrar a mano duela de verdad.
- **Renombrar `wompiTransaccionId` / `LINK_WOMPI`.** Migración de datos sin ganancia hasta que exista una segunda pasarela.
- **DST.** Solo si Chile entra. México no tiene DST desde 2022 (salvo franja fronteriza); Perú, Ecuador y Colombia nunca.
- **Convertir `TipoPermiso` en tabla `ReglaPermisoPais`.** Renombrar a conceptos neutros cubre cuatro países. El campo `diasCargoEmpleador` solo hace falta cuando un cliente reclame.
- **Landing y SEO por país.** Es marketing. Se resuelve con una página nueva, no con refactor.
- **Modelo `Pais` completo.** Tres columnas en `Empresa` cubren el 90%; el modelo normalizado se justifica en la Fase 6.

Y la alternativa que nadie puso sobre la mesa: **profundizar en Colombia.** Con el mismo esfuerzo de la Fase 1 tienes el almuerzo nocturno arreglado, los topes legales de 2h/día y 12h/semana, y el tope diario. Eso se le vende al cliente que **ya paga**, sin migración, sin pasarela nueva, sin exposición biométrica en otra jurisdicción. Si el mercado colombiano no está saturado, internacionalizar es un costo de oportunidad grande y mal medido.

---

## 7. El riesgo concreto de romper a los clientes colombianos

**El escenario:** Fase 6, agregas `paisId` a `TipoHora`. En producción el DDL se escribe a mano —la carpeta de migraciones se quedó en `20260709224614_rostro_facial` mientras el schema ya tiene `Notificacion`, `Afiliado`, `Comision`, `SolicitudRetiro` y `Registro.salidaEstimada`, así que `prisma migrate deploy` **no** reproduce el estado. Corres el `DROP INDEX tipos_hora_codigo_vigenteDesde_key`, algo falla a mitad y el índice compuesto no se crea. La tabla queda sin clave única.

**Por qué es el peor riesgo posible:** no explota. Un seed o un reintento duplica la fila `HOD` vigente. `findMany()` sin filtro devuelve las dos, y `tiposHoraDB.find(t => t.codigo === 'HOD')` (`horasColombiana.ts:92`) toma **la primera arbitrariamente**. Si esa fila trae `horaFin = 21` en vez de `19`, la frontera nocturna se mueve dos horas y **todas las liquidaciones de ese mes salen mal**. Nadie lo ve en logs. Lo ve el cliente cuando le cuadra la nómina, y ahí ya perdiste la confianza — que en un producto que calcula plata es el único activo real.

El mismo mecanismo aplica al fallback `?? 42` de `vigencias.ts:9`: si al filtrar por país una consulta queda mal escrita y devuelve cero filas, el sistema **no falla, liquida con 42h en silencio**. En 2026 el número es correcto, así que el bug queda dormido hasta el próximo escalón de la Ley 2101.

**Cómo evitarlo, en orden:**

1. **Prueba de regresión de oro, antes de tocar nada.** Corre el reporte de liquidación del último mes cerrado para todas las empresas y guarda el JSON en disco. Después del cambio, córrelo otra vez y haz diff. **Si el diff no es exactamente vacío, se revierte.** Es la única prueba que importa: el producto es un número de dinero, y esa prueba te cubre los cinco frentes a la vez.
2. **Quita el fallback `?? 42` y falla explícito** *antes* de introducir cualquier filtro por país. Un default silencioso de otra jurisdicción es peor que un error 500.
3. `paisId` con `@default("CO")` y NOT NULL desde el primer ALTER: el backfill queda implícito y no existe un estado intermedio con NULLs.
4. **Crea el índice compuesto nuevo primero, borra el viejo después**, con verificación entre los dos pasos. Backup de `tipos_hora`, `jornadas_vigencia`, `dias_festivos` y `empresas` antes de correr nada — el `DROP` no es reversible por git.
5. **Actualiza los seeds en el mismo commit.** `seed-produccion.ts:50` upsertea por `where: { vigenteDesde }` y `:63` por `where: { codigo_vigenteDesde }`. Al cambiar la clave, un seed viejo corrido contra el schema nuevo duplica filas — que es exactamente el escenario de arriba.
6. **Y la mitigación que hace innecesarias las cinco anteriores:** si eliges instalación separada, este riesgo no existe. La base colombiana no se toca.