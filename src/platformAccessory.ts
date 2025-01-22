import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { HydroQuebecPeakVirtualSwitchPlatform } from './platform.js';
export type { HydroQuebecIntegration } from './hydro.js';
import { HydroQuebecIntegration } from './hydro.js';

import cron from 'node-cron';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HydroQuebecPeakVirtualSwitchAccessory {
  private isPrePeak: boolean = false;
  private service: Service;
  private hydro: HydroQuebecIntegration;

  /**
   * State tracking of the accessory
   */
  private state = {
    isOn: false,
  };

  constructor(
    private readonly platform: HydroQuebecPeakVirtualSwitchPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.isPrePeak = accessory.displayName.includes('Pre-Peak');

    // set the hydro-quebec integration
    this.hydro = new HydroQuebecIntegration(this.platform.log);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the Switch service if it exists, otherwise create a new Switch service
    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

    // schedule state updates
    const schedules = this.hydro.getCronSchedule(this.isPrePeak);
    schedules.forEach(schedule => {
      cron.schedule(schedule, async () => {
        try {
          await this.updateState();
        } catch (e) {
          this.platform.log.error('Error running CRON scheduled updateState()', e);
        }
      }, {
        timezone: 'America/New_York',
      });
    });

    // initial state update on startup (not awaited, will complete in the background)
    this.updateState();
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  async setOn() {
    // nop - can't change this accessory's state
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   */
  async getOn(): Promise<CharacteristicValue> {
    return this.state.isOn;
  }

  // Update the state of the switch
  async updateState() {
    this.state.isOn = await this.hydro.getState(this.isPrePeak);
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .updateValue(this.state.isOn);
  }
}
