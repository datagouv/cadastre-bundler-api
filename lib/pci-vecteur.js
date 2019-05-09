const {Router} = require('express')
const yazl = require('yazl')

const {notImplemented, validFormat} = require('./middlewares')
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

app.param('format', validFormat(['edigeo', 'edigeo-cc', 'dxf', 'dxf-cc']))

app.get('/departements/:codeDepartement/:format', (req, res, next) => {
  const {codeDepartement, format} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  req.bundlePath = tree.getDepartementArchivePath(codeDepartement)
  req.attachmentName = `dep${codeDepartement}.zip`
  next()
}, downloadExistingBundle)

app.get('/feuilles/:codeFeuille/:format', (req, res, next) => {
  const {codeFeuille, format} = req.params

  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  req.bundlePath = tree.getFeuillePath(codeFeuille)
  req.attachmentName = `${format}-${codeFeuille}.tar.bz2`
  next()
}, downloadExistingBundle)

app.get('/communes/:codeCommune/:format', asExpressMiddleware(async (req, res) => {
  try {
    const {codeCommune, format} = req.params
    const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
    const comArchive = new yazl.ZipFile()
    const feuilles = await tree.listFeuillesByCommune(codeCommune)

    if (req.method === 'HEAD') {
      return res.sendStatus(200)
    }

    feuilles.map(feuille =>
      comArchive.addFile(tree.getFeuillePath(feuille), tree.getFeuillePathInArchive(feuille), {compress: false})
    )

    res.type('application/zip').attachment(`${format}-${codeCommune}.zip`)
    comArchive.outputStream.pipe(res)
    comArchive.end()
  } catch (err) {
    if (!(err instanceof TreeError)) {
      throw err
    }
    res.status(404).send({code: 404, message: 'Le fichier n’existe pas.'})
  }
}))

app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
