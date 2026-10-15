// Game registration entry for the kit's registry (src/games/index.js).
import { mount } from './main.js';

export default {
  id: 'echo-tower',
  title: 'Echo Tower',
  description: 'Two floors. One delayed echo. Reach both exits on the same turn.',
  start(container) { return mount(container); },
};
