'use strict'

const { readFile } = require('node:fs/promises')

const { default: Ajv } = require('ajv')
const { ErrorWithCause } = require('pony-cause')
const { parse: yamlParse } = require('yaml')

const { socketYmlSchemaV1 } = require('./lib/v1')

/**
 * @typedef SocketYmlGitHub
 * @property {boolean} [enabled] enable/disable the Socket.dev GitHub app entirely
 * @property {string[]} [ignoreUsers] list of GitHub usernames to ignore when creating reports
 * @property {boolean} [projectReportsEnabled] enable/disable Github app project report checks
 * @property {boolean} [pullRequestAlertsEnabled] enable/disable GitHub app pull request alert checks
 * @property {boolean} [dependencyOverviewEnabled] enable/disable Pull request comments with details about changed dependencies
 * @property {boolean} [authenticatedProjectReports] enable/disable authenticated project report URLs
 */

/**
 * @typedef SocketYml
 * @property {2} version
 * @property {string[]} projectIgnorePaths
 * @property {{ [issueName: string]: boolean }} issueRules
 * @property {SocketYmlGitHub} githubApp
 */

/** @type {import('ajv').JSONSchemaType<SocketYml>} */
const socketYmlSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    version: { type: 'integer' },
    projectIgnorePaths: {
      type: 'array',
      items: { type: 'string' },
      default: []
    },
    issueRules: {
      type: 'object',
      required: [],
      additionalProperties: { type: 'boolean' },
      default: {}
    },
    githubApp: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', nullable: true },
        ignoreUsers: {
          type: 'array',
          items: { type: 'string' },
          nullable: true
        },
        projectReportsEnabled: { type: 'boolean', nullable: true },
        pullRequestAlertsEnabled: { type: 'boolean', nullable: true },
        dependencyOverviewEnabled: { type: 'boolean', nullable: true },
        authenticatedProjectReports: { type: 'boolean', nullable: true }
      },
      required: [],
      additionalProperties: false,
      default: {}
    },
  },
  required: ['version'],
  additionalProperties: false,
}

const ajvOptions = /** @type {const} */ ({
  allErrors: true,
  coerceTypes: 'array',
  logger: false,
  useDefaults: true
})

const ajv = new Ajv({
  ...ajvOptions,
  removeAdditional: 'failing',
})

const validate = ajv.compile(socketYmlSchema)

// We want to be strict and fail rather than removeAdditional when we parse a possible v1 config – only fallback to it when it actually matches well
const ajvV1 = new Ajv({
  ...ajvOptions
})

const validateV1 = ajvV1.compile(socketYmlSchemaV1)

/**
 * @param {string} filePath
 * @returns {Promise<SocketYml|undefined>}
 * @throws {SocketValidationError}
 */
async function readSocketConfig (filePath) {
  /** @type {string} */
  let fileContent

  try {
    fileContent = await readFile(filePath, 'utf8')
  } catch (err) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      return
    }
    throw new ErrorWithCause('Error when reading socket.yml config file', { cause: err })
  }

  return parseSocketConfig(fileContent)
}

/**
 * @param {string} fileContent
 * @returns {SocketYml}
 * @throws {SocketValidationError}
 */
function parseSocketConfig (fileContent) {
  /** @type {unknown} */
  let parsedContent

  try {
    parsedContent = yamlParse(fileContent)
  } catch (err) {
    throw new ErrorWithCause('Error when parsing socket.yml config', { cause: err })
  }

  if (parsedContent && typeof parsedContent === 'object' && !('version' in parsedContent)) {
    const parsedV1 = parseV1SocketConfig(parsedContent)
    if (parsedV1) {
      return parsedV1
    }
  }

  if (!validate(parsedContent)) {
    throw new SocketValidationError(
      'Invalid config definition',
      validate.errors || [],
      parsedContent
    )
  }

  return parsedContent
}

/**
 * @param {unknown} value
 * @returns {value is NodeJS.ErrnoException}
 */
function isErrnoException (value) {
  if (!(value instanceof Error)) {
    return false
  }

  const errnoException = /** @type NodeJS.ErrnoException} */ (value)

  return errnoException.code !== undefined
}

class SocketValidationError extends Error {
  /**
   * @param {string} message
   * @param {import('ajv').ErrorObject[]} validationErrors
   * @param {unknown} parsedContent
   */
  constructor (message, validationErrors, parsedContent) {
    super(message)

    /** @type {unknown} */
    this.data = parsedContent

    /** @type {import('ajv').JSONSchemaType<SocketYml>} */
    this.schema = socketYmlSchema

    /** @type {import('ajv').ErrorObject[]} */
    this.validationErrors = validationErrors
  }
}

/**
 * @param {object} parsedV1Content
 * @returns {SocketYml | undefined}
 */
function parseV1SocketConfig (parsedV1Content) {
  if (!validateV1(parsedV1Content)) {
    return
  }

  /** @type {SocketYml} */
  const v2 = {
    version: 2,
    projectIgnorePaths: parsedV1Content?.ignore ?? [],
    issueRules: parsedV1Content?.issues ?? {},
    githubApp: {
      ...('enabled' in parsedV1Content ? { enabled: parsedV1Content.enabled } : {}),
      ...('pullRequestAlertsEnabled' in parsedV1Content ? { pullRequestAlertsEnabled: parsedV1Content.pullRequestAlertsEnabled } : {}),
      ...('projectReportsEnabled' in parsedV1Content ? { projectReportsEnabled: parsedV1Content.projectReportsEnabled } : {}),
    }
  }

  return v2
}

/** @returns {SocketYml} */
function getDefaultConfig () {
  const config = { version: 2 }

  if (!validate(config)) {
    throw new Error('Unexpectedly invalid default config')
  }

  return config
}

module.exports = {
  getDefaultConfig,
  parseSocketConfig,
  readSocketConfig,
  SocketValidationError,
  socketYmlSchema,
}
