/**
 * Gestion centralisée des erreurs (bonne pratique, section 7.5 du cahier des charges).
 *
 * Deux middlewares placés à la FIN de app.js :
 *  1. `routeIntrouvable` : aucune route ne correspond -> 404 propre en JSON.
 *  2. `gestionErreurs`   : toute erreur levée dans l'application -> réponse JSON uniforme.
 */
import multer from 'multer';
import { TAILLE_MAX_CV } from './upload.middleware.js';

/** Route inexistante : on renvoie du JSON, pas la page HTML par défaut d'Express. */
export const routeIntrouvable = (req, res) => {
  res.status(404).json({ error: `Route introuvable : ${req.method} ${req.originalUrl}` });
};

/**
 * Middleware d'erreur Express : reconnaissable à ses 4 paramètres (err, req, res, next).
 * Express l'appelle automatiquement dès qu'une erreur est levée ou passée à `next(err)`.
 */
export const gestionErreurs = (err, req, res, next) => {
  console.error('❌ Erreur :', err.message);

  // Erreurs spécifiques à Multer (upload du CV)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMo = TAILLE_MAX_CV / (1024 * 1024);
      return res.status(400).json({ error: `Le CV est trop volumineux (${maxMo} Mo maximum).` });
    }
    return res.status(400).json({ error: `Erreur lors de l'envoi du fichier : ${err.message}` });
  }

  // Erreur de format levée par le fileFilter de Multer
  if (err.message?.includes('Format de fichier non supporté')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Une erreur interne est survenue.',
  });
};
