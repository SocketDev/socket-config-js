'use strict'

const { readFile } = require('node:fs/promises')
const path = require('node:path')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

const {
  getDefaultConfig,
  parseSocketConfig,
  SocketValidationError,
} = require('../index.js')

chai.use(chaiAsPromised)
const should = chai.should()

/** @type {import('../index.js').SocketYml} */
const defaults = {
  'version': 2,
  'githubApp': {},
  'issueRules': {},
  'projectIgnorePaths': [],
}

describe('parseSocketConfig()', () => {
  it('should read and parse socket.yml', async () => {
    const fileContent = await readFile(path.resolve(__dirname, 'sample.yml'), 'utf8')

    parseSocketConfig(fileContent).should.deep.equal({
      'githubApp': {
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

  it('should read and parse socket.yml v1', async () => {
    const fileContent = await readFile(path.resolve(__dirname, 'sample-v1.yml'), 'utf8')

    parseSocketConfig(fileContent).should.deep.equal({
      'githubApp': {
        'enabled': true,
        'projectReportsEnabled': false,
        'pullRequestAlertsEnabled': true,
      },
      'issueRules': {},
      'projectIgnorePaths': [
        'foo',
        'bar',
      ],
      'version': 2,
    })
  })

  it('should throw on invalid document structure', () => {
    should.Throw(() => {
      parseSocketConfig(`
projectIgnorePaths: true
`)
    }, SocketValidationError, /Invalid config definition/)
  })

  it('should throw error when not parseable', () => {
    should.Throw(() => {
      parseSocketConfig(`
foo: abc, {{ bcd }} {{ cde }}
bar: {{ def }} {{ efg }}
`)
    }, /Error when parsing socket\.yml config/)
  })

  it('should not return unknown properties', () => {
    parseSocketConfig(`
version: 2
foo: true
`)
      .should.deep.equal(defaults)
  })

  it('should coerce types', () => {
    parseSocketConfig(`
version: 2
projectIgnorePaths: foobar
`)
      .should.deep.equal({
        ...defaults,
        projectIgnorePaths: ['foobar'],
      })
  })
})

describe('getDefaultConfig()', () => {
  it('should return a default config', () => {
    getDefaultConfig().should.deep.equal(defaults)
  })
})
