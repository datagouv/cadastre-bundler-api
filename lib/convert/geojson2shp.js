const {createReadStream} = require('fs')
const {createGunzip} = require('zlib')
const {convert} = require('geojson2shp')
const {parse} = require('geojson-stream')
const pumpify = require('pumpify')

const crsMapping = {
  // Guadeloupe
  971: 5490,
  // Martinique
  972: 5490,
  // Guyane
  973: 2972,
  // Réunion
  974: 2975,
  // Mayotte
  976: 4471
}

function getLegalCrsCode(departementCode) {
  return departementCode in crsMapping ? crsMapping[departementCode] : 2154
}

function createConvertStream(geojsonSourcePath, layer, departementCode) {
  const targetCrs = getLegalCrsCode(departementCode)
  return pumpify(
    createReadStream(geojsonSourcePath),
    createGunzip(),
    parse(),
    convert({targetCrs, layer})
  )
}

module.exports = {createConvertStream}
