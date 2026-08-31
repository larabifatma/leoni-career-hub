/**
 * Liste publique des offres d'emploi (F01 + F02).
 *
 * Fonctionnalités : recherche par mot-clé, filtre par type de contrat et
 * par lieu, pagination.
 */
import { useEffect, useState } from 'react';
import { getOffres, getOptionsDeFiltre } from '../services/offres';
import OffreCard from '../components/OffreCard';
import Chargement from '../components/Chargement';
import Message from '../components/Message';
import Pagination from '../components/Pagination';

function ListeOffres() {
  const [offres, setOffres] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  // Valeurs des trois filtres de la barre de recherche
  const [motCle, setMotCle] = useState('');
  const [typeContrat, setTypeContrat] = useState('');
  const [lieu, setLieu] = useState('');
  const [page, setPage] = useState(1);

  // Contenu des listes déroulantes, rempli depuis l'API
  const [options, setOptions] = useState({ typesContrat: [], lieux: [] });

  // 1er effet : charger les options des filtres, une seule fois.
  useEffect(() => {
    getOptionsDeFiltre()
      .then(setOptions)
      .catch(() => setOptions({ typesContrat: [], lieux: [] }));
  }, []);

  // 2e effet : recharger les offres dès qu'un filtre ou la page change.
  useEffect(() => {
    setChargement(true);
    setErreur('');

    // Petit délai (300 ms) avant d'appeler l'API pendant la saisie du mot-clé :
    // cela évite d'envoyer une requête à chaque lettre tapée.
    const minuteur = setTimeout(() => {
      getOffres({ motCle, typeContrat, lieu, page, limite: 6 })
        .then((donnees) => {
          setOffres(donnees.offres);
          setPagination({
            page: donnees.page,
            totalPages: donnees.totalPages,
            total: donnees.total,
          });
        })
        .catch((err) => setErreur(err.message))
        .finally(() => setChargement(false));
    }, 300);

    // Nettoyage : si l'utilisateur tape une nouvelle lettre, on annule le minuteur précédent.
    return () => clearTimeout(minuteur);
  }, [motCle, typeContrat, lieu, page]);

  /** Quand un filtre change, on revient toujours à la première page. */
  const changerFiltre = (setter) => (evenement) => {
    setter(evenement.target.value);
    setPage(1);
  };

  return (
    <>
      <div className="entete-page">
        <h1>Nos Offres d'Emploi</h1>
        <p>Rejoignez nos équipes et participez à des projets ambitieux au cœur de notre croissance.</p>
      </div>

      {/* --- Barre de recherche et de filtres (F02) --- */}
      <div className="barre-filtres">
        <div className="champ">
          <label htmlFor="motCle">Mots-clés</label>
          <input
            id="motCle"
            type="text"
            placeholder="Intitulé de poste, compétence..."
            value={motCle}
            onChange={changerFiltre(setMotCle)}
          />
        </div>

        <div className="champ">
          <label htmlFor="typeContrat">Type de contrat</label>
          <select id="typeContrat" value={typeContrat} onChange={changerFiltre(setTypeContrat)}>
            <option value="">Tous les contrats</option>
            {options.typesContrat.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="champ">
          <label htmlFor="lieu">Lieu</label>
          <select id="lieu" value={lieu} onChange={changerFiltre(setLieu)}>
            <option value="">Tous les lieux</option>
            {options.lieux.map((valeur) => (
              <option key={valeur} value={valeur}>
                {valeur}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- Résultats --- */}
      <Message type="erreur">{erreur}</Message>

      {chargement && <Chargement texte="Chargement des offres..." />}

      {!chargement && !erreur && offres.length === 0 && (
        <p className="etat-vide">
          Aucune offre ne correspond à votre recherche.
          <br />
          Essayez de modifier vos critères.
        </p>
      )}

      {!chargement &&
        offres.map((offre) => <OffreCard key={offre.id_offre} offre={offre} />)}

      {!chargement && offres.length > 0 && (
        <div className="tableau-boite" style={{ marginTop: '8px' }}>
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

export default ListeOffres;
