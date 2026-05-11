# Samples

This folder contains integration and mockup examples that demonstrate IBEx.Fi widget flows and UI variants.

## Available examples

- `sample1`: premium dark-mode widget with a rich UI and real-time event log.
- `sample2`: compact and developer-friendly version focused on core API and session flows.
- `sample3`: standalone Polar mockup variant 01 (Safe).
- `sample4`: standalone Polar mockup variant 02 (Data-rich).
- `sample5`: standalone Polar mockup variant 03 (Soft).
- `sample6`: standalone Polar mockup variant 04 (Dark Pro).
- `sample7`: standalone Polar mockup variant 05 (Classic).

## Run an example

From the selected sample folder:

```bash
npm install
npm run dev
```

Both samples automatically load environment variables from the repository root `env/.env.local`.
You can also override values locally by creating a `.env.local` file inside a sample folder.
