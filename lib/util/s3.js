const {ListObjectsV2Command} = require('@aws-sdk/client-s3')

const fetchObjects = async (client, bucket, prefix = '/') => {
  const objects = []
  async function fetchObjectsWithPagination(bucket, continuationToken) {
    const s3 = client
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    )
    objects.push(...(result.Contents || []))
    if (result.NextContinuationToken) {
      return fetchObjectsWithPagination(bucket, result.NextContinuationToken)
    }
  }
  await fetchObjectsWithPagination(bucket)
  return objects
}

const fetchObjectsPrefix = async (client, bucket, prefix = '/') => {
  const folders = []
  async function fetchObjectsWithPagination(bucket, continuationToken) {
    const s3 = client
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: '/',
        ContinuationToken: continuationToken
      })
    )
    folders.push(...(result.CommonPrefixes || []))
    if (result.NextContinuationToken) {
      return fetchObjectsWithPagination(bucket, result.NextContinuationToken)
    }
  }
  await fetchObjectsWithPagination(bucket)
  return folders.map(el => el.Prefix.replace(prefix, '').replace(/\/+$/, ''))
}

const checkFolderExists = async (client, bucketName, folderName) => {
  const s3 = client
  const data = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: folderName + '/',
      MaxKeys: 1
    })
  )
  return data.KeyCount > 0
}

module.exports = {
  fetchObjects,
  fetchObjectsPrefix,
  checkFolderExists
}
