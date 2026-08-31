/** Barre de navigation affichée en haut des pages publiques (espace Candidat). */
import { Link } from 'react-router-dom';

function Entete() {
  return (
    <header className="entete">
      <div className="entete-interieur">
        <Link to="/" className="logo">
          Portail Carrière
        </Link>

        <nav className="entete-liens">
          <Link to="/offres">Offres</Link>
          <Link to="/rh/connexion" className="bouton bouton-secondaire bouton-petit">
            Espace RH
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Entete;
