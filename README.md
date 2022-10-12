# Nowcasting alerts cron

The repo [nowcasting_alerts](https://github.com/openclimatefix/nowcasting_alerts) contains the main Remix application for managing alerts. But Cloudflare Pages does not support ScheduledEvents (cron). So this separate repo houses a cron worker function. It checks for a deviation in the PV_Live and Nowcasting forecasts, and sends a webhook to all configured alerts if there is.

## Running locally

Run `npm run start` in your terminal to start a development server
Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
Go back to the console to see what your worker has logged
Update the Cron trigger in wrangler.toml (see https://developers.cloudflare.com/workers/gler/configuration/#triggers)
Learn more at https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/

## Production

### Setup KV for production

Data for this app is stored using Cloudflare key-value storage
(when setting up the main repo you will have already done: Create KV namespaces: nowcasting-alerts-ALERTS, nowcasting-alerts-LOG)
Copy crangler.toml.example to wrangler.toml
Goto Cloudflare dashboard main nav Workers > KV and copy the IDs for nowcasting-alerts-ALERTS, nowcasting-alerts-LOG then paste them into the kv_namespaces in wrangler.toml

### Deployment

Deployment is currently manually done by running `wrangler publish`
