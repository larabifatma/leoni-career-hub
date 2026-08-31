/**
 * Liste des candidatures (F15 + F18) — maquette "Candidatures reçues".
 *
 * Ce composant sert deux URL :
 *   - /rh/candidatures                      -> toutes les candidatures
 *   - /rh/offres/:id/candidatures           -> celles d'une offre précise
 *
 * Filtres disponibles : recherche par nom/email et filtre par statut.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCandidatures, getCandidaturesParOffre } from '../services/candidatures';
import StatutBadge from '../components/StatutBadge';
import Chargement from '../components/Chargement';
import Message from '../components/Message';
import { formaterDate } from './DetailOffre';

/** Construit les initiales affichées dans la pastille : "Jean Dupont" -> "JD". */
const initiales = (candidat) =>
  `${candidat?.prenom?.[0] || ''}${candidat?.nom?.[0] || ''}`.toUpperCase();

function CandidaturesOffre() {
  // `id` n'est présent que sur la route /rh/offres/:id/candidatures
  const { id } = useParams();

  const [candidatures, setCandidatures] = useState([]);
  const [offre, setOffre] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      if (id) {
        // Candidatures d'une offre précise : le filtrage est fait par le backend.
        const donnees = await getCandidaturesParOffre(id, { statut, recherche });
        setOffre(donnees.offre);
        setCandidatures(donnees.candidatures);
      } else {
        // Toutes les candidatures : on filtre le nom côté navigateur.
        const donnees = await getCandidatures({ statut, limite: 50 });
        const terme = recherche.trim().toLowerCase();

        setCandidatures(
          terme
            ? donnees.candidatures.filter((c) => {
                const nomComplet = `${c.Candidat?.prenom} ${c.Candidat?.nom}`.toLowerCase();
                return nomComplet.includes(terme) || c.Candidat?.email.toLowerCase().includes(terme);
              })
            : donnees.candidatures
        );
      }
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }, [id, statut, recherche]);

  // Petit délai avant de relancer la recherche pendant la saisie.
  useEffect(() => {
    const minuteur = setTimeout(charger, 300);
    return () => clearTimeout(minuteur);
  }, [charger]);

  return (
    <>
      {offre && (
        <nav className="fil-ariane">
          <Link to="/rh/offres">Offres</Link>
          <span>›</span>
          <span>{offre.titre}</span>
          <span>›</span>
          <span aria-current="page">Candidatures</span>
        </nav>
      )}

      <div className="rh-entete-page">
        <div>
          <h1>
            {offre ? 'Candidatures reçues' : 'Toutes les candidatures'} ({candidatures.length})
          </h1>
          <p>
            {offre
              ? `Gérez et évaluez les candidats pour l'offre « ${offre.titre} ».`
              : 'Vue d\'ensemble des candidatures reçues, toutes offres confondues.'}
          </p>
        </div>
      </div>

      {/* --- Recherche et filtre par statut (F18) --- */}
      <div className="barre-outils">
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

      <Message type="erreur">{erreur}</Message>

      {chargement ? (
        <Chargement />
      ) : (
        <div className="tableau-boite">
          <div className="tableau-defilement">
            <table>
              <thead>
                <tr>
                  <th>Candidat</th>
                  <th>Email</th>
                  {!offre && <th>Offre</th>}
                  <th>Diplôme</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidatures.length === 0 && (
                  <tr>
                    <td colSpan={offre ? 6 : 7} className="etat-vide">
                      Aucune candidature ne correspond à votre recherche.
                    </td>
                  </tr>
                )}

                {candidatures.map((candidature) => (
                  <tr key={candidature.id_candidature}>
                    <td>
                      <div className="cellule-candidat">
                        <span className="initiales">{initiales(candidature.Candidat)}</span>
                        <span style={{ fontWeight: 500 }}>
                          {candidature.Candidat?.prenom} {candidature.Candidat?.nom}
                        </span>
                      </div>
                    </td>
                    <td>{candidature.Candidat?.email}</td>
                    {!offre && <td>{candidature.Offre?.titre}</td>}
                    <td>{candidature.Candidat?.diplome || '—'}</td>
                    <td>{formaterDate(candidature.date_candidature)}</td>
                    <td>
                      <StatutBadge statut={candidature.statut} />
                    </td>
                    <td className="cellule-actions">
                      <Link
                        to={`/rh/candidatures/${candidature.id_candidature}`}
                        className="bouton bouton-principal bouton-petit"
                      >
                        Voir le dossier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>
              Affichage de {candidatures.length} candidature
              {candidatures.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default CandidaturesOffre;
