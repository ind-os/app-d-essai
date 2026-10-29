import { createRoute } from '@tanstack/react-router';
import { coquilleDeLEspace, rechercheDUnePage } from '@indos/bibliotheque/espace';
import { nom } from '../module.json';
import { Notes } from './ecrans/notes.tsx';

// Les écrans de la page, dans la coquille de l'espace, chacun à son chemin entier,
// `/<nom de l'app>/<nom de l'écran>`, comme le manifeste les déclare (`ecrans`) : « Notes », la
// page de la liste dans l'adresse.
export const ecrans = [
  createRoute({ getParentRoute: () => coquilleDeLEspace, path: `/${nom}/notes`, validateSearch: rechercheDUnePage, component: Notes }),
];
