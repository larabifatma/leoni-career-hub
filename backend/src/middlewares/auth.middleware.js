/**
 * Middleware d'authentification (F08 / F09).
 *
 * Il s'exécute AVANT les contrôleurs des routes privées `/api/rh/...`.
 * Rôle : vérifier que la requête contient un jeton JWT valide dans l'en-tête
 *        `Authorization: Bearer <token>`.
 *
 * - Pas de jeton      -> 401 (non authentifié)
 * - Jeton invalide    -> 401
 * - Jeton expiré      -> 401 avec un message explicite (le frontend déconnecte)
 * - Jeton valide      -> on stocke les infos du RH dans `req.rh` et on continue.
 */
import jwt from 'jsonwebtoken';

export const verifierAuth = (req, res, next) => {
  const enTete = req.headers.authorization;

  // L'en-tête doit avoir la forme : "Bearer eyJhbGciOi..."
  if (!enTete || !enTete.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès refusé : jeton d\'authentification manquant.' });
  }

  const token = enTete.split(' ')[1];

  try {
    const donnees = jwt.verify(token, process.env.JWT_SECRET);
    req.rh = donnees; // { id_rh, email, nom, prenom } — disponible dans les contrôleurs
    next(); // tout est bon : on passe à la suite
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée, merci de vous reconnecter.' });
    }
    return res.status(401).json({ error: 'Jeton d\'authentification invalide.' });
  }
};
