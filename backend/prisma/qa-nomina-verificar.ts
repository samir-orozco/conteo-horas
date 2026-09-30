// ────────── LO QUE DEBE DAR LA NOMINA DE SEPTIEMBRE, Y LO QUE DA ──────────
//
// Hermano de `qa-nomina-septiembre.ts`: aquel siembra los casos, este pide la liquidacion por las
// RUTAS REALES y la imprime al lado de lo que se calculo A MANO (CLAUDE.md §5.2). Solo lee.
//
// EL COTEJO, hecho a mano el 30 de septiembre de 2026 y comprobado contra esta misma salida:
//
//   ANA (horario fijo L-V 8-17, almuerzo 60 min, tolerancia 10 min; su descanso es el DOMINGO)
//     HOD  73,92 h  = 8 (d1) + 7,58 (d2, llega 8:25) + 7,33 (d3, llega 8:40) + 3 (d4, se va a
//                     almorzar y no vuelve: 4 h menos el almuerzo fijo) + 10 (d7, hasta 19:30)
//                     + 8x4 (d9, d10, d14, d15) + 6 (d11, sale a las 15:00)
//     HON    0,5 h  = d7 de 19:00 a 19:30. El nocturno empieza a las 7 p.m. (Ley 2466).
//     HDD     15 h  = 7 (d8, FESTIVO: 8 h menos el almuerzo, porque el martes es dia de su horario)
//                     + 8 (d13, DOMINGO, que es su descanso y no lleva almuerzo que descontar)
//     EXTRAS   0    = ninguna semana pasa de 42 h ordinarias.
//     TARDANZAS: UN dia, 15 min. El d2 llega 25 min tarde menos 10 de tolerancia. El d3 llega 40 min
//                tarde y NO cuenta: tiene permiso medico de 8 a 9.
//     AUXILIO 80.000 = 200.000 x 12 dias de 30.
//
//   BRUNO (sin horario, noches 22:00-06:00; su descanso es el MIERCOLES, marcado en la programacion)
//     HON     72 h  \ 88 h en total, que son sus 11 turnos de 8 h.
//     HND     16 h  / = 6 (madrugada del mie 2) + 8 (turno del mar 8, que es FESTIVO entero, mas la
//                     madrugada del mie 9) + 2 (noche del mie 9, de 22:00 a 24:00)
//     EL CASO QUE IMPORTA: los domingos 6 y 13 salen HON, NO dominical. Su descanso es el miercoles,
//     y «cuando este Codigo haga referencia a dominical, se entendera que trata de dia de descanso
//     obligatorio» (Ley 2466 de 2025, art. 14, paragrafo 2°). Si algun dia salen HND, el motor se
//     rompio.
//     TARDANZAS: ninguna. Sin horario no hay hora de entrada contra la que medir.
//     SALDO 0: por lo mismo.
import { writeFileSync } from 'fs';
import { prisma } from '../src/prisma';
import { montarApp } from './app-en-proceso';

const SALIDA = process.argv[2];

async function main() {
  const { app, tokenAdmin } = await montarApp();
  const empresa = await prisma.empresa.findFirst({ where: { nombre: 'Seguridad Andina Ltda' }, select: { id: true } });
  if (!empresa) { console.log('no esta la empresa'); return; }
  const tok = { authorization: `Bearer ${tokenAdmin(empresa.id)}` };
  const leer = async <T>(url: string): Promise<T> => {
    const r = await app.inject({ method: 'GET', url, headers: tok });
    if (r.statusCode !== 200) throw new Error(`${url}: ${r.statusCode} ${r.body}`);
    return r.json<T>();
  };

  const RANGO = 'desde=2026-09-01&hasta=2026-09-30';
  const nomina = await leer<{ colaboradores: any[]; horasMes: number; jornadaSemanal: number }>(`/api/reportes/nomina?${RANGO}`);
  const qa = nomina.colaboradores.filter((c: any) => String(c.cedula).startsWith('88'));
  console.log(`jornada semanal ${nomina.jornadaSemanal} h · horas mes ${nomina.horasMes}\n`);

  for (const c of qa) {
    console.log(`━━━━ ${c.nombre} ${c.apellido} · ${c.cargo} · salario ${c.salarioMensual.toLocaleString('es-CO')} · valor hora ${c.valorHora.toLocaleString('es-CO')}`);
    console.log(`     dias con marcacion ${c.diasCont} · marcaciones cerradas ${c.registrosCont} · auxilio ${Math.round(c.auxilioTransporte).toLocaleString('es-CO')}`);
    for (const l of c.liquidacion.filter((l: any) => l.horas > 0)) {
      console.log(`     ${l.codigo.padEnd(5)} ${String(l.horas).padStart(7)} h  x${l.recargo}  ${l.nombre}`);
    }
    console.log(`     recargos ${Math.round(c.totalRecargos).toLocaleString('es-CO')} · extras ${Math.round(c.totalExtra).toLocaleString('es-CO')} · TOTAL ADICIONAL ${Math.round(c.totalAdicional).toLocaleString('es-CO')}`);

    const t = await leer<any>(`/api/reportes/tardanzas?colaboradorId=${c.colaboradorId}&${RANGO}`);
    console.log(`     TARDANZAS: ${t.diasTarde} dia(s), ${t.totalMinutos} min${t.sinHorario ? ' (sin horario: no se miden)' : ''}`);
    for (const d of (t.detalle ?? []).slice(0, 12)) {
      console.log(`       ${String(d.fecha).slice(0, 10)} · esperada ${d.horaEsperada} · llego ${d.horaLlegada} · ${d.minutosTarde} min cobrables (tolerancia ${d.toleranciaMin})`);
    }
    const liq = await leer<any>(`/api/reportes/liquidacion?colaboradorId=${c.colaboradorId}&${RANGO}`);
    const s = liq.saldo;
    if (s) console.log(`     SALDO: esperados ${s.minutosEsperados} min · trabajados ${s.minutosTrabajados} min · saldo ${s.minutosSaldo} min`);
    console.log();
  }

  if (SALIDA) {
    writeFileSync(SALIDA, JSON.stringify({ personas: qa, periodo: { desde: '2026-09-01', hasta: '2026-09-30' } }, null, 2));
    console.log('respuesta guardada en', SALIDA);
  }
}
main().finally(() => prisma.$disconnect());
