'use strict'

const path = require('node:path')

const chai = require('chai')
const { expect } = chai
const { default: chaiAsPromised } = require('chai-as-promised')

const {
  readSocketConfig
} = require('../index.js')

chai.use(chaiAsPromised)

describe('readSocketConfig()', () => {
  it('should read and parse socket.yml', async () => {
    await expect(
      readSocketConfig(path.resolve(__dirname, 'sample.yml'))
    ).to.eventually.deep.equal({
      githubApp: {
        enabled: true,
        projectReportsEnabled: true,
        pullRequestAlertsEnabled: true,
      },
      issueRules: {
        unresolvedRequire: false,
      },
      projectIgnorePaths: [
        'workspaces/test*',
        '!workspaces/test-framework',
      ],
      version: 2,
    })
  })

  it('should fail silently when file not found', async () => {
    await expect(
      readSocketConfig(path.resolve(__dirname, 'non-existing.yml'))
    ).to.eventually.equal(undefined)
  })

  it('should throw error when given a non-file', async () => {
    await expect(
      readSocketConfig(__dirname)
    ).to.be.rejectedWith(/Error when reading socket\.yml config file/)
  })
})
