/**
 * Middleware d'upload du CV (F05).
 *
 * Multer intercepte les requêtes `multipart/form-data` :
 *  - les champs texte se retrouvent dans `req.body`
 *  - le fichier se retrouve dans `req.file`
 *
 * On utilise `memoryStorage` : le fichier n'est PAS écrit sur le disque du serveur,
 * il reste en mémoire (`req.file.buffer`) le temps d'être envoyé à Supabase Storage.
 */
import multer from 'multer';

/** Formats acceptés : PDF et Word (.doc / .docx) — conforme au cahier des charges F05. */
const TYPES_AUTORISES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Taille maximale d'un CV : 5 Mo. */
export const TAILLE_MAX_CV = 5 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX_CV },
  fileFilter: (req, file, cb) => {
    if (TYPES_AUTORISES.includes(file.mimetype)) {
      cb(null, true); // fichier accepté
    } else {
      // L'erreur est récupérée par le middleware de gestion des erreurs (erreur.middleware.js)
      cb(new Error('Format de fichier non supporté : seuls le PDF et le Word sont acceptés.'));
    }
  },
});
