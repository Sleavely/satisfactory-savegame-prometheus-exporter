import { MetricGroup } from './_MetricGroup'
import { type Lookups } from '../types/lookups.type'
import {
  type SaveComponent,
  type SaveEntity,
} from '@etothepii/satisfactory-file-parser'
import { getDistance } from '../utils/spatialMath'
import { pathToBuilding } from '../staticData/staticData'
import {
  type SplineArrayProperty,
  type SplinePointProperty,
} from '../types/splineArrayProperty.type'

const metrics = new MetricGroup('satisfactory_savegame_pipes')
  .addGauge(
    'networks_total',
    'Amount of pipe networks',
  )
  .addGauge(
    'meters',
    'Total length of pipes in meters, by Mk',
    ['mk'],
  )

export const parser = (object: SaveComponent | SaveEntity, lookups: Lookups): void => {
  if (object.typePath === '/Script/FactoryGame.FGPipeNetwork') {
    metrics.getGauge('networks_total').inc()
  }

  if (object.typePath.startsWith('/Game/FactoryGame/Buildable/Factory/Pipeline')) {
    const building = pathToBuilding(object.typePath)
    if (!building) return
    if (![
      'Desc_Pipeline_C',
      'Desc_PipelineMK2_C',
      'Desc_PipelineMK2_NoIndicator_C',
      'Desc_Pipeline_NoIndicator_C',
    ].includes(building.className)) return

    const mk = building.className.match(/mk(\d)/i)?.at(1) ?? '1'

    const { totalLength: pipeLength } = (object.properties?.mSplineData as SplineArrayProperty)?.values
      ?.reduce<{ totalLength: number, previousPoint: SplinePointProperty | null }>(({ totalLength, previousPoint }, splinePoint) => {
      return {
        totalLength: totalLength + (
          previousPoint
            ? getDistance(previousPoint.value.properties.Location.value, splinePoint.value.properties.Location.value) / 100
            : 0
        ),
        previousPoint: splinePoint,
      }
    }, { totalLength: 0, previousPoint: null })

    metrics.getGauge('meters').inc({ mk }, pipeLength)
  }
}

export {
  metrics as pipesMetrics,
  parser as pipesParser,
}
