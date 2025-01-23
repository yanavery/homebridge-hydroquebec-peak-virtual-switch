import { CoreLogging, HydroQuebecIntegration } from '../hydro';

describe('HydroQuebecIntegration', () => {
  let hydroQuebecIntegration: HydroQuebecIntegration;
  const mockedLogger: jest.Mocked<CoreLogging> = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    hydroQuebecIntegration = new HydroQuebecIntegration(mockedLogger);
  });

  it('should return unique cron schedules', () => {
    const expectedCronEntries = [
      '0 6 * * *', '0 9 * * *', '0 16 * * *', '0 20 * * *',
      '0 0 * * *', '0 3 * * *', '0 10 * * *', '0 14 * * *',
      '0 21 * * *', '0 7 * * *', '0 11 * * *',
    ];

    const cronSchedules = hydroQuebecIntegration.getCronSchedules();
    expect(cronSchedules).toEqual(expectedCronEntries);
  });
});
