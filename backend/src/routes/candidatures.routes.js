/**
 * Routes PUBLIQUES des candidatures — préfixe /api/candidatures
 *
 * La soumission d'une candidature est rattachée à l'offre concernée
 * (POST /api/offres/:id/candidatures, voir offres.routes.js), conformément
 * à la section 7.4 du cahier des charges.
 *
 * Ce fichier ne conserve donc qu'une route de vérification de service.
 * Toutes les opérations RH sur les candidatures sont dans rh.routes.js.
 */
import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API Candidatures opérationnelle.',
    info: 'Pour postuler : POST /api/offres/:id/candidatures',
  });
});

export default router;
