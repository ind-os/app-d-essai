-- Les notes : un texte court, à la personne qui l'a écrit, l'identifiant du jeton du core
-- (`sub`) ; chacune ne voit que les siennes.
create table note (
  id uuid primary key default gen_random_uuid(),
  auteur text not null,
  texte text not null check (length(texte) between 1 and 500),
  cree_le timestamptz not null default now()
);

create index on note (auteur, cree_le desc);
