# Time Tracker Contract

`knowledge-habit-tracker` should send light-up events, not final knowledge nodes.

## Rules

1. A light-up is an event.
2. The same user may light the same tutorial again on another day.
3. Import deduplication is only `source + externalEventId`.
4. Node governance happens in this repo after import.

## Files

- `light-up-event.schema.json`
- `light-up-event.example.json`

## Runtime Contract Endpoint

- `GET /api/contracts/light-up-event`

## Import Endpoint

- `POST /api/integrations/time-tracker`
