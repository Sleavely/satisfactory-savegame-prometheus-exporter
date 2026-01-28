import { type vec3 } from '@etothepii/satisfactory-file-parser'

type CoordinateArray = [number, number, number]
type AnyCoordinate = vec3 | CoordinateArray

/**
 * Calculates the straight distance between two points in 3D space. Does not account for curvature.
 */
export const getDistance = (startPoint: AnyCoordinate, endPoint: AnyCoordinate): number => {
  const x1 = (!Array.isArray(startPoint)) ? startPoint.x : startPoint[0]
  const y1 = (!Array.isArray(startPoint)) ? startPoint.y : startPoint[1]
  const z1 = (!Array.isArray(startPoint)) ? startPoint.z : startPoint[2]

  const x2 = (!Array.isArray(endPoint)) ? endPoint.x : endPoint[0]
  const y2 = (!Array.isArray(endPoint)) ? endPoint.y : endPoint[1]
  const z2 = (!Array.isArray(endPoint)) ? endPoint.z : endPoint[2]

  /* eslint-disable operator-linebreak */
  /* eslint-disable @typescript-eslint/comma-dangle */
  return Math.sqrt(
    ((x1 - x2) * (x1 - x2))
    +
    ((y1 - y2) * (y1 - y2))
    +
    ((z1 - z2) * (z1 - z2))
  )
  /* eslint-enable operator-linebreak */
  /* eslint-enable @typescript-eslint/comma-dangle */
}
