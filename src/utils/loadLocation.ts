import { readdir, readFile, stat } from 'fs/promises'
import { resolve } from 'path'

const getLastModifiedFile = async (dir: string, recursive?: boolean, predicateFn?: (file: string) => boolean): Promise<string> => {
  const files = await readdir(dir, { recursive })
  const latestFile = await files.reduce(async (promiseChain, file) => {
    const latest = await promiseChain

    if (predicateFn && !predicateFn(file)) return latest
    const fileStat = await stat(resolve(dir, file))

    const latestStat = await stat(resolve(dir, latest))
    return fileStat.mtimeMs > latestStat.mtimeMs ? file : latest
  }, Promise.resolve(files[0]))

  return resolve(dir, latestFile)
}

export const loadLocation = async (location: string): Promise<ArrayBuffer> => {
  // Is it a URL?
  if (URL.canParse(location)) {
    return await fetch(location).then(async res => await res.arrayBuffer())
  }

  // Treat it as a local path
  let localPath = resolve(location)

  // If its a directory, grab the latest file in it
  const pathStat = await stat(localPath)
  if (pathStat.isDirectory()) {
    localPath = await getLastModifiedFile(localPath, true)
    console.log(`Reading savefile from ${localPath}`)
  }

  return (await readFile(resolve(localPath))).buffer
}