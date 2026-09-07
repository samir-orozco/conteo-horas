// Genera el documento que se le manda al abogado, a partir del MISMO archivo que
// se publica. Así no pueden divergir: si alguien cambia la política y no vuelve a
// correr esto, lo que se revisó y lo que está en línea siguen siendo el mismo
// texto porque salen de la misma fuente.
//
//   cd frontend && node scripts/generar-doc-abogado.mjs ../POLITICA-PRIVACIDAD-para-abogado.md
import { PRIVACIDAD } from '../blog/legal/privacidad.mjs';
import { writeFileSync } from 'node:fs';

// HTML a texto, simple pero suficiente: este documento lo lee una persona.
// Una sección puede traer su html como cadena o como función, si necesita
// interpolar algo del propio documento (la fecha de vigencia, por ejemplo).
const texto = fuente => (typeof fuente === 'function' ? fuente(PRIVACIDAD) : fuente)
  .replace(/<h3>(.*?)<\/h3>/g, '\n### $1\n')
  .replace(/<li>(.*?)<\/li>/g, '- $1')
  .replace(/<\/?(ul|ol)>/g, '')
  .replace(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g, '| $1 | $2 |')
  .replace(/<thead><tr><th>(.*?)<\/th><th>(.*?)<\/th><\/tr><\/thead>/g, '| $1 | $2 |\n|---|---|')
  .replace(/<\/?(table|tbody)[^>]*>/g, '')
  .replace(/<b class="pend">(.*?)<\/b>/g, '**[$1]**')
  .replace(/<b>(.*?)<\/b>/g, '**$1**')
  .replace(/<a href="([^"]*)">(.*?)<\/a>/g, '[$2]($1)')
  .replace(/<\/p>/g, '\n')
  .replace(/<p>/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const doc = `# ${PRIVACIDAD.h1}

**HoraPro** · Versión ${PRIVACIDAD.version} · Vigencia: ${PRIVACIDAD.fechaVigencia}

${PRIVACIDAD.secciones.map(s => `## ${s.titulo}\n\n${texto(s.html)}`).join('\n\n')}

---
---

# Notas para la revisión jurídica

Este documento **no lo escribió un abogado**. Lo escribió el equipo de desarrollo
después de inventariar el software entero, con una regla: cada afirmación tiene
que corresponder a algo que el código hace, y donde el producto no hace algo, el
texto no lo promete.

Eso quiere decir que lo que sigue es fiable como **descripción técnica** y está
sin verificar como **suficiencia jurídica**. Abajo está separado lo uno de lo otro
para que la revisión se concentre donde hace falta.

## 1. Lo que se verificó leyendo y ejecutando el código

- **La foto de cada marcación sí se borra a los 60 días.** Existe un proceso que
  corre al arrancar el servidor y cada 24 horas, y vacía esas imágenes de todo
  registro con más de 60 días. Es la única regla de borrado automático que tiene
  el producto.
- **La ubicación GPS no se guarda.** Llega en el momento de marcar, se usa para
  decidir si la persona está dentro del sitio de trabajo, y se descarta. Solo
  queda registrada la sede.
- **HoraPro no puede ver los datos de los trabajadores de sus clientes.** No
  existe ninguna pantalla ni función del panel interno que devuelva nombres,
  cédulas, salarios, fotos, biometría ni novedades. El panel solo muestra
  conteos y facturación. Queda el acceso técnico a la base de datos, y el
  documento lo dice.
- **HoraPro no recibe datos de tarjetas.** El pago ocurre en el sitio de Wompi;
  solo se le envían llave pública, moneda, monto, referencia y firma.
- **El descriptor facial se calcula en el navegador**, con modelos servidos desde
  el propio dominio. No pasa por ningún proveedor externo de biometría.
- **El nombre del trabajador y sus minutos de retraso salen hacia Telegram**
  cuando la empresa activa esa alerta. Está declarado en el punto 7.
- **Los datos están alojados en Estados Unidos.** El dominio resuelve a una IP
  registrada en Elk Grove Village, Illinois.

## 2. Lo que hay que dejar cierto ANTES de publicar

El texto ya lo afirma, así que publicarlo antes de que exista lo volvería falso.

1. **La copia de seguridad semanal que sobreescribe la anterior.** El dueño se
   comprometió a configurarla.
2. **La casilla privacidad@horapro.co**, que es el canal formal declarado y donde
   empiezan a correr los plazos de respuesta.

## 3. Las preguntas que necesitan criterio jurídico

Son las que el equipo técnico no puede responder.

**a) El consentimiento biométrico.** Hoy el software **no conserva prueba** de
que el trabajador autorizó el tratamiento de su rostro. La pantalla muestra un
texto de autorización al administrador de la empresa, pero ese dato no se guarda
en ninguna parte, y quien marca la casilla es el administrador, no el titular.
El documento resuelve esto diciendo que la autorización la obtiene y la conserva
la empresa empleadora, porque HoraPro es encargado y no responsable de ese dato.
**¿Es suficiente esa posición, o HoraPro debe además conservar la prueba?**

**b) El producto permite dejar el rostro como única forma de marcar.** La
configuración le permite a una empresa desactivar la marcación por cédula. El
documento recomienda expresamente no hacerlo, porque condicionar la asistencia a
entregar un dato biométrico es contrario a la ley. **¿Basta con recomendarlo, o
el software debe impedirlo?**

**c) El descriptor facial se guarda sin cifrar** en la base de datos, igual que
los soportes médicos de las incapacidades. **¿Qué nivel de cifrado en reposo
exige la norma para datos sensibles, y en qué plazo?**

**d) La foto abierta de cada marcación.** Se guarda la imagen del rostro, no solo
el vector matemático. **¿Es defendible como evidencia de la marcación, o hay que
dejar de guardarla?**

**e) Datos de salud.** Las incapacidades médicas que se adjuntan como soporte de
una novedad **no tienen regla de borrado**. Se conservan indefinidamente.
**¿Cuánto tiempo se pueden conservar?**

**f) El retiro de un trabajador no borra nada**, ni siquiera su biometría. La
ficha queda inactiva pero completa. **¿Cuándo se agota la finalidad del dato
biométrico de un exempleado, y qué hay que borrar en ese momento?**

**g) Menores de edad.** El producto admite contratos de aprendizaje, y un
aprendiz puede ser menor. **¿Hay algún requisito adicional?**

**h) La fecha de vigencia.** El documento rige desde la fecha en que de verdad se
publique, no antes. Se consideró fecharlo hacia atrás y se descartó: durante ese
período el sitio afirmaba en su FAQ que se pedía la autorización biométrica en
pantalla, cosa que no era cierta, así que una fecha anterior habría declarado que
todo esto ya regía justo cuando había una afirmación falsa publicada. Esa
afirmación ya se corrigió. Se menciona por transparencia, no porque quede nada
pendiente.

## 4. Lo que el documento deliberadamente NO promete

Porque el producto no lo hace, y prometerlo sería prueba en contra:

- No promete borrado automático de la ficha, contratos, novedades ni soportes.
- No promete que el retiro de un trabajador elimine sus datos.
- No promete cifrado de los datos sensibles en reposo.
- No promete un plazo de conservación de los registros técnicos del servidor.
`;

writeFileSync(process.argv[2], doc, 'utf8');
console.log('escrito:', process.argv[2], doc.length, 'caracteres');
