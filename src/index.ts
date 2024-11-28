import 'dotenv/config';

import { setupBirthDayHandlers } from './handlers/birhdayHandlers';
import { setupCommandHandlers } from './handlers/commandHandlers';
import { setupSchedulers } from './scheduler.ts';


setupCommandHandlers()
setupBirthDayHandlers()
setupSchedulers();