'use strict'

const { readFile } = require('node:fs/promises')

const { default: Ajv } = require('ajv')
const { ErrorWithCause } = require('pony-cause')
const { parse: yamlParse } = require('yaml')

/**
 * @typedef SocketYmlGitHub
 * @property {boolean} [beta] beta opt in field
 * @property {boolean} [enabled] enable/disable the Socket.dev GitHub app entirely
 * @property {boolean} [projectReportsEnabled] enable/disable Github app project report checks
 * @property {boolean} [pullRequestAlertsEnabled] enable/disable GitHub app pull request alert checks
 */

/**
 * @typedef SocketYml
 * @property {2} version
 * @property {string[]} [projectIgnorePaths]
 * @property {{ [issueName: string]: boolean }} [issueRules]
 * @property {SocketYmlGitHub} [githubApp]
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
      nullable: true,
    },
    issueRules: {
      type: 'object',
      nullable: true,
      required: [],
      additionalProperties: { type: 'boolean' },
    },
    githubApp: {
      type: 'object',
      nullable: true,
      properties: {
        beta: { type: 'boolean', nullable: true },
        enabled: { type: 'boolean', nullable: true },
        projectReportsEnabled: { type: 'boolean', nullable: true },
        pullRequestAlertsEnabled: { type: 'boolean', nullable: true },
      },
      required: [],
      additionalProperties: false,
    },
  },
  required: ['version'],
  additionalProperties: false,
}

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: 'array',
  logger: false,
  removeAdditional: 'failing',
})

const validate = ajv.compile(socketYmlSchema)

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
 * @returns {Promise<SocketYml>}
 * @throws {SocketValidationError}
 */
async function parseSocketConfig (fileContent) {
  /** @type {unknown} */
  let parsedContent

  try {
    parsedContent = yamlParse(fileContent)
  } catch (err) {
    throw new ErrorWithCause('Error when parsing socket.yml config', { cause: err })
  }

  if (!validate(parsedContent)) {
    throw new SocketValidationError('Invalid config definition', validate.errors || [])
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
   */
  constructor (message, validationErrors) {
    super(message)

    /** @type {import('ajv').ErrorObject[]} */
    this.validationErrors = validationErrors
  }
}

module.exports = {
  parseSocketConfig,
  readSocketConfig,
  SocketValidationError,
  socketYmlSchema,
}
