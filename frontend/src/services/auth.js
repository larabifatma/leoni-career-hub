/**
 * Service d'authentification du Responsable RH (F08 / F09).
 * La session est conservée dans le localStorage du navigateur :
 * le RH reste connecté même s'il recharge la page.
 */
import api, { CLE_TOKEN, CLE_RH } from './axiosClient';

/** Connexion : envoie email + mot de passe, stocke le jeton reçu. */
export const seConnecter = async (email, motDePasse) => {
  const reponse = await api.post('/auth/login', {
    email,
    mot_de_passe: motDePasse,
  });

  localStorage.setItem(CLE_TOKEN, reponse.data.token);
  localStorage.setItem(CLE_RH, JSON.stringify(reponse.data.rh));

  return reponse.data.rh;
};

/** Déconnexion : on efface simplement la session locale. */
export const seDeconnecter = () => {
  localStorage.removeItem(CLE_TOKEN);
  localStorage.removeItem(CLE_RH);
};

/** Vrai si un jeton est présent (utilisé par le composant RouteProtegee). */
export const estConnecte = () => Boolean(localStorage.getItem(CLE_TOKEN));

/** Infos du RH connecté (nom, prénom, email) pour les afficher dans la barre latérale. */
export const rhConnecte = () => {
  const donnees = localStorage.getItem(CLE_RH);
  return donnees ? JSON.parse(donnees) : null;
};
