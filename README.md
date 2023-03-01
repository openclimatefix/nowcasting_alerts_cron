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

1. For each Cloudflare Worker (directories in root, e.g. `daily_max`), make a copy of `wrangler.toml.example` and rename
   it to `wrangler.toml`.
2. You'll need to grab the Auth0 `CLIENT_ID` and `CLIENT_SECRET` from the
   [Auth0 dashboard](https://manage.auth0.com/dashboard/eu/nowcasting-pro/applications) in the "Alerts App"
   Machine-to-Machine application. and paste them into the `wrangler.toml` file under `[vars]` for each Worker.
3. The `wrangler.toml` file for each Worker also needs the `kv_namespaces` section filled in with the KV namespace IDs
   for the `nowcasting-alerts-ALERTS` and `nowcasting-alerts-LOG` KV namespaces. If you're running locally, you'll also
   need to add a "preview_id" for each KV namespace, these can also be found using the CF Dashboard or the CLI.
   You can find these in the Cloudflare dashboard main nav Workers > KV.
4. Run worker locally **_either_** with:
```
npm run dev --workspace=[Cloudflare Worker folder name]
```

5. Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
   Go back to the console to see what your worker has logged

_**or**_

Sometimes the preview KV doesn't seem to sync properly, so you can run the worker locally with:
```
npx wrangler dev --test-scheduled
```

Similarly, you can then ping the worker with:
```
curl "http://localhost:8787/__scheduled"
```
> N.B. Wrangler can pick up the KV variables from the `wrangler.toml` file, but it doesn't seem to pick up variables
> from an .env file, so they have to be in the `wrangler.toml` file. 
> 
> If you want to use an `.env` file, you can put the Auth0 variables in there, but you'll need to add the KV variables 
> to the `wrangler.toml` file still.


# Production

## Setup KV for production

Data for this app is stored using Cloudflare key-value storage
(when setting up the main repo you will have already done: 
- Create KV namespaces: `nowcasting-alerts-ALERTS`, `nowcasting-alerts-LOG`)
- Copy wrangler.toml.example to wrangler.toml
Go to Cloudflare dashboard main nav Workers > KV and copy the IDs for nowcasting-alerts-ALERTS, 
nowcasting-alerts-LOG then paste them into the kv_namespaces in wrangler.toml

If you add a new worker, ensure you create a preview KV namespace for both `ALERTS` and `LOG`:
```bash
npx wrangler kv:namespace create "LOG" --preview
npx wrangler kv:namespace create "ALERTS" --preview
```
and add the IDs to the `wrangler.toml` file for the new worker under "preview_id".
You can find these in the Cloudflare dashboard main nav Workers > KV, or manage from the CLI:
```bash
# List all KV namespaces
npx wrangler kv:namespace list

# List all KV keys in a specific namespace that is bound to the current Worker (if in that directory)
npx wrangler kv:key list --binding=ALERTS [--preview]

# Get the value of a specific KV key in a namespace that is bound to the current Worker (if in that directory)
npx wrangler kv:key get --binding=ALERTS [--preview] <key_id>

# Put a value into a specific KV key in a namespace that is bound to the current Worker (if in that directory)
npx wrangler kv:key put --binding=ALERTS [--preview] <key_id> [value]
```

## Deployment

- Ensure the Auth0 environment variables are set in the Cloudflare dashboard
  Workers > [worker-name] > Settings > Environment Variables and are *encrypted*. These should be set already.
- Publish all the Workers to Cloudflare:

```
npm run publish --workspaces
```

- Or deploy to production an individual Worker:

```
npm run deploy --workspace=[Cloudflare Worker name]
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
