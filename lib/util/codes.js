const epci = require('@etalab/decoupage-administratif/data/epci.json')
const epci_communes_members = epci.reduce((acc, curr) => {acc[curr.code] = curr.membres.map(membre => membre.code); return acc}, {})
const epci_keys = Object.keys(epci_communes_members)

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

function isCodeEPCIExists(codeEPCI) {
  return epci_keys.includes(codeEPCI)
}

function getCodesCommunesFromEPCI(codeEPCI) {
  return epci_communes_members[codeEPCI]
}


module.exports = {getCodeDep, isCodeDepartement, isCodeCommune, getCodeCommune, isCodeEPCIExists, getCodesCommunesFromEPCI}
