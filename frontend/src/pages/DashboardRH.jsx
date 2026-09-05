/**
 * Tableau de bord du Responsable RH (F14) — maquette "Mes offres d'emploi".
 *
 * Affiche trois indicateurs clés puis le tableau des offres avec, pour chacune :
 * son statut, son nombre de candidatures et les actions possibles
 * (modifier, archiver/republier, supprimer, voir les candidatures).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  archiverOffre,
  getOffresRh,
  getStatistiques,
  supprimerOffre,
} from '../services/offres';
import StatutBadge from '../components/StatutBadge';
import Chargement from '../components/Chargement';
import Message from '../components/Message';
import Pagination from '../components/Pagination';
import { formaterDate } from './DetailOffre';

function DashboardRH() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    offresPubliees: 0,
    candidaturesRecues: 0,
    candidaturesEnAttente: 0,
  });
  const [offres, setOffres] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  /**
   * `useCallback` mémorise la fonction pour qu'elle ne soit pas recréée à chaque
   * rendu : on peut ainsi l'utiliser sans risque dans le `useEffect` ci-dessous.
   */
  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      // Les deux requêtes partent en parallèle : c'est plus rapide qu'à la suite.
      const [donneesStats, donneesOffres] = await Promise.all([
        getStatistiques(),
        getOffresRh({ page, limite: 5 }),
      ]);

      setStats(donneesStats);
      setOffres(donneesOffres.offres);
      setPagination({
        page: donneesOffres.page,
        totalPages: donneesOffres.totalPages,
        total: donneesOffres.total,
      });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }, [page]);

  useEffect(() => {
    charger();
  }, [charger]);

  /** Archive une offre publiée, ou republie une offre archivée (F12). */
  const basculerArchivage = async (offre) => {
    const versArchive = offre.statut === 'Publiée';
    const question = versArchive
      ? `Archiver l'offre "${offre.titre}" ? Elle ne sera plus visible par les candidats.`
      : `Republier l'offre "${offre.titre}" ?`;

    if (!window.confirm(question)) return;

    try {
      await archiverOffre(offre.id_offre, versArchive ? 'Archivée' : 'Publiée');
      setSucces(versArchive ? 'Offre archivée.' : 'Offre republiée.');
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  /** Supprime définitivement une offre et ses candidatures (F13). */
  const supprimer = async (offre) => {
    const question =
      `Supprimer définitivement l'offre "${offre.titre}" ?\n\n` +
      `Ses ${offre.nb_candidatures} candidature(s) et les CV associés seront également supprimés. ` +
      `Cette action est irréversible.`;

    if (!window.confirm(question)) return;

    try {
      await supprimerOffre(offre.id_offre);
      setSucces('Offre supprimée.');
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <>
      <div className="rh-entete-page">
        <div>
          <h1>Mes offres d'emploi</h1>
          <p>Gérez et suivez vos annonces de recrutement actives.</p>
        </div>
        <Link to="/rh/offres/nouvelle" className="bouton bouton-principal">
          + Publier une nouvelle offre
        </Link>
      </div>

      <Message type="erreur">{erreur}</Message>
      <Message type="succes">{succes}</Message>

      {/* --- Indicateurs clés --- */}
      <div className="grille-stats">
        <div className="carte-stat">
          <div className="carte-stat-entete">
            <span className="carte-stat-icone">📤</span>
            <span>Offres publiées</span>
          </div>
          <div className="carte-stat-valeur">{stats.offresPubliees}</div>
        </div>

        <div className="carte-stat">
          <div className="carte-stat-entete">
            <span className="carte-stat-icone">📥</span>
            <span>Candidatures reçues</span>
          </div>
          <div className="carte-stat-valeur">{stats.candidaturesRecues}</div>
        </div>

        <div className="carte-stat">
          <div className="carte-stat-entete">
            <span className="carte-stat-icone">⏳</span>
            <span>Candidatures en attente</span>
          </div>
          <div className="carte-stat-valeur attente">{stats.candidaturesEnAttente}</div>
        </div>
      </div>

      {/* --- Tableau des offres --- */}
      {chargement ? (
        <Chargement />
      ) : (
        <div className="tableau-boite">
          <div className="tableau-defilement">
            <table>
              <thead>
                <tr>
                  <th>Titre du poste</th>
                  <th>Type de contrat</th>
                  <th>Statut</th>
                  <th>Candidatures</th>
                  <th>Date de publication</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offres.length === 0 && (
                  <tr>
                    <td colSpan="6" className="etat-vide">
                      Aucune offre pour le moment. Cliquez sur « Publier une nouvelle offre ».
                    </td>
                  </tr>
                )}

                {offres.map((offre) => (
                  <tr key={offre.id_offre}>
                    <td>
                      {/* Le titre est cliquable : il mène aux candidatures de l'offre */}
                      <Link
                        to={`/rh/offres/${offre.id_offre}/candidatures`}
                        style={{ fontWeight: 600 }}
                      >
                        {offre.titre}
                      </Link>
                    </td>
                    <td>{offre.type_contrat}</td>
                    <td>
                      <StatutBadge statut={offre.statut} />
                    </td>
                    <td>
                      <Link
                        to={`/rh/offres/${offre.id_offre}/candidatures`}
                        className="compteur-candidatures"
                      >
                        {offre.nb_candidatures}
                      </Link>{' '}
                      <span style={{ color: 'var(--texte-doux)', fontSize: '13px' }}>
                        dossier{offre.nb_candidatures > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>{formaterDate(offre.date_publication)}</td>
                    <td className="cellule-actions">
                      <Link
                        to={`/rh/offres/${offre.id_offre}/candidatures`}
                        className="bouton bouton-neutre bouton-petit"
                        title="Consulter les candidatures reçues"
                      >
                        👁 Voir candidatures
                      </Link>
                      <button
                        type="button"
                        className="bouton-icone"
                        title="Modifier l'offre"
                        onClick={() => navigate(`/rh/offres/${offre.id_offre}/modifier`)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="bouton-icone"
                        title={offre.statut === 'Publiée' ? 'Archiver' : 'Republier'}
                        onClick={() => basculerArchivage(offre)}
                      >
                        {offre.statut === 'Publiée' ? '🗄' : '↩'}
                      </button>
                      <button
                        type="button"
                        className="bouton-icone"
                        title="Supprimer définitivement"
                        onClick={() => supprimer(offre)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            libelle="offres"
            onChangerPage={setPage}
          />
        </div>
      )}
    </>
  );
}

export default DashboardRH;
