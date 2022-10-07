export default {
	async scheduled(controller, env, ctx) {
    const alertsKeys = await context.ALERTS.list()
    const alerts = await Promise.all(alertsKeys.keys.map(k => context.ALERTS.get(k.name, {type: "json"})))

		const ocf_req = await fetch("https://api.nowcasting.io/v0/solar/GB/national/forecast", { headers: { 'content-type': 'application/json;charset=UTF-8' }})
    const ocf_data = JSON.stringify(await response.json(ocf_req))
		const pvlive_req = await fetch("https://api.nowcasting.io/v0/solar/GB/national/pvlive?regime=in-day", { headers: { 'content-type': 'application/json;charset=UTF-8' }})
    const pvlive_data = JSON.stringify(await response.json(pvlive_req))

    // Hardcoded 0.5GW deviation check for now
    const threshold_kw = 500000
    // First value in pvlive_data array is the most recent PV_Live estimate (usually from the past 30min)
    const latest_pvlive_kw = pvlive_data[0]["solarGenerationKw"]
    // Now we find the corresponding OCF estimate
    const latest_ocf_estimate = ocf_data.find(o => o.targetTime === pvlive_data[0]["datetimeUtc"])
    if (latest_ocf_estimate) {
      const latest_ocf_kw = latest_ocf_estimate.expectedPowerGenerationMegawatts * 1000
      const deviation = latest_pvlive_kw - latest_ocf_kw
      if (Math.abs(deviation) >= threshold_kw) {
        // Trigger all configured alerts
        const alert_msg = `0.5GW deviation alert! OCF Nowcasting: ${latest_ocf_kw}kW vs PV_Live: ${latest_pvlive_kw}kW`
        console.log(alert_msg)
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
	},
};
