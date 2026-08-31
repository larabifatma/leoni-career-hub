/**
 * Page d'accueil publique (maquette "Rejoignez notre équipe").
 * Affiche une bannière et les 3 offres les plus récentes.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOffres } from '../services/offres';
import Chargement from '../components/Chargement';
import Message from '../components/Message';

function Accueil() {
  const [offres, setOffres] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  // `useEffect` avec [] : le code s'exécute une seule fois, à l'affichage de la page.
  useEffect(() => {
    getOffres({ limite: 3 })
      .then((donnees) => setOffres(donnees.offres))
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, []);

  return (
    <>
      <section className="heros">
        <div className="heros-image">Rejoignez une équipe qui vous ressemble</div>
        <h1>Rejoignez notre équipe</h1>
        <p>Découvrez nos opportunités de carrière et construisez votre avenir avec nous.</p>
        <Link to="/offres" className="bouton bouton-principal">
          Voir les offres
        </Link>
      </section>

      <section>
        <div className="entete-section">
          <h2>Offres récentes</h2>
          <Link to="/offres">Tout voir</Link>
        </div>

        <Message type="erreur">{erreur}</Message>

        {chargement && <Chargement />}

        {!chargement && !erreur && offres.length === 0 && (
          <p className="etat-vide">Aucune offre disponible pour le moment.</p>
        )}

        {offres.map((offre) => (
          <Link
            key={offre.id_offre}
            to={`/offres/${offre.id_offre}`}
            className="carte-offre"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div>
              <h3>{offre.titre}</h3>
              {offre.lieu && <p className="carte-offre-resume">📍 {offre.lieu}</p>}
              <div className="carte-offre-etiquettes" style={{ marginTop: '10px' }}>
                <span className="badge badge-gris">{offre.type_contrat}</span>
              </div>
            </div>
            <span className="badge badge-vert">Nouveau</span>
          </Link>
        ))}
      </section>
    </>
  );
}

export default Accueil;
