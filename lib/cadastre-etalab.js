const {Router} = require('express')

const {departementLayerPath, getLayerPath} = require('./fs/cadastre-etalab')
const {notImplemented, validFormat, validLayer} = require('./middlewares')

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

const geojsonHeaders = {'Content-Type': 'application/vnd.geo+json'}

app.get('/departements/:codeDepartement/:format/:layer', (req, res) => {
  const {codeDepartement, format, layer} = req.params
  const forceDownload = Boolean(req.query.download)
  const depPath = departementLayerPath(process.env.CADASTRE_DATA_BASEPATH, format, layer, codeDepartement)

  if (format === 'geojson') {
    res.set('Content-Encoding', 'gzip')
    if (forceDownload) {
      res.download(depPath, `cadastre-${codeDepartement}-${layer}.json`)
    } else {
      res.sendFile(depPath, {headers: geojsonHeaders})
    }
  } else {
    res.download(depPath, `cadastre-${codeDepartement}-${layer}.json.gz`)
  }
})

app.get('/communes/:codeCommune/:format/:layer', (req, res) => {
  const {codeCommune, format, layer} = req.params
  const forceDownload = Boolean(req.query.download)
  const depPath = getLayerPath(process.env.CADASTRE_DATA_BASEPATH, format, codeCommune, layer)

  if (format === 'geojson') {
    res.set('Content-Encoding', 'gzip')
    if (forceDownload) {
      res.download(depPath, `cadastre-${codeCommune}-${layer}.json`)
    } else {
      res.sendFile(depPath, {headers: geojsonHeaders})
    }
  } else {
    res.download(depPath, `cadastre-${codeCommune}-${layer}.json.gz`)
  }
})

app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
