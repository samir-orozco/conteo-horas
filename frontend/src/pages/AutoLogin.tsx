import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AutoLogin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      navigate('/app', { replace: true });
    }
  }, []);
  return <div className="min-h-screen flex items-center justify-center"><p>Iniciando sesión...</p></div>;
}
