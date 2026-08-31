/**
 * Formulaire de candidature (F04 + F05 + F06) — maquette "Candidature".
 *
 * Contient :
 *   - les informations personnelles et la formation du candidat
 *   - une zone de dépôt du CV (clic ou glisser-déposer), PDF/Word, 5 Mo max
 *   - une lettre de motivation facultative
 *   - une case de consentement RGPD
 *
 * La validation est faite côté client pour le confort de l'utilisateur ;
 * le backend refait exactement les mêmes contrôles (section 4.1).
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOffreById } from '../services/offres';
import { envoyerCandidature } from '../services/candidatures';
import Chargement from '../components/Chargement';
import Message from '../components/Message';

/** Formats et taille acceptés — identiques aux règles du backend. */
const EXTENSIONS_AUTORISEES = ['.pdf', '.doc', '.docx'];
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

/** Affiche une taille en octets de façon lisible : 1258291 -> "1.2 Mo". */
const formaterTaille = (octets) => `${(octets / (1024 * 1024)).toFixed(1)} Mo`;

function FormulaireCandidature() {
  const { id } = useParams();
  const navigate = useNavigate();

  // `useRef` garde une référence vers l'input file caché, pour l'ouvrir au clic.
  const champFichier = useRef(null);

  const [offre, setOffre] = useState(null);
  const [chargement, setChargement] = useState(true);

  // Un seul objet d'état pour tous les champs texte : plus court que 7 useState.
  const [formulaire, setFormulaire] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    diplome: '',
    faculte: '',
    lettreMotivation: '',
  });

  const [cv, setCv] = useState(null);
  const [consentement, setConsentement] = useState(false);
  const [survolDepot, setSurvolDepot] = useState(false);

  const [erreurs, setErreurs] = useState({});     // erreurs par champ
  const [erreurGenerale, setErreurGenerale] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Charger l'offre pour afficher son titre en haut du formulaire.
  useEffect(() => {
    getOffreById(id)
      .then(setOffre)
      .catch((err) => setErreurGenerale(err.message))
      .finally(() => setChargement(false));
  }, [id]);

  /** Met à jour un champ texte et efface son éventuelle erreur. */
  const changerChamp = (evenement) => {
    const { name, value } = evenement.target;
    setFormulaire((precedent) => ({ ...precedent, [name]: value }));
    setErreurs((precedent) => ({ ...precedent, [name]: '' }));
  };

  /** Vérifie le fichier choisi (format et taille) avant de l'accepter. */
  const traiterFichier = (fichier) => {
    if (!fichier) return;

    const extension = fichier.name.slice(fichier.name.lastIndexOf('.')).toLowerCase();

    if (!EXTENSIONS_AUTORISEES.includes(extension)) {
      setErreurs((p) => ({ ...p, cv: 'Format invalide : seuls les fichiers PDF et Word sont acceptés.' }));
      setCv(null);
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      setErreurs((p) => ({ ...p, cv: 'Fichier trop volumineux : 5 Mo maximum.' }));
      setCv(null);
      return;
    }

    setCv(fichier);
    setErreurs((p) => ({ ...p, cv: '' }));
  };

  /** Glisser-déposer : on empêche le navigateur d'ouvrir le fichier dans un onglet. */
  const deposer = (evenement) => {
    evenement.preventDefault();
    setSurvolDepot(false);
    traiterFichier(evenement.dataTransfer.files[0]);
  };

  /** Contrôle de tous les champs obligatoires. Renvoie true si tout est valide. */
  const validerFormulaire = () => {
    const nouvelles = {};

    if (!formulaire.nom.trim()) nouvelles.nom = 'Ce champ est requis.';
    if (!formulaire.prenom.trim()) nouvelles.prenom = 'Ce champ est requis.';

    if (!formulaire.email.trim()) nouvelles.email = 'Ce champ est requis.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulaire.email)) {
      nouvelles.email = "L'adresse email n'est pas valide.";
    }

    if (!formulaire.telephone.trim()) nouvelles.telephone = 'Ce champ est requis.';
    if (!cv) nouvelles.cv = 'Le dépôt du CV est obligatoire.';
    if (!consentement) nouvelles.consentement = 'Vous devez accepter le traitement de vos données.';

    setErreurs(nouvelles);
    return Object.keys(nouvelles).length === 0;
  };

  /** Envoi du formulaire vers l'API. */
  const envoyer = async (evenement) => {
    evenement.preventDefault(); // empêche le rechargement de la page par le navigateur
    setErreurGenerale('');

    if (!validerFormulaire()) return;

    setEnvoiEnCours(true);
    try {
      await envoyerCandidature(id, formulaire, cv);

      // Succès : on affiche l'écran de confirmation (F06).
      // `state` transmet le titre de l'offre à la page suivante sans passer par l'URL.
      navigate('/candidature-envoyee', {
        replace: true,
        state: { titreOffre: offre?.titre },
      });
    } catch (err) {
      setErreurGenerale(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setEnvoiEnCours(false);
    }
  };

  if (chargement) return <Chargement />;

  return (
    <div className="contenu-etroit" style={{ margin: '0 auto' }}>
      {offre && (
        <div className="carte" style={{ padding: '16px 20px', marginBottom: '22px' }}>
          💼 Vous postulez pour : <strong>{offre.titre}</strong>
        </div>
      )}

      <div className="carte">
        <h1 style={{ fontSize: '24px' }}>Candidature</h1>
        <p style={{ color: 'var(--texte-doux)', marginTop: '6px' }}>
          Veuillez remplir les informations ci-dessous pour soumettre votre candidature.
        </p>

        <hr className="separateur" />

        <Message type="erreur">{erreurGenerale}</Message>

        {/* `noValidate` désactive les bulles du navigateur : on affiche nos propres messages. */}
        <form onSubmit={envoyer} noValidate>
          {/* --- Informations personnelles --- */}
          <h2 className="section-formulaire">Informations personnelles</h2>

          <div className="grille-2">
            <div className={`champ ${erreurs.nom ? 'champ-erreur' : ''}`}>
              <label htmlFor="nom">
                Nom <span className="obligatoire">*</span>
              </label>
              <input
                id="nom"
                name="nom"
                type="text"
                placeholder="Votre nom"
                value={formulaire.nom}
                onChange={changerChamp}
              />
              {erreurs.nom && <span className="message-erreur-champ">⚠ {erreurs.nom}</span>}
            </div>

            <div className={`champ ${erreurs.prenom ? 'champ-erreur' : ''}`}>
              <label htmlFor="prenom">
                Prénom <span className="obligatoire">*</span>
              </label>
              <input
                id="prenom"
                name="prenom"
                type="text"
                placeholder="Votre prénom"
                value={formulaire.prenom}
                onChange={changerChamp}
              />
              {erreurs.prenom && <span className="message-erreur-champ">⚠ {erreurs.prenom}</span>}
            </div>
          </div>

          <div className="grille-2">
            <div className={`champ ${erreurs.email ? 'champ-erreur' : ''}`}>
              <label htmlFor="email">
                Email <span className="obligatoire">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="votre.email@exemple.com"
                value={formulaire.email}
                onChange={changerChamp}
              />
              {erreurs.email && <span className="message-erreur-champ">⚠ {erreurs.email}</span>}
            </div>

            <div className={`champ ${erreurs.telephone ? 'champ-erreur' : ''}`}>
              <label htmlFor="telephone">
                Téléphone <span className="obligatoire">*</span>
              </label>
              <input
                id="telephone"
                name="telephone"
                type="tel"
                placeholder="+33 6 00 00 00 00"
                value={formulaire.telephone}
                onChange={changerChamp}
              />
              {erreurs.telephone && (
                <span className="message-erreur-champ">⚠ {erreurs.telephone}</span>
              )}
            </div>
          </div>

          {/* --- Formation --- */}
          <h2 className="section-formulaire">Formation</h2>

          <div className="grille-2">
            <div className="champ">
              <label htmlFor="diplome">Diplôme obtenu</label>
              <input
                id="diplome"
                name="diplome"
                type="text"
                placeholder="Ex : Master Ingénierie Logicielle"
                value={formulaire.diplome}
                onChange={changerChamp}
              />
            </div>

            <div className="champ">
              <label htmlFor="faculte">Faculté / établissement</label>
              <input
                id="faculte"
                name="faculte"
                type="text"
                placeholder="Nom de l'université ou école"
                value={formulaire.faculte}
                onChange={changerChamp}
              />
            </div>
          </div>

          {/* --- Dépôt du CV --- */}
          <h2 className="section-formulaire">
            Dépôt de CV <span className="obligatoire">*</span>
          </h2>

          <div
            className={`depot-cv ${survolDepot ? 'depot-cv-actif' : ''}`}
            onClick={() => champFichier.current.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setSurvolDepot(true);
            }}
            onDragLeave={() => setSurvolDepot(false)}
            onDrop={deposer}
          >
            <div className="depot-cv-icone">☁</div>
            <p className="depot-cv-titre">Glissez votre CV ici ou cliquez pour parcourir</p>
            <p className="depot-cv-aide">Formats acceptés : PDF, Word — 5 Mo maximum</p>

            {/* L'input réel est masqué : on déclenche son ouverture via la zone ci-dessus. */}
            <input
              ref={champFichier}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={(e) => traiterFichier(e.target.files[0])}
            />

            {cv && (
              <div className="fichier-choisi" onClick={(e) => e.stopPropagation()}>
                <div>
                  <div className="fichier-nom">📄 {cv.name}</div>
                  <div className="fichier-taille">{formaterTaille(cv.size)}</div>
                </div>
                <button
                  type="button"
                  className="bouton-icone"
                  onClick={() => setCv(null)}
                  aria-label="Retirer le fichier"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {erreurs.cv && (
            <span className="message-erreur-champ" style={{ marginTop: '8px' }}>
              ⚠ {erreurs.cv}
            </span>
          )}

          {/* --- Lettre de motivation (facultative) --- */}
          <h2 className="section-formulaire">Lettre de motivation (facultatif)</h2>
          <div className="champ">
            <textarea
              name="lettreMotivation"
              placeholder="Exprimez vos motivations pour ce poste..."
              value={formulaire.lettreMotivation}
              onChange={changerChamp}
            />
          </div>

          {/* --- Consentement (section 4.5 : données personnelles) --- */}
          <label className="case-a-cocher">
            <input
              type="checkbox"
              checked={consentement}
              onChange={(e) => {
                setConsentement(e.target.checked);
                setErreurs((p) => ({ ...p, consentement: '' }));
              }}
            />
            <span>
              En soumettant ce formulaire, j'accepte que mes données personnelles soient traitées
              dans le cadre du processus de recrutement.
            </span>
          </label>
          {erreurs.consentement && (
            <span className="message-erreur-champ">⚠ {erreurs.consentement}</span>
          )}

          <div style={{ textAlign: 'right', marginTop: '20px' }}>
            <button type="submit" className="bouton bouton-principal" disabled={envoiEnCours}>
              {envoiEnCours ? 'Envoi en cours...' : 'Envoyer ma candidature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormulaireCandidature;
