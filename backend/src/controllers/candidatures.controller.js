/**
 * Contrôleur des candidatures.
 *
 *  - PUBLIQUE (candidat) : creerCandidature  (formulaire + dépôt du CV)
 *  - PRIVEES (RH)        : listerCandidatures, candidaturesParOffre,
 *                          detailCandidature, lienCv, changerStatut
 */
import { supabase, BUCKET_CV } from '../config/supabaseClient.js';
import {
  STATUTS_CANDIDATURE,
  STATUTS_CANDIDATURE_VALIDES,
  TAILLE_PAGE_DEFAUT,
  DUREE_URL_CV,
} from '../config/constantes.js';

/**
 * Nettoie le nom d'un fichier pour le Storage : Supabase n'accepte ni les accents,
 * ni les espaces, ni les caractères spéciaux dans les chemins de fichiers.
 * Exemple : "CV Jean Dupont (2024).pdf" -> "CV_Jean_Dupont__2024_.pdf"
 */
const nettoyerNomFichier = (nom) =>
  nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents (é -> e)
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // remplace tout le reste par "_"

/** Vérifie qu'une chaîne ressemble à une adresse email. */
const emailValide = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* ------------------------------------------------------------------ *
 *  PARTIE PUBLIQUE (espace Candidat)
 * ------------------------------------------------------------------ */

/**
 * POST /api/offres/:id/candidatures
 * Soumission d'une candidature avec dépôt du CV (F04 + F05 + F06 + F07).
 *
 * La requête arrive en `multipart/form-data` :
 *   - les champs texte sont dans `req.body`
 *   - le fichier CV est dans `req.file` (placé là par le middleware Multer)
 *
 * Déroulé : validation -> vérification de l'offre -> anti-doublon (F07)
 *           -> upload du CV -> création/réutilisation du Candidat -> Candidature.
 */
export const creerCandidature = async (req, res, next) => {
  try {
    const idOffre = req.params.id;
    const { nom, prenom, email, telephone, diplome, faculte, lettre_motivation } = req.body;
    const fichier = req.file;

    // --- 1. Validation côté serveur (section 4.1 : ne jamais faire confiance au frontend) ---
    if (!nom || !prenom || !email || !telephone) {
      return res
        .status(400)
        .json({ error: 'Les champs Nom, Prénom, Email et Téléphone sont obligatoires.' });
    }
    if (!emailValide(email)) {
      return res.status(400).json({ error: "L'adresse email saisie n'est pas valide." });
    }
    if (!fichier) {
      return res.status(400).json({ error: 'Le dépôt du CV est obligatoire.' });
    }

    const emailNormalise = email.trim().toLowerCase();

    // --- 2. L'offre existe-t-elle et accepte-t-elle encore des candidatures ? ---
    const { data: offre } = await supabase
      .from('Offre')
      .select('id_offre, titre, statut, date_expiration')
      .eq('id_offre', idOffre)
      .maybeSingle();

    if (!offre) {
      return res.status(404).json({ error: 'Offre non trouvée.' });
    }
    if (offre.statut !== 'Publiée') {
      return res.status(400).json({ error: "Cette offre n'accepte plus de candidatures." });
    }
    if (offre.date_expiration && offre.date_expiration < new Date().toISOString().split('T')[0]) {
      return res.status(400).json({ error: 'La date limite de candidature est dépassée.' });
    }

    // --- 3. Le candidat existe-t-il déjà (même email) ? ---
    // La table Candidat évite de dupliquer les infos si la personne postule à plusieurs offres.
    const { data: candidatExistant } = await supabase
      .from('Candidat')
      .select('id_candidat')
      .eq('email', emailNormalise)
      .maybeSingle();

    let idCandidat = candidatExistant ? candidatExistant.id_candidat : null;

    // --- 4. Anti double candidature (F07) : on vérifie AVANT d'uploader le CV ---
    if (idCandidat) {
      const { data: doublon } = await supabase
        .from('Candidature')
        .select('id_candidature')
        .eq('id_offre', idOffre)
        .eq('id_candidat', idCandidat)
        .maybeSingle();

      if (doublon) {
        return res
          .status(409) // 409 Conflict = la ressource existe déjà
          .json({ error: 'Vous avez déjà postulé à cette offre avec cette adresse email.' });
      }
    }

    // --- 5. Upload du CV dans le bucket privé "cvs" ---
    // Le préfixe horodaté garantit un nom unique même si deux candidats
    // envoient un fichier appelé "cv.pdf".
    const nomFichier = `${Date.now()}_${nettoyerNomFichier(fichier.originalname)}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET_CV)
      .upload(nomFichier, fichier.buffer, { contentType: fichier.mimetype });

    if (storageError) {
      return next(new Error(`Échec de l'envoi du CV : ${storageError.message}`));
    }

    // --- 6. Créer le candidat s'il n'existe pas encore ---
    if (!idCandidat) {
      const { data: nouveauCandidat, error: candidatError } = await supabase
        .from('Candidat')
        .insert([{
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: emailNormalise,
          telephone: telephone.trim(),
          diplome: diplome || null,
          faculte: faculte || null,
        }])
        .select()
        .single();

      if (candidatError) {
        // Le CV a déjà été envoyé : on le retire pour ne pas laisser de fichier orphelin.
        await supabase.storage.from(BUCKET_CV).remove([nomFichier]);
        return next(candidatError);
      }
      idCandidat = nouveauCandidat.id_candidat;
    }

    // --- 7. Créer la candidature (relie Candidat + Offre + fichier CV) ---
    // Le statut initial 'En attente' est la valeur par défaut de la colonne (règle 3.3).
    const { data: candidature, error: candidatureError } = await supabase
      .from('Candidature')
      .insert([{
        id_offre: idOffre,
        id_candidat: idCandidat,
        cv_fichier: storageData.path,
        lettre_motivation: lettre_motivation || null,
        statut: STATUTS_CANDIDATURE.EN_ATTENTE,
      }])
      .select()
      .single();

    if (candidatureError) {
      await supabase.storage.from(BUCKET_CV).remove([nomFichier]);

      // Code 23505 = violation de contrainte unique (id_offre, id_candidat) -> F07
      if (candidatureError.code === '23505') {
        return res
          .status(409)
          .json({ error: 'Vous avez déjà postulé à cette offre avec cette adresse email.' });
      }
      return next(candidatureError);
    }

    // --- 8. Confirmation renvoyée au candidat (F06) ---
    res.status(201).json({
      success: true,
      message: 'Votre candidature a bien été envoyée.',
      candidature,
      offre: { id_offre: offre.id_offre, titre: offre.titre },
    });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ *
 *  PARTIE PRIVEE (espace RH)
 * ------------------------------------------------------------------ */

/**
 * Sélection Supabase réutilisée pour les listes de candidatures.
 * `Candidat(...)` et `Offre(...)` sont des jointures automatiques basées sur
 * les clés étrangères : on récupère la candidature ET les infos liées en une requête.
 */
const SELECTION_COMPLETE = `
  *,
  Candidat ( id_candidat, nom, prenom, email, telephone, diplome, faculte ),
  Offre ( id_offre, titre, type_contrat, lieu )
`;

/**
 * GET /api/rh/candidatures
 * Liste de toutes les candidatures, avec filtres (F18) :
 * ?statut=En attente&idOffre=...&recherche=dupont&page=1
 */
export const listerCandidatures = async (req, res, next) => {
  try {
    const { statut, idOffre } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limite = Math.max(1, parseInt(req.query.limite) || TAILLE_PAGE_DEFAUT);
    const debut = (page - 1) * limite;

    let requete = supabase
      .from('Candidature')
      .select(SELECTION_COMPLETE, { count: 'exact' });

    if (statut) requete = requete.eq('statut', statut);
    if (idOffre) requete = requete.eq('id_offre', idOffre);

    const { data, error, count } = await requete
      .order('date_candidature', { ascending: false })
      .range(debut, debut + limite - 1);

    if (error) return next(error);

    res.json({
      candidatures: data,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limite),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rh/offres/:id/candidatures
 * Candidatures reçues pour UNE offre précise (F15).
 * Filtres optionnels : ?statut=Accepté&recherche=dupont
 */
export const candidaturesParOffre = async (req, res, next) => {
  try {
    const { statut, recherche } = req.query;

    // On renvoie aussi le titre de l'offre pour l'afficher dans le fil d'ariane du frontend.
    const { data: offre } = await supabase
      .from('Offre')
      .select('id_offre, titre, statut')
      .eq('id_offre', req.params.id)
      .maybeSingle();

    if (!offre) return res.status(404).json({ error: 'Offre non trouvée.' });

    let requete = supabase
      .from('Candidature')
      .select(SELECTION_COMPLETE)
      .eq('id_offre', req.params.id);

    if (statut) requete = requete.eq('statut', statut);

    const { data, error } = await requete.order('date_candidature', { ascending: false });
    if (error) return next(error);

    // La recherche par nom porte sur la table liée Candidat : on filtre en JavaScript,
    // ce qui reste simple et suffisant pour le volume de données de ce projet.
    let candidatures = data;
    if (recherche) {
      const terme = recherche.toLowerCase();
      candidatures = candidatures.filter((c) => {
        const nomComplet = `${c.Candidat?.prenom || ''} ${c.Candidat?.nom || ''}`.toLowerCase();
        const email = (c.Candidat?.email || '').toLowerCase();
        return nomComplet.includes(terme) || email.includes(terme);
      });
    }

    res.json({ offre, candidatures, total: candidatures.length });
  } catch (err) {
    next(err);
  }
};

/** GET /api/rh/candidatures/:id — détail complet d'une candidature (F16). */
export const detailCandidature = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Candidature')
      .select(SELECTION_COMPLETE)
      .eq('id_candidature', req.params.id)
      .maybeSingle();

    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'Candidature non trouvée.' });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rh/candidatures/:id/cv
 * Renvoie une URL signée temporaire permettant de télécharger le CV (F16).
 *
 * Le bucket "cvs" est privé (données personnelles, section 4.5) : on ne diffuse
 * donc jamais d'URL publique, mais un lien valable seulement quelques minutes.
 */
export const lienCv = async (req, res, next) => {
  try {
    const { data: candidature, error } = await supabase
      .from('Candidature')
      .select('cv_fichier, Candidat ( nom, prenom )')
      .eq('id_candidature', req.params.id)
      .maybeSingle();

    if (error) return next(error);
    if (!candidature) return res.status(404).json({ error: 'Candidature non trouvée.' });

    const { data: lien, error: erreurLien } = await supabase.storage
      .from(BUCKET_CV)
      .createSignedUrl(candidature.cv_fichier, DUREE_URL_CV);

    if (erreurLien) {
      return next(new Error(`Impossible de générer le lien du CV : ${erreurLien.message}`));
    }

    res.json({
      url: lien.signedUrl,
      nomFichier: candidature.cv_fichier,
      expireDans: DUREE_URL_CV,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rh/candidatures/:id/statut
 * Change le statut d'une candidature : En attente / Accepté / Refusé (F17).
 * Corps attendu : { statut: "Accepté" }
 */
export const changerStatut = async (req, res, next) => {
  try {
    const { statut } = req.body;

    // On refuse toute valeur qui ne fait pas partie des trois statuts prévus.
    if (!STATUTS_CANDIDATURE_VALIDES.includes(statut)) {
      return res.status(400).json({
        error: `Statut invalide. Valeurs autorisées : ${STATUTS_CANDIDATURE_VALIDES.join(', ')}.`,
      });
    }

    const { data, error } = await supabase
      .from('Candidature')
      .update({ statut })
      .eq('id_candidature', req.params.id)
      .select(SELECTION_COMPLETE)
      .maybeSingle();

    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'Candidature non trouvée.' });

    res.json(data);
  } catch (err) {
    next(err);
  }
};
