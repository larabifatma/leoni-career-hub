/**
 * Carte présentant une offre dans la liste publique (maquette "Nos Offres d'Emploi").
 */
import { Link } from 'react-router-dom';

function OffreCard({ offre }) {
  return (
    <article className="carte-offre">
      <div>
        <div className="carte-offre-etiquettes">
          <span className="badge badge-marine">{offre.type_contrat}</span>
          {offre.lieu && <span className="badge badge-gris">📍 {offre.lieu}</span>}
        </div>

        <h3>{offre.titre}</h3>

        {/* On limite la description à 120 caractères pour garder des cartes de même hauteur */}
        <p className="carte-offre-resume">
          {offre.description.length > 120
            ? `${offre.description.slice(0, 120)}...`
            : offre.description}
        </p>
      </div>

      <Link to={`/offres/${offre.id_offre}`} className="bouton bouton-principal">
        Voir l'offre
      </Link>
    </article>
  );
}

export default OffreCard;
