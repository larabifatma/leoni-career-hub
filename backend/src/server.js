/**
 * Point d'entrée du backend : démarre le serveur HTTP.
 * Lancement en développement : npm run dev
 */
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
});
