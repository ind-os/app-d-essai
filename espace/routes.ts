import { createRoute } from '@tanstack/react-router';
import { coquilleDeLEspace, rechercheDUnePage } from '@indos/bibliotheque/espace';
import { nom } from '../module.json';
import { Entrees } from './ecrans/entrees.tsx';

// Les écrans de la page, dans la coquille de l'espace, chacun à son chemin entier,
// `/<nom de l'app>/<nom de l'écran>`, comme le manifeste les déclare (`ecrans`) : « Entrées », la
// page de la liste dans l'adresse.
export const ecrans = [
  createRoute({ getParentRoute: () => coquilleDeLEspace, path: `/${nom}/entrees`, validateSearch: rechercheDUnePage, component: Entrees }),
];
