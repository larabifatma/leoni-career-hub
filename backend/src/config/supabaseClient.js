/**
 * Client Supabase — point d'accès UNIQUE à la base de données et au Storage.
 *
 * C'est le seul fichier du projet où `createClient` est appelé : tous les
 * contrôleurs importent l'objet `supabase` exporté ici.
 *
 * On utilise la clé "service_role" : elle contourne les règles RLS de Supabase.
 * Elle ne doit donc JAMAIS quitter le backend (jamais côté React, jamais sur Git).
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Vérification au démarrage : un .env mal rempli est l'erreur n°1 en développement.
if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Variables manquantes dans backend/.env : SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/** Nom du bucket Supabase Storage qui contient les CV (bucket privé). */
export const BUCKET_CV = 'cvs';
