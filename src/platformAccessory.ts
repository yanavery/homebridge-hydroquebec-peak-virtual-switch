import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { HydroQuebecPeakVirtualSwitchPlatform } from './platform.js';
import { HydroQuebecIntegration, PeriodType } from './hydro.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HydroQuebecPeakVirtualSwitchAccessory {
  private periodType: PeriodType;
  private service: Service;

  /**
   * State tracking of the accessory
   */
  private state = {
    isOn: false,
  };

  constructor(
    private readonly platform: HydroQuebecPeakVirtualSwitchPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly hydro: HydroQuebecIntegration,
  ) {
    this.periodType = HydroQuebecPeakVirtualSwitchAccessory.getPeriodTypeFromDisplayName(accessory.displayName);

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

    // initial state update on startup (not awaited, will complete in the background)
    this.updateState(true);
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
  async updateState(init: boolean = false) {
    const currentState = this.state.isOn;
    const desiredState = await this.getStateHq();

    if (init) {
      this.platform.log.info(`Hydro-Quebec ${this.periodType} switch initialized to ${desiredState ? 'ON' : 'OFF'} state.`);
    } else {
      if (currentState === desiredState) {
        this.platform.log.info(`Hydro-Quebec ${this.periodType} switch kept in ${desiredState ? 'ON' : 'OFF'} state.`);
      } else {
        this.platform.log.info(`Hydro-Quebec ${this.periodType} switch transitioned from ${currentState ? 'ON' : 'OFF'}` +
          ` to ${desiredState ? 'ON' : 'OFF'} state.`);
      }
    }

    this.state.isOn = desiredState;
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .updateValue(this.state.isOn);
  }

  // Retrieves state as per Hydro-Quebec (doesn't update the device's internal state)
  async getStateHq(): Promise<boolean> {
    const hqState = await this.hydro.getState(this.periodType);
    return hqState;
  }

  static getPeriodTypeFromDisplayName(displayName: string): PeriodType {
    return displayName.includes('Pre-Pre-Peak')
      ? PeriodType.PRE_PRE_PEAK
      : displayName.includes('Pre-Peak')
        ? PeriodType.PRE_PEAK
        : PeriodType.PEAK;
  }
}
