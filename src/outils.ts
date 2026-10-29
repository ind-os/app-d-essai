import type { Outil } from '@indos/bibliotheque/mcp';
import { lignesParPage } from '@indos/bibliotheque/page';
import type pg from 'pg';

// Une note, telle que les outils la rendent.
type Note = { id: string; texte: string; cree_le: string };

// Les outils de l'app, les mêmes pour Claude et pour son écran : chaque personne ajoute et lit ses
// propres notes, par l'identifiant que le core lui donne (`personne.id`).
export function outils(base: pg.Pool): Outil[] {
  return [
    {
      nom: 'ajouter',
      description: 'Ajoute une note, un texte court de 500 caractères au plus, à celles de la personne. Rend la note ajoutée.',
      schema: {
        type: 'object',
        properties: { texte: { type: 'string', minLength: 1, maxLength: 500, description: 'Le texte de la note.' } },
        required: ['texte'],
      },
      executer: async ({ texte }, personne) => {
        const { rows: [note] } = await base.query<Note>(
          'insert into note (auteur, texte) values ($1, $2) returning id, texte, cree_le',
          [personne.id, String(texte).trim()],
        );
        return JSON.stringify(note);
      },
    },
    {
      nom: 'lister',
      description: 'Liste les notes de la personne, les plus récentes d\'abord, 25 par page. Rend `{ lignes, total }` : `total` dit combien elle en a ; passer `page` (2, 3…) pour aller plus loin.',
      schema: {
        type: 'object',
        properties: { page: { type: 'integer', minimum: 1, description: 'La page de la liste, à partir de 1 ; 1 sans elle.' } },
      },
      executer: async ({ page }, personne) => {
        const rang = typeof page === 'number' ? page : 1;
        const [lignes, total] = await Promise.all([
          base.query<Note>(
            'select id, texte, cree_le from note where auteur = $1 order by cree_le desc, id limit $2 offset $3',
            [personne.id, lignesParPage, (rang - 1) * lignesParPage],
          ),
          base.query<{ total: number }>('select count(*)::int as total from note where auteur = $1', [personne.id]),
        ]);
        return JSON.stringify({ lignes: lignes.rows, total: total.rows[0].total });
      },
    },
  ];
}
