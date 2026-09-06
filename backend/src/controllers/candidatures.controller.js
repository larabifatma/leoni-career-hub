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
  SEUILS_SCORE_IA,
} from '../config/constantes.js';
import { analyserCandidature, iaDisponible } from '../services/aiMatching.service.js';

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

/**
 * Vérifie une seule fois si les colonnes du Matching IA existent en base.
 *
 * Pourquoi ce garde-fou ? Les colonnes `score_ia` et `analyse_ia` sont ajoutées
 * par un script SQL exécuté manuellement dans Supabase
 * (src/scripts/migration_score_ia.sql). Tant qu'il n'a pas été lancé, tenter
 * d'écrire dans ces colonnes ferait échouer TOUTE candidature.
 *
 * Le résultat est mis en cache : la vérification ne coûte qu'une requête au
 * premier appel, puis plus rien.
 */
let cacheColonnesIA = null;

const colonnesIaPresentes = async () => {
  if (cacheColonnesIA !== null) return cacheColonnesIA;

  const { error } = await supabase.from('Candidature').select('score_ia').limit(1);
  cacheColonnesIA = !error;

  if (!cacheColonnesIA) {
    console.warn(
      '⚠️  Colonnes score_ia / analyse_ia absentes : le Matching IA est ignoré.\n' +
        '    Exécutez src/scripts/migration_score_ia.sql dans le SQL Editor de Supabase.'
    );
  }
  return cacheColonnesIA;
};

/**
 * Répartit une liste de candidatures selon leur score IA.
 * Alimente les 3 cartes affichées en haut de l'écran « Candidatures d'une offre ».
 */
const repartitionParScore = (candidatures = []) => {
  const compteur = { eleve: 0, modere: 0, faible: 0, nonAnalyse: 0 };

  for (const c of candidatures) {
    if (c.score_ia === null || c.score_ia === undefined) compteur.nonAnalyse++;
    else if (c.score_ia >= SEUILS_SCORE_IA.ELEVE) compteur.eleve++;
    else if (c.score_ia >= SEUILS_SCORE_IA.MODERE) compteur.modere++;
    else compteur.faible++;
  }

  return compteur;
};

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
      // On récupère aussi la description et les critères : ils servent de
      // référence à l'analyse IA du CV (étape 6 bis).
      .select(
        'id_offre, titre, statut, date_expiration, description, competences_requises, type_contrat, annees_experience, diplome_requis, faculte_requise'
      )
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
    const donneesCandidature = {
      id_offre: idOffre,
      id_candidat: idCandidat,
      cv_fichier: storageData.path,
      lettre_motivation: lettre_motivation || null,
      statut: STATUTS_CANDIDATURE.EN_ATTENTE,
    };

    // --- 7 bis. Analyse IA du CV face à l'offre (Matching) ---
    // Cette étape ne peut PAS faire échouer la candidature : en cas de problème
    // (clé absente, quota dépassé, PDF illisible), le service renvoie score = null
    // et l'enregistrement se poursuit normalement. Déposer sa candidature reste
    // la fonctionnalité prioritaire (F04/F05).
    if (await colonnesIaPresentes()) {
      const { score, analyse } = await analyserCandidature(
        fichier.buffer,
        fichier.mimetype,
        offre
      );
      donneesCandidature.score_ia = score;
      donneesCandidature.analyse_ia = analyse;
    }

    const { data: candidature, error: candidatureError } = await supabase
      .from('Candidature')
      .insert([donneesCandidature])
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

    // Tri principal : score IA décroissant (les meilleurs profils en haut).
    // `nullsFirst: false` place les candidatures non analysées en fin de liste.
    // Le tri par date sert de départage entre deux scores identiques.
    if (await colonnesIaPresentes()) {
      requete = requete.order('score_ia', { ascending: false, nullsFirst: false });
    }

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

    res.json({
      offre,
      candidatures,
      total: candidatures.length,
      // Répartition affichée dans les 3 cartes en haut de l'écran RH.
      // Calculée sur la liste complète, avant tout filtrage par recherche.
      repartition: repartitionParScore(data),
    });
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

/**
 * POST /api/rh/offres/:id/analyser
 * Relance l'analyse IA des candidatures d'une offre (bouton « Relancer analyse IA »).
 *
 * Utilité principale : scorer les candidatures enregistrées AVANT la mise en
 * place de la fonctionnalité, qui ont donc `score_ia = null`.
 *
 * Paramètre optionnel : ?toutes=true pour ré-analyser aussi celles déjà scorées.
 *
 * Déroulé pour chaque candidature : télécharger le CV depuis le Storage,
 * en extraire le texte, demander le score, puis mettre à jour la ligne.
 */
export const relancerAnalyse = async (req, res, next) => {
  try {
    if (!iaDisponible()) {
      return res.status(503).json({
        error: "Analyse IA indisponible : la clé OPENAI_API_KEY n'est pas configurée sur le serveur.",
      });
    }
    if (!(await colonnesIaPresentes())) {
      return res.status(503).json({
        error:
          'Colonnes score_ia / analyse_ia absentes en base. Exécutez le script ' +
          'src/scripts/migration_score_ia.sql dans le SQL Editor de Supabase.',
      });
    }

    const idOffre = req.params.id;
    const toutesLesCandidatures = req.query.toutes === 'true';

    // 1. Récupérer l'offre, qui sert de référence à l'analyse
    const { data: offre, error: erreurOffre } = await supabase
      .from('Offre')
      .select(
        'id_offre, titre, description, competences_requises, type_contrat, annees_experience, diplome_requis, faculte_requise'
      )
      .eq('id_offre', idOffre)
      .maybeSingle();

    if (erreurOffre) return next(erreurOffre);
    if (!offre) return res.status(404).json({ error: 'Offre non trouvée.' });

    // 2. Sélectionner les candidatures à traiter
    let requete = supabase
      .from('Candidature')
      .select('id_candidature, cv_fichier, score_ia')
      .eq('id_offre', idOffre);

    // Par défaut on ne retraite que les candidatures jamais analysées :
    // cela évite de consommer inutilement des appels payants à l'IA.
    if (!toutesLesCandidatures) requete = requete.is('score_ia', null);

    const { data: candidatures, error } = await requete;
    if (error) return next(error);

    // 3. Analyser chaque CV, l'un après l'autre
    let analysees = 0;
    let echecs = 0;

    for (const candidature of candidatures) {
      try {
        // Télécharger le fichier depuis le bucket privé
        const { data: fichier, error: erreurTelechargement } = await supabase.storage
          .from(BUCKET_CV)
          .download(candidature.cv_fichier);

        if (erreurTelechargement || !fichier) {
          echecs++;
          continue;
        }

        // `.download()` renvoie un Blob : on le convertit en Buffer Node
        const buffer = Buffer.from(await fichier.arrayBuffer());

        const { score, analyse } = await analyserCandidature(buffer, 'application/pdf', offre);

        await supabase
          .from('Candidature')
          .update({ score_ia: score, analyse_ia: analyse })
          .eq('id_candidature', candidature.id_candidature);

        if (score === null) echecs++;
        else analysees++;
      } catch (err) {
        console.error('⚠️  Analyse échouée pour une candidature :', err.message);
        echecs++;
      }
    }

    res.json({
      message: `Analyse terminée : ${analysees} candidature(s) évaluée(s).`,
      analysees,
      echecs,
      total: candidatures.length,
    });
  } catch (err) {
    next(err);
  }
};
