import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ecran, heureDeSuisse, RefusDUnAppel, useAppel, usePageDeLAdresse } from '@indos/bibliotheque/espace';
import { Bouton, Champ, Saisie, Tableau, type Colonne } from '@indos/bibliotheque/ui';
import { requeteDesEntrees } from '../requetes/entrees.ts';

const colonnes: Colonne[] = [{ titre: 'Entrée' }, { titre: 'Ajoutée', fixe: true }];

// « Entrées » : un champ pour en ajouter une, par l'outil `ajouter`, puis les entrées de la
// personne, 25 par page, par l'outil `lister`, les mêmes que pour Claude ; la page dans l'adresse.
// Un appel refusé se lit sous le champ, mot pour mot.
export function Entrees() {
  const { page, changerDePage } = usePageDeLAdresse();
  const entrees = useQuery({ ...requeteDesEntrees(page), placeholderData: keepPreviousData, throwOnError: true });
  const ajouter = useAppel('ajouter');
  const client = useQueryClient();
  const lignes = (entrees.data?.lignes ?? []).map((entree) => [
    <span className="[overflow-wrap:anywhere]">{entree.texte}</span>,
    heureDeSuisse(entree.cree_le),
  ]);
  return (
    <Ecran titre="Entrées" presentation="Vos entrées, des textes courts que vous seul voyez. Claude les lit et en ajoute quand vous le lui demandez.">
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
        <Champ libelle="Nouvelle entrée" className="min-w-0 flex-[1_1_240px]">
          <Saisie name="texte" maxLength={500} autoComplete="off" required />
        </Champ>
        <Bouton type="submit" disabled={ajouter.isPending}>Ajouter</Bouton>
      </form>
      <RefusDUnAppel appel={ajouter} />
      {entrees.data && (
        <Tableau
          colonnes={colonnes}
          lignes={lignes}
          vide="Aucune entrée."
          pagination={{ page, total: entrees.data.total, changerDePage }}
        />
      )}
    </Ecran>
  );
}
