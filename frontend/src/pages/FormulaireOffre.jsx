/**
 * Formulaire de création et de modification d'une offre (F10 + F11)
 * — maquette "Publier une nouvelle offre".
 *
 * Le même composant sert dans les deux cas :
 *   - /rh/offres/nouvelle          -> création (pas de :id dans l'URL)
 *   - /rh/offres/:id/modifier      -> modification (les champs sont pré-remplis)
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { creerOffre, getOffreRhById, modifierOffre } from '../services/offres';
import Chargement from '../components/Chargement';
import Message from '../components/Message';

/** Types de contrat proposés dans la liste déroulante. */
const TYPES_CONTRAT = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];

/** Valeurs de départ d'une nouvelle offre. */
const OFFRE_VIDE = {
  titre: '',
  description: '',
  competences_requises: '',
  annees_experience: 0,
  diplome_requis: '',
  faculte_requise: '',
  type_contrat: '',
  lieu: '',
  date_expiration: '',
  statut: 'Publiée',
};

function FormulaireOffre() {
  const { id } = useParams();
  const navigate = useNavigate();

  const modeEdition = Boolean(id); // s'il y a un :id dans l'URL, on modifie une offre

  const [offre, setOffre] = useState(OFFRE_VIDE);
  const [chargement, setChargement] = useState(modeEdition);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');

  // En mode édition : récupérer l'offre et pré-remplir le formulaire.
  useEffect(() => {
    if (!modeEdition) return;

    getOffreRhById(id)
      .then((donnees) => {
        setOffre({
          ...donnees,
          // Un champ <input type="date"> refuse la valeur null : on met une chaîne vide.
          date_expiration: donnees.date_expiration || '',
          diplome_requis: donnees.diplome_requis || '',
          faculte_requise: donnees.faculte_requise || '',
          lieu: donnees.lieu || '',
        });
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, [id, modeEdition]);

  /** Un seul gestionnaire pour tous les champs, grâce à l'attribut `name`. */
  const changerChamp = (evenement) => {
    const { name, value } = evenement.target;
    setOffre((precedent) => ({ ...precedent, [name]: value }));
  };

  const enregistrer = async (evenement) => {
    evenement.preventDefault();
    setErreur('');

    // Validation côté client (le backend refait les mêmes contrôles)
    if (!offre.titre.trim() || !offre.description.trim()) {
      setErreur('Le titre et la description sont obligatoires.');
      return;
    }
    if (!offre.competences_requises.trim()) {
      setErreur('Les compétences requises sont obligatoires.');
      return;
    }
    if (!offre.type_contrat) {
      setErreur('Merci de sélectionner un type de contrat.');
      return;
    }

    setEnregistrement(true);
    try {
      if (modeEdition) await modifierOffre(id, offre);
      else await creerOffre(offre);

      navigate('/rh/offres', { replace: true });
    } catch (err) {
      setErreur(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setEnregistrement(false);
    }
  };

  if (chargement) return <Chargement />;

  return (
    <form onSubmit={enregistrer} noValidate>
      <div className="rh-entete-page">
        <h1>{modeEdition ? "Modifier l'offre" : 'Publier une nouvelle offre'}</h1>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="bouton bouton-neutre"
            onClick={() => navigate('/rh/offres')}
          >
            Annuler
          </button>
          <button type="submit" className="bouton bouton-principal" disabled={enregistrement}>
            {enregistrement ? 'Enregistrement...' : modeEdition ? 'Enregistrer' : "Publier l'offre"}
          </button>
        </div>
      </div>

      <Message type="erreur">{erreur}</Message>

      {/* --- Informations générales --- */}
      <div className="carte" style={{ marginBottom: '20px' }}>
        <h2 className="carte-titre">Informations générales</h2>

        <div className="champ">
          <label htmlFor="titre">
            Titre du poste <span className="obligatoire">*</span>
          </label>
          <input
            id="titre"
            name="titre"
            type="text"
            placeholder="ex : Développeur Full-Stack Senior"
            value={offre.titre}
            onChange={changerChamp}
          />
        </div>

        <div className="grille-2">
          <div className="champ">
            <label htmlFor="type_contrat">
              Type de contrat <span className="obligatoire">*</span>
            </label>
            <select
              id="type_contrat"
              name="type_contrat"
              value={offre.type_contrat}
              onChange={changerChamp}
            >
              <option value="">Sélectionnez un type</option>
              {TYPES_CONTRAT.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="champ">
            <label htmlFor="lieu">Lieu</label>
            <input
              id="lieu"
              name="lieu"
              type="text"
              placeholder="ex : Paris, France (ou Télétravail)"
              value={offre.lieu}
              onChange={changerChamp}
            />
          </div>
        </div>
      </div>

      {/* --- Description --- */}
      <div className="carte" style={{ marginBottom: '20px' }}>
        <h2 className="carte-titre">Description</h2>

        <div className="champ">
          <label htmlFor="description">
            Description du poste <span className="obligatoire">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Décrivez les responsabilités, le contexte de l'équipe, etc."
            style={{ minHeight: '170px' }}
            value={offre.description}
            onChange={changerChamp}
          />
        </div>

        <div className="champ">
          <label htmlFor="competences_requises">
            Compétences requises <span className="obligatoire">*</span>
          </label>
          <textarea
            id="competences_requises"
            name="competences_requises"
            placeholder="Listez les compétences techniques et soft skills nécessaires..."
            value={offre.competences_requises}
            onChange={changerChamp}
          />
        </div>
      </div>

      {/* --- Critères candidat --- */}
      <div className="carte" style={{ marginBottom: '20px' }}>
        <h2 className="carte-titre">Critères candidat</h2>

        <div className="grille-3">
          <div className="champ">
            <label htmlFor="annees_experience">Années d'expérience minimales</label>
            <input
              id="annees_experience"
              name="annees_experience"
              type="number"
              min="0"
              placeholder="ex : 3"
              value={offre.annees_experience}
              onChange={changerChamp}
            />
          </div>

          <div className="champ">
            <label htmlFor="diplome_requis">Diplôme requis</label>
            <input
              id="diplome_requis"
              name="diplome_requis"
              type="text"
              placeholder="ex : Bac+5, Master"
              value={offre.diplome_requis}
              onChange={changerChamp}
            />
          </div>

          <div className="champ">
            <label htmlFor="faculte_requise">Faculté / domaine requis</label>
            <input
              id="faculte_requise"
              name="faculte_requise"
              type="text"
              placeholder="ex : Informatique, Ingénierie"
              value={offre.faculte_requise}
              onChange={changerChamp}
            />
          </div>
        </div>
      </div>

      {/* --- Publication --- */}
      <div className="carte">
        <h2 className="carte-titre">Publication</h2>

        <div className="grille-2">
          <div className="champ">
            <label htmlFor="date_expiration">Date d'expiration de l'offre</label>
            <input
              id="date_expiration"
              name="date_expiration"
              type="date"
              value={offre.date_expiration}
              onChange={changerChamp}
            />
            <span style={{ fontSize: '12px', color: 'var(--texte-doux)' }}>
              Laissez vide si l'offre n'a pas de date limite.
            </span>
          </div>

          <div className="champ">
            <label htmlFor="statut">Statut</label>
            <select id="statut" name="statut" value={offre.statut} onChange={changerChamp}>
              <option value="Publiée">Publiée (visible par les candidats)</option>
              <option value="Archivée">Archivée (masquée)</option>
            </select>
          </div>
        </div>
      </div>
    </form>
  );
}

export default FormulaireOffre;
