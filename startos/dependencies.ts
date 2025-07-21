import { store } from './fileModels/store.yaml'
import { sdk } from './sdk'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const conf = await store.read().const(effects)

  // no dependencies if we are not managing ashigaru terminal settings
  if (!conf?.ashigaruterminal.managesettings) {
    return {}
  }

  var serverType = conf.ashigaruterminal.server.type

  if (serverType == 'fulcrum') {
    return {
      fulcrum: {
        kind: 'exists',
        // @todo update version range
        versionRange: '>=1.11.1:0',
      },
    }
  }

  if (serverType == 'electrs') {
    return {
      electrs: {
        kind: 'exists',
        // @todo update version range
        versionRange: '>=0.10.9:1-alpha.1',
      },
    }
  }

  return {}
})
