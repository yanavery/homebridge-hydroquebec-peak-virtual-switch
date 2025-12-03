import moment from 'moment-timezone';
import { PeekDataProviderHydro } from './dataProviderHydro.js';
import { PeekDataProviderSinope } from './dataProviderSinope.js';
import { PeakVirtualSwitchPlatformConfig } from './platform.js';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const APRIL = 3; // 0-based
const DECEMBER = 11; // 0-based

const SEASON_BEGIN_MONTH = DECEMBER;
const SEASON_BEGIN_DAY = 1;

const SEASON_END_MONTH = APRIL;
const SEASON_END_DAY = 31;

export type HydroQuebecPeakData = {
  datedebut: string;
  datefin: string;
}

export enum PeriodType {
  PEAK = 'PEAK',
  PRE_PEAK = 'PRE_PEAK',
  PRE_PRE_PEAK = 'PRE_PRE_PEAK',
};

export enum Schedule {
  AM = 'AM',
  PM = 'PM',
};

export type PeriodDefinitionTime = {
  hours: number;
  minutes: number;
};

export type PeriodDefinition = {
  schedule: Schedule,
  begin: PeriodDefinitionTime;
  end: PeriodDefinitionTime;
};

export const periodDefinitions: { [key in PeriodType]: PeriodDefinition[] } = {
  // peak period
  [PeriodType.PEAK]: [
    { schedule: Schedule.AM, begin: { hours: 6, minutes: 0 }, end: { hours: 10, minutes: 0 } },
    { schedule: Schedule.PM, begin: { hours: 16, minutes: 0 }, end: { hours: 20, minutes: 0 } },
  ],

  // hours prior to peak period
  [PeriodType.PRE_PEAK]: [
    { schedule: Schedule.AM, begin: { hours: 0, minutes: 0 }, end: { hours: 6, minutes: 0 } },
    { schedule: Schedule.PM, begin: { hours: 10, minutes: 0 }, end: { hours: 16, minutes: 0 } },
  ],

  // hours prior to pre-peak period
  [PeriodType.PRE_PRE_PEAK]: [
    { schedule: Schedule.AM, begin: { hours: 21, minutes: 0 }, end: { hours: 0, minutes: 0 } },
    { schedule: Schedule.PM, begin: { hours: 7, minutes: 0 }, end: { hours: 10, minutes: 0 } },
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

export interface PeekDataProvider {
  retrieveData(): Promise<HydroQuebecPeakData[]>;
}

export class HydroQuebecIntegration {
  private log: CoreLogging;
  private dataProviderHydro: PeekDataProvider;
  private dataProviderSinope: PeekDataProvider;

  constructor(log: CoreLogging, config: PeakVirtualSwitchPlatformConfig) {
    this.log = log;
    this.dataProviderHydro = new PeekDataProviderHydro(log);
    this.dataProviderSinope = new PeekDataProviderSinope(
      log,
      config.sinopeUsername,
      config.sinopePassword,
    );
  }

  // Extracts the CRON schedule for the pre/peak periods
  getCronSchedules(): string[] {
    // any begin or end time for any period type is a potential CRON entry
    const cronEntries = Object.values(periodDefinitions).flatMap(periods =>
      periods.flatMap(period => [period.begin, period.end]),
    ).map(time => `${time.minutes} ${time.hours} * * *`);

    // remove duplicates, if any
    const uniqueCronEntries = Array.from(new Set(cronEntries));
    this.log.info(`CRON entries: ${JSON.stringify(uniqueCronEntries)}`);

    return uniqueCronEntries;
  }

  // Return current state (boolean) for Hydro-Quebecs' pre/peak period based on current date/time
  async getState(periodType: PeriodType): Promise<boolean> {
    if (!this.isWithinSeason()) {
      this.log.info(`Outside of Hydro-Quebec winter credit season - ${periodType} is OFF.`);
      return false;
    }

    try {
      let peakData;
      const hqData = await this.dataProviderHydro.retrieveData();
      this.log.debug(`Data received from HQ: ${JSON.stringify(hqData)}`);

      if(hqData.length > 0) {
        peakData = hqData;
      } else {
        this.log.warn('No peak data retrieved from Hydro-Quebec API, trying Sinope API as fallback');
        const sinopeData = await this.dataProviderSinope.retrieveData();
        this.log.debug(`Data received from Sinope: ${JSON.stringify(sinopeData)}`);
        peakData = sinopeData;
      }

      const state = await this.isCurrentlyWithinPeriod(peakData, periodType);
      return state;
    } catch (e) {
      this.log.error('error retrieving state', e);
      return false;
    }
  }

  // Extract JSON data from Hydro-Quebec API response
  async isCurrentlyWithinPeriod(data: HydroQuebecPeakData[], periodType: PeriodType): Promise<boolean> {
    const now = this.getNow();

    if (data.length > 0) {
      const allHqPeakItems = data;
      let isWithinPeriod = false;
      if (periodType === PeriodType.PRE_PRE_PEAK) {
        const isPeak = this.isDuringHqEvent(now, allHqPeakItems, PeriodType.PEAK);
        if (isPeak) {
          return false;
        }
        const isPrePeak = this.isDuringHqEvent(now, allHqPeakItems, PeriodType.PRE_PEAK);
        if (isPrePeak) {
          return false;
        }
        isWithinPeriod = this.isDuringHqEvent(now, allHqPeakItems, PeriodType.PRE_PRE_PEAK);
      } else if (periodType === PeriodType.PRE_PEAK) {
        const isPeak = this.isDuringHqEvent(now, allHqPeakItems, PeriodType.PEAK);
        if (isPeak) {
          return false;
        }
        isWithinPeriod = this.isDuringHqEvent(now, allHqPeakItems, PeriodType.PRE_PEAK);
      } else {
        isWithinPeriod = this.isDuringHqEvent(now, allHqPeakItems, PeriodType.PEAK);
      }

      if (isWithinPeriod) {
        return true;
      }
    }

    return false;
  }

  isDuringHqEvent(now: moment.Moment, allHqPeakItems: HydroQuebecPeakData[], periodType: PeriodType): boolean {
    for (const hqPeakItem of allHqPeakItems) {
      if (this.isDuringHqPeak(now, hqPeakItem)) {
        if (periodType === PeriodType.PEAK) {
          return true;
        } else {
          continue;
        }
      }
      const hqPeakBegin = moment(hqPeakItem.datedebut);
      const hqPeakEnd = moment(hqPeakItem.datefin);
      for (const period of periodDefinitions[periodType]) {
        const periodBegin = periodType === PeriodType.PEAK
          ? hqPeakBegin
          : this.getActualizedDateTime(now, period.begin, 'lower');
        const periodEnd = periodType === PeriodType.PEAK
          ? hqPeakEnd
          : this.getActualizedDateTime(now, period.end, 'upper');

        if (now.isBetween(periodBegin, periodEnd, 'milliseconds', '[]') &&
          periodBegin.isBefore(hqPeakBegin) && Math.abs(periodBegin.diff(hqPeakBegin, 'milliseconds')) <= TWELVE_HOURS_MS &&
          periodEnd.isBefore(hqPeakEnd) && Math.abs(periodEnd.diff(hqPeakEnd, 'milliseconds')) <= TWELVE_HOURS_MS
        ) {
          return true;
        }
      }
    }

    return false;
  }

  isDuringHqPeak(now: moment.Moment, hqPeakItem: HydroQuebecPeakData): boolean {
    const hqPeakBegin = moment(hqPeakItem.datedebut);
    const hqPeakEnd = moment(hqPeakItem.datefin);

    return now.isBetween(hqPeakBegin, hqPeakEnd, 'milliseconds', '[]');
  }

  getActualizedDateTime(dateTime: moment.Moment, time: PeriodDefinitionTime, boundary: 'upper' | 'lower'): moment.Moment {
    const actualizedDateTime = moment(dateTime, 'America/New_York')
      .hour(time.hours)
      .minute(time.minutes)
      .second(0)
      .millisecond(0);

    if (time.hours === 0 && time.minutes === 0 && boundary === 'upper') {
      actualizedDateTime.add(1, 'day');
    }

    return actualizedDateTime;
  }

  isWithinSeason(): boolean {
    const now = this.getNow();

    const seasonBegin = moment(now, 'America/New_York')
      .year(now.month() >= APRIL? now.year() : now.year() - 1)
      .month(SEASON_BEGIN_MONTH)
      .date(SEASON_BEGIN_DAY)
      .hour(0)
      .minute(0)
      .second(0);

    const seasonEnd = moment(now, 'America/New_York')
      .year(now.month() < APRIL ? now.year() : now.year() + 1)
      .month(SEASON_END_MONTH)
      .date(SEASON_END_DAY)
      .hour(23)
      .minute(59)
      .second(59);

    return now.isBetween(seasonBegin, seasonEnd, 'minutes', '[]');
  }

  getNow() {
    return moment();
  }
}
