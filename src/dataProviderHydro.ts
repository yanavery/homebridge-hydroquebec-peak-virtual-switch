import { CoreLogging, PeekDataProvider, HydroQuebecPeakData } from './hydro.js';

export class PeekDataProviderHydro implements PeekDataProvider {
  private log: CoreLogging;

  constructor(log: CoreLogging) {
    this.log = log;
  }

  // Retrieve peak data from Hydro-Quebec API
  public async retrieveData(): Promise<HydroQuebecPeakData[]> {
    const url = this.createURL();
    const response = await this.json(url);
    return response.results ? response.results : [];
  }

  // Build URL to Hydro-Quebec API
  private createURL() {
    const u = new URL(
      'https://donnees.hydroquebec.com/api/explore/v2.1/catalog/datasets/evenements-pointe/records',
    );
    u.searchParams.append('where', 'offre = "CPC-D"');
    u.searchParams.append('order_by', 'datedebut desc');
    u.searchParams.append('limit', '5');
    return u.toString();
  }

  // Extract JSON response data from URL
  private async json(url: string) {
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
}
