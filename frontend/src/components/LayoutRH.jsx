/**
 * Gabarit de l'espace RH : barre latérale de navigation + zone de contenu.
 * Reprend la maquette du tableau de bord (menu bleu marine à gauche).
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { rhConnecte, seDeconnecter } from '../services/auth';

function LayoutRH({ children }) {
  const navigate = useNavigate();
  const rh = rhConnecte();

  const deconnexion = () => {
    seDeconnecter();
    navigate('/rh/connexion', { replace: true });
  };

  // Initiales affichées dans la pastille du profil (ex. "SB" pour Sarra Ben Ali)
  const initiales = rh
    ? `${rh.prenom?.[0] || ''}${rh.nom?.[0] || ''}`.toUpperCase()
    : 'RH';

  // `NavLink` ajoute automatiquement une classe quand le lien correspond à l'URL active.
  const classeLien = ({ isActive }) => (isActive ? 'actif' : '');

  return (
    <div className="rh-cadre">
      <aside className="rh-lateral">
        <NavLink to="/rh/tableau-de-bord" className="rh-lateral-logo">
          Portail Carrière
        </NavLink>

        <nav className="rh-menu">
          <NavLink to="/rh/tableau-de-bord" className={classeLien}>
            <span>▦</span> Tableau de bord
          </NavLink>
          <NavLink to="/rh/offres" className={classeLien}>
            <span>▤</span> Offres d'emploi
          </NavLink>
          <NavLink to="/rh/candidatures" className={classeLien}>
            <span>☰</span> Candidatures
          </NavLink>
        </nav>

        <div className="rh-profil">
          <div className="rh-profil-pastille">{initiales}</div>
          <div>
            <div className="rh-profil-nom">
              {rh ? `${rh.prenom} ${rh.nom}` : 'Responsable RH'}
            </div>
            <div className="rh-profil-role">Responsable RH</div>
          </div>
        </div>

        <div style={{ padding: '0 22px 20px' }}>
          <button type="button" className="rh-deconnexion" onClick={deconnexion}>
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="rh-principal">{children}</main>
    </div>
  );
}

export default LayoutRH;
