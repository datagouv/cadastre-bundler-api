const {createGeoJSONReadStream, createGeoJSONWriteStream} = require('./geo')

async function mergeGeoJSONFiles(srcFiles, destStream, compress = true) {
  console.log(`merging ${srcFiles.join(', ')} into destination stream`)

  return new Promise((resolve, reject) => {
    const mergedStream = createGeoJSONWriteStream(destStream, compress)
    mergedStream.setMaxListeners(Infinity)

    mergedStream
      .on('error', reject)
      .on('finish', resolve)

    let count = srcFiles.length

    if (count === 0) {
      mergedStream.end()
    }

    srcFiles.forEach(srcPath => {
      const srcStream = createGeoJSONReadStream(srcPath)
      srcStream.pipe(mergedStream, {end: false})
      srcStream
        .on('error', reject)
        .on('end', () => {
          count--
          if (count === 0) mergedStream.end()
        })
    })
  })
}

module.exports = {mergeGeoJSONFiles}
