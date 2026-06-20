import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuempresa.conteohoras',
  appName: 'Conteo Horas',
  webDir: 'dist',
  server: {
    // En producción, apunta a tu VPS
    url: 'http://TU_IP_VPS',
    cleartext: true,
  },
};

export default config;
