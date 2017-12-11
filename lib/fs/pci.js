const {join} = require('path')
const {compact} = require('lodash')
const {readdir, fileExist} = require('../util/fs')
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

  getDepartementArchivePath(codeDep) {
    return join(this.getDepartementsArchivesPath(), `dep${codeDep}.zip`)
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

    if (await fileExist(directory)) {
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

module.exports = {Tree, TreeError}
