const {Router} = require('express')
const yazl = require('yazl')

const {Tree, TreeError} = require('./fs/pci')
const {fileExists} = require('./util/fs')
const {asExpressMiddleware} = require('./util/express')

const app = new Router()

const downloadExistingBundle = asExpressMiddleware(async (req, res) => {
  if (!(await fileExists(req.bundlePath))) {
    return res.status(404).send({code: 404, message: 'Le fichier n’existe pas.'})
  }
  if (req.method === 'HEAD') {
    res.sendStatus(200)
  } else {
    res.download(req.bundlePath, req.attachmentName)
  }
})

app.get('/departements/:codeDepartement/tiff', (req, res, next) => {
  const {codeDepartement} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/latest', 'tiff')
  req.bundlePath = tree.getDepartementArchivePath(codeDepartement)
  req.attachmentName = `dep${codeDepartement}.zip`
  next()
}, downloadExistingBundle)

app.get('/feuilles/:codeFeuille/tiff', (req, res, next) => {
  const {codeFeuille} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/latest', 'tiff')
  req.bundlePath = tree.getFeuillePath(codeFeuille)
  req.attachmentName = `tiff-${codeFeuille}.zip`
  next()
}, downloadExistingBundle)

app.get('/communes/:codeCommune/tiff', asExpressMiddleware(async (req, res) => {
  try {
    const {codeCommune} = req.params
    const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/latest', 'tiff')
    const tiffComArchive = new yazl.ZipFile()
    const feuilles = await tree.listFeuillesByCommune(codeCommune)

    if (req.method === 'HEAD') {
      return res.sendStatus(200)
    }

    feuilles.map(feuille =>
      tiffComArchive.addFile(tree.getFeuillePath(feuille), tree.getFeuillePathInArchive(feuille), {compress: false})
    )

    res.type('application/zip').attachment(`tiff-${codeCommune}.zip`)
    tiffComArchive.outputStream.pipe(res)
    tiffComArchive.end()
  } catch (err) {
    if (!(err instanceof TreeError)) {
      throw err
    }
    res.status(404).send({code: 404, message: 'Le fichier n’existe pas.'})
  }
}))

app.get('/epci/:codeEPCI/tiff', (req, res, next) => {
  const {codeEPCI} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', 'tiff')
  req.bundlePath = tree.getEpciArchivePath(codeEPCI, 'tiff')
  req.attachmentName = `cadastre-${codeEPCI}-tiff.zip`
  next()
}, downloadExistingBundle)

module.exports = app
