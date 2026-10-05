const {Readable} = require('stream')
const {fetch, Headers} = require('undici')
const {Router} = require('express')
const yazl = require('yazl')

const {validFormat} = require('./middlewares')
const {Tree, TreeS3, TreeError} = require('./fs/pci')
const {fileExists} = require('./util/fs')
const {asExpressMiddleware} = require('./util/express')

const app = new Router({mergeParams: true})

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
    // We use the filesystem and not remote ressources
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

const validParameterFormats = ['edigeo', 'edigeo-cc', 'dxf', 'dxf-cc']
app.param('format', validFormat(validParameterFormats))

function getDepartement(req, res, next) {
  const {codeDepartement, format, millesimeCadastre} = req.params
  let tree
  const millesime = millesimeCadastre || CADASTRE_MILLESIME
  if (CADASTRE_DATA_TYPE === 'file') {
    tree = new Tree(CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/' + millesime, format)
  } else {
    tree = new TreeS3(CADASTRE_DATA_BASEPATH, 'cadastre', 'dgfip-pci-vecteur/' + millesime, format)
  }
  req.bundlePath = tree.getDepartementArchivePath(codeDepartement)
  req.attachmentName = `dep${codeDepartement}.zip`
  next()
}

app.get('/departements/:codeDepartement/:format', getDepartement, downloadExistingBundle)

function getFeuille(req, res, next) {
  const {codeFeuille, format, millesimeCadastre} = req.params
  let tree
  const millesime = millesimeCadastre || CADASTRE_MILLESIME
  if (CADASTRE_DATA_TYPE === 'file') {
    tree = new Tree(CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/' + millesime, format)
  } else {
    tree = new TreeS3(CADASTRE_DATA_BASEPATH, 'cadastre', 'dgfip-pci-vecteur/' + millesime, format)
  }
  req.bundlePath = tree.getFeuillePath(codeFeuille)
  req.attachmentName = `${format}-${codeFeuille}.tar.bz2`
  next()
}

app.get('/feuilles/:codeFeuille/:format', getFeuille, downloadExistingBundle)

const getCommune = asExpressMiddleware(async (req, res) => {
  try {
    const {codeCommune, format, millesimeCadastre} = req.params
    let tree
    const millesime = millesimeCadastre || CADASTRE_MILLESIME
    if (CADASTRE_DATA_TYPE === 'file') {
      tree = new Tree(CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/' + millesime, format)
    } else {
      tree = new TreeS3(CADASTRE_DATA_BASEPATH, 'cadastre', 'dgfip-pci-vecteur/' + millesime, format)
    }
    const comArchive = new yazl.ZipFile()
    const feuilles = await tree.listFeuillesByCommune(codeCommune)

    if (req.method === 'HEAD') {
      return res.sendStatus(200)
    }

    feuilles.forEach(feuille => {
      if (CADASTRE_DATA_TYPE === 'file') {
        comArchive.addFile(
          tree.getFeuillePath(feuille),
          tree.getFeuillePathInArchive(feuille),
          {compress: false}
        )
      } else {
        comArchive.addReadStreamLazy(tree.getFeuillePathInArchive(feuille), async cb => {
          const fetchResponse = await fetch(tree.getFeuillePath(feuille))
          cb(null, Readable.fromWeb(fetchResponse.body))
        })
      }
    })

    res.type('application/zip').attachment(`${format}-${codeCommune}.zip`)
    comArchive.outputStream.pipe(res)
    comArchive.end()
  } catch (err) {
    if (!(err instanceof TreeError)) {
      throw err
    }
    res.status(404).send({code: 404, message: 'Le fichier n’existe pas.'})
  }
})

app.get('/communes/:codeCommune/:format', getCommune)

const getCommuneOnDemand = asExpressMiddleware(async (req, res) => {
  const {millesimeCadastre} = req.params
  if (!req.query.insee_codes && req.query.insee_codes !== undefined) {
    res.status(404).send({code: 404, message: `Le paramètre insee_codes n'est pas renseigné. Le paramètre insee_codes doit contenir un ou plusieurs codes INSEE séparés par des virgules.`})
  }
  const communes = req.query.insee_codes.split(',').map(commune => commune.trim())
  if (!req.query.format) {
    res.status(404).send({code: 404, message: `Le paramètre format n'est pas renseigné. Il doit être soit edigeo, edigeo-cc, dxf ou dxf-cc.`})
  }
  if (communes.length === 0) {
    res.status(404).send({code: 404, message: `Le paramètre insee_codes doit contenir au moins un code INSEE.`})
  }
  if (communes.length > 300) {
    res.status(404).send({code: 404, message: `Le paramètre insee_codes ne peut pas utiliser plus de 300 codes INSEE.`})
  }
  const {format} = req.query
  if (!communes.every(code => code.length === 5)) {
    res.status(404).send({code: 404, message: 'Un ou plusieurs codes INSEE est mal renseigné.'})
  }
  if (!format && !validParameterFormats.includes(format)) {
    res.status(404).send({code: 404, message: 'Le paramètre format est renseigné mais non valide. Il doit être soit edigeo, edigeo-cc, dxf ou dxf-cc.'})
  }

  try {
    let tree
    const millesime = millesimeCadastre || CADASTRE_MILLESIME
    if (CADASTRE_DATA_TYPE === 'file') {
      tree = new Tree(CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/' + millesime, format)
    } else {
      tree = new TreeS3(CADASTRE_DATA_BASEPATH, 'cadastre', 'dgfip-pci-vecteur/' + millesime, format)
    }
    const genericCommunesArchive = new yazl.ZipFile()
    const feuillesCommunes = await Promise.all(communes.map(async codeCommune => ({
      code: codeCommune,
      feuilles: await tree.listFeuillesByCommune(codeCommune)
    })))

    if (req.method === 'HEAD') {
      return res.sendStatus(200)
    }

    feuillesCommunes.feuilles.forEach(feuille => {
      if (CADASTRE_DATA_TYPE === 'file') {
        genericCommunesArchive.addFile(
          tree.getFeuillePath(feuille),
          tree.getFeuillePathInArchive(feuille),
          {compress: false}
        )
      } else {
        genericCommunesArchive.addReadStreamLazy(tree.getFeuillePathInArchive(feuille), async cb => {
          const fetchResponse = await fetch(tree.getFeuillePath(feuille))
          cb(null, Readable.fromWeb(fetchResponse.body))
        })
      }
    })

    res.type('application/zip').attachment(`${format}-communes.zip`)
    genericCommunesArchive.outputStream.pipe(res)
    genericCommunesArchive.end()
  } catch (err) {
    if (!(err instanceof TreeError)) {
      throw err
    }
    res.status(404).send({code: 404, message: 'Le fichier n’existe pas.'})
  }
})

if (process.env.COMMUNES_ON_DEMAND) {
  app.get('/communes', getCommuneOnDemand)
}

function getEpci(req, res, next) {
  const {codeEPCI, format, millesimeCadastre} = req.params
  let tree
  const millesime = millesimeCadastre || CADASTRE_MILLESIME
  if (CADASTRE_DATA_TYPE === 'file') {
    tree = new Tree(CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/' + millesime, format)
  } else {
    tree = new TreeS3(CADASTRE_DATA_BASEPATH, 'cadastre', 'dgfip-pci-vecteur/' + millesime, format)
  }
  req.bundlePath = tree.getEpciArchivePath(codeEPCI, format)
  req.attachmentName = `cadastre-${codeEPCI}-${format}.zip`
  next()
}
app.get('/epcis/:codeEPCI/:format', getEpci, downloadExistingBundle)

module.exports = app
