import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // 401 = sesión vencida → volver al login. Excepción: el 401 del propio
    // intento de login (credenciales malas) debe mostrarse en el formulario,
    // no recargar la página (la recarga borraba el mensaje de error).
    const esIntentoLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !esIntentoLogin) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
