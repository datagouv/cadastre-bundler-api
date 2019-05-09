const {join} = require('path')
const {Router} = require('express')
const contentDisposition = require('content-disposition')

const {departementLayerPath, getLayerPath} = require('./fs/cadastre-etalab')
const wrap = require('./util/wrap')
const {notImplemented, validFormat, validLayer} = require('./middlewares')
const {fileExists} = require('./util/fs')
const {asExpressMiddleware} = require('./util/express')
const {createConvertStream} = require('./convert/geojson2shp')
const {getCodeDep} = require('./util/codes')

const app = new Router()

app.param('format', validFormat(['geojson', 'geojson-gz', 'shp']))

app.param('layer', validLayer([
  'batiments',
  'communes',
  'feuilles',
  'parcelles',
  'sections',
  'lieux_dits',
  'subdivisions_fiscales',
  'prefixes_sections'
])
)

const geojsonGzipHeaders = {'Content-Type': 'application/vnd.geo+json', 'Content-Encoding': 'gzip'}
const shpHeadlers = {'Content-Type': 'application/x-shapefile'}

const downloadExistingBundle = asExpressMiddleware(async (req, res) => {
  if (!(await fileExists(req.bundlePath))) {
    return res.status(404).send({code: 404, message: 'Le fichier n’existe pas.'})
  }

  if (req.method === 'HEAD') {
    res.sendStatus(200)
  } else if (!req.withGzipHeader) {
    res.download(req.bundlePath, req.attachmentName)
  } else if (req.forceDownload) {
    res.download(req.bundlePath, req.attachmentName, {headers: geojsonGzipHeaders})
  } else {
    res.sendFile(req.bundlePath, {headers: geojsonGzipHeaders})
  }
})

app.get('/departements/:codeDepartement/shp/:layer', (req, res) => {
  const {codeDepartement, layer} = req.params
  const fileName = `cadastre-${codeDepartement}-${layer}-shp.zip`
  const bundlePath = join(process.env.CADASTRE_DATA_BASEPATH, 'etalab-cadastre', 'latest', 'shp', 'departements', codeDepartement, fileName)
  res.download(bundlePath, fileName, {headers: shpHeadlers})
})

app.get('/departements/:codeDepartement/:format/:layer', (req, res, next) => {
  const {codeDepartement, format, layer} = req.params
  req.forceDownload = Boolean(req.query.download)
  req.bundlePath = departementLayerPath(process.env.CADASTRE_DATA_BASEPATH, 'geojson', layer, codeDepartement)
  req.withGzipHeader = format === 'geojson'
  req.attachmentName = format === 'geojson' ?
    `cadastre-${codeDepartement}-${layer}.json` :
    `cadastre-${codeDepartement}-${layer}.json.gz`

  next()
}, downloadExistingBundle)

app.get('/communes/:codeCommune/shp/:layer', wrap(async (req, res) => {
  const {codeCommune, layer} = req.params
  const bundlePath = getLayerPath(process.env.CADASTRE_DATA_BASEPATH, 'geojson', codeCommune, layer)

  if (!(await fileExists(bundlePath))) {
    throw notFoundError('Le fichier n’existe pas')
  }

  if (req.method === 'HEAD') {
    return
  }

  const attachmentName = `cadastre-${codeCommune}-${layer}-shp.zip`

  res.set('Content-Type', 'application/x-shapefile')
  res.set('Content-Disposition', contentDisposition(attachmentName))

  return createConvertStream(bundlePath, layer, getCodeDep(codeCommune))
}))

app.get('/communes/:codeCommune/:format/:layer', (req, res, next) => {
  const {codeCommune, format, layer} = req.params
  req.forceDownload = Boolean(req.query.download)
  req.bundlePath = getLayerPath(process.env.CADASTRE_DATA_BASEPATH, 'geojson', codeCommune, layer)
  req.withGzipHeader = format === 'geojson'
  req.attachmentName = format === 'geojson' ?
    `cadastre-${codeCommune}-${layer}.json` :
    `cadastre-${codeCommune}-${layer}.json.gz`

  next()
}, downloadExistingBundle)

app.get('/epci/:codeEPCI/:format/:layer', notImplemented)

function notFoundError(message) {
  const err = new Error(message)
  err.notFound = true
  return err
}

module.exports = app
