// eslint-disable-next-line import/extensions
const epci = require('@etalab/decoupage-administratif/data/epci.json')

const epciCommunesMembers = epci.reduce((acc, curr) => {
  acc[curr.code] = curr.membres.map(membre => membre.code)
  return acc
}, {})
const epciKeys = Object.keys(epciCommunesMembers)

function getCodeDep(codeCommuneOrFeuille) {
  return codeCommuneOrFeuille.startsWith('97') ?
    codeCommuneOrFeuille.substr(0, 3) :
    codeCommuneOrFeuille.substr(0, 2)
}

function isCodeDepartement(string) {
  return string.match(/^([0-9A-Z]{2,3})$/)
}

function isCodeCommune(string) {
  return string.match(/^([0-9A-Z]{2}\d{3})$/)
}

function getCodeCommune(feuille) {
  return feuille.substr(0, 5)
}

function isCodeEpciExists(codeEpci) {
  return epciKeys.includes(codeEpci)
}

function getCodesCommunesFromEpci(codeEpci) {
  return epciCommunesMembers[codeEpci]
}

module.exports = {getCodeDep, isCodeDepartement, isCodeCommune, getCodeCommune, isCodeEpciExists, getCodesCommunesFromEpci}
