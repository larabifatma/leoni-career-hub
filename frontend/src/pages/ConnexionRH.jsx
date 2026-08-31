/**
 * Page de connexion du Responsable RH (F08) — maquette "Espace Responsable RH".
 *
 * Rappel : il n'existe pas de formulaire d'inscription. Le compte unique est
 * créé en base par le script de seeding du backend (npm run seed).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { seConnecter } from '../services/auth';
import Message from '../components/Message';

function ConnexionRH() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState('');
  const [connexionEnCours, setConnexionEnCours] = useState(false);

  const envoyer = async (evenement) => {
    evenement.preventDefault();
    setErreur('');

    if (!email.trim() || !motDePasse) {
      setErreur('Merci de renseigner votre email et votre mot de passe.');
      return;
    }

    setConnexionEnCours(true);
    try {
      await seConnecter(email.trim(), motDePasse);
      navigate('/rh/tableau-de-bord', { replace: true });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setConnexionEnCours(false);
    }
  };

  return (
    <div className="page-connexion">
      <div className="carte boite-connexion">
        <h1>Portail Carrière</h1>
        <h2>Espace Responsable RH</h2>

        <Message type="erreur">{erreur}</Message>

        <form onSubmit={envoyer} noValidate>
          <div className="champ">
            <label htmlFor="email">Email professionnel</label>
            <input
              id="email"
              type="email"
              placeholder="nom@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="champ">
            <label htmlFor="motDePasse">Mot de passe</label>
            <div className="champ-mot-de-passe">
              <input
                id="motDePasse"
                // On bascule entre "password" (masqué) et "text" (visible)
                type={motDePasseVisible ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="oeil"
                onClick={() => setMotDePasseVisible(!motDePasseVisible)}
                aria-label={motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {motDePasseVisible ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="bouton bouton-principal bouton-bloc"
            disabled={connexionEnCours}
          >
            {connexionEnCours ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="retour-site">
          <Link to="/">← Retour au site public</Link>
        </p>
      </div>
    </div>
  );
}

export default ConnexionRH;
