/**
 * Instance Axios unique, utilisée par tous les autres fichiers de services/.
 *
 * Elle centralise trois choses :
 *   1. l'adresse de l'API (lue dans frontend/.env, variable VITE_API_URL)
 *   2. l'ajout automatique du jeton JWT sur chaque requête (espace RH)
 *   3. la déconnexion automatique si le serveur répond 401 (jeton expiré, F09)
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** Clés utilisées pour conserver la session RH dans le navigateur. */
export const CLE_TOKEN = 'portail_token';
export const CLE_RH = 'portail_rh';

/**
 * Intercepteur de REQUÊTE : s'exécute avant chaque appel.
 * Si un jeton est stocké, on l'ajoute dans l'en-tête Authorization.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(CLE_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Intercepteur de RÉPONSE : s'exécute après chaque appel.
 * - 401 = jeton absent, invalide ou expiré -> on vide la session et on
 *   renvoie l'utilisateur vers la page de connexion.
 * - Sinon on remonte un message d'erreur lisible (celui envoyé par l'API).
 */
api.interceptors.response.use(
  (reponse) => reponse,
  (erreur) => {
    const estSurLaPageConnexion = window.location.pathname === '/rh/connexion';

    if (erreur.response?.status === 401 && !estSurLaPageConnexion) {
      localStorage.removeItem(CLE_TOKEN);
      localStorage.removeItem(CLE_RH);
      window.location.href = '/rh/connexion';
    }

    // On remplace le message technique d'Axios par le message métier de l'API.
    const message =
      erreur.response?.data?.error ||
      erreur.response?.data?.message ||
      "Impossible de contacter le serveur. Vérifiez que le backend est démarré.";

    return Promise.reject(new Error(message));
  }
);

export default api;
