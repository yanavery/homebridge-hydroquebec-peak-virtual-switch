import { Logging } from 'homebridge';
import { Logger } from 'pino';
import moment from 'moment-timezone';

export const PRE_PEAK_HOURS = 5;

const DATE_TIME_FORMAT: string = 'YYYY-MM-DD HH:mm:ss';

type HydroQuebecPeakData = {
  offre: string;
  datedebut: string;
  datefin: string;
  plagehoraire: 'AM' | 'PM';
  duree: string;
  secteurclient: string;
}

export class HydroQuebecIntegration {
  private log: Logging | Logger;

  constructor(log: Logging | Logger) {
    this.log = log;
  }

  // Extracts the CRON schedule for the pre/peak periods
  getCronSchedule(isPrePeak: boolean): string[] {
    // ['0 6 * * *', '0 9 * * *', '0 16 * * *', '0 20 * * *'];
    const hoursToRefreshPeak = [6, 9, 16, 20];

    // ['0 1 * * *', '0 4 * * *', '0 11 * * *', '0 15 * * *']
    const hoursToRefreshPrePeak = hoursToRefreshPeak.map(hour => hour - PRE_PEAK_HOURS);

    return isPrePeak
      ? hoursToRefreshPrePeak.map(hour => `0 ${hour} * * *`)
      : hoursToRefreshPeak.map(hour => `0 ${hour} * * *`);
  }

  // Return current state (boolean) for Hydro-Quebecs' pre/peak period based on current date/time
  async getState(isPrePeak: boolean) {
    try {
      const url = this.createURL();
      const response = await this.json(url);
      this.log.debug(`Raw data received from HQ: ${JSON.stringify(response)}`);

      return this.isCurrentlyWithinPeriod(response, isPrePeak);
    } catch (e) {
      this.log.error('error retrieving state', e);
      return false;
    }
  }

  // Build URL to Hydro-Quebec API
  createURL() {
    const u = new URL('https://donnees.hydroquebec.com/api/explore/v2.1/catalog/datasets/evenements-pointe/records');
    u.searchParams.append('where', 'offre = "CPC-D"');
    u.searchParams.append('order_by', 'datedebut desc');
    u.searchParams.append('limit', '5');
    return u.toString();
  }

  // Extract JSON response data from URL
  async json(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error status: ${response.status}`);
      }
      return response.json();
    } catch (e) {
      this.log.error(`Failed to fetch JSON data at URL: ${url}`, e);
      throw e;
    }
  }

  // Extract JSON data from Hydro-Quebec API response
  async isCurrentlyWithinPeriod(json: {results: HydroQuebecPeakData[]}, isPrePeak: boolean) {
    const now = moment();

    if (json && json.results && json.results.length > 0) {
      for (const item of json.results) {
        let start = moment(item.datedebut);
        start = isPrePeak ? start.subtract(PRE_PEAK_HOURS, 'hours') : start;

        let end = moment(item.datefin);
        end = isPrePeak ? end.subtract(PRE_PEAK_HOURS, 'hours') : end;

        if (now.isBetween(start, end)) {
          this.log.info(`Currently within Hydro-Quebec ${isPrePeak ? 'pre-peak' : 'peak'} period: ${now.format(DATE_TIME_FORMAT)}`);
          return true;
        }
      }
    }

    this.log.info(`Currently NOT within Hydro-Quebec ${isPrePeak ? 'pre-peak' : 'peak'} period: ${now.format(DATE_TIME_FORMAT)}`);
    return false;
  }
}
