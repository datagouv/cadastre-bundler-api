'use strict'

const {join} = require('path')
const {getCodeDep} = require('../util/codes')
const {combineURLs} = require('../util/fs')

const CADASTRE_MILLESIME = process.env.CADASTRE_MILLESIME || 'latest'

function treeBasePath(basePath, format) {
  return combineURLs(basePath, join('etalab-cadastre', CADASTRE_MILLESIME, format))
}

function getLayerPath(basePath, format, codeCommune, layerName) {
  const codeDep = getCodeDep(codeCommune)
  return combineURLs(treeBasePath(basePath, format), join('communes', codeDep, codeCommune, `cadastre-${codeCommune}-${layerName}.json.gz`))
}

function getEpciLayerPath(basePath, format, codeEpci, layerName) {
  return combineURLs(treeBasePath(basePath, format), join('epcis', codeEpci, `epci-${codeEpci}-${layerName}.json.gz`))
}

function departementLayerPath(basePath, format, layer, codeDep) {
  return combineURLs(treeBasePath(basePath, format), join('departements', codeDep, `cadastre-${codeDep}-${layer}.json.gz`))
}

module.exports = {getLayerPath, departementLayerPath, getEpciLayerPath, treeBasePath}
