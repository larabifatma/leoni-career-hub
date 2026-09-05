/**
 * Routes PRIVEES du Responsable RH — préfixe /api/rh
 *
 * `router.use(verifierAuth)` applique le middleware d'authentification à
 * TOUTES les routes déclarées ci-dessous : une requête sans jeton JWT valide
 * est rejetée avec un code 401 avant même d'atteindre un contrôleur.
 * C'est l'exigence de sécurité de la section 4.1 du cahier des charges.
 */
import express from 'express';
import { verifierAuth } from '../middlewares/auth.middleware.js';
import {
  listerOffresRh,
  detailOffreRh,
  creerOffre,
  modifierOffre,
  archiverOffre,
  supprimerOffre,
  statistiques,
} from '../controllers/offres.controller.js';
import {
  listerCandidatures,
  candidaturesParOffre,
  detailCandidature,
  lienCv,
  changerStatut,
  relancerAnalyse,
} from '../controllers/candidatures.controller.js';

const router = express.Router();

// Barrière de sécurité : tout ce qui suit exige un jeton JWT valide.
router.use(verifierAuth);

/* --- Tableau de bord --- */
router.get('/statistiques', statistiques);            // chiffres clés du dashboard

/* --- Gestion des offres (F10 à F14) --- */
router.get('/offres', listerOffresRh);                // liste complète + nb de candidatures
router.post('/offres', creerOffre);                   // créer une offre
router.get('/offres/:id', detailOffreRh);             // détail (pour le formulaire d'édition)
router.put('/offres/:id', modifierOffre);             // modifier une offre
router.patch('/offres/:id/archiver', archiverOffre);  // archiver / republier
router.delete('/offres/:id', supprimerOffre);         // supprimer définitivement

/* --- Gestion des candidatures (F15 à F18) --- */
router.get('/offres/:id/candidatures', candidaturesParOffre); // candidatures d'une offre
router.post('/offres/:id/analyser', relancerAnalyse);         // (re)lancer le Matching IA
router.get('/candidatures', listerCandidatures);              // toutes, avec filtres
router.get('/candidatures/:id', detailCandidature);           // détail d'une candidature
router.get('/candidatures/:id/cv', lienCv);                   // lien temporaire vers le CV
router.patch('/candidatures/:id/statut', changerStatut);      // En attente / Accepté / Refusé

export default router;
