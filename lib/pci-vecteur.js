const fs = require('fs')
const {promisify} = require('util')
const {Router} = require('express')
const yazl = require('yazl')

const {reprojectArchive} = require('edigeo-reproject')
const {notImplemented, validFormat} = require('./middlewares')
const {Tree, TreeError} = require('./fs/pci')
const {getCodeDep} = require('./util/codes')
const {fileExists} = require('./util/fs')
const {asExpressMiddleware} = require('./util/express')

const readFile = promisify(fs.readFile)

const app = new Router()

const downloadExistingBundle = asExpressMiddleware(async (req, res) => {
  if (!(await fileExists(req.bundlePath))) {
    return res.status(400).send({code: 400, message: 'Le fichier n’existe pas.'})
  }
  if (req.method === 'HEAD') {
    res.sendStatus(200)
  } else {
    res.download(req.bundlePath, req.attachmentName)
  }
})

app.param('format', validFormat(['edigeo', 'edigeo-cc', 'dxf']))

app.get('/departements/:codeDepartement/:format', (req, res, next) => {
  const {codeDepartement, format} = req.params

  if (format === 'edigeo-cc') return notImplemented(req, res)
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  req.bundlePath = tree.getDepartementArchivePath(codeDepartement)
  req.attachmentName = `dep${codeDepartement}.zip`
  next()
}, downloadExistingBundle)

app.get('/feuilles/:codeFeuille/edigeo-cc', asExpressMiddleware(async (req, res) => {
  try {
    const {codeFeuille} = req.params

    const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', 'edigeo')
    req.bundlePath = tree.getFeuillePath(codeFeuille)

    if (await fileExists(req.bundlePath)) {
      if (req.method === 'HEAD') return res.sendStatus(200)

      const codeDepartement = getCodeDep(codeFeuille)
      if (codeDepartement.startsWith('97')) return notImplemented(req, res)

      const originalArchive = await readFile(req.bundlePath)
      const reprojectedArchive = await reprojectArchive(originalArchive, codeDepartement)
      res
        .type('application/x-tar')
        .attachment(`edigeo-cc-${codeFeuille}.tar.bz2`)
        .send(reprojectedArchive)
    }
  } catch (err) {
    if (!(err instanceof TreeError)) {
      throw err
    }
    res.status(400).send({code: 400, message: 'Le fichier n’existe pas.'})
  }
}))

app.get('/feuilles/:codeFeuille/:format', (req, res, next) => {
  const {codeFeuille, format} = req.params

  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  req.bundlePath = tree.getFeuillePath(codeFeuille)
  req.attachmentName = `${format}-${codeFeuille}.tar.bz2`
  next()
}, downloadExistingBundle)

app.get('/communes/:codeCommune/edigeo-cc', asExpressMiddleware(async (req, res) => {
  try {
    const {codeCommune} = req.params
    const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', 'edigeo')
    const ccTree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', 'edigeo-cc')
    const comArchive = new yazl.ZipFile()
    const codeDepartement = getCodeDep(codeCommune)
    if (codeDepartement.startsWith('97')) return notImplemented(req, res)
    const feuilles = await tree.listFeuillesByCommune(codeCommune)

    if (req.method === 'HEAD') {
      return res.sendStatus(200)
    }

    await Promise.all(feuilles.map(async feuille => {
      const originalArchive = await readFile(tree.getFeuillePath(feuille))
      const reprojectedArchive = await reprojectArchive(originalArchive, codeDepartement)
      comArchive.addBuffer(reprojectedArchive, ccTree.getFeuillePathInArchive(feuille), {compress: false})
    }))
    res.type('application/zip').attachment(`edigeo-cc-${codeCommune}.zip`)
    comArchive.outputStream.pipe(res)
    comArchive.end()
  } catch (err) {
    if (!(err instanceof TreeError)) {
      throw err
    }
    res.status(400).send({code: 400, message: 'Le fichier n’existe pas.'})
  }
}))

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
    res.status(400).send({code: 400, message: 'Le fichier n’existe pas.'})
  }
}))

app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
