const neostandard = require('neostandard')

module.exports = neostandard({
  ts: true,
  env: ['mocha'],
  ignores: [
    ...neostandard.resolveIgnoresFromGitignore(),
  ],
})
