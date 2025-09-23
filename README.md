# homebridge-hydroquebec-peak-virtual-switch

Hombridge Hydro-Quebec plug-in (integration) that relies on Hydro-Quebec's Open Data APIs to determine wether a peak period is currently ongoing and based on that, turns ON or OFF a HomeKit virtual switch.

There are actually three (3) virtual switches to represent each of the following relevant periods:
- **PEAK** -> An Hydro-Quebec peak period is actually ongoing
- **PRE_PEAK** -> Period before Hydro-Quebec peak period (typically 0am-3am and 10am-2pm)
- **PRE_PRE_PEAK** -> Period before pre-peak period (typically 9pm-0am and 7am-11am)

Switch states:

- **ON** -> The given period is currently ongoing
- **OFF** -> The given period is NOT currently ongoing

At any given time, only one of the virtual switches will report **ON**, all others will be reporting **OFF**.

In case of overlap, the **PEAK** switch wins over the other switches, and the **PRE_PEAK** switch wins over the **PRE_PRE_PEAK** switch.

With these virtual switches, you can then use HomeKit automations to turn other devices ON/OFF when any of these virtual switches change state (ON/OFF), to have even more electicity savings during these different pre/peak periods.

## API Reference:

- https://donnees.hydroquebec.com/explore/dataset/evenements-pointe/information/

- https://donnees.hydroquebec.com/explore/dataset/evenements-pointe/api/?sort=offre

## Update schedule

All 3 virtual switches will update themselves using the following schedule:

- On Homebridge plug-in startup

- Every day at 06:00 EST (peak AM begin)
- Every day at 10:00 EST (peak AM end)
- Every day at 00:00 EST (pre-peak AM begin)
- Every day at 05:59 EST (pre-peak AM end)
- Every day at 21:00 EST (pre-pre-peak AM begin)
- Every day at 23:59 EST (pre-pre-peak AM end)

- Every day at 16:00 EST (peak PM begin)
- Every day at 20:00 EST (peak PM end)
- Every day at 10:00 EST (pre-peak PM begin)
- Every day at 15:59 EST (pre-peak PM end)
- Every day at 07:00 EST (pre-pre-peak PM begin)
- Every day at 09:59 EST (pre-pre-peak PM end)

## Actual Hydro-Quebec API being called by the plug-in

```url
GET https://donnees.hydroquebec.com/api/explore/v2.1/catalog/datasets/evenements-pointe/records
```

### Query parameters added to the URL above:
- **where**=`offre = "CPC-D`
- **order_by**=`datedebut desc`
- **limit**=`5`

## Sample API response:

```json
{
  "total_count":8,
  "results":[
    {
      "offre":"CPC-D",
      "datedebut":"2025-01-20T21:00:00+00:00",
      "datefin":"2025-01-21T01:00:00+00:00",
      "plagehoraire":"PM",
      "duree":"PT04H00MS",
      "secteurclient":"Residentiel"
    },
    {
      "offre":"CPC-D",
      "datedebut":"2025-01-16T11:00:00+00:00",
      "datefin":"2025-01-16T14:00:00+00:00",
      "plagehoraire":"AM",
      "duree":"PT03H00MS",
      "secteurclient":"Residentiel"
    },
    {
      "offre":"CPC-D",
      "datedebut":"2025-01-08T21:00:00+00:00",
      "datefin":"2025-01-09T01:00:00+00:00",
      "plagehoraire":"PM",
      "duree":"PT04H00MS",
      "secteurclient":"Residentiel"
    },
    {
      "offre":"CPC-D",
      "datedebut":"2025-01-08T11:00:00+00:00",
      "datefin":"2025-01-08T14:00:00+00:00",
      "plagehoraire":"AM",
      "duree":"PT03H00MS",
      "secteurclient":"Residentiel"
    },
    {
      "offre":"CPC-D",
      "datedebut":"2025-01-06T21:00:00+00:00",
      "datefin":"2025-01-07T01:00:00+00:00",
      "plagehoraire":"PM",
      "duree":"PT04H00MS",
      "secteurclient":"Residentiel"
    }
  ]
}
```
