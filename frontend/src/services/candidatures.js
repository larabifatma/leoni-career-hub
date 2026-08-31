/**
 * Service des candidatures.
 *
 * Particularité : l'envoi d'une candidature contient un FICHIER (le CV).
 * On utilise donc un objet FormData et l'en-tête `multipart/form-data`
 * au lieu du JSON habituel.
 */
import api from './axiosClient';

/* --- Côté candidat (route publique) --- */

/**
 * Envoie une candidature avec le CV (F04 + F05).
 * @param {string} idOffre - identifiant de l'offre concernée
 * @param {object} donnees - champs du formulaire
 * @param {File}   fichierCv - le fichier choisi par le candidat
 */
export const envoyerCandidature = async (idOffre, donnees, fichierCv) => {
  const formData = new FormData();
  formData.append('nom', donnees.nom);
  formData.append('prenom', donnees.prenom);
  formData.append('email', donnees.email);
  formData.append('telephone', donnees.telephone);
  formData.append('diplome', donnees.diplome || '');
  formData.append('faculte', donnees.faculte || '');
  formData.append('lettre_motivation', donnees.lettreMotivation || '');
  formData.append('cv', fichierCv); // le nom 'cv' doit correspondre à upload.single('cv')

  const reponse = await api.post(`/offres/${idOffre}/candidatures`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return reponse.data;
};

/* --- Côté RH (routes protégées) --- */

/** Toutes les candidatures, avec filtres : { statut, idOffre, page }. */
export const getCandidatures = async (filtres = {}) => {
  const reponse = await api.get('/rh/candidatures', { params: filtres });
  return reponse.data;
};

/** Candidatures reçues pour une offre précise : { offre, candidatures, total }. */
export const getCandidaturesParOffre = async (idOffre, filtres = {}) => {
  const reponse = await api.get(`/rh/offres/${idOffre}/candidatures`, { params: filtres });
  return reponse.data;
};

/** Détail complet d'une candidature (candidat + offre + lettre de motivation). */
export const getCandidatureById = async (id) => {
  const reponse = await api.get(`/rh/candidatures/${id}`);
  return reponse.data;
};

/**
 * Récupère une URL signée temporaire pour consulter/télécharger le CV.
 * Le bucket est privé : ce lien n'est valable que quelques minutes.
 */
export const getLienCv = async (id) => {
  const reponse = await api.get(`/rh/candidatures/${id}/cv`);
  return reponse.data;
};

/** Change le statut : 'En attente' | 'Accepté' | 'Refusé' (F17). */
export const changerStatutCandidature = async (id, statut) => {
  const reponse = await api.patch(`/rh/candidatures/${id}/statut`, { statut });
  return reponse.data;
};
