/** Message affiché pendant l'attente d'une réponse de l'API. */
function Chargement({ texte = 'Chargement en cours...' }) {
  return <p className="etat-vide">{texte}</p>;
}

export default Chargement;
