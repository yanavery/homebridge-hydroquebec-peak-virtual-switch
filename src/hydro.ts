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

export interface CoreLogging {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (message: string, ...parameters: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (message: string, ...parameters: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (message: string, ...parameters: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (message: string, ...parameters: any) => void;
}

export class HydroQuebecIntegration {
  private log: CoreLogging;

  constructor(log: CoreLogging) {
    this.log = log;
  }

  // Extracts the CRON schedule for the pre/peak periods
  getCronSchedules(): string[] {
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

    const cronEntries = [
      ...hoursToRefreshPeak.map(hour => `0 ${hour} * * *`),
      ...hoursToRefreshPrePeak.map(hour => `0 ${hour} * * *`),
      ...hoursToRefreshPrePrePeak.map(hour => `0 ${hour} * * *`),
    ];

    // remove duplicates, if any
    const uniqueCronEntries = Array.from(new Set(cronEntries));
    this.log.info(`CRON entries: ${JSON.stringify(uniqueCronEntries)}`);

    return uniqueCronEntries;
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
    // Typical time ranges for each period:
    //
    //  PeriodType.PEAK
    //    0 HOURS PRIOR PEAK (this is PEAK)
    //    6am - 9am (3 hours range)  <-- potential 2-hours overlap with PRE_PRE_PEAK period
    //    4pm - 8pm (4 hours range)
    //
    //  PeriodType.PRE_PEAK
    //    6 HOURS PRIOR PEAK
    //    12am - 6am (6 hours range)
    //    10am - 4pm (6 hours range)
    //
    //  PeriodType.PRE_PRE_PEAK
    //    9 HOURS PRIOR PEAK
    //    9pm - 12am (3 hours range)
    //    7am - 10am (3 hours range)  <-- potential 2-hours overlap with PEAK period
    //

    const now = moment();

    if (json && json.results && json.results.length > 0) {
      for (const item of json.results) {
        let start = moment(item.datedebut);
        start = start.subtract(periodTimeAdjustmentMap[periodType], 'hours');

        let end = moment(item.datefin);
        end = end.subtract(periodTimeAdjustmentMap[periodType], 'hours');

        if (now.isBetween(start, end)) {
          this.log.info(`Currently within Hydro-Quebec ${periodType} period. Basis - ` +
            `now: ${now.format(DATE_TIME_FORMAT)}, ` +
            `start: ${start.format(DATE_TIME_FORMAT)}, ` +
            `end: ${end.format(DATE_TIME_FORMAT)}`);
          return true;
        }
      }
    }

    this.log.info(`Currently NOT within Hydro-Quebec ${periodType} period. Basis - ` +
      `now: ${now.format(DATE_TIME_FORMAT)}`);

    return false;
  }
}
