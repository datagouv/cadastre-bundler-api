const {Router} = require('express')
const {notImplemented, validFormat} = require('./middlewares')
const {Tree} = require('./fs/pci')

const app = new Router()

app.use(validFormat(['edigeo', 'edigeo-cc', 'dxf']))

app.get('/departements/:codeDepartement/:format', (req, res) => {
  const {codeDepartement, format} = req.params

  if (format === 'edigeo-cc') return notImplemented(req, res)
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  const archivePath = tree.getDepartementArchivePath(codeDepartement)

  res.download(archivePath, `dep${codeDepartement}.zip`)
})

app.get('/communes/:codeCommune/:format', (req, res) => {
  const {codeCommune, format} = req.params

  if (format === 'edigeo-cc') return notImplemented(req, res)
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  const archivePath = tree.getDepartementArchivePath(codeCommune)

  res.download(archivePath, `${format}-${codeCommune}.tar.bz2`)
})
app.get('/feuilles/:codeFeuille/:format', notImplemented)
app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
