'use strict'

const path = require('node:path')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

const {
  readSocketConfig
} = require('../index.js')

chai.use(chaiAsPromised)
chai.should()

describe('readSocketConfig()', () => {
  it('should read and parse socket.yml', async () => {
    await readSocketConfig(path.resolve(__dirname, 'sample.yml')).should.eventually.become({
      'githubApp': {
        'beta': false,
        'enabled': true,
        'projectReportsEnabled': true,
        'pullRequestAlertsEnabled': true,
      },
      'issueRules': {
        'unresolvedRequire': false,
      },
      'projectIgnorePaths': [
        'workspaces/test*',
        '!workspaces/test-framework',
      ],
      'version': 2,
    })
  })

  it('should fail silently when file not found', async () => {
    await readSocketConfig(path.resolve(__dirname, 'non-existing.yml'))
      .should.eventually.become(undefined)
  })

  it('should throw error when given a non-file', async () => {
    await readSocketConfig(__dirname)
      .should.be.rejectedWith(/Error when reading socket\.yml config file/)
  })
})
