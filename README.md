# school-schedule-sync

Synchronization between JSON schedule and Google Calendar

----

## Installation

```bash
git clone https://github.com/anmiles/school-schedule-sync.git
cd school-schedule-sync
npm clean-install
npm run build
copy config/schedule.sample.json config/schedule.json
```

## Adding profiles

This application may work with multiple profiles (create calendar entries in different google accounts).

1. Come up with any profile name you want
1. Execute `npm run create <profile>`

You can create as many profiles as you want.

## Authentication

- `npm run login` to login into all existing profiles
- `npm run login <profile>` to login into selected profile

## Usage

- Make your own schedule in `./config/schedule.json` file
- `npm start <profile>` to create calendar entries in selected profile
