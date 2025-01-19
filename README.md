# homebridge-hydroquebec-peak-virtual-switch

Hombridge Hydro-Quebec plug-in (integration) that relies on Hydro-Quebec's Open Data APIs to determine wether a peak period is currently ongoing and based on that, turns ON or OFF a HomeKit virtual switch.

- **ON** -> Hydro Quebec peak period is currently ongoing
- **OFF** -> Hydro Quebec peak period is NOT currently ongoing

With that virtual switch, you can then use HomeKit automations to turn other devices ON/OFF when this virtual switch changes state (ON/OFF), to have even more electicity savings during these peak periods.

## API Reference:

- https://donnees.hydroquebec.com/explore/dataset/evenements-pointe/information/

- https://donnees.hydroquebec.com/explore/dataset/evenements-pointe/api/?sort=offre

## Update schedule

The virtual switch will update itself using the following schedule:

- On Homebridge plug-in startup
- Every day at 6am EST
- Every day at 9am EST
- Every day at 4pm EST
- Every day at 8pm EST

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
