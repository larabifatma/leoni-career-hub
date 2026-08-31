/**
 * Contrôleur des offres d'emploi.
 *
 * Deux familles de fonctions :
 *  - PUBLIQUES (candidat) : listerOffresPubliques, detailOffrePublique, optionsDeFiltre
 *  - PRIVEES (RH)         : listerOffresRh, creerOffre, modifierOffre,
 *                           archiverOffre, supprimerOffre, statistiques
 */
import { supabase, BUCKET_CV } from '../config/supabaseClient.js';
import { STATUTS_OFFRE, STATUTS_CANDIDATURE, TAILLE_PAGE_DEFAUT } from '../config/constantes.js';

/** Date du jour au format 'AAAA-MM-JJ', utilisée pour filtrer les offres expirées. */
const dateAujourdhui = () => new Date().toISOString().split('T')[0];

/* ------------------------------------------------------------------ *
 *  PARTIE PUBLIQUE (espace Candidat, aucune authentification requise)
 * ------------------------------------------------------------------ */

/**
 * GET /api/offres
 * Liste des offres visibles par les candidats (F01 + F02).
 *
 * Une offre est visible si : statut = 'Publiée' ET (pas de date d'expiration
 * OU date d'expiration >= aujourd'hui) — règle de gestion, section 3.3.
 *
 * Filtres optionnels (F02) : ?motCle=react&typeContrat=CDI&lieu=Paris
 * Pagination (section 4.3) : ?page=1&limite=10
 */
export const listerOffresPubliques = async (req, res, next) => {
  try {
    const { motCle, typeContrat, lieu } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limite = Math.max(1, parseInt(req.query.limite) || TAILLE_PAGE_DEFAUT);
    const debut = (page - 1) * limite;

    // `count: 'exact'` demande à Supabase le nombre total de lignes (utile pour la pagination)
    let requete = supabase
      .from('Offre')
      .select('*', { count: 'exact' })
      .eq('statut', STATUTS_OFFRE.PUBLIEE)
      .or(`date_expiration.is.null,date_expiration.gte.${dateAujourdhui()}`);

    // Recherche par mot-clé sur le titre OU la description OU les compétences (F02)
    if (motCle) {
      requete = requete.or(
        `titre.ilike.%${motCle}%,description.ilike.%${motCle}%,competences_requises.ilike.%${motCle}%`
      );
    }
    if (typeContrat) requete = requete.eq('type_contrat', typeContrat);
    if (lieu) requete = requete.ilike('lieu', `%${lieu}%`);

    const { data, error, count } = await requete
      .order('date_publication', { ascending: false })
      .range(debut, debut + limite - 1);

    if (error) return next(error);

    res.json({
      offres: data,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limite),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/offres/filtres
 * Renvoie les valeurs distinctes de type de contrat et de lieu, pour remplir
 * dynamiquement les listes déroulantes de la page de recherche (F02).
 *
 * ATTENTION : cette route doit être déclarée AVANT `/:id` dans le fichier de
 * routes, sinon Express prendrait "filtres" pour un identifiant d'offre.
 */
export const optionsDeFiltre = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Offre')
      .select('type_contrat, lieu')
      .eq('statut', STATUTS_OFFRE.PUBLIEE);

    if (error) return next(error);

    // `new Set` supprime les doublons ; `filter(Boolean)` retire les valeurs vides/null
    const typesContrat = [...new Set(data.map((o) => o.type_contrat).filter(Boolean))].sort();
    const lieux = [...new Set(data.map((o) => o.lieu).filter(Boolean))].sort();

    res.json({ typesContrat, lieux });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/offres/:id
 * Détail d'une offre publiée (F03). Une offre archivée n'est pas consultable
 * publiquement : on renvoie 404 comme si elle n'existait pas.
 */
export const detailOffrePublique = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Offre')
      .select('*')
      .eq('id_offre', req.params.id)
      .eq('statut', STATUTS_OFFRE.PUBLIEE)
      .maybeSingle();

    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'Offre non trouvée ou plus disponible.' });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ *
 *  PARTIE PRIVEE (espace RH, protégée par le middleware verifierAuth)
 * ------------------------------------------------------------------ */

/**
 * GET /api/rh/offres
 * Liste TOUTES les offres (publiées + archivées) avec le nombre de
 * candidatures reçues pour chacune (F14).
 * Filtre optionnel : ?statut=Publiée
 */
export const listerOffresRh = async (req, res, next) => {
  try {
    const { statut } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limite = Math.max(1, parseInt(req.query.limite) || TAILLE_PAGE_DEFAUT);
    const debut = (page - 1) * limite;

    // `Candidature(count)` est une jointure Supabase : elle compte les candidatures liées.
    let requete = supabase.from('Offre').select('*, Candidature(count)', { count: 'exact' });

    if (statut) requete = requete.eq('statut', statut);

    const { data, error, count } = await requete
      .order('date_publication', { ascending: false })
      .range(debut, debut + limite - 1);

    if (error) return next(error);

    // On aplatit le résultat : Candidature: [{ count: 3 }] devient nb_candidatures: 3
    const offres = data.map(({ Candidature, ...offre }) => ({
      ...offre,
      nb_candidatures: Candidature?.[0]?.count ?? 0,
    }));

    res.json({
      offres,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limite),
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/rh/offres/:id — détail d'une offre côté RH (même archivée, pour l'édition). */
export const detailOffreRh = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Offre')
      .select('*')
      .eq('id_offre', req.params.id)
      .maybeSingle();

    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'Offre non trouvée.' });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * Validation des champs d'une offre, partagée par la création et la modification.
 * Renvoie un message d'erreur (texte) ou `null` si tout est correct.
 */
const validerOffre = (corps) => {
  const { titre, description, competences_requises, type_contrat } = corps;
  if (!titre || !titre.trim()) return "Le titre de l'offre est obligatoire.";
  if (!description || !description.trim()) return 'La description est obligatoire.';
  if (!competences_requises || !competences_requises.trim()) {
    return 'Les compétences requises sont obligatoires.';
  }
  if (!type_contrat || !type_contrat.trim()) return 'Le type de contrat est obligatoire.';
  return null;
};

/**
 * Construit l'objet à enregistrer en base à partir du formulaire RH.
 * Factorisé ici car la création et la modification utilisent exactement les mêmes champs.
 */
const preparerDonneesOffre = (corps) => ({
  titre: corps.titre.trim(),
  description: corps.description.trim(),
  competences_requises: corps.competences_requises.trim(),
  annees_experience: parseInt(corps.annees_experience) || 0,
  diplome_requis: corps.diplome_requis || null,
  faculte_requise: corps.faculte_requise || null,
  type_contrat: corps.type_contrat,
  lieu: corps.lieu || null,
  // Un champ date vide envoyé par un formulaire HTML vaut "" : il faut le convertir en null.
  date_expiration: corps.date_expiration || null,
  statut: corps.statut === STATUTS_OFFRE.ARCHIVEE ? STATUTS_OFFRE.ARCHIVEE : STATUTS_OFFRE.PUBLIEE,
});

/** POST /api/rh/offres — créer une nouvelle offre (F10). */
export const creerOffre = async (req, res, next) => {
  try {
    const erreurValidation = validerOffre(req.body);
    if (erreurValidation) return res.status(400).json({ error: erreurValidation });

    const { data, error } = await supabase
      .from('Offre')
      .insert([{
        ...preparerDonneesOffre(req.body),
        id_rh: req.rh.id_rh, // identifiant du RH connecté, extrait du jeton JWT
      }])
      .select()
      .single();

    if (error) return next(error);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/rh/offres/:id — modifier une offre existante (F11). */
export const modifierOffre = async (req, res, next) => {
  try {
    const erreurValidation = validerOffre(req.body);
    if (erreurValidation) return res.status(400).json({ error: erreurValidation });

    const { data, error } = await supabase
      .from('Offre')
      .update(preparerDonneesOffre(req.body))
      .eq('id_offre', req.params.id)
      .select()
      .maybeSingle();

    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'Offre non trouvée.' });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rh/offres/:id/archiver — archiver / republier une offre (F12).
 * Archiver ne supprime rien : l'offre devient simplement invisible côté candidat.
 * Corps optionnel : { statut: 'Publiée' } pour remettre l'offre en ligne.
 */
export const archiverOffre = async (req, res, next) => {
  try {
    const nouveauStatut =
      req.body && req.body.statut === STATUTS_OFFRE.PUBLIEE
        ? STATUTS_OFFRE.PUBLIEE
        : STATUTS_OFFRE.ARCHIVEE;

    const { data, error } = await supabase
      .from('Offre')
      .update({ statut: nouveauStatut })
      .eq('id_offre', req.params.id)
      .select()
      .maybeSingle();

    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'Offre non trouvée.' });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/rh/offres/:id — supprimer définitivement une offre (F13).
 *
 * Attention : la table Candidature possède une clé étrangère vers Offre.
 * On supprime donc d'abord les candidatures liées (et leurs CV dans le Storage),
 * sinon PostgreSQL refuse la suppression.
 */
export const supprimerOffre = async (req, res, next) => {
  try {
    const idOffre = req.params.id;

    // 1. Récupérer les candidatures de cette offre pour connaître les CV à supprimer
    const { data: candidatures } = await supabase
      .from('Candidature')
      .select('cv_fichier')
      .eq('id_offre', idOffre);

    // 2. Supprimer les fichiers CV du bucket Storage
    if (candidatures && candidatures.length > 0) {
      const fichiers = candidatures.map((c) => c.cv_fichier).filter(Boolean);
      if (fichiers.length > 0) await supabase.storage.from(BUCKET_CV).remove(fichiers);
    }

    // 3. Supprimer les candidatures, puis l'offre elle-même
    await supabase.from('Candidature').delete().eq('id_offre', idOffre);

    const { error } = await supabase.from('Offre').delete().eq('id_offre', idOffre);
    if (error) return next(error);

    res.json({ message: 'Offre supprimée avec succès.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rh/statistiques
 * Chiffres affichés en haut du tableau de bord RH : offres publiées,
 * total des candidatures reçues, candidatures encore en attente.
 */
export const statistiques = async (req, res, next) => {
  try {
    // `head: true` = on ne récupère aucune ligne, seulement le compteur (requête légère).
    const [offres, candidatures, enAttente] = await Promise.all([
      supabase
        .from('Offre')
        .select('*', { count: 'exact', head: true })
        .eq('statut', STATUTS_OFFRE.PUBLIEE),
      supabase.from('Candidature').select('*', { count: 'exact', head: true }),
      supabase
        .from('Candidature')
        .select('*', { count: 'exact', head: true })
        .eq('statut', STATUTS_CANDIDATURE.EN_ATTENTE),
    ]);

    res.json({
      offresPubliees: offres.count || 0,
      candidaturesRecues: candidatures.count || 0,
      candidaturesEnAttente: enAttente.count || 0,
    });
  } catch (err) {
    next(err);
  }
};
