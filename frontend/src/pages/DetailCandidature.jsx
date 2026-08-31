/**
 * Détail d'une candidature (F16 + F17) — maquette "Jean Dupont".
 *
 * Affiche les informations du candidat, sa lettre de motivation, et permet :
 *   - de télécharger le CV via une URL signée temporaire
 *   - de changer le statut : En attente / Accepté / Refusé
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  changerStatutCandidature,
  getCandidatureById,
  getLienCv,
} from '../services/candidatures';
import StatutBadge from '../components/StatutBadge';
import Chargement from '../components/Chargement';
import Message from '../components/Message';
import { formaterDate } from './DetailOffre';

function DetailCandidature() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidature, setCandidature] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [cvEnCours, setCvEnCours] = useState(false);

  useEffect(() => {
    getCandidatureById(id)
      .then(setCandidature)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, [id]);

  /** Change le statut de la candidature (F17). */
  const changerStatut = async (nouveauStatut) => {
    setErreur('');
    setSucces('');
    try {
      const misAJour = await changerStatutCandidature(id, nouveauStatut);
      setCandidature(misAJour);
      setSucces(`Statut mis à jour : ${nouveauStatut}.`);
    } catch (err) {
      setErreur(err.message);
    }
  };

  /**
   * Ouvre le CV dans un nouvel onglet.
   * Le bucket Supabase étant privé, le backend nous fournit une URL signée
   * valable seulement quelques minutes (section 4.5 : données personnelles).
   */
  const ouvrirCv = async () => {
    setErreur('');
    setCvEnCours(true);
    try {
      const { url } = await getLienCv(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCvEnCours(false);
    }
  };

  if (chargement) return <Chargement />;
  if (!candidature) return <Message type="erreur">{erreur || 'Candidature introuvable.'}</Message>;

  const { Candidat: candidat, Offre: offre } = candidature;

  return (
    <>
      <nav className="fil-ariane">
        <Link to="/rh/offres">Offres</Link>
        <span>›</span>
        <Link to={`/rh/offres/${offre?.id_offre}/candidatures`}>{offre?.titre}</Link>
        <span>›</span>
        <span aria-current="page">
          {candidat?.prenom} {candidat?.nom}
        </span>
      </nav>

      <div className="rh-entete-page">
        <h1>
          {candidat?.prenom} {candidat?.nom}
        </h1>
        <button type="button" className="bouton bouton-secondaire" onClick={() => navigate(-1)}>
          ← Retour à la liste
        </button>
      </div>

      <Message type="erreur">{erreur}</Message>
      <Message type="succes">{succes}</Message>

      <div className="detail-candidature-grille">
        {/* --- Colonne principale --- */}
        <div>
          <div className="carte" style={{ marginBottom: '20px' }}>
            <h2 className="carte-titre">👤 Informations du candidat</h2>

            <div className="grille-infos">
              <div>
                <div className="info-libelle">Nom complet</div>
                <div className="info-valeur">
                  {candidat?.prenom} {candidat?.nom}
                </div>
              </div>
              <div>
                <div className="info-libelle">Email</div>
                <div className="info-valeur">
                  <a href={`mailto:${candidat?.email}`}>✉ {candidat?.email}</a>
                </div>
              </div>
              <div>
                <div className="info-libelle">Téléphone</div>
                <div className="info-valeur">📞 {candidat?.telephone}</div>
              </div>
              <div>
                <div className="info-libelle">Date de candidature</div>
                <div className="info-valeur">📅 {formaterDate(candidature.date_candidature)}</div>
              </div>
              <div>
                <div className="info-libelle">Dernier diplôme</div>
                <div className="info-valeur">{candidat?.diplome || 'Non précisé'}</div>
              </div>
              <div>
                <div className="info-libelle">École / université</div>
                <div className="info-valeur">{candidat?.faculte || 'Non précisé'}</div>
              </div>
            </div>
          </div>

          <div className="carte">
            <h2 className="carte-titre">📄 Lettre de motivation</h2>
            {candidature.lettre_motivation ? (
              <div className="lettre-motivation">{candidature.lettre_motivation}</div>
            ) : (
              <p style={{ color: 'var(--texte-doux)' }}>
                Le candidat n'a pas joint de lettre de motivation.
              </p>
            )}
          </div>
        </div>

        {/* --- Colonne latérale : statut et CV --- */}
        <div>
          <div className="carte" style={{ marginBottom: '20px' }}>
            <h2 className="carte-titre">Statut de la candidature</h2>

            <p style={{ marginBottom: '18px' }}>
              Statut actuel : <StatutBadge statut={candidature.statut} />
            </p>

            <div className="actions-statut">
              <button
                type="button"
                className="bouton bouton-neutre"
                disabled={candidature.statut === 'En attente'}
                onClick={() => changerStatut('En attente')}
              >
                🕘 Marquer en attente
              </button>
              <button
                type="button"
                className="bouton bouton-vert"
                disabled={candidature.statut === 'Accepté'}
                onClick={() => changerStatut('Accepté')}
              >
                ✓ Accepter
              </button>
              <button
                type="button"
                className="bouton bouton-rouge"
                disabled={candidature.statut === 'Refusé'}
                onClick={() => changerStatut('Refusé')}
              >
                ✕ Refuser
              </button>
            </div>
          </div>

          <div className="carte">
            <h2 className="carte-titre">Curriculum Vitae</h2>

            <div className="boite-cv">
              <div className="boite-cv-icone">📄</div>
              <div className="boite-cv-nom">{candidature.cv_fichier}</div>
            </div>

            <button
              type="button"
              className="bouton bouton-principal bouton-bloc"
              onClick={ouvrirCv}
              disabled={cvEnCours}
            >
              {cvEnCours ? 'Préparation du lien...' : '⤓ Consulter / télécharger le CV'}
            </button>

            <p style={{ fontSize: '12px', color: 'var(--texte-doux)', marginTop: '10px' }}>
              Le lien de téléchargement est sécurisé et valable 5 minutes.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default DetailCandidature;
