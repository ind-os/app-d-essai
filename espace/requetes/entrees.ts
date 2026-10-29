import { queryOptions } from '@tanstack/react-query';
import { appeler, texteDe } from '@indos/bibliotheque/espace';

// Une entrée, telle que la rendent les outils `ajouter` et `lister`.
export type Entree = { id: string; texte: string; cree_le: string };

export type PageDesEntrees = { lignes: Entree[]; total: number };

// Les entrées de la personne, page par page, par l'outil `lister`, le même que pour Claude :
// 25 lignes, et le total.
export function requeteDesEntrees(page: number) {
  return queryOptions({
    queryKey: ['outils', 'lister', page],
    queryFn: async () => JSON.parse(texteDe(await appeler('lister', { page }))) as PageDesEntrees,
  });
}
