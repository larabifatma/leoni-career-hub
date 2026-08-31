/**
 * Routes PUBLIQUES des offres — préfixe /api/offres
 * Accessibles à tout visiteur, sans authentification.
 */
import express from 'express';
import {
  listerOffresPubliques,
  detailOffrePublique,
  optionsDeFiltre,
} from '../controllers/offres.controller.js';
import { creerCandidature } from '../controllers/candidatures.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = express.Router();

// GET /api/offres — liste des offres publiées, avec recherche et pagination (F01, F02)
router.get('/', listerOffresPubliques);

// GET /api/offres/filtres — valeurs disponibles pour les listes déroulantes (F02).
// IMPORTANT : déclarée avant '/:id', sinon Express lirait "filtres" comme un identifiant.
router.get('/filtres', optionsDeFiltre);

// GET /api/offres/:id — détail d'une offre (F03)
router.get('/:id', detailOffrePublique);

// POST /api/offres/:id/candidatures — postuler avec dépôt du CV (F04, F05)
// `upload.single('cv')` traite le champ fichier nommé "cv" du formulaire.
router.post('/:id/candidatures', upload.single('cv'), creerCandidature);

export default router;
