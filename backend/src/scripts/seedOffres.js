/**
 * Script OPTIONNEL : insère quelques offres d'exemple pour tester l'application
 * et préparer une démonstration (soutenance).
 *
 * Lancement :  npm run seed:offres
 *
 * Le script est sans risque : il ne recrée pas une offre dont le titre existe déjà.
 */
import dotenv from 'dotenv';
import { supabase } from '../config/supabaseClient.js';

dotenv.config();

const OFFRES = [
  {
    titre: 'Développeur Backend',
    description:
      "En tant que Développeur Backend au sein de notre équipe technique, vous jouerez un rôle central dans la conception, le développement et la maintenance de nos services et de nos architectures backend.\n\nVous collaborerez étroitement avec les équipes frontend, DevOps et produit pour délivrer des solutions performantes qui soutiennent notre croissance opérationnelle.",
    competences_requises:
      "- Maîtrise de Node.js et/ou Python pour le développement backend\n- Expérience solide avec les bases de données relationnelles (SQL, PostgreSQL)\n- Conception et développement d'APIs RESTful sécurisées\n- Connaissance des principes d'architecture micro-services et des pipelines CI/CD",
    annees_experience: 3,
    diplome_requis: 'Bac+5',
    faculte_requise: 'Informatique / IT',
    type_contrat: 'CDI',
    lieu: 'Paris (Hybride)',
  },
  {
    titre: 'Chargé de Recrutement',
    description:
      "Accompagnez la croissance de nos équipes en dénichant les meilleurs talents.\n\nVous piloterez le processus de recrutement de bout en bout : définition du besoin avec les managers, sourcing, entretiens et suivi de l'intégration.",
    competences_requises:
      "- Expérience en sourcing et en conduite d'entretiens\n- Excellent relationnel et sens de l'écoute\n- Maîtrise des outils de suivi de candidatures\n- Bonne connaissance du marché de l'emploi",
    annees_experience: 2,
    diplome_requis: 'Bac+3',
    faculte_requise: 'Ressources Humaines',
    type_contrat: 'CDD',
    lieu: 'Lyon',
  },
  {
    titre: 'Ingénieur DevOps',
    description:
      "Optimisez nos pipelines de déploiement et assurez la stabilité de nos infrastructures.\n\nVous serez le garant de la disponibilité de nos environnements et de l'automatisation de nos mises en production.",
    competences_requises:
      '- Docker et Kubernetes\n- Intégration et déploiement continus (GitLab CI, GitHub Actions)\n- Infrastructure as Code (Terraform, Ansible)\n- Supervision et observabilité (Prometheus, Grafana)',
    annees_experience: 4,
    diplome_requis: 'Bac+5',
    faculte_requise: 'Informatique / IT',
    type_contrat: 'CDI',
    lieu: 'Télétravail',
  },
  {
    titre: 'Stagiaire Marketing Digital',
    description:
      "Appuyez l'équipe communication dans le déploiement de nos campagnes digitales.\n\nStage conventionné de 6 mois, avec un accompagnement personnalisé et de réelles responsabilités.",
    competences_requises:
      "- Bonne culture des réseaux sociaux\n- Notions de référencement (SEO) et d'analyse d'audience\n- Excellentes qualités rédactionnelles\n- Curiosité et autonomie",
    annees_experience: 0,
    diplome_requis: 'Bac+3 en cours',
    faculte_requise: 'Marketing / Communication',
    type_contrat: 'Stage',
    lieu: 'Paris',
  },
];

async function seed() {
  // On récupère le compte RH unique : chaque offre doit être rattachée à son créateur.
  const { data: rh } = await supabase.from('Compte_RH').select('id_rh').limit(1).maybeSingle();

  if (!rh) {
    console.error('❌ Aucun compte RH en base. Lancez d\'abord : npm run seed');
    return;
  }

  for (const offre of OFFRES) {
    const { data: existante } = await supabase
      .from('Offre')
      .select('id_offre')
      .eq('titre', offre.titre)
      .maybeSingle();

    if (existante) {
      console.log(`↷ Ignorée (déjà présente) : ${offre.titre}`);
      continue;
    }

    const { error } = await supabase.from('Offre').insert([{ ...offre, id_rh: rh.id_rh }]);

    if (error) console.error(`❌ ${offre.titre} :`, error.message);
    else console.log(`✅ Offre créée : ${offre.titre}`);
  }
}

seed();
