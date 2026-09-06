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
import ScoreIA from '../components/ScoreIA';
import Chargement from '../components/Chargement';
import Message from '../components/Message';
import { formaterDate } from './DetailOffre';

/**
 * Retourne l'analyse de l'IA sous forme d'objet exploitable, quelle que soit
 * la forme reçue de l'API (objet, chaîne JSON, null).
 *
 * Le JSON.parse() n'est tenté que sur une chaîne non vide : appelé sur `null`,
 * il lèverait l'erreur « Unexpected token 'n', "null" is not valid JSON ».
 * En cas de contenu illisible, on renvoie `null` : la page affiche alors
 * simplement « Non analysé » au lieu de planter.
 *
 * @param {object|string|null} valeur - le contenu brut de la colonne analyse_ia
 * @returns {object|null}
 */
function lireAnalyse(valeur) {
  if (!valeur) return null;
  if (typeof valeur === 'object') return valeur;

  if (typeof valeur === 'string') {
    if (!valeur.trim()) return null;
    try {
      const objet = JSON.parse(valeur);
      return objet && typeof objet === 'object' ? objet : null;
    } catch {
      return null;
    }
  }

  return null;
}

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

  // Initiales du candidat, affichées dans la pastille du bandeau
  const initiales = `${candidat?.prenom?.[0] || ''}${candidat?.nom?.[0] || ''}`.toUpperCase();

  // L'analyse détaillée n'existe que si l'IA a pu évaluer le CV.
  // `analyse_ia` peut arriver sous trois formes :
  //   - un objet   : cas normal, la colonne est de type jsonb
  //   - null       : candidature jamais analysée
  //   - une chaîne : si la colonne avait été créée en type text
  // On ne lit donc jamais la valeur sans l'avoir vérifiée au préalable.
  const analyse = lireAnalyse(candidature.analyse_ia);
  const analyseReussie = analyse && !analyse.erreur;

  return (
    <>
      <button
        type="button"
        className="lien-retour"
        onClick={() =>
          navigate(offre ? `/rh/offres/${offre.id_offre}/candidatures` : '/rh/candidatures')
        }
      >
        ← Retour à la liste des candidatures
      </button>

      <nav className="fil-ariane">
        <Link to="/rh/offres">Offres</Link>
        <span>›</span>
        <Link to={`/rh/offres/${offre?.id_offre}/candidatures`}>{offre?.titre}</Link>
        <span>›</span>
        <span>Candidatures</span>
        <span>›</span>
        <span aria-current="page">
          {candidat?.prenom} {candidat?.nom}
        </span>
      </nav>

      {/* --- Bandeau : identité du candidat + score de Matching IA --- */}
      <div className="bandeau-candidat">
        <div className="bandeau-candidat-identite">
          <div className="bandeau-candidat-pastille">{initiales}</div>
          <div>
            <h1>
              {candidat?.prenom} {candidat?.nom}
            </h1>
            <div className="bandeau-candidat-etiquettes">
              <span className="badge badge-gris">
                Statut actuel : {candidature.statut}
              </span>
              <span className="badge badge-marine">{offre?.type_contrat}</span>
              <span style={{ fontSize: '13px', color: 'var(--texte-doux)' }}>
                {offre?.titre}
              </span>
            </div>
          </div>
        </div>

        <div className="encadre-score">
          <div className="encadre-score-icone">◎</div>
          <div>
            <div className="encadre-score-libelle">Évaluation algorithmique</div>
            <div className="encadre-score-valeur">
              {candidature.score_ia !== null && candidature.score_ia !== undefined
                ? `Score Matching IA : ${candidature.score_ia}%`
                : 'Score non calculé'}
            </div>
          </div>
        </div>
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

          {/* --- Analyse détaillée produite par l'IA --- */}
          {analyseReussie && (
            <div className="carte" style={{ marginBottom: '20px' }}>
              <h2 className="carte-titre">◎ Analyse du profil</h2>

              {analyse.resume && (
                <p style={{ marginBottom: '20px', color: '#374151' }}>{analyse.resume}</p>
              )}

              <div className="analyse-colonnes">
                <div>
                  <div className="analyse-titre positif">Points forts</div>
                  <ul className="analyse-liste">
                    {analyse.points_forts?.length ? (
                      analyse.points_forts.map((point, index) => <li key={index}>{point}</li>)
                    ) : (
                      <li style={{ color: 'var(--texte-doux)' }}>Aucun point relevé</li>
                    )}
                  </ul>
                </div>

                <div>
                  <div className="analyse-titre negatif">Points de vigilance</div>
                  <ul className="analyse-liste">
                    {analyse.points_faibles?.length ? (
                      analyse.points_faibles.map((point, index) => <li key={index}>{point}</li>)
                    ) : (
                      <li style={{ color: 'var(--texte-doux)' }}>Aucun point relevé</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Rappel important : l'IA assiste, elle ne décide pas. */}
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--texte-doux)',
                  marginTop: '18px',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--bordure)',
                }}
              >
                Analyse générée automatiquement le {formaterDate(analyse.date_analyse)} — elle
                constitue une aide à la décision et ne remplace pas l'évaluation du recruteur.
              </p>
            </div>
          )}

          {/* Message affiché quand l'analyse n'a pas pu aboutir */}
          {analyse?.erreur && (
            <div className="carte" style={{ marginBottom: '20px' }}>
              <h2 className="carte-titre">◎ Analyse du profil</h2>
              <p style={{ color: 'var(--texte-doux)' }}>{analyse.erreur}</p>
            </div>
          )}

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
