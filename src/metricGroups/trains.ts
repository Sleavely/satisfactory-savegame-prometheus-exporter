import { MetricGroup } from './_MetricGroup'
import { type Lookups } from '../types/lookups.type'
import {
  type SaveComponent,
  type SaveEntity,
} from '@etothepii/satisfactory-file-parser'
import { getDistance } from '../utils/spatialMath'
import {
  type SplineArrayProperty,
  type SplinePointProperty,
} from '../types/splineArrayProperty.type'

const metrics = new MetricGroup('satisfactory_savegame_trains')
  .addGauge(
    'total',
    'Amount of trains',
  )
  .addGauge(
    'tracks_meters',
    'Total length of railroad tracks in meters',
  )
  .addSummary(
    'current_speed',
    'Current speeds of all trains',
  )

export const parser = (object: SaveComponent | SaveEntity, lookups: Lookups): void => {
  if (object.typePath === '/Game/FactoryGame/Buildable/Vehicle/Train/-Shared/BP_Train.BP_Train_C') {
    metrics.getGauge('total').inc()

    // Figure out the speed for this train and add it to our summary bucket
    if (object.properties?.mSimulationData?.value?.properties?.Velocity?.value) {
      const centimetersPerSecond = Math.abs(object.properties?.mSimulationData?.value?.properties?.Velocity?.value)
      const kilometersPerHour = Math.round(centimetersPerSecond * 0.036)
      metrics.getHistogram('current_speed').observe(kilometersPerHour)
    } else {
      metrics.getHistogram('current_speed').observe(0)
    }
  }

  if (object.typePath.startsWith('/Game/FactoryGame/Buildable/Factory/Train/Track')) {
    const { totalLength } = (object.properties?.mSplineData as SplineArrayProperty)?.values
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

    metrics.getGauge('tracks_meters').inc(totalLength)
  }
}

export {
  metrics as trainsMetrics,
  parser as trainsParser,
}
