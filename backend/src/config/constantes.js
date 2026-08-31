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
