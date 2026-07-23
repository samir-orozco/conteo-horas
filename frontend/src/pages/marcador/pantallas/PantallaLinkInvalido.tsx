import { Link2Off } from 'lucide-react';

export default function PantallaLinkInvalido() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <Link2Off size={40} className="mx-auto mb-4 text-white/40" />
        <h1 className="text-xl font-bold text-white mb-2">Link de marcación inválido</h1>
        <p className="text-sm text-white/50">Pide a tu administrador el link del marcador de tu empresa.</p>
      </div>
    </div>
  );
}
