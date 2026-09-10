// Temporary diagnostics branch only; retain every other project option.
import config from './vitest.config'

export default {
  ...config,
  test: {
    ...config.test,
    projects: config.test.projects
      .filter(project => project.test.name === 'puppeteer-e2e')
      .map(project => ({ ...project, test: { ...project.test, environment: './.desktop-diagnostic-environment.ts' } })),
  },
}
