import type { Outil } from '@indos/bibliotheque/mcp';
import { lignesParPage } from '@indos/bibliotheque/page';
import type pg from 'pg';

// Une entrée, telle que les outils la rendent.
type Entree = { id: string; texte: string; cree_le: string };

// Les outils de l'app, les mêmes pour Claude et pour son écran : chaque personne ajoute et lit ses
// propres entrées, par l'identifiant que le core lui donne (`personne.id`).
export function outils(base: pg.Pool): Outil[] {
  return [
    {
      nom: 'ajouter',
      description: 'Ajoute une entrée, un texte court de 500 caractères au plus, à celles de la personne. Rend l\'entrée ajoutée.',
      schema: {
        type: 'object',
        properties: { texte: { type: 'string', minLength: 1, maxLength: 500, description: 'Le texte de l\'entrée.' } },
        required: ['texte'],
      },
      executer: async ({ texte }, personne) => {
        const { rows: [entree] } = await base.query<Entree>(
          'insert into entree (auteur, texte) values ($1, $2) returning id, texte, cree_le',
          [personne.id, String(texte).trim()],
        );
        return JSON.stringify(entree);
      },
    },
    {
      nom: 'lister',
      description: 'Liste les entrées de la personne, les plus récentes d\'abord, 25 par page. Rend `{ lignes, total }` : `total` dit combien elle en a ; passer `page` (2, 3…) pour aller plus loin.',
      schema: {
        type: 'object',
        properties: { page: { type: 'integer', minimum: 1, description: 'La page de la liste, à partir de 1 ; 1 sans elle.' } },
      },
      executer: async ({ page }, personne) => {
        const rang = typeof page === 'number' ? page : 1;
        const [lignes, total] = await Promise.all([
          base.query<Entree>(
            'select id, texte, cree_le from entree where auteur = $1 order by cree_le desc, id limit $2 offset $3',
            [personne.id, lignesParPage, (rang - 1) * lignesParPage],
          ),
          base.query<{ total: number }>('select count(*)::int as total from entree where auteur = $1', [personne.id]),
        ]);
        return JSON.stringify({ lignes: lignes.rows, total: total.rows[0].total });
      },
    },
  ];
}
