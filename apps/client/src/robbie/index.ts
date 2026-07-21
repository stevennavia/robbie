import './robbie.css';
import { RobbieController } from './RobbieController';
import { RobbieView } from './RobbieView';
import type { RobbieController as RobbieControllerApi, RobbieOptions } from './types';

export * from './types';

export function createRobbie(options: RobbieOptions): RobbieControllerApi {
  if (!options?.container || !(options.container instanceof HTMLElement)) {
    throw new TypeError('createRobbie requires a valid HTMLElement container');
  }
  const view = new RobbieView(options.container, options.className);
  return new RobbieController(view, options.state ?? 'idle', options.autoStartPersonality ?? true);
}
