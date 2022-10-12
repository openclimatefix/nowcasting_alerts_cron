async function daily_max(env) {
  const alertsKeys = await env.ALERTS.list()
  const alerts = await Promise.all(alertsKeys.keys.map(k => env.ALERTS.get(k.name, {type: "json"})))

  const ocf_req = await fetch("https://api.nowcasting.io/v0/solar/GB/national/forecast?historic=true", { headers: { 'content-type': 'application/json;charset=UTF-8' }})
  const ocf_data = await ocf_req.json()

  const [todays_date] = new Date().toISOString().split('T')
  const todays_forecast_values = ocf_data["forecastValues"].filter(o => o.targetTime.split('T')[0] === todays_date)
  let max_forecast_value = todays_forecast_values[0]
  for (const fv of todays_forecast_values) {
    if (fv > max_forecast_value.expectedPowerGenerationMegawatts) {
      max_forecast_value = fv
    }
  }

  const alert_msg = `PV Today Max Alert! OCF Nowcast maximum of ${Math.round(max_forecast_value.expectedPowerGenerationMegawatts).toLocaleString()} MW today, peaking ${new Date(max_forecast_value.targetTime).toLocaleTimeString('en-GB', { timeStyle: 'long' })} ${new Date(max_forecast_value.targetTime).toLocaleDateString('en-GB', { dateStyle: 'long' })}.`
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

export default {
	async scheduled(controller, env, context) {
    context.waitUntil(daily_max(env))
	},
};
