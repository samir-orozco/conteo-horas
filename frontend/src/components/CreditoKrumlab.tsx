// Crédito del desarrollador — el año se calcula solo
export default function CreditoKrumlab({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-muted ${className}`}>
      <a href="https://krumlab.com/" target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
        Desarrollado por © Krumlab {new Date().getFullYear()}
      </a>
    </p>
  );
}
