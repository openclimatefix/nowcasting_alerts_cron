import { Env, OcfNationalForecastResponse, OcfPvLiveResponse } from "./lib";

export const getNewToken = async (env: Env) => {
  // Get new token from Auth0 using client credentials grant
  const response = await fetch('https://nowcasting-pro.eu.auth0.com/oauth/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      audience: "https://api.nowcasting.io/",
      grant_type: "client_credentials"
    })
  })
  if (!response) return

  const result = await response.json()
  return result?.access_token
}

const fetchWithToken = async (route: string, token: string) => {
  return await fetch(route, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}

export const fetchDataWithAuth = async <ReturnDataType>(route: string, env: Env): Promise<ReturnDataType | undefined> => {
  console.log(`Fetching data from ${route}`)
  // Get token from KV storage
  let token = await env.STORAGE.get("token")
  let usingSavedToken = true

  // If token is not in KV storage, get a new one
  if(!token) {
    console.log('No token in storage, getting new token')
    usingSavedToken = false
    token = await getNewToken(env)
    // If we can't get a new token, return
    if(!token) return;

    // Save new token to KV storage
    await env.STORAGE.put("token", token)
  }

  // A token is in KV storage, so we attempt to use it to fetch data
  let response = await fetchWithToken(route, token);
  // If we can't fetch data at all, return
  if (!response) return

  console.log(`First attempt to fetch data using ${usingSavedToken ? "saved" : "fresh"} token returned status ${response.status}`)
  if (response.status !== 200) {
    if (response.status === 401) {
      // Unauthorized, so we get a new token
      console.log('Request failed with 401, getting new token')
      token = await getNewToken(env)
      // If we can't get a new token, return
      if(!token) return

      // Save new token to KV storage
      await env.STORAGE.put("token", token)

      // Try to fetch data again
      response = await fetchWithToken(route, token)
      console.log(`Second attempt to fetch data using fresh token returned status ${response.status}`)

      // If we still can't fetch data, return
      if (!response || response.status !== 200) return
    } else {
      // Some other error, so we won't continue
      return
    }
  }
  // Token is valid, response has status 200, so we can return the data
  return await response.json()
}

export const fetchOcfForecastData = async (env: Env) => {
  return await fetchDataWithAuth<OcfNationalForecastResponse>(
    "https://api.nowcasting.io/v0/solar/GB/national/forecast?historic=true", env
  );
}

export const fetchPvLiveData = async (env: Env) => {
  return await fetchDataWithAuth<OcfPvLiveResponse>(
    "https://api.nowcasting.io/v0/solar/GB/national/pvlive?regime=in-day", env
  )
}
