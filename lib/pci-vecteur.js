const fs = require('fs')
const {promisify} = require('util')
const {Router} = require('express')
const yazl = require('yazl')

const {reprojectArchive} = require('edigeo-reproject')
const {notImplemented, validFormat} = require('./middlewares')
const {Tree} = require('./fs/pci')
const {getCodeDep} = require('./util/codes')

const readFile = promisify(fs.readFile)

const app = new Router()

app.param('format', validFormat(['edigeo', 'edigeo-cc', 'dxf']))

app.get('/departements/:codeDepartement/:format', (req, res) => {
  const {codeDepartement, format} = req.params

  if (format === 'edigeo-cc') return notImplemented(req, res)
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  const archivePath = tree.getDepartementArchivePath(codeDepartement)
  res.download(archivePath, `${format}-dep${codeDepartement}.zip`)
})

app.get('/feuilles/:codeFeuille/:format', async (req, res, next) => {
  const {codeFeuille, format} = req.params

  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format === 'edigeo-cc' ? 'edigeo' : format)
  const feuillePath = tree.getFeuillePath(codeFeuille)

  if (format === 'edigeo-cc') {
    const codeDepartement = getCodeDep(codeFeuille)
    if (codeDepartement.startsWith('97')) return notImplemented(req, res)
    try {
      const originalArchive = await readFile(feuillePath)
      const reprojectedArchive = await reprojectArchive(originalArchive, codeDepartement)
      res
        .type('application/x-tar')
        .attachment(`edigeocc-${codeFeuille}.tar.bz2`)
        .send(reprojectedArchive)
    } catch (err) {
      next(err)
    }
  } else {
    res.download(feuillePath, `${format}-${codeFeuille}.tar.bz2`)
  }
})

app.get('/communes/:codeCommune/:format', async (req, res, next) => {
  const {codeCommune, format} = req.params

  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  try {
    res.type('application/zip').attachment(`${format}-${codeCommune}.zip`)
    const comArchive = new yazl.ZipFile()

    if (format === 'edigeo-cc') {
      const codeDepartement = getCodeDep(codeCommune)
      if (codeDepartement.startsWith('97')) return notImplemented(req, res)
      const edigeoTree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', 'edigeo')
      const feuilles = await edigeoTree.listFeuillesByCommune(codeCommune)
      await Promise.all(feuilles.map(async feuille => {
        const originalArchive = await readFile(edigeoTree.getFeuillePath(feuille))
        const reprojectedArchive = await reprojectArchive(originalArchive, codeDepartement)
        comArchive.addBuffer(reprojectedArchive, tree.getFeuillePathInArchive(feuille), {compress: false})
      }))
    } else {
      const feuilles = await tree.listFeuillesByCommune(codeCommune)
      feuilles.map(feuille =>
        comArchive.addFile(tree.getFeuillePath(feuille), tree.getFeuillePathInArchive(feuille), {compress: false})
      )
    }
    comArchive.outputStream.pipe(res)
    comArchive.end()
  } catch (err) {
    next(err)
  }
})

app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
