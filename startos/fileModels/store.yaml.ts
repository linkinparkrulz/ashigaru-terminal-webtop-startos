import { matches, FileHelper, T } from '@start9labs/start-sdk'
const { object, string, boolean, oneOf, literal } = matches

const shape = object({
  title: string,
  username: string,
  password: string.optional(),
  reconnect: boolean.onMismatch(false),
  ashigaruterminal: object({
    managesettings: boolean,
    server: object({
      type: oneOf(
        literal('fulcrum'),
        literal('electrs'),
        literal('public'),
      ).onMismatch('electrs'),
      user: string,
      password: string,
    }),
    proxy: object({
      type: oneOf(literal('tor'), literal('none')).onMismatch('tor'),
    }),
  }),
})

export type StoreType = typeof shape._TYPE

export const store = FileHelper.yaml(
  '/media/startos/volumes/main/start9/config.yaml',
  shape,
)

export const createDefaultStore = async (effects: T.Effects) => {
  // check if the file exists (from previous installs or upgrades)
  const conf = await store.read().once()
  if (conf) {
    console.log('Ashigaru Terminal config file already exists')
    return
  }

  // config file does not exist, create it
  console.log('Ashigaru Terminal config file does not exist, creating it')
  const installedPackages = await effects.getInstalledPackages()
  const serverType = installedPackages.includes('fulcrum')
    ? 'fulcrum'
    : installedPackages.includes('electrs')
      ? 'electrs'
      : 'public'

  await store.write(effects, {
    title: 'Ashigaru Terminal',
    username: 'ashigaru',
    reconnect: false,
    ashigaruterminal: {
      managesettings: true,
      server: {
        type: serverType,
        user: '',
        password: '',
      },
      proxy: {
        type: 'tor',
      },
    },
  })
}
