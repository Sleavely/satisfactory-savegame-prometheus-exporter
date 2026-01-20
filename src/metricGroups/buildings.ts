import { pathToBuilding } from '../staticData/staticData'
import { type Lookups } from '../types/lookups.type'
import { MetricGroup } from './_MetricGroup'
import {
  isBuildableSubsystemSpecialProperties,
  type SaveComponent,
  type SaveEntity,
} from '@etothepii/satisfactory-file-parser'

const metrics = new MetricGroup('satisfactory_savegame_buildings')
  .addGauge(
    'total',
    'Total amount of buildings',
    ['building'],
  )
  .addGauge(
    'lightweight_total',
    'Total amount of lightweight buildings',
    ['building'],
  )

export const parser = (object: SaveComponent | SaveEntity, lookups: Lookups): void => {
  const building = pathToBuilding(object.typePath)
  if (building) {
    metrics.getGauge('total').inc({ building: building.name })
  }

  // "Lightweight" buildings with no dynamic properties such as walls and foundations
  if (object.typePath === '/Script/FactoryGame.FGLightweightBuildableSubsystem') {
    if (isBuildableSubsystemSpecialProperties(object.specialProperties)) {
      for (const buildable of object.specialProperties.buildables) {
        // Skip buildables without a valid typeReference path
        const typePath = buildable.typeReference?.pathName
        if (!typePath) continue

        // Because there are so many variations of walls and foundations, we group them.
        // E.g. '/Game/FactoryGame/Buildable/Building/Wall/FicsitWallSet/Build_Wall_Orange_8x1.Build_Wall_Orange_8x1_C'
        const category = typePath.split('/')[5] ?? 'Unknown'
        metrics.getGauge('lightweight_total').inc({ building: category }, buildable.instances.length)
      }
    }
  }
}

export {
  metrics as buildingsMetrics,
  parser as buildingsParser,
}
