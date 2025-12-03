import {
  CoreLogging,
  PeekDataProvider,
  HydroQuebecPeakData,
} from './hydro.js';

type SinopeData = {
  startDateTime: string;
  endDateTime: string;
};

export class PeekDataProviderSinope implements PeekDataProvider {
  private readonly log: CoreLogging;
  private readonly username: string;
  private readonly password: string;
  private sessionId: string | null = null;

  constructor(log: CoreLogging, username: string, password: string) {
    this.log = log;
    this.username = username;
    this.password = password;
  }

  // Retrieve peak data from Sinope API
  public async retrieveData(): Promise<HydroQuebecPeakData[]> {
    if (!this.sessionId) {
      const success = await this.login();
      if (!success) {
        return [];
      }
    }
    const url = this.createURL();
    const data = await this.fetchData(url);
    return data && Array.isArray(data) ?
      data.map((item: SinopeData) => {
        // somehow, `startDateTime` is NOT correctly reported as a valid ISO date/time from Sinope, we
        // need to adjust it. it's received as `2025-12-03 09:00:00` but should be `2025-12-03T09:00:00Z`
        // it's also 2 hours earlier than it actually should be, so we need to add 2 hours too
        const adjustedStartStr = item.startDateTime.replace(' ', 'T') + 'Z';
        const start = new Date(adjustedStartStr);
        start.setHours(start.getHours() + 2);
        const datedebut = start.toISOString();

        // end time is correct as it's received
        const end = new Date(item.endDateTime);
        const datefin = end.toISOString();

        return {
          datedebut,
          datefin,
        };
      }) : [];
  }

  // Build URL to Sinope API
  private createURL() {
    const from = new Date();
    from.setDate(from.getDate() - 2); // 2 days ago
    const to = new Date();
    to.setDate(to.getDate() + 2); // upcoming 2 days

    // ??? at the moment, not sure what the `11689` program participant ID is ???
    const u = new URL('https://neviweb.com/api/program-participants/11689/events');
    u.searchParams.append('embed', 'phases');
    u.searchParams.append('from', from.toISOString());
    u.searchParams.append('to', to.toISOString());
    u.searchParams.append('program$id', '4'); // CPC-D program ID
    return u.toString();
  }

  // Extract JSON response data from URL
  private async fetchData(url: string, tryLoginOnFail: boolean = true): Promise<SinopeData[]> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'session-id': this.sessionId || '',
        },
      });

      if (!response.ok) {
        this.log.error(`HTTP error, response body: ${JSON.stringify(response.body)}`);
        return [];
      }
      const data = await response.json();
      this.log.debug(`Fetched data: ${JSON.stringify(data)}`);
      return data;
    } catch (e) {
      if (tryLoginOnFail) {
        this.log.info('Session may have expired, attempting to re-login');
        const success = await this.login();
        if (!success) {
          return [];
        }
        return this.fetchData(url, false);
      }
      this.log.error(`Failed to fetch data at URL: '${url}', error: ${JSON.stringify(e)}`);
      return [];
    }
  }

  private async login(): Promise<boolean> {
    this.log.info('Sinope login started');
    if (!this.username || !this.password) {
      this.log.error('Sinope credentials missing: set in plugin configuration');
      return false;
    }

    try {
      const response = await fetch('https://neviweb.com/api/login', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
          interface: 'neviweb',
          stayConnected: 1,
        }),
      });

      if (!response.ok) {
        this.log.error(`Error during login, response: ${JSON.stringify(response.body)}`);
        return false;
      }

      const data = await response.json();
      if (!data || !data.session) {
        this.log.error(`Invalid login, response data: ${JSON.stringify(data)}`);
        return false;
      }
      this.sessionId = data.session;
      this.log.info('Sinope login completed successfully');
      return true;
    } catch (e) {
      this.log.error(`Failed to login to Sinope API, error: ${JSON.stringify(e)}`);
      return false;
    }
  }
}
