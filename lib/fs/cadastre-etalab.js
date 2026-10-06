'use strict'

const {join} = require('path')
const {getCodeDep} = require('../util/codes')
const {combineURLs} = require('../util/fs')

const CADASTRE_MILLESIME = process.env.CADASTRE_MILLESIME || 'latest'

function treeBasePath(basePath, format, millesime = CADASTRE_MILLESIME) {
  return combineURLs(basePath, join('etalab-cadastre', millesime, format))
}

function getLayerPath(basePath, format, codeCommune, layerName, millesime = CADASTRE_MILLESIME) {
  const codeDep = getCodeDep(codeCommune)
  return combineURLs(treeBasePath(basePath, format, millesime), join('communes', codeDep, codeCommune, `cadastre-${codeCommune}-${layerName}.json.gz`))
}

function getEpciLayerPath(basePath, format, codeEpci, layerName, millesime = CADASTRE_MILLESIME) {
  return combineURLs(treeBasePath(basePath, format, millesime), join('epcis', codeEpci, `epci-${codeEpci}-${layerName}.json.gz`))
}

function departementLayerPath(basePath, format, layer, codeDep, millesime = CADASTRE_MILLESIME) {
  return combineURLs(treeBasePath(basePath, format, millesime), join('departements', codeDep, `cadastre-${codeDep}-${layer}.json.gz`))
}

module.exports = {getLayerPath, departementLayerPath, getEpciLayerPath, treeBasePath}
