const {Router} = require('express')
const yazl = require('yazl')

const {departementPath, departementLayerPath} = require('./fs/cadastre-etalab')
const {notImplemented, validFormat, validLayer} = require('./middlewares')

const app = new Router()

const layersList = [
  'batiments',
  'communes',
  'feuilles',
  'parcelles',
  'sections'
]

app.param('format', validFormat(['geojson', 'geojson-gz']))

app.param('layers', validLayer(layersList)
)

app.get('/departements/:codeDepartement/:format/:layers', async (req, res, next) => {
  const {codeDepartement, format, layers} = req.params
  const depPath = departementPath(process.env.CADASTRE_DATA_BASEPATH, codeDepartement)
  const lys = layers.length === 0 ? layersList : layers
  try {
    res.type('application/zip').attachment(`${format}-${codeDepartement}.zip`)
    const depArchive = new yazl.ZipFile()
    lys.map(layer => {
      const layerPath = departementLayerPath(process.env.CADASTRE_DATA_BASEPATH, layer, codeDepartement)
      depArchive.addFile(layerPath, depPath, {compress: false})
    })
    depArchive.outputStream.pipe(res)
    depArchive.end()
  } catch (err) {
    next(err)
  }
})
app.get('/communes/:codeDepartement/:format', notImplemented)
app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
