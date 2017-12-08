const {Router} = require('express')
const yazl = require('yazl')

const {notImplemented} = require('./middlewares')
const {Tree} = require('./fs/pci')

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
    res.type('application/zip').attachment(`tiff-${codeCommune}.zip`)
    const tiffComArchive = new yazl.ZipFile()
    const feuilles = await tree.listFeuillesByCommune(codeCommune)
    feuilles.map(feuille =>
      tiffComArchive.addFile(tree.getFeuillePath(feuille), tree.getFeuillePathInArchive(feuille), {compress: false})
    )
    tiffComArchive.outputStream.pipe(res)
    tiffComArchive.end()
  } catch (err) {
    next(err)
  }
})

app.get('/epci/:codeEPCI/tiff', notImplemented)

module.exports = app
