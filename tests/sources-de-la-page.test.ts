import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

// Les sources de la page, `espace/`, n'écrivent jamais de HTML brut : React échappe tout ce qu'il
// rend, et un texte venu de l'app, d'une personne ou de Claude ne devient jamais du HTML.
const interdits = /dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|document\.write/;

test('les sources de la page n\'écrivent jamais de HTML brut', () => {
  const espace = new URL('../espace/', import.meta.url);
  const fautes: string[] = [];
  for (const fichier of readdirSync(espace, { recursive: true, encoding: 'utf8' })) {
    if (!/\.(tsx?|css|html)$/.test(fichier)) {
      continue;
    }
    readFileSync(new URL(fichier, espace), 'utf8').split('\n').forEach((ligne, rang) => {
      if (interdits.test(ligne)) {
        fautes.push(`espace/${fichier}:${rang + 1} : ${ligne.trim()}`);
      }
    });
  }
  assert.ok(fautes.length === 0, fautes.join('\n'));
});
