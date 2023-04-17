'use strict'

const {join} = require('path')
const {getCodeDep, isCodeDepartement} = require('../util/codes')
const {glob, readdir} = require('../util/fs')

function departementPath(basePath, format, codeDep) {
  return join(basePath, 'etalab-cadastre', 'latest', format, 'departements', codeDep)
}

function communePath(basePath, format, codeCommune) {
  const codeDep = getCodeDep(codeCommune)
  return join(basePath, 'etalab-cadastre', 'latest', format, 'communes', codeDep, codeCommune)
}

function epciPath(basePath, format, codeEpci) {
  return join(basePath, 'etalab-cadastre', 'latest', format, 'epci', codeEpci)
}

function getLayerPath(basePath, format, codeCommune, layerName) {
  return join(communePath(basePath, format, codeCommune), `cadastre-${codeCommune}-${layerName}.json.gz`)
}

function getEpciLayerPath(basePath, format, codeEpci, layerName) {
  return join(epciPath(basePath, format, codeEpci), `cadastre-${codeEpci}-${layerName}.json.gz`)
}

function departementsPath(basePath) {
  return join(basePath, 'etalab-cadastre', 'communes')
}

async function listDepartements(basePath) {
  const directory = departementsPath(basePath)
  const entries = await readdir(directory)
  return entries.filter(isCodeDepartement)
}

async function listLayerFilesByDepartement(basePath, layer, codeDep) {
  const cwd = join(basePath, 'etalab-cadastre', 'communes', codeDep)
  const relativePaths = await glob(`**/cadastre-*-${layer}.json.gz`, {cwd})
  return relativePaths.map(path => join(cwd, path))
}

function departementLayerPath(basePath, format, layer, codeDep) {
  return join(departementPath(basePath, format, codeDep), `cadastre-${codeDep}-${layer}.json.gz`)
}

module.exports = {getLayerPath, departementPath, communePath, listDepartements, listLayerFilesByDepartement, departementLayerPath, getEpciLayerPath}
