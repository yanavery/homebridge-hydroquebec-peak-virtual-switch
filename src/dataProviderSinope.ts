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
  private accountId: string | null = null;
  private locationId: string | null = null;
  private programId: string | null = null;
  private programParticipantId: string | null = null;

  constructor(log: CoreLogging, username: string, password: string) {
    this.log = log;
    this.username = username;
    this.password = password;
  }

  // Retrieve peak data from Sinope API
  public async retrieveData(): Promise<HydroQuebecPeakData[]> {
    const success = await this.initializeIdsIfNeeded();
    if (!success) {
      return [];
    }
    const data = await this.fetchPeakEvents(this.programParticipantId!, this.programId!);
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

  private async initializeIdsIfNeeded(): Promise<boolean> {
    if (this.sessionId && this.accountId && this.locationId && this.programId && this.programParticipantId) {
      return true;
    }
    let result = await this.login();
    if (!result) {
      return false;
    }
    result = await this.fetchLocation(this.accountId!);
    if (!result) {
      return false;
    }
    result = await this.fetchHQWinterCreditProgram(this.locationId!);
    if (!result) {
      return false;
    }
    result = await this.fetchProgramParticipant(this.locationId!, this.accountId!);
    if (!result) {
      return false;
    }
    return true;
  }

  private async fetchPeakEvents(programParticipantId: string, programId: string): Promise<SinopeData[]> {
    this.log.debug(`Fetching peak events for program participant ID: '${programParticipantId}' & program ID: '${programId}'`);
    const result = await this.fetchData(
      this.createEventsUrl({ programParticipantId, programId }),
      true, // try re-login on failure
    );
    this.log.debug(`Fetched peak events: ${JSON.stringify(result)}`);
    return result as SinopeData[];
  }

  private createEventsUrl(params: { programParticipantId: string; programId: string; }) {
    const from = new Date();
    from.setDate(from.getDate() - 2); // 2 days ago
    const to = new Date();
    to.setDate(to.getDate() + 2); // upcoming 2 days

    const u = new URL(`https://neviweb.com/api/program-participants/${params.programParticipantId}/events`);
    u.searchParams.append('embed', 'phases');
    u.searchParams.append('from', from.toISOString());
    u.searchParams.append('to', to.toISOString());
    u.searchParams.append('program$id', params.programId);
    return u.toString();
  }

  private async fetchLocation(accountId: string): Promise<boolean> {
    this.log.debug(`Fetching locations for account ID: '${accountId}'`);
    const result = await this.fetchData(this.createLocationsUrl({ accountId }));
    if (!result || !Array.isArray(result) || result.length <= 0 || result[0].id === undefined) {
      this.log.error(`No locations found for Sinope account, data: ${JSON.stringify(result)}`);
      return false;
    }
    this.locationId = result[0].id;
    this.log.debug(`Found location ID: ${this.locationId}`);
    return true;
  }

  private createLocationsUrl(params: { accountId: string }) {
    const u = new URL('https://neviweb.com/api/locations');
    u.searchParams.append('account$id', params.accountId);
    return u.toString();
  }

  private async fetchHQWinterCreditProgram(locationId: string): Promise<boolean> {
    this.log.debug(`Fetching HQ winter credit program for location ID: '${locationId}'`);
    const result = await this.fetchData(this.createProgramsUrl({ locationId }));
    if (!result || !Array.isArray(result) || result.length <= 0) {
      this.log.error(`No programs found for location, data: ${JSON.stringify(result)}`);
      return false;
    }
    const programs = result.filter((program) => program.ref === 'SINOPE-HQ-WINCR');
    if (programs.length !== 1) {
      this.log.error(`Exactly one program was expected, data: ${JSON.stringify(result)}`);
      return false;
    }
    this.programId = programs[0].id;
    this.log.debug(`Found HQ winter credit program ID: ${this.programId}`);
    return true;
  }

  private createProgramsUrl(params: { locationId: string }) {
    const u = new URL(`https://neviweb.com/api/location/${params.locationId}/programs`);
    u.searchParams.append('embed', 'participantFieldDefinitions,filters');
    return u.toString();
  }

  private async fetchProgramParticipant(locationId: string, accountId: string): Promise<boolean> {
    this.log.debug(`Fetching program participant for location ID: '${locationId}' & account ID: '${accountId}'`);
    const result = await this.fetchData(this.createProgramParticipantUrl({ locationId, accountId }));
    if (!result || !Array.isArray(result) || result.length !== 1 || result[0].id === undefined) {
      this.log.error(`Exactly one program participant was expected, data: ${JSON.stringify(result)}`);
      return false;
    }
    this.programParticipantId = result[0].id;
    this.log.debug(`Found program participant ID: ${this.programParticipantId}`);
    return true;
  }

  private createProgramParticipantUrl(params: { locationId: string, accountId: string }) {
    const u = new URL('https://neviweb.com/api/program-participants');
    u.searchParams.append('embed', 'fieldValues,devices,devices.phases');
    u.searchParams.append('location$id', params.locationId);
    u.searchParams.append('account$id', params.accountId);
    return u.toString();
  }

  // Extract JSON response data from URL
  private async fetchData(url: string, tryLoginOnFail: boolean = false): Promise<unknown> {
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
        return this.fetchData(url);
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
      if (!data || !data.session || !data.account || !data.account.id) {
        this.log.error(`Invalid login, response data: ${JSON.stringify(data)}`);
        return false;
      }
      this.sessionId = data.session;
      this.accountId = data.account.id;
      this.log.info('Sinope login completed successfully');
      return true;
    } catch (e) {
      this.log.error(`Failed to login to Sinope API, error: ${JSON.stringify(e)}`);
      return false;
    }
  }
}
