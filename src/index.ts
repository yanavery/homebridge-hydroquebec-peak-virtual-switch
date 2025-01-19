import type { API } from 'homebridge';
import { HydroQuebecPeakVirtualSwitchPlatform } from './platform.js';
import { PLATFORM_NAME } from './settings.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HydroQuebecPeakVirtualSwitchPlatform);
};

/**
 * For local testing of Hydro-Quebec integration outside of Homebridge
 */
// import pino from 'pino';
// import { HydroQuebecIntegration } from './hydro.js';

// async function runAppLocal() {
//   const logger = pino({
//     level: 'debug',
//     transport: {
//       target: 'pino-pretty',
//       options: {
//         colorize: true,
//       },
//     },
//   });

//   const hydro = new HydroQuebecIntegration(logger);
//   await hydro.getState().then((state) => {
//     logger.info(`Current Hydro-Quebec peak state: ${state}`);
//   });
// }
// await runAppLocal();
