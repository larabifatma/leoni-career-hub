/**
 * Protège les pages de l'espace RH (F08).
 *
 * Si aucun jeton n'est présent dans le navigateur, l'utilisateur est
 * immédiatement redirigé vers la page de connexion.
 *
 * Remarque : ce contrôle est un confort d'affichage. La vraie sécurité est
 * assurée côté backend par le middleware `verifierAuth`, car un utilisateur
 * malveillant pourrait toujours modifier le code exécuté dans son navigateur.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { estConnecte } from '../services/auth';
import LayoutRH from './LayoutRH';

function RouteProtegee() {
  if (!estConnecte()) {
    // `replace` évite que le bouton "retour" ramène sur la page protégée.
    return <Navigate to="/rh/connexion" replace />;
  }

  return (
    <LayoutRH>
      <Outlet />
    </LayoutRH>
  );
}

export default RouteProtegee;
