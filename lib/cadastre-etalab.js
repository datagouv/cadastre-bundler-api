const {Router} = require('express')

const {departementLayerPath, getLayerPath} = require('./fs/cadastre-etalab')
const {notImplemented, validFormat, validLayer} = require('./middlewares')
const {fileExist} = require('./util/fs')

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

app.get('/departements/:codeDepartement/:format/:layer', async (req, res, next) => {
  const {codeDepartement, format, layer} = req.params
  const forceDownload = Boolean(req.query.download)
  const depPath = departementLayerPath(process.env.CADASTRE_DATA_BASEPATH, format, layer, codeDepartement)

  try {
    if (await fileExist(depPath)) {
      if (format === 'geojson') {
        if (forceDownload) {
          res.download(depPath, `cadastre-${codeDepartement}-${layer}.json`, {headers: geojsonGzipHeaders})
        } else {
          res.sendFile(depPath, {headers: geojsonGzipHeaders})
        }
      } else {
        res.download(depPath, `cadastre-${codeDepartement}-${layer}.json.gz`)
      }
    } else {
      res.status(400).send({code: 400, message: 'Le fichier n’existe pas'})
    }
  } catch (err) {
    next(err)
  }
})

app.get('/communes/:codeCommune/:format/:layer', async (req, res, next) => {
  const {codeCommune, format, layer} = req.params
  const forceDownload = Boolean(req.query.download)
  const depPath = getLayerPath(process.env.CADASTRE_DATA_BASEPATH, format, codeCommune, layer)

  try {
    if (await fileExist(depPath)) {
      if (format === 'geojson') {
        if (forceDownload) {
          res.download(depPath, `cadastre-${codeCommune}-${layer}.json`, {headers: geojsonGzipHeaders})
        } else {
          res.sendFile(depPath, {headers: geojsonGzipHeaders})
        }
      } else {
        res.download(depPath, `cadastre-${codeCommune}-${layer}.json.gz`)
      }
    } else {
      res.status(400).send({code: 400, message: 'Le fichier n’existe pas'})
    }
  } catch (err) {
    next(err)
  }
})

app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
