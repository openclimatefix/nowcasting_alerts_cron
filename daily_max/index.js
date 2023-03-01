async function daily_max(env) {
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

  const [todays_date] = new Date().toISOString().split('T')
  const todays_forecast_values = ocf_data["forecastValues"].filter(o => o.targetTime.split('T')[0] === todays_date)
  console.log(todays_forecast_values)
  let max_forecast_value = todays_forecast_values[0]
  for (const fv of todays_forecast_values) {
    if (fv.expectedPowerGenerationMegawatts > max_forecast_value.expectedPowerGenerationMegawatts) {
      max_forecast_value = fv
    }
  }

  const time = new Date(max_forecast_value.targetTime).toLocaleTimeString('en-GB', { timeStyle: 'long' });
  const date = new Date(max_forecast_value.targetTime).toLocaleDateString('en-GB', { dateStyle: 'long' });
  const maxMegawatts = Math.round(max_forecast_value.expectedPowerGenerationMegawatts).toLocaleString();

  const alert_msg = `PV Today Max Alert! OCF Nowcast maximum of ${maxMegawatts} MW today, peaking ${time} ${date}.`
  const alertMsgBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `>*PV Today Max Alert* \n>:chart_with_upwards_trend: OCF Nowcast Maximum of *${maxMegawatts} MW* today.`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`\`\`Peaking at ${time} \n${date}\`\`\``
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
            text: "Alert trigger: Daily max forecast alert"
          }
        ]
      }
    ];

  env.LOG.put(`${new Date().toISOString()}--${crypto.randomUUID()}`, JSON.stringify({
    text: alert_msg
  }), {
    metadata: { loggedAt: new Date().toISOString() },
  })
  const init = {
    // Hard coded Slack webhook format for now
    body: JSON.stringify({
      text: alert_msg,
      blocks: alertMsgBlocks
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

export default {
	async scheduled(controller, env, context) {
    context.waitUntil(daily_max(env))
	},
};
