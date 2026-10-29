import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { test, type TestContext } from 'node:test';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { creerLeServeur } from '@indos/bibliotheque/app';
import { appliquerLesMigrations, ouvrirLaBase } from '@indos/bibliotheque/base';
import { ouvrirUneBaseDEssai } from '@indos/bibliotheque/base-d-essai';
import { fabriquerUnJeton, lancerLeFauxCore } from '@indos/bibliotheque/faux-core';
import { creerLeTraitement } from '../src/serveur.ts';

const { nom, titre } = JSON.parse(readFileSync(new URL('../module.json', import.meta.url), 'utf8'));
// La page construite par `npm run build`, que l'app sert.
const page = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const ada = { id: 'p1', email: 'ada@exemple.ch', nom: 'Ada', proprietaire: true };
const eve = { id: 'p2', email: 'eve@exemple.ch', nom: 'Eve', proprietaire: false };

// L'app telle que le kit la déclare au core, avec son écran.
const apps = [{ nom, titre, lien: `https://exemple.ch/${nom}`, ecrans: [{ nom: 'notes', titre: 'Notes' }] }];

// Démarre l'app sur une base d'essai migrée et un port libre, servie sous /<nom> comme derrière le
// proxy et branchée au core donné, et rend son adresse, avec son chemin.
async function demarrer(t: TestContext, adresseDuCore?: string): Promise<string> {
  const essai = await ouvrirUneBaseDEssai();
  const base = ouvrirLaBase(essai.adresse, 1);
  t.after(async () => {
    await base.end();
    await essai.fermer();
  });
  await appliquerLesMigrations(base, new URL('../migrations/', import.meta.url));
  let traiter: ReturnType<typeof creerLeTraitement> | undefined;
  const serveur = creerLeServeur((requete, reponse) => {
    traiter?.(requete, reponse).catch((erreur) => reponse.destroy(erreur));
  }).listen(0, '127.0.0.1');
  t.after(() => {
    serveur.closeAllConnections();
    serveur.close();
  });
  await once(serveur, 'listening');
  const adresse = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}/${nom}`;
  traiter = creerLeTraitement({ base, adresse, adresseDuCore });
  return adresse;
}

async function connecter(t: TestContext, adresse: string, personne: typeof ada): Promise<Client> {
  const client = new Client({ name: 'essai', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${adresse}/mcp`), { requestInit: { headers: { authorization: `Bearer ${fabriquerUnJeton(personne, nom)}` } } }),
  );
  t.after(() => client.close());
  return client;
}

// Le JSON que rend un outil.
async function appeler(client: Client, outil: string, arguments_: Record<string, unknown>) {
  const resultat = await client.callTool({ name: outil, arguments: arguments_ });
  assert.notEqual(resultat.isError, true, JSON.stringify(resultat.content));
  return JSON.parse((resultat.content as { text: string }[])[0].text);
}

test('la racine renvoie vers l\'écran ; /sante répond ok ; une autre page est introuvable', async (t) => {
  const adresse = await demarrer(t, await lancerLeFauxCore(t, { 'session=ada': ada }, { nom: 'Essai' }, apps));
  const origine = new URL(adresse).origin;
  for (const racine of [`${adresse}/`, `${origine}/`]) {
    const reponse = await fetch(racine, { redirect: 'manual' });
    assert.equal(reponse.status, 303);
    assert.equal(reponse.headers.get('location'), `${adresse}/notes`);
  }
  assert.equal(await (await fetch(`${origine}/sante`)).text(), 'ok');
  assert.equal((await fetch(`${adresse}/ailleurs`, { headers: { cookie: 'session=ada' } })).status, 404);
});

test('l\'écran sert la page construite à une personne connectée, avec ou sans le chemin de l\'app', async (t) => {
  const adresse = await demarrer(t, await lancerLeFauxCore(t, { 'session=eve': eve }, { nom: 'Essai' }, apps));
  const origine = new URL(adresse).origin;
  for (const ecran of [`${adresse}/notes`, `${origine}/notes`]) {
    const reponse = await fetch(ecran, { headers: { cookie: 'session=eve' } });
    assert.equal(reponse.status, 200);
    assert.equal(await reponse.text(), page);
  }
  const sansSession = await fetch(`${adresse}/notes`, { redirect: 'manual' });
  assert.equal(sansSession.status, 303);
  assert.match(sansSession.headers.get('location') ?? '', /\/connexion\?retour=/);
});

test('chacun ajoute et lit ses notes, les plus récentes d\'abord, 25 par page', async (t) => {
  const adresse = await demarrer(t, await lancerLeFauxCore(t));
  const deAda = await connecter(t, adresse, ada);
  const deEve = await connecter(t, adresse, eve);
  for (let rang = 1; rang <= 26; rang += 1) {
    await appeler(deAda, 'ajouter', { texte: `Note ${rang}` });
  }
  const ajoutee = await appeler(deEve, 'ajouter', { texte: '  La seule d\'Eve  ' });
  assert.equal(ajoutee.texte, 'La seule d\'Eve');

  const premiere = await appeler(deAda, 'lister', {});
  assert.equal(premiere.total, 26);
  assert.equal(premiere.lignes.length, 25);
  assert.equal(premiere.lignes[0].texte, 'Note 26');
  const seconde = await appeler(deAda, 'lister', { page: 2 });
  assert.deepEqual(seconde.lignes.map((note: { texte: string }) => note.texte), ['Note 1']);
  assert.deepEqual(await appeler(deEve, 'lister', {}), { lignes: [ajoutee], total: 1 });

  const vide = await deEve.callTool({ name: 'ajouter', arguments: { texte: '' } });
  assert.equal(vide.isError, true);
});

test('l\'écran appelle les outils avec la session de la personne, de l\'origine de l\'app seulement', async (t) => {
  const adresse = await demarrer(t, await lancerLeFauxCore(t, { 'session=eve': eve }, { nom: 'Essai' }, apps));
  const origine = new URL(adresse).origin;
  function appelerDepuisLEcran(outil: string, corps: Record<string, unknown>, entetes: Record<string, string>) {
    return fetch(`${adresse}/outils/${outil}`, {
      method: 'POST',
      headers: { origin: origine, 'content-type': 'application/json', ...entetes },
      body: JSON.stringify(corps),
    });
  }
  assert.equal((await appelerDepuisLEcran('ajouter', { texte: 'Depuis l\'écran' }, { cookie: 'session=eve' })).status, 200);
  const liste = await appelerDepuisLEcran('lister', {}, { cookie: 'session=eve' });
  assert.equal(liste.status, 200);
  const { content } = await liste.json() as { content: { text: string }[] };
  assert.equal(JSON.parse(content[0].text).lignes[0].texte, 'Depuis l\'écran');
  assert.equal((await appelerDepuisLEcran('lister', {}, {})).status, 401);
  assert.equal((await appelerDepuisLEcran('lister', {}, { cookie: 'session=eve', origin: 'https://ailleurs.exemple' })).status, 403);
});

test('sans jeton du core, le MCP répond 401 ; sans CORE_ADRESSE, 503', async (t) => {
  const avecCore = await demarrer(t, await lancerLeFauxCore(t));
  const corps = { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' };
  assert.equal((await fetch(`${avecCore}/mcp`, corps)).status, 401);
  const sansCore = await demarrer(t);
  assert.equal((await fetch(`${sansCore}/mcp`, corps)).status, 503);
});
