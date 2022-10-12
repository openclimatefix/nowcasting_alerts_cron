async function alerts(env) {
  const alertsKeys = await env.ALERTS.list()
  const alerts = await Promise.all(alertsKeys.keys.map(k => env.ALERTS.get(k.name, {type: "json"})))

  const ocf_req = await fetch("https://api.nowcasting.io/v0/solar/GB/national/forecast?historic=true", { headers: { 'content-type': 'application/json;charset=UTF-8' }})
  const ocf_data = await ocf_req.json()
  const pvlive_req = await fetch("https://api.nowcasting.io/v0/solar/GB/national/pvlive?regime=in-day", { headers: { 'content-type': 'application/json;charset=UTF-8' }})
  const pvlive_data = await pvlive_req.json()

  // Hardcoded 0.5GW deviation check for now
  const threshold_kw = 500000
  // First value in pvlive_data array is the most recent PV_Live estimate (usually from the past 30min)
  const latest_pvlive_kw = pvlive_data[0]["solarGenerationKw"]
  // Now we find the corresponding OCF estimate
  const latest_ocf_estimate = ocf_data["forecastValues"].find(o => o.targetTime === pvlive_data[0]["datetimeUtc"])

  if (latest_ocf_estimate) {
    const latest_ocf_kw = Math.round(latest_ocf_estimate.expectedPowerGenerationMegawatts * 1000)
    const deviation = latest_pvlive_kw - latest_ocf_kw
    if (Math.abs(deviation) >= threshold_kw) {
      // Trigger all configured alerts
      const pv_live_above_below = deviation > 0 ? ":arrow_up: above" : ":arrow_down: below"
      const alert_msg = `PVLive Alert! PV Live is ${Math.abs(deviation).toLocaleString()}kW {pv_live_above_below} OCF Forecast for ${pvlive_data[0]["datetimeUtc"]}.
OCF Nowcast ${latest_ocf_kw.toLocaleString()}kW vs PV Live ${latest_pvlive_kw.toLocaleString()}kW.
Deviation above threshold of 500MW.`
      console.log(alert_msg)
      env.LOG.put(crypto.randomUUID(), JSON.stringify({
        text: alert_msg
      }), {
        metadata: { loggedAt: new Date().toISOString() },
      })
      const init = {
        // Hard coded Slack webhook format for now
        body: JSON.stringify({
          text: alert_msg
        }),
        method: 'POST',
        headers: {
          'content-type': 'application/json;charset=UTF-8',
        },
      }
      for (const alert of alerts) {
        const response = await fetch(alert.url, init);
        console.log(`Alert webhook POST to ${alert.url} responsed with ${response.status}`)
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
