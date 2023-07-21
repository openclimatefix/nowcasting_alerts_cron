import { fetchOcfForecastData, fetchPvLiveData } from "../lib/utils";
import { AlertRecord, Env } from "../lib/lib";

async function alerts(env: Env) {
  const alertsKeys = await env.ALERTS.list()
  const alerts: AlertRecord[] = await Promise.all(alertsKeys.keys.map(k => env.ALERTS.get(k.name, {type: "json"}) as Promise<AlertRecord>))

  const ocfForecastData = await fetchOcfForecastData(env);
  const pvLiveData = await fetchPvLiveData(env)

  if(!ocfForecastData || !pvLiveData) return

  console.log('ocfForecastData: Array of length ', ocfForecastData.length)
  console.log('pvLiveData: Array of length ', pvLiveData.length)

  // Hardcoded 1GW deviation check for now
  const thresholdMw = 1000
  // First value in pvLiveData array is the most recent PV_Live estimate (usually from the past 30min)
  const latestPvLiveMw = Math.round(pvLiveData[0]["solarGenerationKw"] / 1000)
  // Now we find the corresponding OCF estimate
  const latestOcfEstimate = ocfForecastData.find(o => o.targetTime === pvLiveData[0]["datetimeUtc"])
  if (latestOcfEstimate) {
    const latestOcfMw = Math.round(latestOcfEstimate.expectedPowerGenerationMegawatts)
    const deviation = latestPvLiveMw - latestOcfMw
    if (Math.abs(deviation) >= thresholdMw) {
      // Trigger all configured alerts
      console.log('Triggering alerts')
      const pvLiveAboveBelow = deviation > 0 ? ":arrow_up_small: above" : ":arrow_down_small: below"
      const formattedDeviationString = Math.abs(deviation).toLocaleString()
      const formattedDatetime = new Date(pvLiveData[0]["datetimeUtc"]).toLocaleDateString("en-GB", { timeZone: "Europe/London" });
      const formattedLatestOcfMw = latestOcfMw.toLocaleString()
      const formattedLatestPvliveMw = latestPvLiveMw.toLocaleString()
      const alertMsg = `PVLive Alert! PV Live is ${formattedDeviationString}MW ${pvLiveAboveBelow} OCF Forecast for ${formattedDatetime}.
OCF Nowcast ${formattedLatestOcfMw}MW vs PV Live ${formattedLatestPvliveMw}MW.
Deviation exceeds threshold of ${thresholdMw}MW.`
      console.log(alertMsg)
      const alertBlocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `>*Intra-day PV Live Alert* \n :red_circle: *${formattedDeviationString} MW* ${pvLiveAboveBelow} OCF Forecast \nfor ${formattedDatetime}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `\`\`\`OCF Nowcast   ${formattedLatestOcfMw} MW \nPV Live       ${formattedLatestPvliveMw} MW\`\`\``
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Forecast  :sunny:",
              emoji: true
            },
            value: "click_me_123",
            url: "https://app.nowcasting.io",
            action_id: "button-action"
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Alert trigger:  Deviation to Intra-day PV Live exceeded ${thresholdMw} MW threshold.`
            }
          ]
        }
      ]
      console.log(JSON.stringify(alertBlocks))
      env.LOG.put(`${new Date().toISOString()}--${crypto.randomUUID()}`, JSON.stringify({
        text: alertMsg
      }), {
        metadata: { loggedAt: new Date().toISOString() },
      })
      const init = {
        // Hard coded Slack webhook format for now
        body: JSON.stringify({
          text: alertMsg,
          blocks: alertBlocks
        }),
        method: 'POST',
        headers: {
          'content-type': 'application/json;charset=UTF-8',
        },
      }
      for (const alert of alerts) {
        const response = await fetch(alert.url, init);
        console.log(`Alert webhook POST to ${alert.url} responded with ${response.status}`)
      }
    } else {
      console.log(`No alert triggered. Deviation of ${deviation}MW is below threshold of ${thresholdMw}MW`)
    }
  } else {
    console.log(`Couldn't find OCF forecast for PV_Live datetimeUtc: ${pvLiveData[0]["datetimeUtc"]}`)
  }
}

export default {
	async scheduled(controller: any, env: Env, context: any) {
    context.waitUntil(alerts(env))
	},
};
