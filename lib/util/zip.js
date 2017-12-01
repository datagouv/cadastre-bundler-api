const {dirname} = require('path')
const fs = require('fs')
const {PassThrough} = require('stream')
const yazl = require('yazl')

const {ensureDirectoryExists} = require('./fs')

class ZipStream extends PassThrough {

  // Archive is lazily created
  _createArchive() {
    if (this._zipFile) return
    this._zipFile = new yazl.ZipFile()
    this._zipFile.outputStream.pipe(this) // TODO: Improve error handling
  }

  addBuffer(buffer, internalPath, options) {
    if (!this._zipFile) this._createArchive()
    this._zipFile.addBuffer(buffer, internalPath, options || {})
  }

  addFile(path, internalPath, options) {
    if (!this._zipFile) this._createArchive()
    this._zipFile.addFile(path, internalPath, options || {})
  }

  endArchive() {
    if (this.ended) return
    this.ended = true
    this._zipFile.end()
  }

}

module.exports = {ZipStream}
