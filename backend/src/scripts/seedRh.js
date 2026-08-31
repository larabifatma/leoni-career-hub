/**
 * Script d'initialisation du compte Responsable RH unique (F08bis).
 *
 * Le cahier des charges interdit toute interface d'inscription : le compte RH
 * est créé une seule fois, directement en base, par ce script.
 *
 * Lancement :  npm run seed        (depuis le dossier backend/)
 *
 * Le script est "idempotent" : s'il est relancé, il ne crée pas de doublon,
 * il met simplement à jour le mot de passe du compte existant.
 */
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { supabase } from '../config/supabaseClient.js';

dotenv.config();

// Identifiants du compte RH — à modifier ici avant le premier lancement.
const COMPTE_RH = {
  nom: 'Ben Ali',
  prenom: 'Sarra',
  email: 'rh@entreprise.com',
  motDePasse: 'MonMotDePasseSolide123!',
};

async function seed() {
  // bcrypt.hash transforme le mot de passe en empreinte irréversible (section 4.1).
  // Le "10" est le coût du hachage : plus il est élevé, plus le calcul est lent (donc sûr).
  const motDePasseHache = await bcrypt.hash(COMPTE_RH.motDePasse, 10);

  // 1. Le compte existe-t-il déjà ?
  const { data: existant } = await supabase
    .from('Compte_RH')
    .select('id_rh')
    .eq('email', COMPTE_RH.email)
    .maybeSingle();

  if (existant) {
    const { error } = await supabase
      .from('Compte_RH')
      .update({ mot_de_passe: motDePasseHache })
      .eq('id_rh', existant.id_rh);

    if (error) console.error('❌ Erreur lors de la mise à jour :', error.message);
    else console.log(`✅ Compte RH déjà présent — mot de passe mis à jour (${COMPTE_RH.email})`);
    return;
  }

  // 2. Sinon, on le crée.
  const { error } = await supabase.from('Compte_RH').insert([
    {
      nom: COMPTE_RH.nom,
      prenom: COMPTE_RH.prenom,
      email: COMPTE_RH.email,
      mot_de_passe: motDePasseHache,
    },
  ]);

  if (error) console.error('❌ Erreur lors du seed RH :', error.message);
  else console.log(`✅ Compte RH créé avec succès : ${COMPTE_RH.email}`);
}

seed();
