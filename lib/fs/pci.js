/* eslint unicorn/custom-error-definition: off */
const {join} = require('path')
const {compact} = require('lodash')
const {S3Client} = require('@aws-sdk/client-s3')
const {fromEnv} = require('@aws-sdk/credential-providers')
const {readdir, fileExists, combineURLs} = require('../util/fs')
const {fetchObjects, fetchObjectsPrefix, checkFolderExists} = require('../util/s3')
const {getCodeDep, isCodeDepartement, isCodeCommune} = require('../util/codes')

function getFeuilleArchiveExt(format) {
  if (format === 'tiff') return 'zip'
  return 'tar.bz2'
}

class TreeError extends Error {}

class Tree {
  constructor(basePath, prefix, format) {
    this.format = format
    this.treeBasePath = join(basePath, prefix, format)
  }

  getFeuillesBasePath() {
    return join(this.treeBasePath, 'feuilles')
  }

  getDepartementsArchivesPath() {
    return join(this.treeBasePath, 'departements')
  }

  getEpciArchivesPath() {
    return join(this.treeBasePath, 'epcis')
  }

  getDepartementArchivePath(codeDep) {
    return join(this.getDepartementsArchivesPath(), `dep${codeDep}.zip`)
  }

  getEpciArchivePath(codeEpci, format) {
    return join(this.getEpciArchivesPath(), `cadastre-${codeEpci}-${format}.zip`)
  }

  getFeuillePath(feuille) {
    const codeCommune = feuille.substr(0, 5)
    const codeDep = getCodeDep(codeCommune)
    return join(this.getFeuillesBasePath(), codeDep, codeCommune, `${this.format}-${feuille}.${getFeuilleArchiveExt(this.format)}`)
  }

  getFeuillePathInArchive(feuille) {
    return `${feuille.substr(0, 5)}/${this.format}-${feuille}.${getFeuilleArchiveExt(this.format)}`
  }

  async listDepartements() {
    const directory = this.getFeuillesBasePath()
    const entries = await readdir(directory)
    return entries.filter(isCodeDepartement)
  }

  async listCommunesByDepartement(codeDep) {
    const directory = join(this.getFeuillesBasePath(), codeDep)
    const entries = await readdir(directory)
    return entries.filter(isCodeCommune)
  }

  async listFeuillesByCommune(codeCommune) {
    const codeDep = getCodeDep(codeCommune)
    const directory = join(this.getFeuillesBasePath(), codeDep, codeCommune)

    if (await fileExists(directory)) {
      const entries = await readdir(directory)

      const regex = this.format === 'tiff' ?
        /^tiff-([A-Z0-9]{12})\.zip$/i :
        new RegExp(`^${this.format}-([A-Z0-9]{12})\\.tar\\.bz2$`, 'i')

      return compact(entries.map(fileName => {
        const res = fileName.match(regex)
        return res ? res[1] : null
      }))
    }

    throw new TreeError('Le fichier n’existe pas : ' + directory)
  }
}

class TreeS3 {
  constructor(urlBasePath, bucket, prefix, format) {
    this.format = format
    this.prefix = prefix
    this.bucket = bucket

    this.client = new S3Client({
      credentials: fromEnv()
    })

    this.treeUrlBasePath = combineURLs(combineURLs(urlBasePath, prefix), format)
  }

  getFeuillesBasePath() {
    return combineURLs(this.treeUrlBasePath, 'feuilles')
  }

  getDepartementsArchivesPath() {
    return combineURLs(this.treeUrlBasePath, 'departements')
  }

  getEpciArchivesPath() {
    return combineURLs(this.treeUrlBasePath, 'epcis')
  }

  getDepartementArchivePath(codeDep) {
    return combineURLs(this.getDepartementsArchivesPath(), `dep${codeDep}.zip`)
  }

  getEpciArchivePath(codeEpci, format) {
    return combineURLs(this.getEpciArchivesPath(), `cadastre-${codeEpci}-${format}.zip`)
  }

  getFeuillePath(feuille) {
    const codeCommune = feuille.substr(0, 5)
    const codeDep = getCodeDep(codeCommune)
    return combineURLs(this.getFeuillesBasePath(), join(codeDep, codeCommune, `${this.format}-${feuille}.${getFeuilleArchiveExt(this.format)}`))
  }

  getFeuillePathInArchive(feuille) {
    return `${feuille.substr(0, 5)}/${this.format}-${feuille}.${getFeuilleArchiveExt(this.format)}`
  }

  async listDepartements() {
    const pathS3 = join(this.prefix, this.format, 'feuilles') + '/'
    const entries = await fetchObjectsPrefix(this.client, this.bucket, pathS3)
    return entries.filter(isCodeDepartement)
  }

  async listCommunesByDepartement(codeDep) {
    const pathS3 = join(this.prefix, this.format, 'feuilles', codeDep) + '/'
    const entries = await fetchObjectsPrefix(this.client, this.bucket, pathS3)
    return entries.filter(isCodeCommune)
  }

  async listFeuillesByCommune(codeCommune) {
    const codeDep = getCodeDep(codeCommune)
    const pathS3 = join(this.prefix, this.format, 'feuilles', codeDep, codeCommune)

    if (await checkFolderExists(this.client, this.bucket, pathS3)) {
      const entries = await fetchObjects(this.client, this.bucket, pathS3)
      const regex = this.format === 'tiff' ?
        /^tiff-([A-Z0-9]{12})\.zip$/i :
        new RegExp(`^${this.format}-([A-Z0-9]{12})\\.tar\\.bz2$`, 'i')

      return compact(entries
        .map(entry => entry.Key.replace(pathS3 + '/', ''))
        .map(fileName => {
          const res = fileName.match(regex)
          return res ? res[1] : null
        })
      )
    }

    throw new TreeError('Le dossier n’existe pas : ' + pathS3)
  }
}

module.exports = {Tree, TreeS3, TreeError}
