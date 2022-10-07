# Nowcasting alerts cron

The main nowcasting_alerts repo details the Remix application for managing alerts. But Cloudflare Pages does not support ScheduledEvents (cron). So this separate repo houses a function that is run every 5min by Cloudflare. It checks for a deviation in the PV_Live and Nowcasting forecasts, and sends a webhook to all configured alerts if there is.

## Running locally

Run `npm run start` in your terminal to start a development server
Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
Go back to the console to see what your worker has logged
Update the Cron trigger in wrangler.toml (see https://developers.cloudflare.com/workers/gler/configuration/#triggers)
Learn more at https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/

### Deployment

Deployment is currently manually done by running `wrangler publish --name nowcasting_alerts_cron`

### Setup KV for production

Data for this app is stored using Cloudflare key-value storage
(when setting up the main repo you will have already done: Create KV namespaces: nowcasting-alerts-ALERTS, nowcasting-alerts-LOG)
Goto main nav Workers > KV > nowcasting_alerts_cron > Settings > Variables > KV namespace bindings. Add bindings: ALERTS = nowcasting-alerts-ALERTS, LOG = nowcasting-alerts-LOG