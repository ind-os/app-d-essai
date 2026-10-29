import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { creerLaRacine, envoyerLaPage, pageSimple } from '@indos/bibliotheque/ecran';
import { creerLeMcp } from '@indos/bibliotheque/mcp';
import { servirLaPage } from '@indos/bibliotheque/page';
import { creerLaSession } from '@indos/bibliotheque/session';
import type pg from 'pg';
import { outils } from './outils.ts';

// Le manifeste et le texte d'usage sont copiés dans l'image : l'app dit son nom et sa version, et
// son texte d'usage devient ses instructions MCP.
const manifeste = JSON.parse(readFileSync(new URL('../module.json', import.meta.url), 'utf8')) as {
  nom: string;
  version: string;
  ecrans: { nom: string }[];
};
const instructions = readFileSync(new URL('../USAGE.md', import.meta.url), 'utf8').trim();

// Les chemins de ses écrans, déclarés dans son manifeste (`ecrans`), sous son adresse.
const cheminsDesEcrans = manifeste.ecrans.map((ecran) => `/${ecran.nom}`);

export type Contexte = {
  base: pg.Pool;
  adresse: string; // son adresse publique, avec le chemin sous lequel elle est servie : https://<domaine>/<nom>
  adresseDuCore?: string;
};

// Les routes de l'app : son MCP sur /mcp et ses outils pour son écran sur /outils/<nom> ; sa page de
// l'espace, construite dans `dist/` (`npm run build`), sur le chemin de chaque écran et ses fichiers
// sur /espace/… ; sa racine, qui renvoie vers son premier écran ; une page introuvable partout
// ailleurs. Elle est servie sous un chemin du domaine du serveur : le chemin de son adresse est
// retiré s'il arrive avec la requête, pour que les routes valent avec ou sans lui. Un écran qui
// porte le nom de l'app arrive, derrière le proxy, sur ce chemin : il se reconnaît avant le retrait.
// La sonde GET /sante est servie par la bibliothèque.
export function creerLeTraitement(contexte: Contexte) {
  const prefixe = new URL(contexte.adresse).pathname.replace(/\/$/, '');
  const mcp = creerLeMcp({ app: manifeste.nom, version: manifeste.version, instructions, outils: outils(contexte.base), adresseDuCore: contexte.adresseDuCore, adresse: contexte.adresse });
  const racine = creerLaRacine({ adresse: contexte.adresse, manifeste });
  const page = servirLaPage({ dist: new URL('../dist/', import.meta.url), session: creerLaSession(contexte.adresse, contexte.adresseDuCore) });

  return async function traiter(requete: IncomingMessage, reponse: ServerResponse) {
    let chemin = new URL(requete.url ?? '/', 'http://app').pathname;
    if (!cheminsDesEcrans.includes(chemin) && prefixe && (chemin === prefixe || chemin.startsWith(`${prefixe}/`))) {
      chemin = chemin.slice(prefixe.length) || '/';
    }
    if (chemin === '/mcp' || /^\/outils\/[^/]+$/.test(chemin)) {
      await mcp(requete, reponse);
    } else if (cheminsDesEcrans.includes(chemin) || chemin.startsWith('/espace/')) {
      await page(requete, reponse, chemin);
    } else if (!(await racine(requete, reponse, chemin))) {
      envoyerLaPage(reponse, 404, pageSimple('Introuvable', 'Cette page n\'existe pas.'));
    }
  };
}
