import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tabDesdeUrl, urlConTab, type ClaveTab } from './tabs';

// El tab abierto vive en la dirección, y la dirección manda.
//
// No es un detalle de implementación: la campana de avisos navega a
// `?tab=contratos` cuando un contrato está por vencer. Si el tab se leyera solo
// al montar, ese clic no haría nada cuando ya se está viendo esa ficha, ni al
// saltar de una persona a otra (la ruta cambia de parámetro, no de componente,
// así que React no vuelve a montar nada).
//
// Se reemplaza la entrada del historial en vez de agregar una: pasar por cinco
// tabs no debería obligar a pulsar atrás cinco veces para salir de la ficha.
export function useTabFicha(): [ClaveTab, (t: ClaveTab) => void] {
  const [params, setParams] = useSearchParams();
  const tab = tabDesdeUrl(params.toString());

  const cambiar = useCallback((t: ClaveTab) => {
    setParams(urlConTab(params.toString(), t), { replace: true });
  }, [params, setParams]);

  return [tab, cambiar];
}
