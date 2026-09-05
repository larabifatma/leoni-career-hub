-- ============================================================================
--  MIGRATION — Ajout du Matching IA sur les candidatures
-- ----------------------------------------------------------------------------
--  À exécuter UNE SEULE FOIS dans Supabase :
--     Dashboard  ->  SQL Editor  ->  New query  ->  coller  ->  Run
--
--  "if not exists" rend le script rejouable sans risque : si les colonnes
--  existent déjà, PostgreSQL ne fait rien et ne renvoie aucune erreur.
-- ============================================================================

-- Score global de correspondance entre le CV et l'offre, de 0 à 100.
-- NULL = la candidature n'a pas encore été analysée (ex. candidatures
-- enregistrées avant la mise en place de la fonctionnalité).
alter table "Candidature"
  add column if not exists score_ia integer;

-- Analyse détaillée renvoyée par le modèle, au format JSON :
--   { "score": 85, "points_forts": [...], "points_faibles": [...], "resume": "..." }
-- Le type JSONB permet à PostgreSQL d'indexer et d'interroger le contenu.
alter table "Candidature"
  add column if not exists analyse_ia jsonb;

-- Garde-fou : le score doit rester dans l'intervalle 0-100.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'candidature_score_ia_valide'
  ) then
    alter table "Candidature"
      add constraint candidature_score_ia_valide
      check (score_ia is null or (score_ia >= 0 and score_ia <= 100));
  end if;
end $$;

-- Index : le tableau RH trie systématiquement par score décroissant.
-- Il accélère la requête dès que le volume de candidatures augmente.
create index if not exists idx_candidature_score_ia
  on "Candidature" (id_offre, score_ia desc nulls last);

-- Vérification : la requête ci-dessous doit renvoyer 2 lignes.
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'Candidature'
  and column_name in ('score_ia', 'analyse_ia');
