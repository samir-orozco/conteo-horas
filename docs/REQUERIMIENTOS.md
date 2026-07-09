# Levantamiento de Requerimientos — HoraPro (horapro.co)

**Fecha:** 5 de julio de 2026
**Estado:** Aprobado — en desarrollo (Fase 1).
**Producto:** HoraPro — SaaS de conteo de horas para Colombia (dominio horapro.co).
**Referencias de mercado:** GeoVictoria (industria seguridad/vigilancia), Buk (precios por persona).

---

## 1. Visión general

Sistema SaaS multi-empresa para el registro y liquidación de horas trabajadas por
colaboradores, basado en la legislación laboral colombiana. Se parte del proyecto
existente en este repositorio (backend Fastify + Prisma + MySQL, frontend React +
Vite + Tailwind, kiosco de marcación), que hoy es single-tenant, y se evoluciona a
multi-tenant con capa comercial (suscripciones, pagos, morosidad).

**Alcance acotado:** control de asistencia y cálculo de horas/recargos. NO es un
software de nómina completa (no liquida seguridad social, prestaciones ni genera
planilla PILA). Los reportes sirven como insumo para la nómina.

---

## 2. Actores y roles

### 2.1 Super Administrador (dueño del SaaS)
- Crea y administra usuarios Empresa (alta, edición, suspensión).
- Ve empresas activas/inactivas y su número de colaboradores.
- Gestiona suscripciones y ve los pagos recibidos (vía pasarela).
- Reporte de ingresos (mensual, acumulado, por empresa).
- Alertas de morosos: empresas con pago vencido, días de mora, acción de
  suspensión automática/manual del servicio.

### 2.2 Empresa (administrador de cada tenant)
- Gestiona sus propios usuarios internos (roles ADMIN y SUPERVISOR).
- CRUD de colaboradores (nombre, cédula, cargo, salario, horario asignado).
- Registra novedades por colaborador:
  - **Vacaciones** (15 días hábiles por año trabajado).
  - **Incapacidades** (enfermedad general EPS / laboral ARL, con días y soporte).
  - **Licencias**: maternidad, paternidad, luto, calamidad doméstica, jurado de
    votación / citas judiciales.
  - **Permisos** remunerados y no remunerados.
- Corrige/ajusta marcaciones (con trazabilidad de quién y cuándo).
- Aprueba horas extras (opcional, configurable).
- Consulta reportes de horas por colaborador y por período, discriminadas por
  tipo de hora y recargo, con valor en pesos.
- Configura su empresa: horario diurno/nocturno, jornada, tolerancias de marcación.

### 2.3 Colaborador
- **No tiene login.** Marca entrada/salida en el kiosco (módulo Marcador):
  - **Fase 1:** marcación con número de cédula.
  - **Fase 2:** marcación con huella dactilar (hardware en camino; se evaluará el
    SDK/driver del lector cuando llegue). El diseño debe dejar la abstracción
    lista: `metodoMarcacion: CEDULA | HUELLA`.

---

## 3. Reglas de negocio — legislación colombiana

### 3.1 Jornada laboral (Ley 2101 de 2021) — con vigencias
La jornada máxima semanal se reduce gradualmente. **No puede ser un número fijo en
configuración**: debe modelarse con vigencias por fecha para que reportes históricos
liquiden con la jornada vigente en cada semana.

| Vigente desde | Jornada semanal |
|---|---|
| 15 jul 2023 | 47 h |
| 15 jul 2024 | 46 h |
| 15 jul 2025 | 44 h |
| **15 jul 2026** | **42 h** ← aplica en 10 días |

Horas por encima de la jornada semanal vigente = horas extra (máx. 2 h/día,
12 h/semana según CST).

### 3.2 Recargos (CST + Reforma Laboral, Ley 2466 de 2025) — con vigencias
- **Jornada nocturna:** desde diciembre de 2025 inicia a las **7:00 p.m.** (19:00)
  y va hasta las 6:00 a.m. (antes era 21:00–06:00).
- **Recargo nocturno:** 35 %.
- **Hora extra diurna:** 25 %. **Hora extra nocturna:** 75 %.
- **Recargo dominical/festivo** (aumento gradual):

| Vigente desde | Recargo dom/festivo |
|---|---|
| antes de jul 2025 | 75 % |
| 1 jul 2025 | 80 % |
| **1 jul 2026** | **90 %** ← vigente hoy |
| 1 jul 2027 | 100 % |

La tabla `TipoHora` existente ya es configurable; se le agregan campos
`vigenteDesde`/`vigenteHasta` y los cálculos toman la tarifa vigente a la fecha
del registro. Se precargan las vigencias conocidas por ley.

### 3.2.1 Modelo de pago de la liquidación (importante)
El **salario mensual ya cubre las horas ordinarias** (≈ jornada×5 h/mes, ej. 210h
con jornada de 42h). El reporte NO vuelve a pagar esas horas; calcula solo lo que
se paga **además** del salario:
- **Hora ordinaria diurna (HOD):** $0 adicional (incluida en el salario).
- **Recargos** de horas ordinarias nocturnas / dominicales / festivas: se paga
  **solo el recargo** (factor − 1), no la hora base. Ej. nocturno = valorHora×0,35;
  dominical = valorHora×0,90.
- **Horas extra** (superan la jornada legal semanal): se paga la **hora completa**
  con su factor (1,25 / 1,75 / …), porque no están cubiertas por el salario.
- Total nómina del período = salario base + recargos + horas extra.
Implementado en `calcularLiquidacion` (`esExtra` → factor completo; ordinaria →
factor − 1). El reporte muestra salario base, recargos, horas extra y total adicional.

### 3.3 Festivos (Ley 51 de 1983 — Ley Emiliani)
Los 18 festivos anuales se **generan automáticamente por algoritmo**:
- **Fijos:** 1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic.
- **Trasladables al lunes siguiente:** Reyes (6 ene), San José (19 mar), San Pedro y
  San Pablo (29 jun), Asunción (15 ago), Día de la Raza (12 oct), Todos los Santos
  (1 nov), Independencia de Cartagena (11 nov).
- **Basados en Pascua:** Jueves y Viernes Santo; Ascensión, Corpus Christi y Sagrado
  Corazón (trasladados a lunes).

El sistema genera el calendario de cada año automáticamente y la empresa puede
agregar/quitar días manualmente (ej. días cívicos propios). Los festivos son
globales (no por empresa), con excepciones por empresa.

---

## 4. Arquitectura multi-tenant

- **Una sola base de datos** con columna `empresaId` en todas las tablas de negocio
  (colaboradores, registros, permisos, configuración, usuarios).
- Restricciones únicas pasan a ser compuestas: la cédula del colaborador es única
  **por empresa** (`@@unique([empresaId, cedula])`), no global.
- Todo endpoint del backend filtra por la empresa del token JWT. El super admin
  usa rutas separadas (`/api/admin/...`).
- Nuevos modelos: `Empresa`, `Plan`, `Suscripcion`, `Pago`.

## 5. Suscripciones y pagos

- **Pasarela:** Wompi (Bancolombia) — soporta tarjetas con tokenización para cobro
  recurrente, PSE y Nequi para pagos puntuales. Webhook de confirmación actualiza
  el estado de la suscripción.
- **Estados de suscripción:** `PRUEBA` → `ACTIVA` → `EN_MORA` → `SUSPENDIDA` → `CANCELADA`.
- **Morosidad:** al vencer el período sin pago → `EN_MORA` (alerta al super admin y
  banner a la empresa); tras N días configurables de mora → `SUSPENDIDA` (bloqueo de
  acceso, se conservan los datos).
- **Modelo de precios (escalonado, EDITABLE por el super admin en /admin/configuracion):**
  - Valores actuales: primeros **15** colaboradores a **$10.000 COP** c/u por mes;
    del 16 en adelante a **$2.000 COP** c/u.
  - Los precios viven en BD (`ConfiguracionPlataforma`) y aplican de inmediato.
- **Facturación por MES CALENDARIO (estilo Notion):**
  - Todo pago cubre desde hoy hasta fin de mes (prorrateado por días restantes);
    todas las renovaciones caen el día 1.
  - Colaborador nuevo a mitad de mes con el mes ya pagado → cobro adicional
    prorrateado solo por la diferencia.
  - "Eliminar" un colaborador con el mes pagado programa su retiro para fin de mes
    (ya está cubierto y sigue marcando); sin mes pagado, se desactiva de inmediato.
  - El kiosco de marcación NUNCA se bloquea por mora: las horas siempre se registran.
    El bloqueo es del panel admin (modal de pago obligatorio).
- **Período de prueba:** 7 días con funcionalidad completa.
- **Morosidad:** al vencer el pago → `EN_MORA`; a los **5 días** de mora → `SUSPENDIDA`.
- **Formas de pago:** tarjeta tokenizada (cobro recurrente automático) y link de pago
  mensual Wompi (PSE/Nequi/tarjeta) para quienes no registren tarjeta.

## 6. Módulos del sistema

| Módulo | Descripción | Estado actual |
|---|---|---|
| Marcador (kiosco) | Marcación por cédula (hoy usa PIN → cambiar), futuro huella | Existe, ajustar |
| Colaboradores | CRUD + salario + horario | Existe, agregar empresaId |
| Registros | Entradas/salidas, corrección manual con auditoría | Existe, agregar auditoría |
| Novedades | Vacaciones, incapacidades, licencias, permisos | Parcial (ampliar tipos) |
| Festivos | Generación automática anual + edición | Existe, agregar algoritmo |
| Reportes de horas | Por colaborador/período, tipos de hora, valor en $ | Existe, ajustar vigencias |
| Configuración empresa | Jornada, horario nocturno, tolerancias | Existe, mover a tenant |
| Panel Super Admin | Empresas, suscripciones, ingresos, morosos | **Nuevo** |
| Pagos (Wompi) | Checkout, webhooks, historial | **Nuevo** |

## 7. Fases propuestas

1. **Fase 1 — Multi-tenant:** modelo `Empresa`, migración de datos, scoping por
   `empresaId`, roles, marcación por cédula, vigencias de jornada y recargos
   (urgente: cambio del 15 jul 2026), algoritmo de festivos.
2. **Fase 2 — Capa comercial:** panel super admin, planes, integración Wompi,
   webhooks, alertas de morosos, reporte de ingresos.
3. **Fase 3 — Línea gráfica:** aplicación de logo/colores definitivos (pendiente
   definición del cliente), landing pública, registro self-service de empresas.
4. **Fase 4 — Huellero:** integración del lector de huella al kiosco (según SDK
   del hardware que está por llegar).

## 8. Línea gráfica

Estilo de referencia: dashboard SaaS moderno tipo "Nexus" — sidebar blanca con
secciones (General / Herramientas / Soporte), contenido sobre fondo gris muy claro,
cards blancas con bordes suaves y esquinas redondeadas, chips de porcentaje,
tipografía sans limpia.

**Paleta HoraPro:**

| Uso | Color |
|---|---|
| Primario / acento (botones, activos, marca) | `#FFD85E` (amarillo) |
| Texto principal / superficies oscuras | `#303030` |
| Texto secundario / íconos | `#898989` |
| Fondos / superficies | `#FFFFFF` |

Nota de accesibilidad: sobre el amarillo `#FFD85E` el texto va en `#303030`
(el blanco no contrasta). Pendiente: logo definitivo.

## 9. Decisiones tomadas

- [x] Evolucionar el proyecto existente (no partir de cero).
- [x] Precios: escalonado $10.000 (1–25) / $6.000 (26+) por colaborador activo/mes.
- [x] Prueba gratis: 7 días. Gracia de morosos: 5 días → suspensión.
- [x] Nombre: **HoraPro** (horapro.co).
- [x] Pagos: Wompi — recurrente con tarjeta + link de pago mensual.
- [x] Marcación: por **cédula** ahora; huella cuando llegue el lector (Fase 4).
- [x] Desarrollo arranca con la jornada de **42 h** (vigente 15 jul 2026) modelada
      con vigencias para no recalcular después.
- [x] **Horarios de trabajo** por empresa (Configuración → Horarios) asignables por
      colaborador, con tolerancia en minutos. Las **llegadas tarde** se calculan
      contra el horario (excluyendo festivos y novedades) y se ven en el perfil
      del colaborador y en Reportes (días y tiempo total).
- [x] **Seguridad del kiosco**: opción "solo dispositivos autorizados" — se vinculan
      con un código de 6 dígitos de un solo uso (10 min) generado en el panel;
      lista de dispositivos con revocación. Se eligió esto en lugar del link
      rotativo diario porque ataca el problema real (marcar desde la casa con el
      link copiado) sin la operación diaria de reabrir links.
- [x] Logo definitivo integrado (login, sidebar y kiosco).
- [x] **Landing pública** en `/` (hero enfoque liquidación automática, precios dinámicos
      leídos de la config del super admin, beneficios, cómo funciona, FAQ, franja de
      confianza, animaciones geométricas). **Registro self-service** en `/registro`
      (crea empresa + 7 días de prueba y entra directo). La app quedó bajo `/app`.
- [x] **Dashboard de inicio de la empresa** (pantalla `/`): en planta ahora, llegadas
      tarde hoy, quién no ha marcado entrada, novedades del día, turnos sin cerrar
      (alerta), próximos festivos y KPIs (en planta, colaboradores, horas de la semana,
      horas extra del mes). El "Marcador" (link del kiosco) pasó a `/kiosco`.
