const {Router} = require('express')
const contentDisposition = require('content-disposition')
const {notImplemented} = require('./middlewares')
const {Tree} = require('./fs/pci')
const {ZipStream} = require('./util/zip')

const app = new Router()

app.get('/departements/:codeDepartement/tiff', (req, res) => {
  const {codeDepartement} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/latest', 'tiff')
  const archivePath = tree.getDepartementArchivePath(codeDepartement)
  res.download(archivePath, `dep${codeDepartement}.zip`)
})

app.get('/feuilles/:codeFeuille/tiff', (req, res) => {
  const {codeFeuille} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/latest', 'tiff')
  const feuillePath = tree.getFeuillePath(codeFeuille)
  res.download(feuillePath, `tiff-${codeFeuille}.zip`)
})

app.get('/communes/:codeCommune/tiff', async (req, res, next) => {
  const {codeCommune} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/latest', 'tiff')
  try {
    const feuilles = await tree.listFeuillesByCommune(codeCommune)
    const tiffComArchive = new ZipStream()
    feuilles.map(feuille =>
      tiffComArchive.addFile(tree.getFeuillePath(feuille), tree.getFeuillePathInArchive(feuille), {compress: false})
    )
    tiffComArchive.pipe(res)
    res.type('application/zip').set('Content-Disposition', contentDisposition(`tiff-${codeCommune}.zip`, {type: 'attachment'}))
    tiffComArchive.end()
  } catch (err) {
    next(err)
  }
})
app.get('/epci/:codeEPCI/tiff', notImplemented)

module.exports = app
