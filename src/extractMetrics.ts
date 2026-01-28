import {
  Parser,
  type SaveComponent,
  type SaveEntity,
} from '@etothepii/satisfactory-file-parser'
import { Registry } from 'prom-client'
import { conveyorsMetrics, conveyorsParser } from './metricGroups/conveyors'
import { powerMetrics, powerParser } from './metricGroups/power'
import { awesomeMetrics, awesomeParser } from './metricGroups/awesome'
import { pipesMetrics, pipesParser } from './metricGroups/pipes'
import { buildingsMetrics, buildingsParser } from './metricGroups/buildings'
import { resourcesMetrics, resourcesParser } from './metricGroups/resources'
import { trainsMetrics, trainsParser } from './metricGroups/trains'

export const extractMetrics = async (arrayBuffer: ArrayBuffer): Promise<Registry> => {
  const register = Registry.merge([
    awesomeMetrics.register,
    buildingsMetrics.register,
    conveyorsMetrics.register,
    pipesMetrics.register,
    powerMetrics.register,
    resourcesMetrics.register,
    trainsMetrics.register,
  ])

  register.resetMetrics()
  const save = Parser.ParseSave('MySave', arrayBuffer)
  register.setDefaultLabels({ sessionName: save.header.sessionName })

  const lookups = {
    byType: new Map<string, SaveComponent | SaveEntity>(),
    byInstance: new Map<string, SaveComponent | SaveEntity>(),
  } as const

  // Build lookup maps in an initial pass
  for (const level of Object.values(save.levels)) {
    for (const object of level.objects) {
      lookups.byType.set(object.typePath, object)
      lookups.byInstance.set(object.instanceName, object)
    }
  }

  for (const level of Object.values(save.levels)) {
    for (const object of level.objects) {
      awesomeParser(object, lookups)
      buildingsParser(object, lookups)
      conveyorsParser(object, lookups)
      pipesParser(object, lookups)
      powerParser(object, lookups)
      resourcesParser(object, lookups)
      trainsParser(object, lookups)
    }
  }

  return register
}
