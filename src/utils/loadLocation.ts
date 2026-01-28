import { readdir, readFile, stat } from 'fs/promises'
import { resolve } from 'path'

const {
  LOG_LEVEL = 'info',
} = process.env

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
    if (LOG_LEVEL === 'debug') console.log(`Reading savefile from ${location}`)
    return await fetch(location).then(async res => await res.arrayBuffer())
  }

  // Treat it as a local path
  let localPath = resolve(location)

  // If its a directory, grab the latest file in it
  const pathStat = await stat(localPath)
  if (pathStat.isDirectory()) {
    localPath = await getLastModifiedFile(localPath, true, (file) => file.endsWith('.sav') && !file.includes('ServerManager_V2'))
    if (LOG_LEVEL === 'debug') console.log(`Reading savefile from ${localPath}`)
  }

  const buffer = await readFile(resolve(localPath))
  // Convert Buffer to proper ArrayBuffer (Buffer.buffer can have offset issues)
  return new Uint8Array(buffer).buffer
}
