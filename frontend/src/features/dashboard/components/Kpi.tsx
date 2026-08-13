export default function Kpi({ icon: Icon, titulo, valor, detalle, acento }: {
  icon: any; titulo: string; valor: string; detalle: string; acento?: string;
}) {
  return (
    <div className="bg-white rounded-card border border-gray-200 p-5">
      <div className="flex items-center gap-2 text-muted text-sm mb-2">
        <Icon size={16} className={acento} />{titulo}
      </div>
      <p className="text-2xl font-bold text-ink">{valor}</p>
      <p className="text-xs text-muted mt-1">{detalle}</p>
    </div>
  );
}
