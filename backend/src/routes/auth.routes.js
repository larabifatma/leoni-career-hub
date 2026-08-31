/**
 * Routes d'authentification — préfixe /api/auth
 *
 * Un fichier de routes ne contient QUE les URLs et le contrôleur associé.
 * Toute la logique se trouve dans controllers/auth.controller.js.
 *
 * Conformément au cahier des charges (F08bis), il n'existe AUCUNE route
 * d'inscription : le compte RH unique est créé par le script de seeding.
 */
import express from 'express';
import { connexion, profil } from '../controllers/auth.controller.js';
import { verifierAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /api/auth/login — connexion du Responsable RH (public)
router.post('/login', connexion);

// GET /api/auth/profil — vérifie que le jeton stocké est toujours valide (privé)
router.get('/profil', verifierAuth, profil);

export default router;
