// Composición geométrica animada con la paleta HoraPro (amarillo / grafito / gris).
// Se usa en el hero de la landing y en el panel del registro.
export default function GeoArt({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      {/* Círculo grande amarillo */}
      <div className="hp-float absolute -left-10 top-10 w-40 h-40 rounded-full bg-primary" style={{ animationDelay: '0s' }} />
      {/* Semicírculo grafito */}
      <div className="hp-float-slow absolute right-8 top-6 w-28 h-14 bg-ink" style={{ borderRadius: '999px 999px 0 0', animationDelay: '.4s' }} />
      {/* Cuarto de círculo gris (contorno) */}
      <div className="hp-float absolute right-16 top-40 w-24 h-24 border-2 border-muted/50" style={{ borderRadius: '0 100% 0 0', animationDelay: '1.1s' }} />
      {/* Hoja amarilla suave */}
      <div className="hp-float-slow absolute left-16 top-48 w-24 h-24 bg-primary/60" style={{ borderRadius: '100% 0 100% 0', animationDelay: '.7s' }} />
      {/* Círculo pequeño grafito */}
      <div className="hp-float absolute left-40 top-24 w-12 h-12 rounded-full bg-ink/85" style={{ animationDelay: '1.6s' }} />
      {/* Anillo amarillo que gira lento */}
      <div className="hp-spin-slow absolute right-4 bottom-16 w-32 h-32 rounded-full border-[10px] border-primary/70" />
      {/* Cuarto de círculo amarillo relleno */}
      <div className="hp-float absolute left-6 bottom-10 w-28 h-28 bg-primary" style={{ borderRadius: '0 100% 0 0', animationDelay: '.9s' }} />
      {/* Semicírculo gris suave */}
      <div className="hp-float-slow absolute right-28 bottom-8 w-24 h-12 bg-muted/30" style={{ borderRadius: '0 0 999px 999px', animationDelay: '1.3s' }} />
      {/* Puntito */}
      <div className="hp-float absolute left-1/2 top-12 w-5 h-5 rounded-full bg-ink" style={{ animationDelay: '2s' }} />
    </div>
  );
}
