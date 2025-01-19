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

export class HydroQuebecIntegration {
  private log: Logging | Logger;

  constructor(log: Logging | Logger) {
    this.log = log;
  }

  // Return current state (boolean) for Hydro-Quebecs' peak period based on current date/time
  async getState() {
    try {
      const url = this.createURL();
      const response = await this.json(url);
      return this.isCurrentlyWithinPeakPeriod(response);
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
  async isCurrentlyWithinPeakPeriod(json: {results: HydroQuebecPeakData[]}) {
    this.log.debug(`Raw data received from HQ: ${JSON.stringify(json)}`);

    const now = moment();

    if (json && json.results && json.results.length > 0) {
      for (const item of json.results) {
        const start = moment(item.datedebut);
        const end = moment(item.datefin);
        if (now.isBetween(start, end)) {
          this.log.info(`Currently within Hydro-Quebec peak period: ${now.format(DATE_TIME_FORMAT)}`);
          return true;
        }
      }
    }

    this.log.info(`Currently NOT within Hydro-Quebec peak period: ${now.format(DATE_TIME_FORMAT)}`);
    return false;
  }
}
