import { fetchOcfForecastData } from "../lib/utils";
import { AlertRecord, Env } from "../lib/lib";

async function dailyMax(env: Env) {
  const alertsKeys = await env.ALERTS.list()
  const alerts: AlertRecord[] = await Promise.all(alertsKeys.keys.map(k => env.ALERTS.get(k.name, {type: "json"}) as Promise<AlertRecord>))
  console.log('alerts', JSON.stringify(alerts))

  const ocfForecastData = await fetchOcfForecastData(env)
  if(!ocfForecastData) return

  console.log('ocfForecastData: Array of length ', ocfForecastData.length)

  const [todayDate] = new Date().toISOString().split('T')
  const todayForecastValues = ocfForecastData.filter(o => o.targetTime.split('T')[0] === todayDate)
  console.log('todayForecastValues: Array of length ', todayForecastValues.length)
  let maxForecastValue = todayForecastValues[0]
  for (const fv of todayForecastValues) {
    if (fv.expectedPowerGenerationMegawatts > maxForecastValue.expectedPowerGenerationMegawatts) {
      maxForecastValue = fv
    }
  }

  const time = new Date(maxForecastValue.targetTime).toLocaleTimeString('en-GB', { timeStyle: 'long' });
  const date = new Date(maxForecastValue.targetTime).toLocaleDateString('en-GB', { dateStyle: 'long' });
  const maxMegawatts = Math.round(maxForecastValue.expectedPowerGenerationMegawatts).toLocaleString();

  const alertMsg = `PV Today Max Alert! OCF Nowcast maximum of ${maxMegawatts} MW today, peaking ${time} ${date}.`
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

  await env.LOG.put(`${new Date().toISOString()}--${crypto.randomUUID()}`, JSON.stringify({
    text: alertMsg
  }), {
    metadata: { loggedAt: new Date().toISOString() },
  })

  const init = {
    // Hard coded Slack webhook format for now
    body: JSON.stringify({
      text: alertMsg,
      blocks: alertMsgBlocks
    }),
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  }
  for (const alert of alerts) {
    console.log(`Alert webhook POST to ${alert.url}`)
    const response = await fetch(alert.url, init);
    console.log(`Alert webhook POST to ${alert.url} responded with ${response.status}`)
  }
}

export default {
	async scheduled(controller: any, env: Env, context: any) {
    context.waitUntil(dailyMax(env))
	},
};
