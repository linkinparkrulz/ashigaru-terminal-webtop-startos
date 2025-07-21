import { sdk } from '../sdk'
import { T, utils } from '@start9labs/start-sdk'
import { createDefaultStore, store } from '../fileModels/store.yaml'
import { Variants } from '@start9labs/start-sdk/base/lib/actions/input/builder'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  title: Value.text({
    name: 'Webtop Title',
    description:
      'This value will be displayed as the title of your browser tab.',
    required: true,
    default: 'Ashigaru Terminal',
    placeholder: 'Ashigaru Terminal',
    patterns: [utils.Patterns.ascii],
  }),
  username: Value.text({
    name: 'Username',
    description: 'The username for logging into your Webtop.',
    required: true,
    default: 'ashigaru',
    placeholder: '',
    masked: false,
    patterns: [utils.Patterns.ascii],
  }),
  password: Value.text({
    name: 'Password',
    description: 'The password for logging into your Webtop.',
    required: true,
    generate: {
      charset: 'a-z,0-9',
      len: 20,
    },
    default: { charset: 'a-z,0-9', len: 20 },
    placeholder: '',
    masked: true,
    minLength: 8,
  }),
  reconnect: Value.toggle({
    name: 'Automatically reconnect',
    description:
      'Automatically reconnect when the connection to the desktop is lost or the browser tab has been idle for too long.',
    default: false,
  }),
  ashigaruterminal: Value.object(
    {
      name: 'Ashigaru Terminal settings',
      description: 'Ashigaru Terminal settings',
    },
    InputSpec.of({
      managesettings: Value.toggle({
        name: 'Apply settings on startup',
        description:
          'Disable to manage your own server and proxy settings in Ashigaru Terminal',
        default: true,
      }),
      server: Value.dynamicUnion(async ({ effects }) => {
        // determine default server type and disabled options
        const installedPackages = await effects.getInstalledPackages()
        let serverType: 'fulcrum' | 'electrs' | 'public' = 'public'
        let disabled: string[] = []

        if (installedPackages.includes('fulcrum')) {
          serverType = 'fulcrum'
        } else {
          disabled.push('fulcrum')
        }

        if (installedPackages.includes('electrs')) {
          serverType = 'electrs'
        } else {
          disabled.push('electrs')
        }

        return {
          name: 'Server',
          description: 'Electrum Server',
          default: serverType,
          disabled: disabled,
          variants: Variants.of({
            fulcrum: {
              name: 'Fulcrum' + (disabled.includes('fulcrum') ? ' (not installed)' : ''),
              spec: InputSpec.of({}),
            },
            electrs: {
              name: 'Electrs' + (disabled.includes('electrs') ? ' (not installed)' : ''),
              spec: InputSpec.of({}),
            },
            public: {
              name: 'Public (not recommended)',
              spec: InputSpec.of({}),
            },
          }),
        }
      }),
      proxy: Value.union({
        name: 'Proxy',
        description: 'Proxy settings',
        default: 'tor',
        variants: Variants.of({
          tor: {
            name: 'Tor (recommended)',
            spec: InputSpec.of({}),
          },
          none: {
            name: 'None',
            spec: InputSpec.of({}),
          },
        }),
      }),
    }),
  ),
})

export const config = sdk.Action.withInput(
  // id
  'config',

  // metadata
  async ({ effects }) => ({
    name: 'Settings',
    description: 'Webtop username/password and connection settings',
    warning: null,
    allowedStatuses: 'any',
    group: 'Configuration',
    visibility: 'enabled',
  }),

  // form input specification
  inputSpec,

  // optionally pre-fill the input form
  async ({ effects }) => readSettings(effects),

  // the execution function
  ({ effects, input }) => writeSettings(effects, input),
)

type InputSpec = typeof inputSpec._TYPE
type PartialInputSpec = typeof inputSpec._PARTIAL

async function readSettings(effects: T.Effects): Promise<PartialInputSpec> {
  let settings = await store.read().once()
  if (!settings) {
    await createDefaultStore(effects)
    settings = (await store.read().once())!
  }

  return {
    title: settings.title,
    username: settings.username,
    password: settings.password,
    reconnect: settings.reconnect,
    ashigaruterminal: {
      managesettings: settings.ashigaruterminal.managesettings,
      server: {
        selection: settings.ashigaruterminal.server.type,
      },
      proxy: {
        selection: settings.ashigaruterminal.proxy.type,
      },
    },
  }
}

async function writeSettings(effects: T.Effects, input: InputSpec) {
  if (
    input.ashigaruterminal.managesettings &&
    input.ashigaruterminal.server.selection == 'public'
  ) {
    console.log('using public electrum server')
  }

  if (
    input.ashigaruterminal.managesettings &&
    input.ashigaruterminal.server.selection == 'fulcrum'
  ) {
    console.log('using local fulcrum server')
  }

  if (
    input.ashigaruterminal.managesettings &&
    input.ashigaruterminal.server.selection == 'electrs'
  ) {
    console.log('using local electrs server')
  }

  await store.merge(effects, {
    title: input.title,
    username: input.username,
    password: input.password,
    reconnect: input.reconnect,
    ashigaruterminal: {
      managesettings: input.ashigaruterminal.managesettings,
      server: {
        type: input.ashigaruterminal.server.selection,
      },
      proxy: {
        type: input.ashigaruterminal.proxy.selection,
      },
    },
  })
}
