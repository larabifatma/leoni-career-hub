/**
 * Déclaration de toutes les routes de l'application (React Router).
 *
 * Organisation :
 *   - routes publiques  : encadrées par LayoutPublic (en-tête + pied de page)
 *   - route de connexion: sans gabarit (page pleine hauteur)
 *   - routes RH         : encadrées par RouteProtegee (vérifie le jeton JWT)
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import LayoutPublic from './components/LayoutPublic';
import RouteProtegee from './components/RouteProtegee';

import Accueil from './pages/Accueil';
import ListeOffres from './pages/ListeOffres';
import DetailOffre from './pages/DetailOffre';
import FormulaireCandidature from './pages/FormulaireCandidature';
import ConfirmationCandidature from './pages/ConfirmationCandidature';

import ConnexionRH from './pages/ConnexionRH';
import DashboardRH from './pages/DashboardRH';
import FormulaireOffre from './pages/FormulaireOffre';
import CandidaturesOffre from './pages/CandidaturesOffre';
import DetailCandidature from './pages/DetailCandidature';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Espace Candidat (public) --- */}
        <Route element={<LayoutPublic />}>
          <Route path="/" element={<Accueil />} />
          <Route path="/offres" element={<ListeOffres />} />
          <Route path="/offres/:id" element={<DetailOffre />} />
          <Route path="/offres/:id/postuler" element={<FormulaireCandidature />} />
          <Route path="/candidature-envoyee" element={<ConfirmationCandidature />} />
        </Route>

        {/* --- Connexion RH (public, sans en-tête ni pied de page) --- */}
        <Route path="/rh/connexion" element={<ConnexionRH />} />

        {/* --- Espace RH (privé : RouteProtegee redirige si aucun jeton) --- */}
        <Route element={<RouteProtegee />}>
          <Route path="/rh" element={<Navigate to="/rh/tableau-de-bord" replace />} />
          <Route path="/rh/tableau-de-bord" element={<DashboardRH />} />
          <Route path="/rh/offres" element={<DashboardRH />} />
          <Route path="/rh/offres/nouvelle" element={<FormulaireOffre />} />
          <Route path="/rh/offres/:id/modifier" element={<FormulaireOffre />} />
          <Route path="/rh/offres/:id/candidatures" element={<CandidaturesOffre />} />
          <Route path="/rh/candidatures" element={<CandidaturesOffre />} />
          <Route path="/rh/candidatures/:id" element={<DetailCandidature />} />
        </Route>

        {/* --- URL inconnue : on renvoie vers l'accueil --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
