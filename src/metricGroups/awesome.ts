import { MetricGroup } from './_MetricGroup'
import { type Lookups } from '../types/lookups.type'
import {
  type Int32Property,
  type Int64ArrayProperty,
  type SaveComponent,
  type SaveEntity,
} from '@etothepii/satisfactory-file-parser'

const metrics = new MetricGroup('satisfactory_savegame_awesome')
  .addGauge(
    'points',
    'AWESOME sink points earned, all-time',
  )
  .addGauge(
    'printable',
    'AWESOME coupons that are currently printable',
  )
/* eslint-disable no-useless-return */
export const parser = (object: SaveComponent | SaveEntity, lookups: Lookups): void => {
  if (object.typePath === '/Script/FactoryGame.FGResourceSinkSubsystem') {
    // Total all-time, split by Standard and DNA
    const mTotalPoints = (object?.properties?.mTotalPoints as Int64ArrayProperty)?.values?.map((s) => parseInt(s, 10))
    if (mTotalPoints) {
      metrics.getGauge('points').set(mTotalPoints.reduce((acc, value) => acc + value, 0))
    }

    // Printable coupons
    const mNumResourceSinkCoupons = (object?.properties?.mNumResourceSinkCoupons as Int32Property)?.value
    if (mNumResourceSinkCoupons) {
      metrics.getGauge('printable').set(mNumResourceSinkCoupons)
    }
    return
  }
}
/* eslint-enable no-useless-return */

export {
  metrics as awesomeMetrics,
  parser as awesomeParser,
}
