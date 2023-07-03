'use strict'

const {createReadStream} = require('fs')
const {createGzip, createGunzip} = require('zlib')
const {stringify, parse} = require('JSONStream')
const pumpify = require('pumpify')

const GEOJSON = {
  open: '{"type":"FeatureCollection","features":[\n',
  separator: ',\n',
  close: ']}'
}

function createGeoJSONWriteStream(streamOut, compress = true) {
  const args = [
    stringify(GEOJSON.open, GEOJSON.separator, GEOJSON.close)
  ]
  if (compress) {
    args.push(createGzip())
  }
  args.push(streamOut)
  console.log('compress length', args.length)
  return pumpify.obj(...args)
}

function createGeoJSONReadStream(path) {
  const file = createReadStream(path)
  const gunzip = createGunzip()
  const parser = parse('features.*')

  function onError(error) {
    file.destroy()
    gunzip.destroy()
    parser.emit('error', error)
    parser.destroy()
  }

  file.on('error', onError)
  gunzip.on('error', onError)

  file.pipe(gunzip).pipe(parser)

  return parser
}

module.exports = {
  createGeoJSONReadStream,
  createGeoJSONWriteStream
}
