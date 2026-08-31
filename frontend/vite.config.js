import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration de Vite (outil de développement du frontend React).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // adresse du site en développement : http://localhost:5173
    open: true, // ouvre automatiquement le navigateur au démarrage
  },
});
