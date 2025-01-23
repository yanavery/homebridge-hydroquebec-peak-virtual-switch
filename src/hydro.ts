import { Logging } from 'homebridge';
import { Logger } from 'pino';
import moment from 'moment-timezone';

const DATE_TIME_FORMAT: string = 'YYYY-MM-DD HH:mm:ss';

type HydroQuebecPeakData = {
  offre: string;
  datedebut: string;
  datefin: string;
  plagehoraire: 'AM' | 'PM';
  duree: string;
  secteurclient: string;
}

export enum PeriodType {
  PEAK = 'PEAK',
  PRE_PEAK = 'PRE_PEAK',
  PRE_PRE_PEAK = 'PRE_PRE_PEAK',
};

export const PRE_PEAK_HOURS = 6;
export const PRE_PRE_PEAK_HOURS = 9;

export const periodTimeAdjustmentMap: { [key in PeriodType]: number } = {
  [PeriodType.PEAK]:  0,
  [PeriodType.PRE_PEAK]: PRE_PEAK_HOURS,
  [PeriodType.PRE_PRE_PEAK]: PRE_PRE_PEAK_HOURS,
};

export class HydroQuebecIntegration {
  private log: Logging | Logger;

  constructor(log: Logging | Logger) {
    this.log = log;
  }

  // Extracts the CRON schedule for the pre/peak periods
  getCronSchedule(periodType: PeriodType): string[] {
    // ['0 6 * * *', '0 9 * * *', '0 16 * * *', '0 20 * * *'];
    const hoursToRefreshPeak = [6, 9, 16, 20];

    // ['0 0 * * *', '0 3 * * *', '0 10 * * *', '0 14 * * *']
    const hoursToRefreshPrePeak = hoursToRefreshPeak.map(hour => {
      return moment().startOf('day').hour(hour).subtract(PRE_PEAK_HOURS, 'hours').hour();
    });

    // ['0 21 * * *', '0 0 * * *', '0 7 * * *', '0 11 * * *']
    const hoursToRefreshPrePrePeak = hoursToRefreshPeak.map(hour => {
      return moment().startOf('day').hour(hour).subtract(PRE_PRE_PEAK_HOURS, 'hours').hour();
    });

    const cronEntries = (periodType === PeriodType.PRE_PRE_PEAK)
      ? hoursToRefreshPrePrePeak.map(hour => `0 ${hour} * * *`)
      : (periodType === PeriodType.PRE_PEAK)
        ? hoursToRefreshPrePeak.map(hour => `0 ${hour} * * *`)
        : hoursToRefreshPeak.map(hour => `0 ${hour} * * *`);

    this.log.debug(`CRON entries for ${periodType} ${JSON.stringify(cronEntries)}`);

    return cronEntries;
  }

  // Return current state (boolean) for Hydro-Quebecs' pre/peak period based on current date/time
  async getState(periodType: PeriodType) {
    try {
      const url = this.createURL();
      const response = await this.json(url);
      this.log.debug(`Raw data received from HQ: ${JSON.stringify(response)}`);

      return this.isCurrentlyWithinPeriod(response, periodType);
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
  async isCurrentlyWithinPeriod(json: {results: HydroQuebecPeakData[]}, periodType: PeriodType) {
    const now = moment();

    if (json && json.results && json.results.length > 0) {
      for (const item of json.results) {
        let start = moment(item.datedebut);
        start = start.subtract(periodTimeAdjustmentMap[periodType], 'hours');

        let end = moment(item.datefin);
        end = end.subtract(periodTimeAdjustmentMap[periodType], 'hours');

        if (now.isBetween(start, end)) {
          this.log.info(`Currently within Hydro-Quebec ${periodType} period: ${now.format(DATE_TIME_FORMAT)}`);
          return true;
        }
      }
    }

    this.log.info(`Currently NOT within Hydro-Quebec ${periodType} period: ${now.format(DATE_TIME_FORMAT)}`);
    return false;
  }
}
