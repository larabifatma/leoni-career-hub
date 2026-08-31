/**
 * Barre de pagination affichée sous les listes et les tableaux
 * (exigence de performance, section 4.3 du cahier des charges).
 */
function Pagination({ page, totalPages, total, libelle = 'éléments', onChangerPage }) {
  if (!total) return null;

  return (
    <div className="pagination">
      <span>
        Page {page} sur {totalPages || 1} — {total} {libelle}
      </span>
      <div className="pagination-boutons">
        <button
          type="button"
          className="bouton bouton-neutre bouton-petit"
          disabled={page <= 1}
          onClick={() => onChangerPage(page - 1)}
        >
          Précédent
        </button>
        <button
          type="button"
          className="bouton bouton-neutre bouton-petit"
          disabled={page >= totalPages}
          onClick={() => onChangerPage(page + 1)}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

export default Pagination;
