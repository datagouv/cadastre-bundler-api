const {Readable} = require('stream')
const {fetch, Headers} = require('undici')
const {Router} = require('express')
const yazl = require('yazl')

const {Tree, TreeS3, TreeError} = require('./fs/pci')
const {fileExists} = require('./util/fs')
const {asExpressMiddleware} = require('./util/express')

const app = new Router()

const CADASTRE_MILLESIME = process.env.CADASTRE_MILLESIME || 'latest'
const CADASTRE_DATA_TYPE = process.env.CADASTRE_DATA_TYPE || 'file'
let defaultDataBasePath
if (CADASTRE_DATA_TYPE === 'file') {
  defaultDataBasePath = '/data'
} else {
  defaultDataBasePath = 'https://cadastre.s3.rbx.io.cloud.ovh.net'
}
const CADASTRE_DATA_BASEPATH = process.env.CADASTRE_DATA_BASEPATH || defaultDataBasePath

const downloadExistingBundle = asExpressMiddleware(async (req, res) => {
  let contentType = 'application/zip'
  const isHttp = req.bundlePath.startsWith('http')
  if (isHttp) {
    const url = req.bundlePath
    const headResponse = await fetch(url, {
      method: 'HEAD'
    })
    if (headResponse.status !== 200) {
      return res.status(404).send({code: 404, message: 'Le fichier n’existe pas.'})
    }
    const contentTypeInfo = headResponse.headers.get('content-type')
    if (contentTypeInfo && contentTypeInfo.includes(':')) {
      contentType = contentTypeInfo.split(':').slice(-1)[0]
    }
  } else {
    // We use the filesystem and not remoe ressources
    const fileExist = await fileExists(req.bundlePath)
    if (!fileExist) {
      return res.status(404).send({code: 404, message: 'Le fichier n’existe pas.'})
    }
  }

  if (req.method === 'HEAD') {
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': 'attachment; filename=' + req.attachmentName
    })
    res.status(200).end()
  } else if (isHttp) {
    const fetchResponse = await fetch(req.bundlePath)
    const forwardHeaders = new Headers(fetchResponse.headers)
    forwardHeaders.delete('content-encoding')
    forwardHeaders.set('content-disposition', 'attachment; filename=' + req.attachmentName)
    res.setHeaders(forwardHeaders)
    Readable.fromWeb(fetchResponse.body).pipe(res)
  } else {
    res.download(req.bundlePath, req.attachmentName)
  }
})

app.get('/departements/:codeDepartement/tiff', (req, res, next) => {
  const {codeDepartement} = req.params
  let tree
  if (CADASTRE_DATA_TYPE === 'file') {
    tree = new Tree(CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/' + CADASTRE_MILLESIME, 'tiff')
  } else {
    tree = new TreeS3(CADASTRE_DATA_BASEPATH, 'cadastre', 'dgfip-pci-image/' + CADASTRE_MILLESIME, 'tiff')
  }
  req.bundlePath = tree.getDepartementArchivePath(codeDepartement)
  req.attachmentName = `dep${codeDepartement}.zip`
  next()
}, downloadExistingBundle)

app.get('/feuilles/:codeFeuille/tiff', (req, res, next) => {
  const {codeFeuille} = req.params
  let tree
  if (CADASTRE_DATA_TYPE === 'file') {
    tree = new Tree(CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/' + CADASTRE_MILLESIME, 'tiff')
  } else {
    tree = new TreeS3(CADASTRE_DATA_BASEPATH, 'cadastre', 'dgfip-pci-image/' + CADASTRE_MILLESIME, 'tiff')
  }
  req.bundlePath = tree.getFeuillePath(codeFeuille)
  req.attachmentName = `tiff-${codeFeuille}.zip`
  next()
}, downloadExistingBundle)

app.get('/communes/:codeCommune/tiff', asExpressMiddleware(async (req, res) => {
  try {
    const {codeCommune} = req.params
    let tree
    if (CADASTRE_DATA_TYPE === 'file') {
      tree = new Tree(CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/' + CADASTRE_MILLESIME, 'tiff')
    } else {
      tree = new TreeS3(CADASTRE_DATA_BASEPATH, 'cadastre', 'dgfip-pci-image/' + CADASTRE_MILLESIME, 'tiff')
    }
    const tiffComArchive = new yazl.ZipFile()
    const feuilles = await tree.listFeuillesByCommune(codeCommune)

    if (req.method === 'HEAD') {
      return res.sendStatus(200)
    }

    feuilles.forEach(feuille => {
      if (CADASTRE_DATA_TYPE === 'file') {
        tiffComArchive.addFile(
          tree.getFeuillePath(feuille),
          tree.getFeuillePathInArchive(feuille),
          {compress: false}
        )
      } else {
        tiffComArchive.addReadStreamLazy(tree.getFeuillePathInArchive(feuille), async cb => {
          const fetchResponse = await fetch(tree.getFeuillePath(feuille))
          cb(null, Readable.fromWeb(fetchResponse.body))
        })
      }
    })

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

app.get('/epcis/:codeEPCI/tiff', (req, res, next) => {
  const {codeEPCI} = req.params
  let tree
  if (CADASTRE_DATA_TYPE === 'file') {
    tree = new Tree(CADASTRE_DATA_BASEPATH, 'dgfip-pci-image/' + CADASTRE_MILLESIME, 'tiff')
  } else {
    tree = new TreeS3(CADASTRE_DATA_BASEPATH, 'cadastre', 'dgfip-pci-image/' + CADASTRE_MILLESIME, 'tiff')
  }
  req.bundlePath = tree.getEpciArchivePath(codeEPCI, 'tiff')
  req.attachmentName = `cadastre-${codeEPCI}-tiff.zip`
  next()
}, downloadExistingBundle)

module.exports = app
