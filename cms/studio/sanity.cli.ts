import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'g6xm8j7l',
    dataset: 'production',
  },
  deployment: {
    appId: 'ufq6gs6u9zommyghrgw4euzw',
    // Keep the deployed Studio on the exact dependency versions reviewed in this repository.
    autoUpdates: false,
  },
})
