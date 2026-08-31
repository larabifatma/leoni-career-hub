/**
 * Écran de confirmation affiché après l'envoi d'une candidature (F06).
 *
 * Le titre de l'offre est transmis par la page précédente via `state`
 * (voir navigate('/candidature-envoyee', { state: ... }) dans FormulaireCandidature).
 */
import { Link, useLocation } from 'react-router-dom';

function ConfirmationCandidature() {
  const location = useLocation();
  const titreOffre = location.state?.titreOffre;

  return (
    <div className="confirmation">
      <div className="confirmation-icone">✓</div>

      <h1>Candidature envoyée avec succès !</h1>

      <p>
        Votre candidature{titreOffre ? ' pour le poste de ' : ' '}
        {titreOffre && <strong>{titreOffre}</strong>} a bien été transmise à notre équipe RH.
        Nous reviendrons vers vous rapidement.
      </p>

      <Link to="/offres" className="bouton bouton-secondaire">
        ← Retour à la liste des offres
      </Link>
    </div>
  );
}

export default ConfirmationCandidature;
