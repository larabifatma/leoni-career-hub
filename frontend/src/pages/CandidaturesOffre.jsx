/**
 * Liste des candidatures d'une offre (F15 + F18 + Matching IA).
 *
 * Ce composant sert deux URL :
 *   - /rh/offres/:id/candidatures  -> candidatures d'une offre, triées par score IA
 *   - /rh/candidatures             -> toutes les candidatures, toutes offres confondues
 *
 * Contenu de l'écran :
 *   1. En-tête : retour, titre, mention du tri
 *   2. Trois cartes de répartition par niveau de score
 *   3. Barre de recherche + filtre par statut
 *   4. Tableau trié par score IA décroissant
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getCandidatures,
  getCandidaturesParOffre,
  relancerAnalyseIA,
} from '../services/candidatures';
import ScoreIA, { niveauScore } from '../components/ScoreIA';
import StatutBadge from '../components/StatutBadge';
import Chargement from '../components/Chargement';
import Message from '../components/Message';
import { formaterDate } from './DetailOffre';

/** Initiales affichées dans la pastille : « Jean Dupont » -> « JD ». */
const initiales = (candidat) =>
  `${candidat?.prenom?.[0] || ''}${candidat?.nom?.[0] || ''}`.toUpperCase();

/**
 * Carte de répartition avec son anneau de progression.
 * L'anneau est dessiné en CSS pur (conic-gradient), sans librairie de graphiques.
 */
function CarteRepartition({ libelle, valeur, detail, total, couleur }) {
  // Part du total, utilisée pour remplir l'anneau
  const pourcentage = total > 0 ? Math.round((valeur / total) * 100) : 0;

  return (
    <div className="carte-repartition">
      <div>
        <div className="carte-repartition-libelle">{libelle}</div>
        <div>
          <span className="carte-repartition-valeur">{valeur}</span>
          <span className="carte-repartition-detail">{detail}</span>
        </div>
      </div>
      <div
        className={`anneau anneau-${couleur}`}
        style={{ '--part': pourcentage }}
        title={`${pourcentage}% des candidatures`}
      />
    </div>
  );
}

function CandidaturesOffre() {
  // `id` n'est présent que sur la route /rh/offres/:id/candidatures
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidatures, setCandidatures] = useState([]);
  const [offre, setOffre] = useState(null);
  const [repartition, setRepartition] = useState({
    eleve: 0,
    modere: 0,
    faible: 0,
    nonAnalyse: 0,
  });

  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState('');
  const [chargement, setChargement] = useState(true);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  /** Calcule la répartition côté client (cas « toutes les candidatures »). */
  const calculerRepartition = (liste) => {
    const compteur = { eleve: 0, modere: 0, faible: 0, nonAnalyse: 0 };
    for (const c of liste) {
      const niveau = niveauScore(c.score_ia);
      if (niveau === 'inconnu') compteur.nonAnalyse++;
      else compteur[niveau]++;
    }
    return compteur;
  };

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      if (id) {
        // Candidatures d'une offre : le tri et la répartition viennent du backend
        const donnees = await getCandidaturesParOffre(id, { statut, recherche });
        setOffre(donnees.offre);
        setCandidatures(donnees.candidatures);
        setRepartition(donnees.repartition || calculerRepartition(donnees.candidatures));
      } else {
        // Toutes les candidatures : on trie et filtre côté navigateur
        const donnees = await getCandidatures({ statut, limite: 100 });
        const terme = recherche.trim().toLowerCase();

        const liste = terme
          ? donnees.candidatures.filter((c) => {
              const nomComplet = `${c.Candidat?.prenom} ${c.Candidat?.nom}`.toLowerCase();
              return (
                nomComplet.includes(terme) || c.Candidat?.email.toLowerCase().includes(terme)
              );
            })
          : donnees.candidatures;

        // Tri par score décroissant, les non analysées en dernier
        liste.sort((a, b) => (b.score_ia ?? -1) - (a.score_ia ?? -1));

        setCandidatures(liste);
        setRepartition(calculerRepartition(liste));
      }
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }, [id, statut, recherche]);

  // Petit délai avant de relancer la recherche pendant la saisie (debounce)
  useEffect(() => {
    const minuteur = setTimeout(charger, 300);
    return () => clearTimeout(minuteur);
  }, [charger]);

  /** Lance l'analyse IA des candidatures non encore évaluées. */
  const lancerAnalyse = async () => {
    setErreur('');
    setSucces('');
    setAnalyseEnCours(true);
    try {
      const resultat = await relancerAnalyseIA(id);
      setSucces(resultat.message);
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setAnalyseEnCours(false);
    }
  };

  /**
   * Export CSV généré directement dans le navigateur (aucun appel serveur).
   * Le BOM "﻿" en tête force Excel à lire le fichier en UTF-8,
   * sinon les accents s'affichent incorrectement.
   */
  const exporterCSV = () => {
    const entetes = ['Nom', 'Prenom', 'Email', 'Telephone', 'Diplome', 'Offre', 'Date', 'Score IA', 'Statut'];

    const echapper = (valeur) => `"${String(valeur ?? '').replace(/"/g, '""')}"`;

    const lignes = candidatures.map((c) =>
      [
        c.Candidat?.nom,
        c.Candidat?.prenom,
        c.Candidat?.email,
        c.Candidat?.telephone,
        c.Candidat?.diplome,
        c.Offre?.titre,
        formaterDate(c.date_candidature),
        c.score_ia ?? 'Non analyse',
        c.statut,
      ].map(echapper).join(';')
    );

    const contenu = '﻿' + [entetes.join(';'), ...lignes].join('\n');
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8;' }));
    lien.download = `candidatures_${offre ? offre.titre.replace(/\s+/g, '_') : 'toutes'}.csv`;
    lien.click();
    URL.revokeObjectURL(lien.href);
  };

  const total = candidatures.length;

  return (
    <>
      {/* --- 1. En-tête --- */}
      <button type="button" className="lien-retour" onClick={() => navigate('/rh/tableau-de-bord')}>
        ← Retour au tableau de bord
      </button>

      <div className="rh-entete-page">
        <div>
          <h1>
            {offre ? `Candidatures pour ${offre.titre}` : 'Toutes les candidatures'}
          </h1>
          <div className="sous-titre-meta">
            <span>{total} candidature{total > 1 ? 's' : ''} reçue{total > 1 ? 's' : ''}</span>
            {offre && (
              <>
                <span className="point">•</span>
                <span>Filtré pour cette offre</span>
              </>
            )}
          </div>
          <div style={{ marginTop: '10px' }}>
            <span className="badge badge-bleu">Classées par ordre décroissant de Score IA</span>
          </div>
        </div>

        <div className="actions-entete">
          <button
            type="button"
            className="bouton bouton-neutre"
            onClick={exporterCSV}
            disabled={total === 0}
          >
            ⤓ Exporter CSV
          </button>
          {/* La relance d'analyse ne concerne qu'une offre précise */}
          {id && (
            <button
              type="button"
              className="bouton bouton-principal"
              onClick={lancerAnalyse}
              disabled={analyseEnCours}
            >
              {analyseEnCours ? 'Analyse en cours...' : '◎ Relancer analyse IA'}
            </button>
          )}
        </div>
      </div>

      <Message type="erreur">{erreur}</Message>
      <Message type="succes">{succes}</Message>

      {/* --- 2. Répartition par niveau de score --- */}
      <div className="grille-repartition">
        <CarteRepartition
          libelle="Score élevé (> 75%)"
          valeur={repartition.eleve}
          detail="profils qualifiés"
          total={total}
          couleur="eleve"
        />
        <CarteRepartition
          libelle="Score modéré (50 - 75%)"
          valeur={repartition.modere}
          detail="profils à valider"
          total={total}
          couleur="modere"
        />
        <CarteRepartition
          libelle="Score faible (< 50%)"
          valeur={repartition.faible}
          detail="profils écartés"
          total={total}
          couleur="faible"
        />
      </div>

      {repartition.nonAnalyse > 0 && (
        <Message type="info">
          {repartition.nonAnalyse} candidature(s) sans score.
          {id && ' Cliquez sur « Relancer analyse IA » pour les évaluer.'}
        </Message>
      )}

      {/* --- 3. Recherche et filtre (F18) --- */}
      <div className="carte" style={{ padding: '18px 20px', marginBottom: '20px' }}>
        <div className="barre-outils" style={{ marginBottom: 0 }}>
          <input
            type="search"
            placeholder="🔍 Rechercher par nom ou email..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <select value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="En attente">En attente</option>
            <option value="Accepté">Accepté</option>
            <option value="Refusé">Refusé</option>
          </select>
        </div>
      </div>

      {/* --- 4. Tableau des candidatures --- */}
      {chargement ? (
        <Chargement />
      ) : (
        <div className="tableau-boite">
          <div className="tableau-defilement">
            <table>
              <thead>
                <tr>
                  <th>Candidat</th>
                  {!offre && <th>Offre</th>}
                  <th>Date de postulation</th>
                  <th>Score IA</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {candidatures.length === 0 && (
                  <tr>
                    <td colSpan={offre ? 5 : 6} className="etat-vide">
                      Aucune candidature ne correspond à votre recherche.
                    </td>
                  </tr>
                )}

                {candidatures.map((candidature) => (
                  <tr key={candidature.id_candidature}>
                    <td>
                      <div className="cellule-candidat">
                        <span className="initiales">{initiales(candidature.Candidat)}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {candidature.Candidat?.prenom} {candidature.Candidat?.nom}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--texte-doux)' }}>
                            {candidature.Candidat?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    {!offre && <td>{candidature.Offre?.titre}</td>}
                    <td>📅 {formaterDate(candidature.date_candidature)}</td>
                    <td>
                      <ScoreIA score={candidature.score_ia} />
                    </td>
                    <td>
                      <StatutBadge statut={candidature.statut} />
                    </td>
                    <td className="cellule-actions">
                      <Link
                        to={`/rh/candidatures/${candidature.id_candidature}`}
                        className="bouton bouton-principal bouton-petit"
                      >
                        Voir Fiche →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>
              Affichage de {total} candidature{total > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default CandidaturesOffre;
