import { sdk } from '../sdk'
import { config } from './config'
import { restartService } from './restartService'
import { uiCredentials } from './uiCredentials'

export const actions = sdk.Actions.of()
  .addAction(config)
  .addAction(restartService)
  .addAction(uiCredentials)
