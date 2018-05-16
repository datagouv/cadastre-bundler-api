const {createReadStream} = require('fs')
const {createGunzip} = require('zlib')
const {convert} = require('geojson2shp')
const {parse} = require('geojson-stream')
const pumpify = require('pumpify')

function createConvertStream(geojsonSourcePath, layer) {
  return pumpify(
    createReadStream(geojsonSourcePath),
    createGunzip(),
    parse(),
    convert({layer})
  )
}

module.exports = {createConvertStream}
