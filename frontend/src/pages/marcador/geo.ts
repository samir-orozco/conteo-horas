// Helpers puros de geolocalización del kiosco (geocerco).
export const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

export type MensajeGeo = { titulo: string; ayuda: string };

// Traduce el error de geolocalización a un mensaje claro y accionable.
export function mensajeGeo(e: any): MensajeGeo {
  switch (e?.code) {
    case 1: // PERMISSION_DENIED
      return {
        titulo: 'Permite tu ubicación para marcar',
        ayuda: esIOS
          ? 'Toca "aA" (o el ícono junto a la dirección) → Ajustes del sitio → Ubicación → Permitir. También revisa que el navegador tenga acceso a la ubicación en Ajustes del teléfono. Luego reintenta.'
          : 'Toca el candado junto a la dirección del navegador → Permisos → Ubicación → Permitir. Luego reintenta.',
      };
    case 2: // POSITION_UNAVAILABLE (normalmente ubicación apagada)
      return {
        titulo: 'Activa la ubicación de tu teléfono',
        ayuda: 'Enciende el GPS/Ubicación: desliza desde arriba y toca el ícono de Ubicación (o entra a Ajustes → Ubicación). Luego reintenta.',
      };
    case 3: // TIMEOUT
      return {
        titulo: 'No pudimos ubicarte',
        ayuda: 'Verifica que tengas señal o acércate a una ventana/lugar abierto, y reintenta.',
      };
    default:
      return {
        titulo: 'Tu navegador no permite ubicación',
        ayuda: 'Abre el kiosco en Chrome o Safari actualizado e intenta de nuevo.',
      };
  }
}

// Opciones comunes: alta precisión, espera hasta 15s, admite una ubicación reciente.
export const OPC_GEO: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 };
