import { setupManifest } from '@start9labs/start-sdk'
import { SDKImageInputSpec } from '@start9labs/start-sdk/base/lib/types/ManifestTypes'

const ASHIGARU_VERSION = '1.0.0:0'
const ASHIGARU_DEBVERSION = '1.0.0'
const ASHIGARU_PGP_SIG = '' // No PGP verification for Ashigaru (using local .deb)

// the following allows us to build the service for x86 or arm64 specifically
// use: 'make x86' or 'make arm' ('make' will build both)
const BUILD = process.env.BUILD || ''

// @todo we need to define two images and decide which one to use when creating
// the subcontainer (in main.ts), is this correct?

const defaultBuildArgs = {
  ASHIGARU_VERSION: ASHIGARU_VERSION,
  ASHIGARU_DEBVERSION: ASHIGARU_DEBVERSION,
  ASHIGARU_PGP_SIG: ASHIGARU_PGP_SIG,
}

const main_x64: SDKImageInputSpec = {
  arch: ['x86_64'],
  source: {
    dockerBuild: {
      workdir: '.',
      dockerfile: 'Dockerfile',
      buildArgs: {
        ...defaultBuildArgs,
        PLATFORM: 'amd64',
      },
    },
  },
}

const main_aarch64: SDKImageInputSpec = {
  arch: ['aarch64'],
  source: {
    dockerBuild: {
      workdir: '.',
      dockerfile: 'Dockerfile.aarch64',
      buildArgs: {
        ...defaultBuildArgs,
        PLATFORM: 'arm64',
      },
    },
  },
}

// Currently only x86_64 supported (only amd64 .deb available for Ashigaru Terminal)
const images: Record<string, SDKImageInputSpec> = { 'main': main_x64 }

export const manifest = setupManifest({
  id: 'ashigaru-webtop',
  title: 'Ashigaru Terminal',
  license: 'GPLv3',
  wrapperRepo: 'https://github.com/linkinparkrulz/ashigaru-webtop-startos',
  upstreamRepo: 'http://ashicodepbnpvslzsl2bz7l2pwrjvajgumgac423pp3y2deprbnzz7id.onion/Ashigaru',
  supportSite: 'https://github.com/linkinparkrulz/ashigaru-webtop-startos/issues',
  marketingSite: 'https://ashigaru.rs',
  donationUrl: 'https://geyser.fund/project/ashigarufund',
  description: {
    short: 'Ashigaru Terminal - A non-custodial, dedicated Ashigaru Whirlpool client',
    long: "Ashigaru Terminal on Webtop is a stripped down version of 'Webtop' (a Linux Desktop Environment) running the Ashigaru Terminal.\nAshigaru Terminal is a non-custodial, dedicated Ashigaru Whirlpool client which allows users to enter pools of their choice and continue to build their forward and backwards anonymity sets whilst being in full control of their funds during every stage of coinjoin cycles.",
  },
  volumes: ['main', 'userdir'],
  images: images,
  hardwareRequirements: {
    arch: ['x86_64'],
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {
    fulcrum: {
      description: 'Used to connect to your fulcrum electrum server for enhanced privacy.',
      optional: true,
      s9pk: null,
    },
    electrs: {
      description: 'Used to connect to your electrs electrum server for enhanced privacy.',
      optional: true,
      s9pk: null,
    },
  },
})
