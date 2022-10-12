# Nowcasting Alerts Cron Workers

The repo [nowcasting_alerts](https://github.com/openclimatefix/nowcasting_alerts) contains the main Remix application for managing alerts. But Cloudflare Pages does not support ScheduledEvents (cron). So this separate repo houses cron worker functions.
Learn more at https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/

We use [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) (npm
version 7+) to manage multiple `package.json` files (a separate package is
required for each Cloudflare Worker).

# Workers

## deviation

Checks for a deviation in the PV_Live and Nowcasting forecasts, and sends a webhook to all configured alerts if there is.

## daily_max

Runs every morning at 7am UTC and finds the highest forecast for the day, and sends it as a webhook to all configured alerts.

# Running locally

```
npm i
```

3. For each Cloudflare Worker, make a copy of `wrangler.toml.example` and rename
   it to `wrangler.toml`.

```
npm run dev --workspace=[Cloudflare Worker folder name]
```

Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
Go back to the console to see what your worker has logged

# Production

## Setup KV for production

Data for this app is stored using Cloudflare key-value storage
(when setting up the main repo you will have already done: Create KV namespaces: nowcasting-alerts-ALERTS, nowcasting-alerts-LOG)
Copy crangler.toml.example to wrangler.toml
Goto Cloudflare dashboard main nav Workers > KV and copy the IDs for nowcasting-alerts-ALERTS, nowcasting-alerts-LOG then paste them into the kv_namespaces in wrangler.toml

## Deployment

5. Publish all the Workers to Cloudflare:

```
npm run publish --workspaces
```

Or publish an individual Worker:

```
npm run publish --workspace=[Cloudflare Worker name]
```

# Limitations

There are
[some permission issues](https://github.com/cloudflare/wrangler/issues/240) when
installing `wrangler` as a dependency in an npm workspace. As a workaround, I've
made `wrangler` a dependency in the top-level `package.json` for the overall
monorepo, and omitted `wrangler` from the dependencies for each workspace. That
means that **the npm scripts in each workspace depend on `wrangler` being
installed outside of the workspace**. So if you wanted to pull a workspace out
of the monorepo and run the workspace on its own, you must re-add `wrangler` to
the workspace dependencies first.
