import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'g6xm8j7l',
    dataset: 'production'
  },
  deployment: {
    appId: 'ufq6gs6u9zommyghrgw4euzw',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
