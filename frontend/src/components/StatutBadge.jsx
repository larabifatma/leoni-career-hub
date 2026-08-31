/**
 * Petite pastille colorée affichant un statut.
 * Utilisée pour les offres (Publiée / Archivée) et les candidatures
 * (En attente / Accepté / Refusé).
 */

// À chaque statut correspond une classe CSS définie dans styles/index.css.
const COULEURS = {
  'Publiée': 'badge-vert',
  'Archivée': 'badge-gris',
  'En attente': 'badge-orange',
  'Accepté': 'badge-bleu',
  'Refusé': 'badge-rouge',
};

function StatutBadge({ statut }) {
  const couleur = COULEURS[statut] || 'badge-gris';
  return <span className={`badge ${couleur}`}>{statut}</span>;
}

export default StatutBadge;
