const {Router} = require('express')
const yazl = require('yazl')

const {notImplemented, validFormat} = require('./middlewares')
const {Tree} = require('./fs/pci')

const app = new Router()

app.param('format', validFormat(['edigeo', 'edigeo-cc', 'dxf']))

app.get('/departements/:codeDepartement/:format', (req, res) => {
  const {codeDepartement, format} = req.params

  if (format === 'edigeo-cc') return notImplemented(req, res)
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  const archivePath = tree.getDepartementArchivePath(codeDepartement)
  res.download(archivePath, `${format}-dep${codeDepartement}.zip`)
})

app.get('/feuilles/:codeFeuille/:format', (req, res) => {
  const {codeFeuille, format} = req.params

  if (format === 'edigeo-cc') return notImplemented(req, res)
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  const feuillePath = tree.getFeuillePath(codeFeuille)
  res.download(feuillePath, `${format}-${codeFeuille}.tar.bz2`)
})

app.get('/communes/:codeCommune/:format', async (req, res, next) => {
  const {codeCommune, format} = req.params

  if (format === 'edigeo-cc') return notImplemented(req, res)
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  try {
    res.type('application/zip').attachment(`${format}-${codeCommune}.zip`)
    const comArchive = new yazl.ZipFile()
    const feuilles = await tree.listFeuillesByCommune(codeCommune)
    feuilles.map(feuille =>
      comArchive.addFile(tree.getFeuillePath(feuille), tree.getFeuillePathInArchive(feuille), {compress: false})
    )
    comArchive.outputStream.pipe(res)
    comArchive.end()
  } catch (err) {
    next(err)
  }
})

app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
