const {Router} = require('express')

const {departementLayerPath, getLayerPath} = require('./fs/cadastre-etalab')
const {notImplemented, validFormat, validLayer} = require('./middlewares')
const {fileExists} = require('./util/fs')
const {asExpressMiddleware} = require('./util/express')

const app = new Router()

app.param('format', validFormat(['geojson', 'geojson-gz']))

app.param('layer', validLayer([
  'batiments',
  'communes',
  'feuilles',
  'parcelles',
  'sections'
])
)

const geojsonGzipHeaders = {'Content-Type': 'application/vnd.geo+json', 'Content-Encoding': 'gzip'}

const downloadExistingBundle = asExpressMiddleware(async (req, res) => {
  if (!(await fileExists(req.bundlePath))) {
    return res.status(400).send({code: 400, message: 'Le fichier n’existe pas.'})
  }

  if (req.method === 'HEAD') {
    res.sendStatus(200)
  } else {
    if (req.withGzipHeader) {
      res.withGzipHeader(req.bundlePath, {headers: geojsonGzipHeaders})
    } else {
      res.download(req.bundlePath, req.attachmentName)
    }
  }
})

app.get('/departements/:codeDepartement/:format/:layer', (req, res, next) => {
  const {codeDepartement, format, layer} = req.params
  const forceDownload = Boolean(req.query.download)
  req.bundlePath = departementLayerPath(process.env.CADASTRE_DATA_BASEPATH, format, layer, codeDepartement)
  req.withGzipHeader = format === 'geojson' && forceDownload
  req.attachmentName = format === 'geojson' ?
    `cadastre-${codeDepartement}-${layer}.json.gz` :
    `cadastre-${codeDepartement}-${layer}.json`

  next()
}, downloadExistingBundle)

app.get('/communes/:codeCommune/:format/:layer', (req, res, next) => {
  const {codeCommune, format, layer} = req.params
  const forceDownload = Boolean(req.query.download)
  req.bundlePath = getLayerPath(process.env.CADASTRE_DATA_BASEPATH, format, codeCommune, layer)
  req.withGzipHeader = format === 'geojson' && forceDownload
  req.attachmentName = format === 'geojson' ?
    `cadastre-${codeCommune}-${layer}.json.gz` :
    `cadastre-${codeCommune}-${layer}.json`

  next()
}, downloadExistingBundle)

app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
