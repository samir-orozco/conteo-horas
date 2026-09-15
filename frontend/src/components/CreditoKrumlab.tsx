// Crédito del desarrollador — el año se calcula solo
// `oscuro` es para ponerlo sobre un fondo oscuro, como el pie de la landing: ahí el gris y el
// hover a tinta no se verían.
export default function CreditoKrumlab({ className = '', oscuro = false }: { className?: string; oscuro?: boolean }) {
  return (
    <p className={`text-xs ${oscuro ? 'text-white/50' : 'text-muted'} ${className}`}>
      <a href="https://krumlab.com/" target="_blank" rel="noreferrer" className={`${oscuro ? 'hover:text-white' : 'hover:text-ink'} hover:underline`}>
        Desarrollado por © Krumlab {new Date().getFullYear()}
      </a>
    </p>
  );
}
