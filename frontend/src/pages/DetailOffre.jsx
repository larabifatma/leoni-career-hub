/**
 * Détail d'une offre d'emploi (F03) — maquette "Développeur Backend".
 *
 * Deux colonnes : à gauche un encadré récapitulatif (contrat, lieu,
 * expérience, diplôme, dates), à droite la description complète.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOffreById } from '../services/offres';
import Chargement from '../components/Chargement';
import Message from '../components/Message';

/** Convertit une date ISO ('2026-08-20T...') en date française ('20/08/2026'). */
export const formaterDate = (valeur) => {
  if (!valeur) return '—';
  return new Date(valeur).toLocaleDateString('fr-FR');
};

function DetailOffre() {
  // `useParams` récupère le :id présent dans l'URL /offres/:id
  const { id } = useParams();

  const [offre, setOffre] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    setChargement(true);
    getOffreById(id)
      .then(setOffre)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, [id]);

  if (chargement) return <Chargement texte="Chargement de l'offre..." />;
  if (erreur) return <Message type="erreur">{erreur}</Message>;
  if (!offre) return null;

  return (
    <>
      <nav className="fil-ariane">
        <Link to="/offres">Offres</Link>
        <span>›</span>
        <span aria-current="page">{offre.titre}</span>
      </nav>

      <div className="detail-offre-entete">
        <div>
          <h1>{offre.titre}</h1>
          <div className="detail-offre-etiquettes">
            <span className="badge badge-marine">{offre.type_contrat}</span>
            {offre.lieu && <span className="badge badge-gris">📍 {offre.lieu}</span>}
            {offre.annees_experience > 0 && (
              <span className="badge badge-gris">
                🕘 {offre.annees_experience} an{offre.annees_experience > 1 ? 's' : ''} d'expérience
              </span>
            )}
          </div>
        </div>

        <Link to={`/offres/${offre.id_offre}/postuler`} className="bouton bouton-principal">
          Postuler à cette offre
        </Link>
      </div>

      <div className="detail-grille">
        {/* --- Colonne de gauche : récapitulatif --- */}
        <div>
          <div className="carte" style={{ marginBottom: '20px' }}>
            <h3 className="carte-titre">Détails de l'offre</h3>

            <div className="ligne-info">
              <span className="ligne-info-libelle">Contrat</span>
              <span className="ligne-info-valeur">{offre.type_contrat}</span>
            </div>
            <div className="ligne-info">
              <span className="ligne-info-libelle">Localisation</span>
              <span className="ligne-info-valeur">{offre.lieu || 'Non précisé'}</span>
            </div>
            <div className="ligne-info">
              <span className="ligne-info-libelle">Expérience</span>
              <span className="ligne-info-valeur">
                {offre.annees_experience > 0
                  ? `${offre.annees_experience} an${offre.annees_experience > 1 ? 's' : ''} minimum`
                  : 'Débutant accepté'}
              </span>
            </div>
            <div className="ligne-info">
              <span className="ligne-info-libelle">Niveau d'études</span>
              <span className="ligne-info-valeur">{offre.diplome_requis || 'Non précisé'}</span>
            </div>
            <div className="ligne-info">
              <span className="ligne-info-libelle">Domaine</span>
              <span className="ligne-info-valeur">{offre.faculte_requise || 'Tous domaines'}</span>
            </div>
          </div>

          <div className="carte">
            <div className="ligne-info">
              <span className="ligne-info-libelle">Publié le</span>
              <span className="ligne-info-valeur">{formaterDate(offre.date_publication)}</span>
            </div>
            <div className="ligne-info">
              <span className="ligne-info-libelle">Clôture le</span>
              <span className="ligne-info-valeur" style={{ color: offre.date_expiration ? '#c5221f' : undefined }}>
                {offre.date_expiration ? formaterDate(offre.date_expiration) : 'Pas de date limite'}
              </span>
            </div>
          </div>
        </div>

        {/* --- Colonne de droite : description et compétences --- */}
        <div className="carte">
          <h2 className="sous-titre-detail">📄 Description du poste</h2>
          {/* La classe `bloc-texte` conserve les retours à la ligne saisis par le RH */}
          <p className="bloc-texte">{offre.description}</p>

          <hr className="separateur" />

          <h2 className="sous-titre-detail">🧩 Compétences requises</h2>
          <p className="bloc-texte">{offre.competences_requises}</p>

          <hr className="separateur" />

          <Link
            to={`/offres/${offre.id_offre}/postuler`}
            className="bouton bouton-principal bouton-bloc"
          >
            Postuler à cette offre
          </Link>
        </div>
      </div>
    </>
  );
}

export default DetailOffre;
