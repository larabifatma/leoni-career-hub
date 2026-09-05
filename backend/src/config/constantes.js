/**
 * Constantes métier partagées par les contrôleurs.
 * Les regrouper ici évite les "chaînes magiques" dispersées dans le code.
 */

/** Statuts possibles d'une offre (table Offre, colonne `statut`). */
export const STATUTS_OFFRE = {
  PUBLIEE: 'Publiée',
  ARCHIVEE: 'Archivée',
};

/** Statuts possibles d'une candidature (table Candidature, colonne `statut`). */
export const STATUTS_CANDIDATURE = {
  EN_ATTENTE: 'En attente',
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
};

/** Liste utilisée pour valider la valeur envoyée par le frontend RH (F17). */
export const STATUTS_CANDIDATURE_VALIDES = Object.values(STATUTS_CANDIDATURE);

/** Nombre d'éléments par page par défaut (pagination, section 4.3 du cahier des charges). */
export const TAILLE_PAGE_DEFAUT = 10;

/** Durée de validité d'une URL signée de téléchargement de CV (en secondes). */
export const DUREE_URL_CV = 60 * 5; // 5 minutes

/**
 * Seuils de classement du score de Matching IA (0 à 100).
 * Utilisés côté backend pour la répartition affichée sur le tableau de bord RH,
 * et côté frontend pour la couleur des badges.
 */
export const SEUILS_SCORE_IA = {
  ELEVE: 75,  // > 75  : profil qualifié   (badge vert)
  MODERE: 50, // 50-75 : profil à valider  (badge orange)
  // < 50 : profil écarté (badge rouge)
};
