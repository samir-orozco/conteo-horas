// Qué paga un DOMINGO trabajado, según de dónde salga el día de descanso de esa persona.
// Solo lee catálogos (tipos de hora y jornadas); no escribe nada. Ver CLAUDE.md §8.6.
import { PrismaClient } from '@prisma/client';
import { liquidarRegistros } from '../src/utils/liquidarRegistros';
import { construirExtraConfig } from '../src/utils/tardanzas';
import { fuenteDelDescansoDe } from '../src/utils/descansoDelHorario';

const prisma = new PrismaClient();

(async () => {
  const tipos = await prisma.tipoHora.findMany();
  const jornadas = await prisma.jornadaVigencia.findMany();
  // Domingo 6 de septiembre de 2026, 8:00 a 17:00 en Bogotá (UTC-5), en UTC explícito (§8.1).
  const bog = (d: number, h: number) => new Date(Date.UTC(2026, 8, d, h + 5, 0, 0));
  const reg = [{ id: 'x', fecha: bog(6, 0), entrada: bog(6, 8), salida: bog(6, 17) }];
  const extra = construirExtraConfig('SEMANAL', null, []);
  const salario = 1_623_500, horasMes = 210;   // 42 h/semana desde el 15/07/2026

  const correr = (etiqueta: string, horario: any, dias: any[]) => {
    const r: any = liquidarRegistros(reg as any, horario, extra, [], tipos, jornadas,
      salario, horasMes, true, dias, fuenteDelDescansoDe(horario));
    const filas = (r.liquidacion ?? []).filter((f: any) => Number(f.horas) > 0);
    const total = Math.round(r.totalRecargos ?? 0);
    console.log(`\n${etiqueta}`);
    for (const f of filas) console.log(`    ${f.codigo.padEnd(5)} ${String(f.horas).padStart(4)} h`);
    console.log(`    recargo: $${total.toLocaleString('es-CO')}`);
    return total;
  };

  const dia = (esDescanso: boolean | null) =>
    [{ fecha: bog(6, 0), esDescanso, horaEntrada: null, horaSalida: null,
       tieneAlmuerzo: false, programado: true } as any];
  const lunesASabado = { franjas: [{ dias: ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'] }] };

  console.log('DOMINGO 06/09/2026, 9 h, salario mínimo. Qué recargo paga:');
  const a = correr('  [1] sin horario, semana SIN programar  -> presunción legal', null, []);
  const b = correr('  [2] sin horario, semana programada con MIÉRCOLES', null, dia(false));
  const c = correr('  [3] con horario de lunes a sábado      -> le sobra el domingo', lunesASabado, []);

  console.log('\nLo que tiene que pasar:');
  console.log(`  [1] paga  ${a > 0 ? 'OK' : 'MAL'}   el domingo es su descanso mientras nadie programe`);
  console.log(`  [2] NO paga ${b === 0 ? 'OK' : 'MAL'}  la programación se lo llevó al miércoles`);
  console.log(`  [3] paga  ${c > 0 ? 'OK' : 'MAL'}   sus franjas dejan libre el domingo`);
  await prisma.$disconnect();
})();
