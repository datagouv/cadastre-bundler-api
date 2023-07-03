const {join} = require('path')
const {Router} = require('express')
const contentDisposition = require('content-disposition')

const {departementLayerPath, getLayerPath, getEpciLayerPath} = require('./fs/cadastre-etalab')
const wrap = require('./util/wrap')
const {validFormat, validLayer} = require('./middlewares')
const {fileExists} = require('./util/fs')
const {asExpressMiddleware} = require('./util/express')
const {createConvertStream} = require('./convert/geojson2shp')
const {getCodeDep} = require('./util/codes')
const {mergeGeoJSONFiles} = require('./util/geojson')

const app = new Router()

const EPCI_TO_DEPTS = {
  200018653: '971',
  200041507: '971',
  200044691: '971',
  249710047: '971',
  249710062: '971',
  249710070: '971',
  200041788: '972',
  249720053: '972',
  249720061: '972',
  200027548: '973',
  249730037: '973',
  249730045: '973',
  249730052: '973',
  249740077: '974',
  249740085: '974',
  249740093: '974',
  249740101: '974',
  249740119: '974',
  200050532: '976',
  200059871: '976',
  200060457: '976',
  200060465: '976',
  200060473: '976'
}

const validLayers = [
  'batiments',
  'communes',
  'feuilles',
  'parcelles',
  'sections',
  'lieux_dits',
  'subdivisions_fiscales',
  'prefixes_sections'
]
const validFormats = ['geojson', 'geojson-gz', 'shp']
app.param('format', validFormat(validFormats))
app.param('layer', validLayer(validLayers))

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

if (process.env.COMMUNES_ON_DEMAND) {
  app.get('/communes', asExpressMiddleware(async (req, res) => {
    if (!req.query.insee_codes && req.query.insee_codes !== undefined) {
      res.status(404).send({code: 404, message: `Le paramètre insee_codes n'est pas renseigné. Le paramètre insee_codes doit contenir un ou plusieurs codes INSEE séparés par des virgules.`})
    }
    const communes = req.query.insee_codes.split(',').map(commune => commune.trim())
    if (!req.query.format) {
      res.status(404).send({code: 404, message: `Le paramètre format n'est pas renseigné. Il doit être soit geojson, geojson-gz ou shp.`})
    }
    if (communes.length === 0) {
      res.status(404).send({code: 404, message: `Le paramètre insee_codes doit contenir au moins un code INSEE.`})
    }
    if (communes.length > 300) {
      res.status(404).send({code: 404, message: `Le paramètre insee_codes ne peut pas utiliser plus de 300 codes INSEE.`})
    }
    const {format, layer} = req.query
    if (!communes.every(code => code.length === 5)) {
      res.status(404).send({code: 404, message: 'Un ou plusieurs codes INSEE est mal renseigné.'})
    }
    if (!format && !['geojson', 'geojson-gz'].includes(format)) {
      res.status(404).send({code: 404, message: 'Le paramètre format est renseigné mais non valide. Il doit être soit geojson, geojson-gz ou shp.'})
    }
    if (!layer && !validLayers.includes(layer)) {
      res.status(404).send({code: 404, message: `Le paramètre layer est renseigné mais non valide. Il doit être ${validLayers.join(', ')}.`})
    }
    const srcFiles = communes.map(commune => {
      const codeDepartement = commune.startsWith('97') ? commune.slice(0, 3) : commune.slice(0, 2)
      return join(
        process.env.CADASTRE_DATA_BASEPATH,
        'etalab-cadastre',
        'latest',
        'geojson',
        'communes',
        codeDepartement,
        commune,
        `cadastre-${commune}-${layer}.json.gz`)
    })

    req.forceDownload = Boolean(req.query.download)
    req.withGzipHeader = format === 'geojson'
    req.attachmentName = format === 'geojson' ?
      `communes-${layer}.json` :
      `communes-${layer}.json.gz`

    res.type('application/vnd.geo+json').attachment(req.attachmentName)
    await mergeGeoJSONFiles(srcFiles, res, format !== 'geojson')
  }))
}

app.get('/epcis/:codeEPCI/shp/:layer', wrap(async (req, res) => {
  const {codeEPCI, layer} = req.params
  const bundlePath = getEpciLayerPath(process.env.CADASTRE_DATA_BASEPATH, 'geojson', codeEPCI, layer)

  if (!(await fileExists(bundlePath))) {
    throw notFoundError('Le fichier n’existe pas')
  }

  if (req.method === 'HEAD') {
    return
  }

  const attachmentName = `cadastre-${codeEPCI}-${layer}-shp.zip`

  res.set('Content-Type', 'application/x-shapefile')
  res.set('Content-Disposition', contentDisposition(attachmentName))
  const codeDep = (codeEPCI in EPCI_TO_DEPTS) ? EPCI_TO_DEPTS[codeEPCI] : '01'
  return createConvertStream(bundlePath, layer, codeDep)
}))

app.get('/epcis/:codeEPCI/:format/:layer', (req, res, next) => {
  const {codeEPCI, format, layer} = req.params
  req.forceDownload = Boolean(req.query.download)
  req.bundlePath = getEpciLayerPath(process.env.CADASTRE_DATA_BASEPATH, 'geojson', codeEPCI, layer)
  req.withGzipHeader = format !== 'geojson'
  req.attachmentName = format === 'geojson' ?
    `epci-${codeEPCI}-${layer}.json` :
    `epci-${codeEPCI}-${layer}.json.gz`

  next()
}, downloadExistingBundle)

function notFoundError(message) {
  const err = new Error(message)
  err.notFound = true
  return err
}

module.exports = app
