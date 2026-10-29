import { lancerLaPage } from '@indos/bibliotheque/espace';
import { nom, version } from '../module.json';
import { ecrans } from './routes.ts';

// La page de l'espace de l'app, à sa base `/<nom>/`.
lancerLaPage({ piece: { nom, version }, base: `/${nom}/`, ecrans });
