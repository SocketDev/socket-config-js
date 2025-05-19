'use strict'

const { readFile } = require('node:fs/promises')
const path = require('node:path')

const chai = require('chai')
const { expect } = chai
const { default: chaiAsPromised } = require('chai-as-promised')

const {
  getDefaultConfig,
  parseSocketConfig,
  SocketValidationError,
} = require('../index.js')

chai.use(chaiAsPromised)

/** @type {import('../index.js').SocketYml} */
const defaults = {
  version: 2,
  githubApp: {},
  issueRules: {},
  projectIgnorePaths: [],
}

describe('parseSocketConfig()', () => {
  it('should read and parse socket.yml', async () => {
    const fileContent = await readFile(path.resolve(__dirname, 'sample.yml'), 'utf8')

    expect(parseSocketConfig(fileContent)).to.deep.equal({
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

  it('should read and parse socket.yml v1', async () => {
    const fileContent = await readFile(path.resolve(__dirname, 'sample-v1.yml'), 'utf8')

    expect(parseSocketConfig(fileContent)).to.deep.equal({
      githubApp: {
        enabled: true,
        projectReportsEnabled: false,
        pullRequestAlertsEnabled: true,
      },
      issueRules: {},
      projectIgnorePaths: ['foo', 'bar'],
      version: 2,
    })
  })

  it('should throw on invalid document structure', () => {
    expect(() => {
      parseSocketConfig(`
projectIgnorePaths: true
`)
    }).to.throw(SocketValidationError, /Invalid config definition/)
  })

  it('should throw error when not parseable', () => {
    expect(() => {
      parseSocketConfig(`
foo: abc, {{ bcd }} {{ cde }}
bar: {{ def }} {{ efg }}
`)
    }).to.throw(/Error when parsing socket\.yml config/)
  })

  it('should not return unknown properties', () => {
    expect(
      parseSocketConfig(`
version: 2
foo: true
`)
    ).to.deep.equal(defaults)
  })

  it('should coerce types', () => {
    expect(
      parseSocketConfig(`
version: 2
projectIgnorePaths: foobar
`)
    ).to.deep.equal({
      ...defaults,
      projectIgnorePaths: ['foobar'],
    })
  })
})

describe('getDefaultConfig()', () => {
  it('should return a default config', () => {
    expect(getDefaultConfig()).to.deep.equal(defaults)
  })
})
