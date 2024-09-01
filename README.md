# school

Synchronization between JSON schedule and Google Calendar

----

## Installation

```bash
git clone https://github.com/anmiles/school.git
cd school
npm clean-install
npm run build
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

- Create schedule in `./input/schedule.json` file
- `npm start <profile>` to create calendar entries in selected profile
