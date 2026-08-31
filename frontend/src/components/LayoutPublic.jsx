/**
 * Gabarit des pages publiques : en-tête + contenu + pied de page.
 * `<Outlet />` est l'emplacement où React Router affiche la page courante.
 */
import { Outlet } from 'react-router-dom';
import Entete from './Entete';
import PiedDePage from './PiedDePage';

function LayoutPublic() {
  return (
    <div className="page">
      <Entete />
      <main className="contenu">
        <Outlet />
      </main>
      <PiedDePage />
    </div>
  );
}

export default LayoutPublic;
