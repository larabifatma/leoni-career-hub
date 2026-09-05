/**
 * Affichage du score de Matching IA.
 *
 * Ce fichier regroupe trois éléments liés à la même notion, pour éviter
 * d'éparpiller la logique de couleur dans plusieurs composants :
 *   - SEUILS       : les bornes de classement (identiques au backend)
 *   - niveauScore  : convertit un score en niveau ('eleve' | 'modere' | 'faible')
 *   - ScoreIA      : le badge coloré affiché dans les tableaux
 */

/** Seuils identiques à ceux du backend (config/constantes.js). */
export const SEUILS = { ELEVE: 75, MODERE: 50 };

/**
 * Convertit un score numérique en niveau.
 * @param {number|null} score
 * @returns {'eleve'|'modere'|'faible'|'inconnu'}
 */
export const niveauScore = (score) => {
  if (score === null || score === undefined) return 'inconnu';
  if (score > SEUILS.ELEVE) return 'eleve';
  if (score >= SEUILS.MODERE) return 'modere';
  return 'faible';
};

/** Classe CSS correspondant à chaque niveau (définies dans styles/index.css). */
const CLASSES = {
  eleve: 'score-eleve',
  modere: 'score-modere',
  faible: 'score-faible',
  inconnu: 'score-inconnu',
};

/**
 * Badge de score affiché dans les tableaux de candidatures.
 * @param {number|null} score - le score de 0 à 100, ou null si non analysé
 */
function ScoreIA({ score }) {
  const niveau = niveauScore(score);

  if (niveau === 'inconnu') {
    return <span className="badge-score score-inconnu">Non analysé</span>;
  }

  return (
    <span className={`badge-score ${CLASSES[niveau]}`}>
      <span className="pastille-score" />
      {score}% Match
    </span>
  );
}

export default ScoreIA;
