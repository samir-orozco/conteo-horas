import { useState } from 'react';
import { vincularDispositivo } from './api';

// Autorización del dispositivo (si la empresa exige dispositivos vinculados). El
// deviceToken se guarda en localStorage de la tablet. `onVinculado` lo dispara el
// padre para reiniciar la cámara/login tras vincular.
export function useVinculoDispositivo(marcadorToken: string | undefined, onVinculado: () => void) {
  const claveDispositivo = `hp_kiosco_${marcadorToken}`;
  const [requiereVinculo, setRequiereVinculo] = useState(false);
  const [codigoVinculo, setCodigoVinculo] = useState('');
  const [errorVinculo, setErrorVinculo] = useState('');
  const [vinculando, setVinculando] = useState(false);

  const getDeviceToken = () => localStorage.getItem(claveDispositivo) ?? undefined;
  const olvidarDispositivo = () => localStorage.removeItem(claveDispositivo);

  const vincular = async (e: React.FormEvent) => {
    e.preventDefault();
    setVinculando(true);
    setErrorVinculo('');
    try {
      const r = await vincularDispositivo(marcadorToken!, codigoVinculo);
      localStorage.setItem(claveDispositivo, r.deviceToken);
      setRequiereVinculo(false);
      setCodigoVinculo('');
      onVinculado();
    } catch (err: any) {
      setErrorVinculo(err.response?.data?.error ?? 'Código inválido');
    } finally {
      setVinculando(false);
    }
  };

  return {
    claveDispositivo, requiereVinculo, setRequiereVinculo, codigoVinculo, setCodigoVinculo,
    errorVinculo, setErrorVinculo, vinculando, vincular, getDeviceToken, olvidarDispositivo,
  };
}
