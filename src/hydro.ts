import moment from 'moment-timezone';

const DATE_TIME_FORMAT: string = 'YYYY-MM-DD HH:mm:ss';

export type HydroQuebecPeakData = {
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

export type PeriodDefinition = {
  begin: number;
  end: number;
};

export const periodDefinitions: { [key in PeriodType]: PeriodDefinition[] } = {
  // peak period
  [PeriodType.PEAK]: [
    { begin: 6, end: 9 },
    { begin: 16, end: 20 },
  ],

  // 6 hours prior to peak period
  [PeriodType.PRE_PEAK]: [
    { begin: 0 /* 6 - 6 */, end: 3 /* 9 - 6 */ },
    { begin: 10 /* 16 - 6 */, end: 14 /* 20 - 6 */ },
  ],

  // 9 hours prior to peak period
  [PeriodType.PRE_PRE_PEAK]: [
    { begin: 21 /* 6 - 9 */, end: 0 /* 9 - 9 */ },
    { begin: 7 /* 16 - 9 */, end: 11 /* 20 - 9 */ },
  ],
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
    // any begin or end time for any period type is a potential CRON entry
    const cronEntries = Object.values(periodDefinitions).flatMap(periods =>
      periods.flatMap(period => [period.begin, period.end]),
    ).map(hour => `0 ${hour} * * *`);

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
  private createURL() {
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
  async isCurrentlyWithinPeriod(json: {results: HydroQuebecPeakData[]}, periodType: PeriodType): Promise<boolean> {
    const now = this.getNow();

    const isWithinPeriodHolistic = this.isWithinPeriodHolistic(periodType, now);
    if (isWithinPeriodHolistic) {
      if (json && json.results && json.results.length > 0) {
        for (const hqItem of json.results) {
          const isWithinPeriodHqBasis = this.isWithinPeriodHqBasis(periodType, now, hqItem);
          if (isWithinPeriodHqBasis) {
            this.log.info(`Currently within Hydro-Quebec ${periodType} period. Basis - ` +
              `now: ${now.format(DATE_TIME_FORMAT)}`);

            return true;
          }
        }
      }
    }

    this.log.info(`Currently NOT within Hydro-Quebec ${periodType} period. Basis - ` +
      `now: ${now.format(DATE_TIME_FORMAT)}`);

    return false;
  }

  isWithinPeriodHqBasis(periodType: PeriodType, now: moment.Moment, hqItem: HydroQuebecPeakData): boolean {
    // only PEAK period is considered for Hydro-Quebec basis, otherwise returning `true` to skip check
    if (periodType === PeriodType.PRE_PEAK || periodType === PeriodType.PRE_PRE_PEAK) {
      return true;
    }

    const hqBegin = moment(hqItem.datedebut);
    const hqEnd = moment(hqItem.datefin);

    for (const period of periodDefinitions[periodType]) {
      const periodBegin = this.getActualizedDateTime(hqBegin, period.begin, 'lower');
      const periodEnd = this.getActualizedDateTime(hqEnd, period.end, 'upper');

      if (now.isBetween(periodBegin, periodEnd, 'seconds', '[]')) {
        return true;
      }
    }

    return false;
  }

  isWithinPeriodHolistic(periodType: PeriodType, now: moment.Moment): boolean {
    // check to see if within PEAK period, as it trumps PRE_PEAK & PRE_PRE_PEAK period types
    if (periodType === PeriodType.PRE_PEAK || periodType === PeriodType.PRE_PRE_PEAK) {
      const isPeak = this.isWithinPeriodHolistic(PeriodType.PEAK, now);
      if (isPeak) {
        return false;
      }
      // check to see if within PRE_PEAK period, as it trumps PRE_PRE_PEAK period type
      if (periodType === PeriodType.PRE_PRE_PEAK) {
        const isPrePeak = this.isWithinPeriodHolistic(PeriodType.PRE_PEAK, now);
        if (isPrePeak) {
          return false;
        }
      }
    }

    for (const period of periodDefinitions[periodType]) {
      const periodBegin = this.getActualizedDateTime(now, period.begin, 'lower');
      const periodEnd = this.getActualizedDateTime(now, period.end, 'upper');

      if (now.isBetween(periodBegin, periodEnd, 'seconds', '[]')) {
        return true;
      }
    }

    return false;
  }

  getActualizedDateTime(dateTime: moment.Moment, hour: number, boundary: 'upper' | 'lower'): moment.Moment {
    const actualizedDateTime = moment(dateTime, 'America/New_York')
      .hour(hour)
      .minute(dateTime.minute())
      .second(dateTime.second());

    if (hour === 0 && boundary === 'upper') {
      actualizedDateTime.add(1, 'day');
    }

    return actualizedDateTime;
  }

  getNow() {
    return moment();
  }
}
