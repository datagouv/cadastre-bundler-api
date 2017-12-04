const {Router} = require('express')

const {departementLayerPath} = require('./fs/cadastre-etalab')
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

app.get('/departements/:codeDepartement/:format/:layer', async (req, res) => {
  const {codeDepartement, format, layer} = req.params
  const depPath = departementLayerPath(process.env.CADASTRE_DATA_BASEPATH, format, layer, codeDepartement)
  res.download(depPath, `cadastre-${codeDepartement}-${layer}.json.gz`)
})
app.get('/communes/:codeDepartement/:format', notImplemented)
app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
