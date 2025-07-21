import os from 'os'
import * as fs from 'node:fs/promises'
import { sdk } from './sdk'
import { T, utils } from '@start9labs/start-sdk'
import { canConnectToRpc, uiPort } from './utils'
import { store } from './fileModels/store.yaml'
import { ashigaru } from './fileModels/ashigaru.json'
import { config } from './actions/config'

export const main = sdk.setupMain(async ({ effects, started }) => {
  console.info('setupMain: Setting up Ashigaru Terminal webtop...')

  // setup a watch on the store file for changes (this restarts the service)
  const conf = await store.read().const(effects)

  if (!conf?.password) {
    throw new Error('Password is required')
  }

  /*
   * Subcontainer setup
   */
  let mounts = sdk.Mounts.of()
    .mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/root/data',
      readonly: false,
    })
    .mountVolume({
      volumeId: 'userdir',
      subpath: null,
      mountpoint: '/config',
      readonly: false,
    })



  // main subcontainer (the webtop container)
  // @todo: review this (should the service do this or can the sdk be smarter?)
  const imageId = os.arch() == 'x64' ? 'main' : 'main-aarch'
  const subcontainer = await sdk.SubContainer.of(
    effects,
    {
      imageId: imageId,
    },
    mounts,
    'main',
  )



  /*
   * Ashigaru Terminal settings
   */
  if (conf.ashigaruterminal.managesettings) {
    let config = {}

    // server config
    if (conf.ashigaruterminal.server.type == 'fulcrum') {
      config = {
        ...config,
        serverType: 'ELECTRUM_SERVER',
        coreServer: 'tcp://127.0.0.1:50001',
      }
    } else if (conf.ashigaruterminal.server.type == 'electrs') {
      config = {
        ...config,
        serverType: 'ELECTRUM_SERVER',
        coreServer: 'tcp://127.0.0.1:50001',
      }
    } else if (conf.ashigaruterminal.server.type == 'public') {
      config = {
        ...config,
        serverType: 'PUBLIC_ELECTRUM_SERVER',
      }
    }

    // proxy config
    if (conf.ashigaruterminal.proxy.type == 'tor') {
      const serverIp = await sdk.getOsIp(effects)
      config = {
        ...config,
        useProxy: true,
        proxyServer: `${serverIp}:9050`,
      }
    } else {
      config = {
        ...config,
        useProxy: false,
      }
    }

    // create default config file if it does not exist
    const configFile = `${subcontainer.rootfs}/config/.ashigaru/config`
    try {
      await fs.access(configFile, fs.constants.F_OK) // check if configFile exists
    } catch (e) {
      await subcontainer.exec([
        'sh',
        '-c',
        `
         mkdir -p /config/.ashigaru && 
         cp /defaults/.ashigaru/config /config/.ashigaru/config && 
         chown -R 1000:1000 /config/.ashigaru
        `,
      ])
    }

    // merge with existing config file
    ashigaru.merge(effects, config)
  }

  /*
   * Daemons
   */
  const primaryDaemon = sdk.Daemons.of(effects, started).addDaemon('primary', {
    subcontainer: subcontainer,
    exec: {
      command: ['docker_entrypoint.sh'],
      runAsInit: true,
      env: {
        PUID: '1000',
        PGID: '1000',
        TZ: 'Etc/UTC',
        TITLE: conf.title,
        CUSTOM_USER: conf.username,
        PASSWORD: conf.password,
        RECONNECT: conf.reconnect ? 'true' : 'false',
      },
    },
    ready: {
      display: 'Web Interface',
      fn: () =>
        sdk.healthCheck.checkWebUrl(
          effects,
          'http://ashigaru-webtop.startos:' + uiPort,
          {
            successMessage: 'The web interface is ready',
            errorMessage: 'The web interface is unreachable',
          },
        ),
    },
    requires: [],
  })

  // if we are managing the Ashigaru Terminal settings, add a health check to display the connected server
  if (conf.ashigaruterminal.managesettings) {
    primaryDaemon.addHealthCheck('check-connected-node', {
      ready: {
        display: 'Connected Server',
        fn: async () => {
          if (conf.ashigaruterminal.server.type == 'fulcrum') {
            // @todo: check if we can connect to the local fulcrum server
            return {
              message: 'Using local fulcrum server',
              result: 'success',
            }
          }

          if (conf.ashigaruterminal.server.type == 'electrs') {
            // @todo: check if we can connect to the local electrum server
            return {
              message: 'Using local electrum server',
              result: 'success',
            }
          }

          sdk.action.createOwnTask(effects, config, 'important', {
            reason: 'Change settings to not use a public electrum server',
          })

          return {
            message: 'Using a public electrum server',
            result: 'failure',
          }
        },
      },
      requires: [],
    })
  }

  return primaryDaemon
})
