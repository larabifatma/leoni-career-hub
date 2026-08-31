/**
 * Contrôleur d'authentification du Responsable RH (F08).
 *
 * Rappel du cahier des charges : il n'existe QU'UN SEUL compte RH, créé
 * directement en base par le script de seeding (`src/scripts/seedRh.js`).
 * Il n'y a donc volontairement AUCUNE route d'inscription (`/register`).
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabaseClient.js';

/**
 * POST /api/auth/login
 * Corps attendu : { email, mot_de_passe }
 * Réponse 200   : { token, rh: { id_rh, nom, prenom, email } }
 */
export const connexion = async (req, res, next) => {
  try {
    const { email, mot_de_passe } = req.body;

    // 1. Validation côté serveur (on ne fait jamais confiance au frontend seul)
    if (!email || !mot_de_passe) {
      return res.status(400).json({ error: 'Email et mot de passe sont obligatoires.' });
    }

    // 2. Recherche du compte RH correspondant à cet email
    const { data: compteRh, error } = await supabase
      .from('Compte_RH')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) return next(error);

    // 3. Message d'erreur volontairement identique si l'email OU le mot de passe est faux :
    //    cela évite de révéler quels emails existent en base.
    if (!compteRh) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // 4. bcrypt.compare re-hache le mot de passe saisi et le compare au hash stocké.
    const motDePasseValide = await bcrypt.compare(mot_de_passe, compteRh.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // 5. Génération du jeton JWT (F09 : il expire automatiquement)
    const token = jwt.sign(
      {
        id_rh: compteRh.id_rh,
        email: compteRh.email,
        nom: compteRh.nom,
        prenom: compteRh.prenom,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '8h' }
    );

    // 6. On ne renvoie JAMAIS le mot de passe haché au frontend.
    res.json({
      token,
      rh: {
        id_rh: compteRh.id_rh,
        nom: compteRh.nom,
        prenom: compteRh.prenom,
        email: compteRh.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/profil  (route privée)
 * Permet au frontend de vérifier au démarrage que le jeton stocké est toujours valide.
 * Si le middleware `verifierAuth` a laissé passer la requête, le jeton est bon.
 */
export const profil = (req, res) => {
  res.json({ rh: req.rh });
};
