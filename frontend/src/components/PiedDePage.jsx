/** Pied de page commun à toutes les pages publiques. */
function PiedDePage() {
  const annee = new Date().getFullYear();

  return (
    <footer className="pied">
      <p className="pied-titre">Portail Carrière</p>
      <div className="pied-liens">
        <a href="#confidentialite">Politique de confidentialité</a>
        <a href="#mentions">Mentions légales</a>
        <a href="#contact">Contact</a>
      </div>
      <p>© {annee} Portail Carrière. Tous droits réservés.</p>
    </footer>
  );
}

export default PiedDePage;
