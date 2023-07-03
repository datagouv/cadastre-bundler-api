const {Router} = require('express')
const yazl = require('yazl')

const {validFormat} = require('./middlewares')
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

const validParameterFormats = ['edigeo', 'edigeo-cc', 'dxf', 'dxf-cc']
app.param('format', validFormat(validParameterFormats))

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

if (process.env.COMMUNES_ON_DEMAND) {
  app.get('/communes', asExpressMiddleware(async (req, res) => {
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
      const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
      const genericCommunesArchive = new yazl.ZipFile()
      const feuillesCommunes = await Promise.all(communes.map(async codeCommune => ({
        code: codeCommune,
        feuilles: await tree.listFeuillesByCommune(codeCommune)
      })))

      if (req.method === 'HEAD') {
        return res.sendStatus(200)
      }

      feuillesCommunes.forEach(feuillesCommune => {
        feuillesCommune.feuilles.forEach(feuille => {
          const dest = `${tree.getFeuillePathInArchive(feuille)}`
          genericCommunesArchive.addFile(tree.getFeuillePath(feuille), dest, {compress: false})
        })
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
  }))
}

app.get('/epcis/:codeEPCI/:format', (req, res, next) => {
  const {codeEPCI, format} = req.params
  const tree = new Tree(process.env.CADASTRE_DATA_BASEPATH, 'dgfip-pci-vecteur/latest', format)
  req.bundlePath = tree.getEpciArchivePath(codeEPCI, format)
  req.attachmentName = `cadastre-${codeEPCI}-${format}.zip`
  next()
}, downloadExistingBundle)

module.exports = app
