import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { setTimeout } from 'timers/promises';
import cron from 'node-cron';
import { HydroQuebecPeakVirtualSwitchAccessory } from './platformAccessory.js';
import { HydroQuebecIntegration, PeriodType } from './hydro.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class HydroQuebecPeakVirtualSwitchPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  // This is only required when using Custom Services and Characteristics not support by HomeKit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomServices: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomCharacteristics: any;

  // Hydro-Quebec integration
  private hydro: HydroQuebecIntegration;

  // Peak, Pre-Peak and Pre-Pre-Peak Handlers
  private peakHandler?: HydroQuebecPeakVirtualSwitchAccessory;
  private prePeakHandler?: HydroQuebecPeakVirtualSwitchAccessory;
  private prePrePeakHandler?: HydroQuebecPeakVirtualSwitchAccessory;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    // set the hydro-quebec integration
    this.hydro = new HydroQuebecIntegration(this.log);

    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
      // setup scheduled state updates
      this.setupCronSchedules();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    // EXAMPLE ONLY
    // A real plugin you would discover accessories from the local network, cloud services
    // or a user-defined array in the platform config.
    const devices = [
      {
        uniqueId: 'C9851E4A-00E2-44F3-90C0-81D571E03B02',
        displayName: 'Hydro Quebec Peak Event Virtual Switch',
      },
      {
        uniqueId: 'C9851E4A-00E2-44F3-90C0-81D571E03B03',
        displayName: 'Hydro Quebec Pre-Peak Event Virtual Switch',
      },
      {
        uniqueId: 'C9851E4A-00E2-44F3-90C0-81D571E03B04',
        displayName: 'Hydro Quebec Pre-Pre-Peak Event Virtual Switch',
      },
    ];

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of devices) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = device.uniqueId;

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.get(uuid);
      let handler: HydroQuebecPeakVirtualSwitchAccessory;

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // create the accessory handler for the restored accessory
        handler = new HydroQuebecPeakVirtualSwitchAccessory(this, existingAccessory, this.hydro);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.displayName);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.displayName, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        handler = new HydroQuebecPeakVirtualSwitchAccessory(this, accessory, this.hydro);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }

      // setup device handler so it can be used from CRON events
      const type = HydroQuebecPeakVirtualSwitchAccessory.getPeriodTypeFromDisplayName(device.displayName);
      if (type === PeriodType.PEAK) {
        this.peakHandler = handler;
      } else if (type === PeriodType.PRE_PEAK) {
        this.prePeakHandler = handler;
      } else if (type === PeriodType.PRE_PRE_PEAK) {
        this.prePrePeakHandler = handler;
      }

      // push into discoveredCacheUUIDs
      this.discoveredCacheUUIDs.push(uuid);
    }

    // you can also deal with accessories from the cache which are no longer present by removing them from Homebridge
    // for example, if your plugin logs into a cloud account to retrieve a device list, and a user has previously removed a device
    // from this cloud account, then this device will no longer be present in the device list but will still be in the Homebridge cache
    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info('Removing existing accessory from cache:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  setupCronSchedules() {
    const schedules = this.hydro.getCronSchedules();
    schedules.forEach(schedule => {
      cron.schedule(schedule, async () => {
        try {
          await this.performScheduledAccessoriesStateUpdate();
        } catch (e) {
          this.log.error('Error running CRON scheduled state update', e);
        }
      }, {
        timezone: 'America/New_York',
      });
    });
  }

  async performScheduledAccessoriesStateUpdate() : Promise<void> {
    // pause for 10ms between each operation to make sure nothing overlaps (time wise) and not causing any conflicts between
    // the different period types (PEAK, PRE_PEAK and PRE_PRE_PEAK) as some of the devices share their begin/end times
    await setTimeout(10);

    const peakStateHq = await this.peakHandler?.getStateHq();
    const peakStateCurrent = await this.peakHandler?.getOn();

    await setTimeout(10);

    const prePeakStateHq = await this.prePeakHandler?.getStateHq();
    const prePeakStateCurrent = await this.prePeakHandler?.getOn();

    await setTimeout(10);

    const prePrePeakStateHq = await this.prePrePeakHandler?.getStateHq();
    const prePrePeakStateCurrent = await this.prePrePeakHandler?.getOn();

    await setTimeout(10);

    // 1st run all ON -> OFF transitions, and run them in Pre-Pre-Peak, Pre-Peak, Peak sequence
    if (prePrePeakStateCurrent && !prePrePeakStateHq) {
      await this.prePrePeakHandler?.updateState();
      await setTimeout(10);
    }
    if (prePeakStateCurrent && !prePeakStateHq) {
      await this.prePeakHandler?.updateState();
      await setTimeout(10);
    }
    if (peakStateCurrent && !peakStateHq) {
      await this.peakHandler?.updateState();
      await setTimeout(10);
    }

    // 2nd run all OFF -> ON transitions, and run them in Pre-Pre-Peak, Pre-Peak, Peak sequence
    if (!prePrePeakStateCurrent && prePrePeakStateHq) {
      await this.prePrePeakHandler?.updateState();
      await setTimeout(10);
    }
    if (!prePeakStateCurrent && prePeakStateHq) {
      await this.prePeakHandler?.updateState();
      await setTimeout(10);
    }
    if (!peakStateCurrent && peakStateHq) {
      await this.peakHandler?.updateState();
      await setTimeout(10);
    }
  }
}
