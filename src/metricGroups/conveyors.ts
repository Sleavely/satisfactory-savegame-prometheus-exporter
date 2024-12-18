import { MetricGroup } from './_MetricGroup'
import { type Lookups } from '../types/lookups.type'
import {
  isConveyorChainActorSpecialProperties,
  type SaveComponent,
  type SaveEntity,
} from '@etothepii/satisfactory-file-parser'

const metrics = new MetricGroup('satisfactory_savegame_conveyors')
  .addGauge(
    'meters',
    'Total length of conveyor belts & lifts in meters, by Mk',
    ['mk'],
  )

/* eslint-disable no-useless-return */
export const parser = (object: SaveComponent | SaveEntity, lookups: Lookups): void => {
  if (object.typePath.startsWith('/Script/FactoryGame.FGConveyorChainActor')) {
    const props = object.specialProperties
    if (!isConveyorChainActorSpecialProperties(props)) return

    // Measure length, grouped by Mk.
    // FYI beltchains also include lifts
    for (const beltInChain of props.beltsInChain) {
      const mk = beltInChain.beltRef.pathName.match(/mk(\d)/i)?.at(1)
      metrics.getGauge('meters').inc({ mk }, (beltInChain.endsAtLength - beltInChain.startsAtLength) / 100)
    }

    return
  }
}
/* eslint-enable no-useless-return */

export {
  metrics as conveyorsMetrics,
  parser as conveyorsParser,
}
