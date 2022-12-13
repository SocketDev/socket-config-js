'use strict'

const { readFile } = require('node:fs/promises')
const path = require('node:path')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

const {
  parseSocketConfig,
  SocketValidationError,
} = require('../index.js')

chai.use(chaiAsPromised)
chai.should()

describe('readSocketConfig()', () => {
  it('should read and parse socket.yml', async () => {
    const fileContent = await readFile(path.resolve(__dirname, 'sample.yml'), 'utf8')

    await parseSocketConfig(fileContent).should.eventually.become({
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

  it('should throw on invalid document structure', async () => {
    await parseSocketConfig(`
projectIgnorePaths: true
`)
      .should.be.rejectedWith(SocketValidationError, /Invalid config definition/)
  })

  it('should throw error when not parseable', async () => {
    await parseSocketConfig(`
foo: abc, {{ bcd }} {{ cde }}
bar: {{ def }} {{ efg }}
`).should.be.rejectedWith(/Error when parsing socket\.yml config/)
  })

  it('should not return unknown properties', async () => {
    await parseSocketConfig(`
version: 2
foo: true
`)
      .should.eventually.become({ version: 2 })
  })

  it('should coerce types', async () => {
    await parseSocketConfig(`
version: 2
projectIgnorePaths: foobar
`)
      .should.eventually.become({
        version: 2,
        projectIgnorePaths: ['foobar'],
      })
  })
})
