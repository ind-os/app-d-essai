import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ecran, heureDeSuisse, RefusDUnAppel, useAppel, usePageDeLAdresse } from '@indos/bibliotheque/espace';
import { Bouton, Champ, Saisie, Tableau, type Colonne } from '@indos/bibliotheque/ui';
import { requeteDesNotes } from '../requetes/notes.ts';

const colonnes: Colonne[] = [{ titre: 'Note' }, { titre: 'Ajoutée', fixe: true }];

// « Notes » : un champ pour en ajouter une, par l'outil `ajouter`, puis les notes de la
// personne, 25 par page, par l'outil `lister`, les mêmes que pour Claude ; la page dans l'adresse.
// Un appel refusé se lit sous le champ, mot pour mot.
export function Notes() {
  const { page, changerDePage } = usePageDeLAdresse();
  const notes = useQuery({ ...requeteDesNotes(page), placeholderData: keepPreviousData, throwOnError: true });
  const ajouter = useAppel('ajouter');
  const client = useQueryClient();
  const lignes = (notes.data?.lignes ?? []).map((note) => [
    <span className="[overflow-wrap:anywhere]">{note.texte}</span>,
    heureDeSuisse(note.cree_le),
  ]);
  return (
    <Ecran titre="Notes" presentation="Vos notes, des textes courts que vous seul voyez. Claude les lit et en ajoute quand vous le lui demandez.">
      <form
        className="mb-5 flex flex-wrap items-end gap-2.5"
        onSubmit={(evenement) => {
          evenement.preventDefault();
          const formulaire = evenement.currentTarget;
          const texte = String(new FormData(formulaire).get('texte') ?? '').trim();
          if (!texte) {
            return;
          }
          ajouter.mutate({ texte }, {
            onSuccess: () => {
              formulaire.reset();
              void client.invalidateQueries({ queryKey: ['outils', 'lister'] });
              changerDePage(1);
            },
          });
        }}
      >
        <Champ libelle="Nouvelle note" className="min-w-0 flex-[1_1_240px]">
          <Saisie name="texte" maxLength={500} autoComplete="off" required />
        </Champ>
        <Bouton type="submit" disabled={ajouter.isPending}>Ajouter</Bouton>
      </form>
      <RefusDUnAppel appel={ajouter} />
      {notes.data && (
        <Tableau
          colonnes={colonnes}
          lignes={lignes}
          vide="Aucune note."
          pagination={{ page, total: notes.data.total, changerDePage }}
        />
      )}
    </Ecran>
  );
}
