import { readFileSync } from 'node:fs';
import { demarrer } from '@indos/bibliotheque/app';
import { appliquerLesMigrations, ouvrirLaBase } from '@indos/bibliotheque/base';
import { creerLeTraitement } from './serveur.ts';

const { nom } = JSON.parse(readFileSync(new URL('../module.json', import.meta.url), 'utf8')) as { nom: string };

// Ce que le kit lui donne (README.md, « Ce que le kit attend ») : sa base par DATABASE_URL, son
// adresse publique par ADRESSE, le core par CORE_ADRESSE.
const adresse = process.env.ADRESSE;
if (!adresse) {
  throw new Error(`La variable ADRESSE manque : l'adresse publique de l'app, avec son chemin, comme https://exemple.ch/${nom}.`);
}
const base = ouvrirLaBase();
const appliquees = await appliquerLesMigrations(base, new URL('../migrations/', import.meta.url));
if (appliquees.length > 0) {
  console.log(`Migrations appliquées : ${appliquees.join(', ')}`);
}
const traiter = creerLeTraitement({ base, adresse: adresse.replace(/\/$/, ''), adresseDuCore: process.env.CORE_ADRESSE });

demarrer(nom, (requete, reponse) => {
  traiter(requete, reponse).catch((erreur) => {
    console.error(erreur);
    if (!reponse.headersSent) {
      reponse.writeHead(500).end();
    } else {
      reponse.destroy();
    }
  });
});
