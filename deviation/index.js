async function alerts(env) {
  const alertsKeys = await env.ALERTS.list()
  const alerts = await Promise.all(alertsKeys.keys.map(k => env.ALERTS.get(k.name, {type: "json"})))
  const response = await fetch('https://nowcasting-pro.eu.auth0.com/oauth/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.CLIENT_ID,
      client_secret:env.CLIENT_SECRET,
      audience:"https://api.nowcasting.io/",
      grant_type:"client_credentials"
    })
  })
  const result = await response.json();
  const token = result?.access_token;

  if(!token) return;

  const ocf_req = await fetch("https://api.nowcasting.io/v0/solar/GB/national/forecast?historic=true", { headers: { 'content-type': 'application/json;charset=UTF-8', 'authorization': `Bearer ${token}` }})
  const ocf_data = await ocf_req.json()
  const pvlive_req = await fetch("https://api.nowcasting.io/v0/solar/GB/national/pvlive?regime=in-day", { headers: { 'content-type': 'application/json;charset=UTF-8', 'authorization': `Bearer ${token}` }})
  const pvlive_data = await pvlive_req.json()

  // Hardcoded 1GW deviation check for now
  const threshold_mw = 1000
  // First value in pvlive_data array is the most recent PV_Live estimate (usually from the past 30min)
  const latest_pvlive_mw = Math.round(pvlive_data[0]["solarGenerationKw"] / 1000)
  // Now we find the corresponding OCF estimate
  const latest_ocf_estimate = ocf_data["forecastValues"].find(o => o.targetTime === pvlive_data[0]["datetimeUtc"])

  if (latest_ocf_estimate) {
    const latest_ocf_mw = Math.round(latest_ocf_estimate.expectedPowerGenerationMegawatts)
    const deviation = latest_pvlive_mw - latest_ocf_mw
    if (Math.abs(deviation) >= threshold_mw) {
      // Trigger all configured alerts
      const pv_live_above_below = deviation > 0 ? ":arrow_up_small: above" : ":arrow_down_small: below"
      const formattedDeviationString = Math.abs(deviation).toLocaleString()
      const formattedDatetime = new Date(pvlive_data[0]["datetimeUtc"]).toLocaleString()
      const formattedLatestOcfMw = latest_ocf_mw.toLocaleString()
      const formattedLatestPvliveMw = latest_pvlive_mw.toLocaleString()
      const alert_msg = `PVLive Alert! PV Live is ${formattedDeviationString}MW ${pv_live_above_below} OCF Forecast for ${formattedDatetime}.
OCF Nowcast ${formattedLatestOcfMw}MW vs PV Live ${formattedLatestPvliveMw}MW.
Deviation exceeds threshold of ${threshold_mw}MW.`
      console.log(alert_msg)
      const alertBlocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `>*Intra-day PV Live Alert* \n :red_circle: *${formattedDeviationString} MW* ${pv_live_above_below} OCF Forecast \nfor ${formattedDatetime}`
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
              text: `Alert trigger:  Deviation to Intra-day PV Live exceeded ${threshold_mw} MW threshold.`
            }
          ]
        }
      ]
      console.log(JSON.stringify(alertBlocks))
      env.LOG.put(`${new Date().toISOString()}--${crypto.randomUUID()}`, JSON.stringify({
        text: alert_msg
      }), {
        metadata: { loggedAt: new Date().toISOString() },
      })
      const init = {
        // Hard coded Slack webhook format for now
        body: JSON.stringify({
          text: alert_msg,
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
    }
  } else {
    console.log(`Couldn't find OCF forecast for PV_Live datetimeUtc: ${pvlive_data[0]["datetimeUtc"]}`)
  }
}

export default {
	async scheduled(controller, env, context) {
    context.waitUntil(alerts(env))
	},
};
