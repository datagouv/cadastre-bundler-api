const {Router} = require('express')
const yazl = require('yazl')

const {notImplemented} = require('./middlewares')
const {Tree, TreeError} = require('./fs/pci')
const {fileExist} = require('./util/fs')

const app = new Router()

app.get('/departements/:codeDepartement/tiff', async (req, res, next) => {
  const {codeDepartement} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/latest', 'tiff')
  const archivePath = tree.getDepartementArchivePath(codeDepartement)

  try {
    if (await fileExist(archivePath)) {
      res.download(archivePath, `dep${codeDepartement}.zip`)
    } else {
      res.status(400).send({code: 400, message: 'Le fichier n’existe pas'})
    }
  } catch (err) {
    next(err)
  }
})

app.get('/feuilles/:codeFeuille/tiff', async (req, res, next) => {
  const {codeFeuille} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/latest', 'tiff')
  const feuillePath = tree.getFeuillePath(codeFeuille)

  try {
    if (await fileExist(feuillePath)) {
      res.download(feuillePath, `tiff-${codeFeuille}.zip`)
    } else {
      res.status(400).send({code: 400, message: 'Le fichier n’existe pas'})
    }
  } catch (err) {
    next(err)
  }
})

app.get('/communes/:codeCommune/tiff', async (req, res, next) => {
  const {codeCommune} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/latest', 'tiff')
  try {
    const tiffComArchive = new yazl.ZipFile()
    const feuilles = await tree.listFeuillesByCommune(codeCommune)
    feuilles.map(feuille =>
      tiffComArchive.addFile(tree.getFeuillePath(feuille), tree.getFeuillePathInArchive(feuille), {compress: false})
    )
    res.type('application/zip').attachment(`tiff-${codeCommune}.zip`)
    tiffComArchive.outputStream.pipe(res)
    tiffComArchive.end()
  } catch (err) {
    if (err instanceof TreeError) {
      res.status(400).send({code: 400, message: 'Le fichier n’existe pas'})
    } else {
      next(err)
    }
  }
})

app.get('/epci/:codeEPCI/tiff', notImplemented)

module.exports = app
