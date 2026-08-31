/**
 * Service des offres d'emploi : toutes les fonctions qui appellent l'API.
 *
 * Les composants React n'utilisent JAMAIS Axios directement : ils importent
 * ces fonctions. Si une URL change, il n'y a qu'un seul fichier à modifier.
 */
import api from './axiosClient';

/* --- Côté candidat (routes publiques) --- */

/**
 * Liste des offres publiées.
 * @param {object} filtres - { motCle, typeContrat, lieu, page, limite }
 * @returns { offres, total, page, totalPages }
 */
export const getOffres = async (filtres = {}) => {
  const reponse = await api.get('/offres', { params: filtres });
  return reponse.data;
};

/** Valeurs disponibles pour les listes déroulantes de recherche. */
export const getOptionsDeFiltre = async () => {
  const reponse = await api.get('/offres/filtres');
  return reponse.data;
};

/** Détail d'une offre publiée. */
export const getOffreById = async (id) => {
  const reponse = await api.get(`/offres/${id}`);
  return reponse.data;
};

/* --- Côté RH (routes protégées par le jeton JWT) --- */

/** Chiffres clés du tableau de bord. */
export const getStatistiques = async () => {
  const reponse = await api.get('/rh/statistiques');
  return reponse.data;
};

/** Toutes les offres (publiées + archivées) avec le nombre de candidatures. */
export const getOffresRh = async (filtres = {}) => {
  const reponse = await api.get('/rh/offres', { params: filtres });
  return reponse.data;
};

/** Détail d'une offre côté RH (utilisé pour pré-remplir le formulaire d'édition). */
export const getOffreRhById = async (id) => {
  const reponse = await api.get(`/rh/offres/${id}`);
  return reponse.data;
};

/** Création d'une offre. */
export const creerOffre = async (offre) => {
  const reponse = await api.post('/rh/offres', offre);
  return reponse.data;
};

/** Modification d'une offre existante. */
export const modifierOffre = async (id, offre) => {
  const reponse = await api.put(`/rh/offres/${id}`, offre);
  return reponse.data;
};

/**
 * Archive une offre, ou la republie si `statut` vaut 'Publiée'.
 * Archiver = rendre invisible côté candidat, sans rien supprimer.
 */
export const archiverOffre = async (id, statut) => {
  const reponse = await api.patch(`/rh/offres/${id}/archiver`, { statut });
  return reponse.data;
};

/** Suppression définitive d'une offre (et de ses candidatures). */
export const supprimerOffre = async (id) => {
  const reponse = await api.delete(`/rh/offres/${id}`);
  return reponse.data;
};
