// Exporta datos a un archivo que Excel abre nativamente (.xls basado en HTML,
// sin dependencias). Los números van crudos para que Excel pueda sumarlos.
type Celda = string | number;

const esc = (v: Celda) => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function descargarExcel(nombreArchivo: string, titulo: string, columnas: string[], filas: Celda[][]) {
  const th = columnas.map(c => `<th style="background:#303030;color:#fff;padding:6px 10px;border:1px solid #bbb;text-align:left">${esc(c)}</th>`).join('');
  const cuerpo = filas.map(f => `<tr>${f.map(c => {
    const num = typeof c === 'number';
    return `<td style="padding:5px 10px;border:1px solid #ddd" ${num ? '' : ''}>${esc(c)}</td>`;
  }).join('')}</tr>`).join('');
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="utf-8"></head><body>` +
    `<h3 style="font-family:sans-serif">${esc(titulo)}</h3>` +
    `<table><thead><tr>${th}</tr></thead><tbody>${cuerpo}</tbody></table>` +
    `</body></html>`;

  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.xls') ? nombreArchivo : `${nombreArchivo}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
