import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from '@tanstack/react-router';
import { afterEach, expect, test, vi } from 'vitest';
import { creerLaPage, type Session } from '@indos/bibliotheque/espace';
import { nom, titre } from '../../module.json';
import { ecrans } from '../../espace/routes.ts';

afterEach(() => vi.unstubAllGlobals());

const chemin = `/${nom}/notes`;
const ada: Session = {
  id: 'p1',
  email: 'ada@exemple.ch',
  nom: 'Ada',
  proprietaire: false,
  groupes: [],
  apps: [{ nom, titre, lien: `http://localhost:3000/${nom}`, reglages: false, ecrans: [{ nom: 'notes', titre: 'Notes', chemin }] }],
  barre: [{ titre: 'Notes', chemin, app: titre }],
  theme: { nom: 'Essai', logo: false },
};

// Le résultat MCP d'un outil, tel que l'app le rend à son écran.
const resultat = (corps: unknown, isError = false) => ({ content: [{ type: 'text', text: typeof corps === 'string' ? corps : JSON.stringify(corps) }], ...(isError ? { isError } : {}) });

// Le serveur d'essai : chaque chemin appelé, avec son corps, reçoit la réponse que rend `repondre`.
function servir(repondre: (chemin: string, corps: Record<string, unknown>) => [number, unknown]) {
  const appels: { chemin: string; corps: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (chemin: string, init?: RequestInit) => {
    const corps = init?.body ? JSON.parse(String(init.body)) : {};
    appels.push({ chemin, corps });
    const [statut, reponse] = chemin === '/espace/session' ? [200, ada] : repondre(chemin, corps);
    return new Response(JSON.stringify(reponse), { status: statut, headers: { 'content-type': 'application/json' } });
  }));
  return appels;
}

function ouvrir(adresse = chemin) {
  const { Page } = creerLaPage({
    piece: { nom, version: '0.1.0' },
    base: `/${nom}/`,
    ecrans,
    historique: createMemoryHistory({ initialEntries: [adresse] }),
  });
  render(<Page />);
}

test('l\'écran liste les notes de la personne, la page dans l\'adresse', async () => {
  const appels = servir(() => [200, resultat({ lignes: [{ id: 'n1', texte: 'Appeler le notaire', cree_le: '2026-10-28T09:00:00.000Z' }], total: 26 })]);
  ouvrir(`${chemin}?page=2`);
  expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Notes');
  await screen.findByText('Appeler le notaire');
  expect(screen.getByText('28.10.2026 10:00')).toBeTruthy();
  expect(appels).toContainEqual({ chemin: `/${nom}/outils/lister`, corps: { page: 2 } });
});

test('ajouter une note appelle l\'outil, puis relit la liste', async () => {
  const notes: { id: string; texte: string; cree_le: string }[] = [];
  const appels = servir((chemin, corps) => {
    if (chemin.endsWith('/outils/ajouter')) {
      const note = { id: `n${notes.length + 1}`, texte: String(corps.texte), cree_le: '2026-10-28T09:00:00.000Z' };
      notes.unshift(note);
      return [200, resultat(note)];
    }
    return [200, resultat({ lignes: notes, total: notes.length })];
  });
  ouvrir();
  await screen.findByText('Aucune note.');
  await userEvent.type(screen.getByLabelText('Nouvelle note'), 'Relancer le devis');
  await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
  await screen.findByText('Relancer le devis');
  expect(appels).toContainEqual({ chemin: `/${nom}/outils/ajouter`, corps: { texte: 'Relancer le devis' } });
  expect((screen.getByLabelText('Nouvelle note') as HTMLInputElement).value).toBe('');
});

test('un ajout refusé se lit sous le champ, mot pour mot', async () => {
  servir((chemin) => chemin.endsWith('/outils/ajouter')
    ? [422, resultat('Le texte est trop long.', true)]
    : [200, resultat({ lignes: [], total: 0 })]);
  ouvrir();
  await screen.findByText('Aucune note.');
  await userEvent.type(screen.getByLabelText('Nouvelle note'), 'Trop long');
  await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Le texte est trop long.');
});
