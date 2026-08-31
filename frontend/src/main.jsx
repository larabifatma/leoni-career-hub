/**
 * Point d'entrée du frontend React.
 * Vite charge ce fichier depuis index.html et affiche <App /> dans la div #root.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode signale en développement les pratiques React déconseillées.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
