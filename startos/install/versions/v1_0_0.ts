import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'

export const v1_0_0 = VersionInfo.of({
  version: '1.0.0:0',
  releaseNotes: 'First official release of Ashigaru Terminal on StartOS',
  migrations: {
    up: async ({ effects }) => { },
    down: IMPOSSIBLE,
  },
})
