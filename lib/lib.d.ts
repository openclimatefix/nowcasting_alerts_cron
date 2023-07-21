import { KVNamespace } from '@cloudflare/workers-types'

export type Env = {
  CLIENT_ID: string,
  CLIENT_SECRET: string,
  ALERTS: KVNamespace,
  STORAGE: KVNamespace<'token'>,
  LOG: KVNamespace,
}

export type AlertRecord = {
  name: string,
  url: string
}

export type OcfNationalForecastResponse = {
  targetTime: string,
  expectedPowerGenerationMegawatts: number,
  expectedPowerGenerationNormalized: number
}[]

export type OcfPvLiveResponse = {
  datetimeUtc: string,
  solarGenerationKw: number,
  regime: string,
  capacityMwp: number,
  pvliveUpdatedUtc: string,
  gsp: {
    label: string,
    gspId: string,
    gspName: string,
    gspGroup: string,
    regionName: string,
    installedCapacityMw: number
  }
}[]
