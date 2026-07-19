import { useState, useEffect } from 'react';
import { IdCard, ScanFace, AlertTriangle, Check, MapPin, LocateFixed } from 'lucide-react';
import api from '../../lib/api';

// Métodos de marcación del kiosco (las alertas de Telegram viven en Conexiones).
export default function TabMarcacion() {
  const [permiteCedula, setPermiteCedula] = useState(true);
  const [cargado, setCargado] = useState(false);

  // Geolocalización (geocerco)
  const [geoExigir, setGeoExigir] = useState(false);
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');
  const [geoRadio, setGeoRadio] = useState('150');
  const [capturandoGeo, setCapturandoGeo] = useState(false);
  const [guardandoGeo, setGuardandoGeo] = useState(false);
  const [msgGeo, setMsgGeo] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    api.get('/configuracion').then(r => {
      setPermiteCedula(r.data.KIOSCO_PERMITE_CEDULA !== '0');
      setGeoExigir(r.data.GEO_EXIGIR === '1');
      setGeoLat(r.data.GEO_LAT || '');
      setGeoLng(r.data.GEO_LNG || '');
      setGeoRadio(r.data.GEO_RADIO || '150');
      setCargado(true);
    });
  }, []);

  const toggleGeo = async () => {
    const nuevo = !geoExigir;
    if (nuevo && (!geoLat || !geoLng)) {
      setMsgGeo({ tipo: 'error', texto: 'Primero fija la ubicación de la empresa con "Usar mi ubicación actual".' });
      return;
    }
    setGeoExigir(nuevo);
    setMsgGeo(null);
    await api.put('/configuracion', { GEO_EXIGIR: nuevo ? '1' : '0' });
  };

  const capturarUbicacion = () => {
    if (!navigator.geolocation) {
      setMsgGeo({ tipo: 'error', texto: 'Este dispositivo no permite obtener la ubicación.' });
      return;
    }
    setCapturandoGeo(true); setMsgGeo(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoLat(pos.coords.latitude.toFixed(6));
        setGeoLng(pos.coords.longitude.toFixed(6));
        setCapturandoGeo(false);
        setMsgGeo({ tipo: 'ok', texto: `Ubicación capturada (precisión ~${Math.round(pos.coords.accuracy)} m). No olvides guardar.` });
      },
      err => {
        setCapturandoGeo(false);
        setMsgGeo({ tipo: 'error', texto: err.code === 1 ? 'Debes permitir el acceso a la ubicación.' : 'No pudimos obtener la ubicación. Activa el GPS.' });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const guardarGeo = async () => {
    const radio = parseInt(geoRadio, 10);
    if (!geoLat || !geoLng) { setMsgGeo({ tipo: 'error', texto: 'Fija primero la ubicación.' }); return; }
    if (!Number.isFinite(radio) || radio < 20) { setMsgGeo({ tipo: 'error', texto: 'El radio debe ser al menos 20 metros.' }); return; }
    setGuardandoGeo(true); setMsgGeo(null);
    try {
      await api.put('/configuracion', { GEO_LAT: geoLat, GEO_LNG: geoLng, GEO_RADIO: String(radio) });
      setMsgGeo({ tipo: 'ok', texto: 'Ubicación y radio guardados.' });
    } catch {
      setMsgGeo({ tipo: 'error', texto: 'No pudimos guardar.' });
    } finally { setGuardandoGeo(false); }
  };

  const toggleCedula = async () => {
    const nuevo = !permiteCedula;
    setPermiteCedula(nuevo);
    await api.put('/configuracion', { KIOSCO_PERMITE_CEDULA: nuevo ? '1' : '0' });
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Marcación</h1>
        <p className="text-sm text-muted">Cómo se identifican tus colaboradores en el kiosco.</p>
      </div>

      <div className="columns-1 xl:columns-2 gap-6 [&>*]:mb-6 [&>*]:break-inside-avoid">
      <div className="bg-white rounded-card border border-gray-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-ink mb-1 flex items-center gap-2"><IdCard size={17} /> Marcación con cédula</p>
            <p className="text-sm text-muted">
              El colaborador digita su número de cédula para marcar. Si la desactivas,
              el kiosco solo aceptará reconocimiento facial.
            </p>
          </div>
          <button onClick={toggleCedula} disabled={!cargado} role="switch" aria-checked={permiteCedula}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${permiteCedula ? 'bg-primary' : 'bg-gray-200'}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${permiteCedula ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {!permiteCedula && cargado && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Solo podrán marcar los colaboradores con el <b>rostro registrado</b>.
              Verifica que todos lo tengan en su perfil (Colaboradores → Reconocimiento facial).
            </span>
          </div>
        )}

        <div className="border-t border-gray-100 pt-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-ink mb-1 flex items-center gap-2"><ScanFace size={17} /> Reconocimiento facial</p>
            <p className="text-sm text-muted">
              Siempre disponible para quienes tengan su rostro registrado. La verificación
              incluye prueba de vida y guarda una foto como evidencia de cada marcación.
            </p>
          </div>
          <span className="text-xs font-bold bg-green-100 text-green-800 px-3 py-1.5 rounded-full shrink-0">Siempre activo</span>
        </div>
      </div>

      {/* Marcación por ubicación (geocerco GPS) */}
      <div className="bg-white rounded-card border border-gray-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-ink mb-1 flex items-center gap-2"><MapPin size={17} className="text-red-500" /> Marcar solo desde la ubicación de la empresa</p>
            <p className="text-sm text-muted">
              El colaborador podrá marcar desde su teléfono, pero <b>solo si está dentro del radio</b> que definas
              alrededor de la empresa (usa el GPS del dispositivo).
            </p>
          </div>
          <button onClick={toggleGeo} disabled={!cargado} role="switch" aria-checked={geoExigir}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${geoExigir ? 'bg-primary' : 'bg-gray-200'}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${geoExigir ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-muted space-y-1.5">
            <p className="font-semibold text-ink">Cómo configurarlo</p>
            <p>1. <b>Párate en la empresa</b> y presiona "Usar mi ubicación actual".</p>
            <p>2. Ajusta el <b>radio</b> permitido (recomendado 100–150 m; el GPS no es exacto).</p>
            <p>3. <b>Guarda</b> y activa el interruptor de arriba.</p>
          </div>

          <button onClick={capturarUbicacion} disabled={capturandoGeo}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60">
            <LocateFixed size={15} /> {capturandoGeo ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Latitud</label>
              <input value={geoLat} onChange={e => setGeoLat(e.target.value)} placeholder="—"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Longitud</label>
              <input value={geoLng} onChange={e => setGeoLng(e.target.value)} placeholder="—"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Radio permitido (metros)</label>
            <input type="number" min={20} step={10} value={geoRadio} onChange={e => setGeoRadio(e.target.value)}
              className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <button onClick={guardarGeo} disabled={guardandoGeo}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg disabled:opacity-60">
            {guardandoGeo ? 'Guardando...' : 'Guardar ubicación'}
          </button>

          {msgGeo && (
            <p className={`flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 ${msgGeo.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {msgGeo.tipo === 'ok' && <Check size={15} />}{msgGeo.texto}
            </p>
          )}

          <p className="text-xs text-muted flex items-start gap-1.5">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
            El GPS se puede falsear con apps de ubicación falsa. Es un buen control, no infalible; combínalo con el reconocimiento facial.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
