import moment from 'moment-timezone';
import { CoreLogging, HydroQuebecIntegration, HydroQuebecPeakData, PeriodType } from '../hydro';

describe('HydroQuebecIntegration', () => {
  let hydroQuebecIntegration: HydroQuebecIntegration;
  const mockedLogger: jest.Mocked<CoreLogging> = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const sampleData: { results: HydroQuebecPeakData[] } = {
    results: [
      {
        offre:'CPC-D',
        datedebut:'2025-01-16T11:00:00+00:00', // 1/16 @ 6am EST
        datefin:'2025-01-16T14:00:00+00:00', // 1/16 @ 9am EST
        plagehoraire:'AM',
        duree:'PT03H00MS',
        secteurclient:'Residentiel',
      },
      {
        offre: 'CPC-D',
        datedebut: '2025-01-20T21:00:00+00:00', // 1/20 @ 4pm EST
        datefin: '2025-01-21T01:00:00+00:00', // 1/20 @ 8pm EST
        plagehoraire: 'PM',
        duree: 'PT04H00MS',
        secteurclient: 'Residentiel',
      },
      {
        offre:'CPC-D',
        datedebut:'2025-01-22T11:00:00+00:00', // 1/22 @ 6am EST
        datefin:'2025-01-22T14:00:00+00:00', // 1/22 @ 9am EST
        plagehoraire:'AM',
        duree:'PT03H00MS',
        secteurclient:'Residentiel',
      },
      {
        offre: 'CPC-D',
        datedebut: '2025-01-22T21:00:00+00:00', // 1/22 @ 4pm EST
        datefin: '2025-01-23T01:00:00+00:00', // 1/22 @ 8pm EST
        plagehoraire: 'PM',
        duree: 'PT04H00MS',
        secteurclient: 'Residentiel',
      },
      {
        offre:'CPC-D',
        datedebut:'2025-01-23T11:00:00+00:00', // 1/23 @ 6am EST
        datefin:'2025-01-23T14:00:00+00:00', // 1/23 @ 9am EST
        plagehoraire:'AM',
        duree:'PT03H00MS',
        secteurclient:'Residentiel',
      },
    ],
  };

  beforeEach(() => {
    hydroQuebecIntegration = new HydroQuebecIntegration(mockedLogger);
  });

  it('should return unique cron schedules', () => {
    const expectedCronEntries = [
      '0 6 * * *', '0 9 * * *', '0 16 * * *', '0 20 * * *',
      '0 0 * * *', /*'0 6 * * *',*/ '0 10 * * *', /*'0 16 * * *',*/
      '0 21 * * *', /*'0 0 * * *',*/ '0 7 * * *', /*'0 10 * * *',*/
    ];

    const cronSchedules = hydroQuebecIntegration.getCronSchedules();
    expect(cronSchedules).toEqual(expectedCronEntries);
  });

  it('date actualization testing - lower boundary', () => {
    const dataUnderTest = [
      // basic use cases
      { inputDate: '2025-01-22T03:00-05:00', hour: 0, expectedOutput: moment('2025-01-22T00:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 1, expectedOutput: moment('2025-01-22T01:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 2, expectedOutput: moment('2025-01-22T02:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 3, expectedOutput: moment('2025-01-22T03:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 4, expectedOutput: moment('2025-01-22T04:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 5, expectedOutput: moment('2025-01-22T05:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 6, expectedOutput: moment('2025-01-22T06:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 7, expectedOutput: moment('2025-01-22T07:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 8, expectedOutput: moment('2025-01-22T08:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 9, expectedOutput: moment('2025-01-22T09:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 10, expectedOutput: moment('2025-01-22T10:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 11, expectedOutput: moment('2025-01-22T11:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 12, expectedOutput: moment('2025-01-22T12:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 13, expectedOutput: moment('2025-01-22T13:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 14, expectedOutput: moment('2025-01-22T14:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 15, expectedOutput: moment('2025-01-22T15:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 16, expectedOutput: moment('2025-01-22T16:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 17, expectedOutput: moment('2025-01-22T17:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 18, expectedOutput: moment('2025-01-22T18:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 19, expectedOutput: moment('2025-01-22T19:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 20, expectedOutput: moment('2025-01-22T20:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 21, expectedOutput: moment('2025-01-22T21:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 22, expectedOutput: moment('2025-01-22T22:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 23, expectedOutput: moment('2025-01-22T23:00-05:00') },

      // lower boundary use cases
      { inputDate: '2025-01-22T00:00-05:00', hour: 0, expectedOutput: moment('2025-01-22T00:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 1, expectedOutput: moment('2025-01-22T01:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 2, expectedOutput: moment('2025-01-22T02:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 3, expectedOutput: moment('2025-01-22T03:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 4, expectedOutput: moment('2025-01-22T04:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 5, expectedOutput: moment('2025-01-22T05:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 6, expectedOutput: moment('2025-01-22T06:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 7, expectedOutput: moment('2025-01-22T07:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 8, expectedOutput: moment('2025-01-22T08:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 9, expectedOutput: moment('2025-01-22T09:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 10, expectedOutput: moment('2025-01-22T10:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 11, expectedOutput: moment('2025-01-22T11:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 12, expectedOutput: moment('2025-01-22T12:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 13, expectedOutput: moment('2025-01-22T13:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 14, expectedOutput: moment('2025-01-22T14:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 15, expectedOutput: moment('2025-01-22T15:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 16, expectedOutput: moment('2025-01-22T16:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 17, expectedOutput: moment('2025-01-22T17:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 18, expectedOutput: moment('2025-01-22T18:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 19, expectedOutput: moment('2025-01-22T19:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 20, expectedOutput: moment('2025-01-22T20:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 21, expectedOutput: moment('2025-01-22T21:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 22, expectedOutput: moment('2025-01-22T22:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 23, expectedOutput: moment('2025-01-22T23:00-05:00') },

      // upper boundary use cases
      { inputDate: '2025-01-22T23:00-05:00', hour: 0, expectedOutput: moment('2025-01-22T00:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 1, expectedOutput: moment('2025-01-22T01:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 2, expectedOutput: moment('2025-01-22T02:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 3, expectedOutput: moment('2025-01-22T03:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 4, expectedOutput: moment('2025-01-22T04:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 5, expectedOutput: moment('2025-01-22T05:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 6, expectedOutput: moment('2025-01-22T06:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 7, expectedOutput: moment('2025-01-22T07:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 8, expectedOutput: moment('2025-01-22T08:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 9, expectedOutput: moment('2025-01-22T09:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 10, expectedOutput: moment('2025-01-22T10:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 11, expectedOutput: moment('2025-01-22T11:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 12, expectedOutput: moment('2025-01-22T12:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 13, expectedOutput: moment('2025-01-22T13:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 14, expectedOutput: moment('2025-01-22T14:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 15, expectedOutput: moment('2025-01-22T15:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 16, expectedOutput: moment('2025-01-22T16:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 17, expectedOutput: moment('2025-01-22T17:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 18, expectedOutput: moment('2025-01-22T18:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 19, expectedOutput: moment('2025-01-22T19:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 20, expectedOutput: moment('2025-01-22T20:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 21, expectedOutput: moment('2025-01-22T21:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 22, expectedOutput: moment('2025-01-22T22:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 23, expectedOutput: moment('2025-01-22T23:00-05:00') },
    ];

    for (const item of dataUnderTest) {
      const output = hydroQuebecIntegration.getActualizedDateTime(moment(item.inputDate), { hours: item.hour, minutes: 0 }, 'lower');
      expect(output.toISOString()).toEqual(item.expectedOutput.toISOString());
    }
  });

  it('date actualization testing - upper boundary', () => {
    const dataUnderTest = [
      // basic use cases
      { inputDate: '2025-01-22T03:00-05:00', hour: 0, expectedOutput: moment('2025-01-23T00:00-05:00') }, // next day
      { inputDate: '2025-01-22T03:00-05:00', hour: 1, expectedOutput: moment('2025-01-22T01:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 2, expectedOutput: moment('2025-01-22T02:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 3, expectedOutput: moment('2025-01-22T03:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 4, expectedOutput: moment('2025-01-22T04:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 5, expectedOutput: moment('2025-01-22T05:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 6, expectedOutput: moment('2025-01-22T06:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 7, expectedOutput: moment('2025-01-22T07:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 8, expectedOutput: moment('2025-01-22T08:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 9, expectedOutput: moment('2025-01-22T09:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 10, expectedOutput: moment('2025-01-22T10:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 11, expectedOutput: moment('2025-01-22T11:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 12, expectedOutput: moment('2025-01-22T12:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 13, expectedOutput: moment('2025-01-22T13:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 14, expectedOutput: moment('2025-01-22T14:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 15, expectedOutput: moment('2025-01-22T15:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 16, expectedOutput: moment('2025-01-22T16:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 17, expectedOutput: moment('2025-01-22T17:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 18, expectedOutput: moment('2025-01-22T18:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 19, expectedOutput: moment('2025-01-22T19:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 20, expectedOutput: moment('2025-01-22T20:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 21, expectedOutput: moment('2025-01-22T21:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 22, expectedOutput: moment('2025-01-22T22:00-05:00') },
      { inputDate: '2025-01-22T03:00-05:00', hour: 23, expectedOutput: moment('2025-01-22T23:00-05:00') },

      // lower boundary use cases
      { inputDate: '2025-01-22T00:00-05:00', hour: 0, expectedOutput: moment('2025-01-23T00:00-05:00') }, // next day
      { inputDate: '2025-01-22T00:00-05:00', hour: 1, expectedOutput: moment('2025-01-22T01:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 2, expectedOutput: moment('2025-01-22T02:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 3, expectedOutput: moment('2025-01-22T03:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 4, expectedOutput: moment('2025-01-22T04:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 5, expectedOutput: moment('2025-01-22T05:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 6, expectedOutput: moment('2025-01-22T06:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 7, expectedOutput: moment('2025-01-22T07:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 8, expectedOutput: moment('2025-01-22T08:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 9, expectedOutput: moment('2025-01-22T09:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 10, expectedOutput: moment('2025-01-22T10:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 11, expectedOutput: moment('2025-01-22T11:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 12, expectedOutput: moment('2025-01-22T12:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 13, expectedOutput: moment('2025-01-22T13:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 14, expectedOutput: moment('2025-01-22T14:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 15, expectedOutput: moment('2025-01-22T15:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 16, expectedOutput: moment('2025-01-22T16:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 17, expectedOutput: moment('2025-01-22T17:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 18, expectedOutput: moment('2025-01-22T18:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 19, expectedOutput: moment('2025-01-22T19:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 20, expectedOutput: moment('2025-01-22T20:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 21, expectedOutput: moment('2025-01-22T21:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 22, expectedOutput: moment('2025-01-22T22:00-05:00') },
      { inputDate: '2025-01-22T00:00-05:00', hour: 23, expectedOutput: moment('2025-01-22T23:00-05:00') },

      // upper boundary use cases
      { inputDate: '2025-01-22T23:00-05:00', hour: 0, expectedOutput: moment('2025-01-23T00:00-05:00') }, // next day
      { inputDate: '2025-01-22T23:00-05:00', hour: 1, expectedOutput: moment('2025-01-22T01:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 2, expectedOutput: moment('2025-01-22T02:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 3, expectedOutput: moment('2025-01-22T03:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 4, expectedOutput: moment('2025-01-22T04:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 5, expectedOutput: moment('2025-01-22T05:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 6, expectedOutput: moment('2025-01-22T06:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 7, expectedOutput: moment('2025-01-22T07:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 8, expectedOutput: moment('2025-01-22T08:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 9, expectedOutput: moment('2025-01-22T09:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 10, expectedOutput: moment('2025-01-22T10:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 11, expectedOutput: moment('2025-01-22T11:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 12, expectedOutput: moment('2025-01-22T12:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 13, expectedOutput: moment('2025-01-22T13:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 14, expectedOutput: moment('2025-01-22T14:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 15, expectedOutput: moment('2025-01-22T15:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 16, expectedOutput: moment('2025-01-22T16:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 17, expectedOutput: moment('2025-01-22T17:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 18, expectedOutput: moment('2025-01-22T18:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 19, expectedOutput: moment('2025-01-22T19:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 20, expectedOutput: moment('2025-01-22T20:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 21, expectedOutput: moment('2025-01-22T21:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 22, expectedOutput: moment('2025-01-22T22:00-05:00') },
      { inputDate: '2025-01-22T23:00-05:00', hour: 23, expectedOutput: moment('2025-01-22T23:00-05:00') },
    ];

    for (const item of dataUnderTest) {
      const output = hydroQuebecIntegration.getActualizedDateTime(moment(item.inputDate), { hours: item.hour, minutes: 0 }, 'upper');
      expect(output.toISOString()).toEqual(item.expectedOutput.toISOString());
    }
  });

  it('making sure PEAK period is properly reported - positive use case PM', async () => {
    const mockedNow = moment('2025-01-20T17:00:00-05:00'); // 1/20 @ 5pm EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(true);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(false);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PEAK period is properly reported - positive use case LOWER BOUNDARY PM', async () => {
    const mockedNow = moment('2025-01-20T16:00:00-05:00'); // 1/20 @ 4pm EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(true);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(false);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PEAK period is properly reported - positive use case UPPER BOUNDARY PM', async () => {
    const mockedNow = moment('2025-01-20T20:00:00-05:00'); // 1/20 @ 8pm EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(true);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(false);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PEAK period is properly reported - positive use case AM', async () => {
    const mockedNow = moment('2025-01-16T07:00:00-05:00'); // 1/16 @ 7am EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(true);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(false);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PEAK period is properly reported - positive use case LOWER BOUNDARY AM', async () => {
    const mockedNow = moment('2025-01-16T06:00:00-05:00'); // 1/16 @ 6am EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(true);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(false);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PEAK period is properly reported - positive use case UPPER BOUNDARY AM', async () => {
    const mockedNow = moment('2025-01-16T09:00:00-05:00'); // 1/16 @ 9am EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(true);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(false);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PEAK period is properly reported - negative use case BEFORE AM', async () => {
    const mockedNow = moment('2025-01-20T05:00:00-05:00'); // 1/20 @ 5am EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(false);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(true);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PEAK period is properly reported - negative use case AFTER AM', async () => {
    const mockedNow = moment('2025-01-21T10:00:00-05:00'); // 1/21 @ 10am EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(false);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(true);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PEAK period is properly reported - negative use case BEFORE PM', async () => {
    const mockedNow = moment('2025-01-20T15:00:00-05:00'); // 1/20 @ 3pm EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(false);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(true);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PEAK period is properly reported - negative use case AFTER PM', async () => {
    const mockedNow = moment('2025-01-21T22:00:00-05:00'); // 1/20 @ 10pm EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(false);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(false);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(true);
  });

  it('making sure PRE-PEAK period is properly reported - positive use case AM', async () => {
    const mockedNow = moment('2025-01-16T02:00-05:00'); // 1/16 @ 2am EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(true);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(false);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure PRE-PEAK period is properly reported - positive use case PM', async () => {
    const mockedNow = moment('2025-01-22T11:00-05:00'); // 1/22 @ 11am EST
    jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

    const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
    expect(isWithinPrePeakPeriod).toBe(true);

    const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
    expect(isWithinPeakPeriod).toBe(false);

    const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
    expect(isWithinPrePrePeakPeriod).toBe(false);
  });

  it('making sure overlapping periods are properly reported', async () => {
    // abc 1/21 @ 11pm -> PRE_PRE_PEAK
    // abc 1/22 @ 0am -> PRE_PEAK (also overlaps with PRE_PRE_PEAK)
    // abc 1/22 @ 1am -> PRE_PEAK
    // abc 1/22 @ 2am -> PRE_PEAK
    // abc 1/22 @ 3am -> PRE_PEAK
    // abc 1/22 @ 4am -> PRE_PEAK
    // abc 1/22 @ 5am -> PRE_PEAK
    // abc 1/22 @ 6am -> PEAK
    // abc 1/22 @ 7am -> PEAK (also overlaps with PRE_PRE_PEAK)
    // abc 1/22 @ 8am -> PEAK (also overlaps with PRE_PRE_PEAK)
    // abc 1/22 @ 9am -> PEAK (also overlaps with PRE_PRE_PEAK)
    // abc 1/22 @ 10am -> PRE_PEAK (also overlaps with PRE_PRE_PEAK)
    // abc 1/22 @ 11am -> PRE_PEAK (also overlaps with PRE_PRE_PEAK)
    // abc 1/22 @ 12pm -> PRE_PEAK
    // abc 1/22 @ 1pm -> PRE_PEAK
    // abc 1/22 @ 2pm -> PRE_PEAK
    // abc 1/22 @ 3pm -> PRE_PEAK
    // abc 1/22 @ 4pm -> PEAK
    // abc 1/22 @ 5pm -> PEAK
    // abc 1/22 @ 6pm -> PEAK
    // abc 1/22 @ 7pm -> PEAK
    // abc 1/22 @ 8pm -> PEAK
    // abc 1/22 @ 9pm -> PRE_PRE_PEAK
    // abc 1/22 @ 10pm -> PRE_PRE_PEAK
    // abc 1/22 @ 11pm -> PRE_PRE_PEAK
    // abc 1/23 @ 0am -> PRE_PEAK (also overlaps with PRE_PRE_PEAK)

    const testItems = [
      { mockedNow: '2025-01-21T23:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: true } },
      { mockedNow: '2025-01-22T00:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T01:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T02:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T03:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T04:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T05:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T06:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T07:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T08:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T09:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T10:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T11:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T12:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T13:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T14:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T15:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T16:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T17:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T18:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T19:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T20:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T21:00-05:00', expected: { [PeriodType.PEAK]: false , [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: true } },
      { mockedNow: '2025-01-22T22:00-05:00', expected: { [PeriodType.PEAK]: false , [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: true } },
      { mockedNow: '2025-01-22T23:00-05:00', expected: { [PeriodType.PEAK]: false , [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: true } },
      { mockedNow: '2025-01-23T00:00-05:00', expected: { [PeriodType.PEAK]: false , [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
    ];

    for (const testItem of testItems) {
      const mockedNow = moment(testItem.mockedNow);
      jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

      const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
      expect(isWithinPeakPeriod).toBe(testItem.expected[PeriodType.PEAK]);

      const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
      expect(isWithinPrePeakPeriod).toBe(testItem.expected[PeriodType.PRE_PEAK]);

      const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
      expect(isWithinPrePrePeakPeriod).toBe(testItem.expected[PeriodType.PRE_PRE_PEAK]);
    }
  });

  it('making sure non edge/boundary times are properly reported', async () => {
    const testItems = [
      { mockedNow: '2025-01-22T06:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T06:01-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T08:59-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T09:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T09:01-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: true } },
      { mockedNow: '2025-01-22T09:59-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: true } },
      { mockedNow: '2025-01-22T10:00-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T10:01-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T13:59-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T14:01-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T15:59-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T16:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T16:01-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T19:59-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T20:00-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T20:01-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
    ];

    for (const testItem of testItems) {
      const mockedNow = moment(testItem.mockedNow);
      jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

      const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
      expect(isWithinPeakPeriod).toBe(testItem.expected[PeriodType.PEAK]);

      const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
      expect(isWithinPrePeakPeriod).toBe(testItem.expected[PeriodType.PRE_PEAK]);

      const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
      expect(isWithinPrePrePeakPeriod).toBe(testItem.expected[PeriodType.PRE_PRE_PEAK]);
    }
  });

  it('making sure millisecond boundaries are properly observed', async () => {
    const testItems = [
      { mockedNow: '2025-01-22T05:59:59.000-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T05:59:59.001-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T05:59:59.999-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: true, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T06:00:00.000-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T06:00:00.001-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T06:00:00.999-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T08:59:59.000-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T08:59:59.001-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T08:59:59.999-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T09:00:00.000-05:00', expected: { [PeriodType.PEAK]: true, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: false } },
      { mockedNow: '2025-01-22T09:00:00.001-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: true } },
      { mockedNow: '2025-01-22T09:00:00.999-05:00', expected: { [PeriodType.PEAK]: false, [PeriodType.PRE_PEAK]: false, [PeriodType.PRE_PRE_PEAK]: true } },
    ];

    for (const testItem of testItems) {
      const mockedNow = moment(testItem.mockedNow);
      jest.spyOn(hydroQuebecIntegration, 'getNow').mockReturnValue(mockedNow);

      const isWithinPeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PEAK);
      expect(isWithinPeakPeriod).toBe(testItem.expected[PeriodType.PEAK]);

      const isWithinPrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PEAK);
      expect(isWithinPrePeakPeriod).toBe(testItem.expected[PeriodType.PRE_PEAK]);

      const isWithinPrePrePeakPeriod = await hydroQuebecIntegration.isCurrentlyWithinPeriod(sampleData, PeriodType.PRE_PRE_PEAK);
      expect(isWithinPrePrePeakPeriod).toBe(testItem.expected[PeriodType.PRE_PRE_PEAK]);
    }
  });
});
