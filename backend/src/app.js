/**
 * Configuration générale de l'application Express.
 *
 * Ce fichier assemble les briques dans l'ordre où elles s'exécutent :
 *   1. middlewares globaux (CORS, lecture du JSON)
 *   2. routes de l'API
 *   3. gestion des erreurs (toujours en dernier)
 *
 * Le démarrage du serveur se fait dans server.js : cette séparation permet de
 * tester l'application sans ouvrir de port réseau.
 */
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import offresRoutes from './routes/offres.routes.js';
import candidaturesRoutes from './routes/candidatures.routes.js';
import rhRoutes from './routes/rh.routes.js';
import { routeIntrouvable, gestionErreurs } from './middlewares/erreur.middleware.js';

const app = express();

/* --- 1. Middlewares globaux --- */
// CORS autorise le frontend React (port 5173) à appeler cette API (port 5000).
app.use(cors());
// Transforme automatiquement le corps JSON des requêtes en objet `req.body`.
app.use(express.json());

/* --- 2. Routes de l'API --- */
app.get('/', (req, res) => {
  res.json({ message: 'API Portail Carrière opérationnelle.' });
});

app.use('/api/auth', authRoutes);                 // public : connexion RH
app.use('/api/offres', offresRoutes);             // public : offres + candidater
app.use('/api/candidatures', candidaturesRoutes); // public : information
app.use('/api/rh', rhRoutes);                     // privé  : espace Responsable RH

/* --- 3. Gestion des erreurs (obligatoirement en dernier) --- */
app.use(routeIntrouvable);
app.use(gestionErreurs);

export default app;
