import { pathToGenerator, pathToItem, pathToMiner, pathToRecipe, pathToResourceNode, staticData } from '../staticData/staticData'
import { type Lookups } from '../types/lookups.type'
import { MetricGroup } from './_MetricGroup'
import {
  type ArrayProperty,
  type BoolProperty,
  type FloatProperty,
  type IntProperty,
  type InventoryItemStructPropertyValue,
  isObjectProperty,
  type ObjectProperty,
  type SaveComponent,
  type SaveEntity,
  type StructProperty,
} from '@etothepii/satisfactory-file-parser'

const metrics = new MetricGroup('satisfactory_savegame_resources')
  .addGauge(
    'consumption_per_second',
    'Usage of items per second across all configured recipes and extractors',
    ['item'],
  )
  .addGauge(
    'production_per_second',
    'Creation of items per second',
    ['item'],
  )
  .addGauge(
    'storage_containers_total',
    'Total items in storage containers',
    ['item'],
  )
  .addGauge(
    'storage_dimensional_total',
    'Total items uploaded to dimensional storage',
    ['item'],
  )

const iterateInventory = (object: SaveComponent | SaveEntity, lookups: Lookups): Map<string, number> => {
  const itemQuantities = new Map<string, number>()
  const inventory = lookups.byInstance.get(object.properties?.mStorageInventory?.value?.pathName)
  if (!inventory) throw new Error('Inventory not found: ' + object.properties?.mStorageInventory?.value?.pathName)
  const inventoryStacks = (inventory.properties?.mInventoryStacks as ArrayProperty).values
  for (const stack of inventoryStacks) {
    const item = pathToItem(((stack.properties?.Item as StructProperty)?.value as InventoryItemStructPropertyValue)?.itemReference?.pathName)
    const quantity = (stack.properties?.NumItems as IntProperty)?.value
    if (item && quantity) {
      if (itemQuantities.has(item.name)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        itemQuantities.set(item.name, itemQuantities.get(item.name)! + quantity)
      } else {
        itemQuantities.set(item.name, quantity)
      }
    }
  }
  return itemQuantities
}

export const parser = (object: SaveComponent | SaveEntity, lookups: Lookups): void => {
  // #region Storage
  if (object.typePath.startsWith('/Game/FactoryGame/Buildable/Factory/Storage')) {
    if (object.typePath === '/Game/FactoryGame/Buildable/Factory/StoragePlayer/Build_StorageIntegrated.Build_StorageIntegrated_C') {
      // TODO: is this HUB storage? It only appears once despite having multiple players in the save.
      return
    }

    const items = iterateInventory(object, lookups)
    for (const [itemName, quantity] of items) {
      metrics.getGauge('storage_containers_total').inc({ item: itemName }, quantity)
    }
  }

  // Dimensional depot buildings have a buffer inventory for things that are waiting to be uploaded,
  // but there's also the central storage subsystem which contains the actual cloud inventory.
  if (object.typePath === '/Game/FactoryGame/Buildable/Factory/CentralStorage/Build_CentralStorage.Build_CentralStorage_C') {
    // We dont include depot buffers in the "storage_containers_total" metric because they are not available for consumption yet,
    // but if you wanted to include them, this would be how:
    // const items = iterateInventory(object, lookups)
    // for (const [itemName, quantity] of items) {
    //   metrics.getGauge('storage_dimensional_total').inc({ item: itemName }, quantity)
    // }
  }
  // Actual cloud inventory
  if (object.typePath === '/Script/FactoryGame.FGCentralStorageSubsystem') {
    const uploadedItems = (object.properties?.mStoredItems as ArrayProperty)?.values ?? []
    for (const uploadedItem of uploadedItems) {
      const itemPathName = (uploadedItem.properties?.ItemClass as ObjectProperty)?.value?.pathName
      const item = pathToItem(itemPathName) || { name: itemPathName.split('.').at(-1)?.replace(/^Desc_/, '').replace(/_C$/, '') }
      if (!pathToItem(itemPathName)) {
        process.stderr.write(`Item name could not be resolved: ${itemPathName}\n`)
        continue
      }
      metrics.getGauge('storage_dimensional_total').inc({ item: item.name }, uploadedItem.properties.Amount.value)
    }
  }
  // #endregion

  // Don't include manually paused buildings
  const isStandby = (object?.properties?.mIsProductionPaused as BoolProperty)?.value
  if (isStandby) return

  // #region Production
  if (object.properties?.mCurrentRecipe) {
    if (!isObjectProperty(object.properties.mCurrentRecipe)) return

    // Clock speed affects the recipe rates
    const clockSpeed =
      (object.properties?.mCurrentPotential as FloatProperty)?.value ??
      (object.properties?.mPendingPotential as FloatProperty)?.value ??
      1

    const recipe = pathToRecipe(object.properties.mCurrentRecipe.value.pathName)

    if (recipe === undefined) {
      return
    }

    for (const ingredient of recipe.ingredients) {
      const item = staticData.items[ingredient.item]
      metrics.getGauge('consumption_per_second').inc({ item: item.name }, (ingredient.amount / recipe.time) * clockSpeed)
    }
    for (const product of recipe.products) {
      const item = staticData.items[product.item]
      metrics.getGauge('production_per_second').inc({ item: item.name }, (product.amount / recipe.time) * clockSpeed)
    }
    return
  }
  // #endregion

  // #region Resource extraction
  if (object.properties?.mExtractableResource) {
    // Waterpumps refer to undocumented bodies of water as their resource nodes, so we treat them differently.
    if (object.typePath.startsWith('/Game/FactoryGame/Buildable/Factory/WaterPump')) {
      const item = staticData.items.Desc_Water_C
      const miner = pathToMiner(object.typePath)
      if (!miner) throw new Error('Miner not found: ' + object.typePath)
      const extractionPerSecond = miner.itemsPerCycle / miner.extractCycleTime
      const clockSpeed =
        (object.properties?.mCurrentPotential as FloatProperty)?.value ??
        (object.properties?.mPendingPotential as FloatProperty)?.value ??
        1
      metrics.getGauge('production_per_second').inc({ item: item.name }, extractionPerSecond * clockSpeed)
      return
    }

    // Geothermal generates only power, but their implementation make it seem like they produce "Desc_Geyser_C" which is.. interesting.
    if (object.typePath.startsWith('/Game/FactoryGame/Buildable/Factory/GeneratorGeoThermal/Build_GeneratorGeoThermal')) return

    // Fracking is also different, but in its own ✨special✨ way
    // The smasher is the parent that can be turned on and off,
    // but the FrackingExtractors are the ones sitting on the nodes which we know the resources for.
    if (object.typePath.startsWith('/Game/FactoryGame/Buildable/Factory/FrackingSmasher')) return
    // TODO: Currently, the resourceNodes.ts file doesn't have a mapping of what fracking satellites belong to which core
    // and its not readily available in the parsed entity, so we cant account for overclocking of the parent smasher

    const resource = pathToResourceNode((object.properties.mExtractableResource as ObjectProperty).value.pathName)
    if (!resource) throw new Error('Resource not found: ' + (object.properties.mExtractableResource as ObjectProperty).value.pathName)

    // Oil frackers claim to extract "Desc_LiquidOilWell_C" but the actual resource is "Desc_LiquidOil_C" (Crude Oil)
    const item = staticData.items[resource.item.replace('Well_C', '_C')]
    if (!item) throw new Error('Item not found: ' + resource.item)

    const miner = pathToMiner(object.typePath)
    if (!miner) throw new Error('Miner not found: ' + object.typePath)

    const extractionPerSecond = miner.itemsPerCycle / miner.extractCycleTime
    const clockSpeed =
      (object.properties?.mCurrentPotential as FloatProperty)?.value ??
      (object.properties?.mPendingPotential as FloatProperty)?.value ??
      1
    metrics.getGauge('production_per_second').inc({ item: item.name }, extractionPerSecond * resource.purity * clockSpeed)
  }
  // #endregion

  // #region Generator consumption
  if (object.properties?.mCurrentFuelClass) {
    const generator = pathToGenerator(object.typePath)
    if (!generator) return // Its a vehicle. Or a jetpack. Or one of the players are drinking fuel.

    const fuel = pathToItem((object.properties.mCurrentFuelClass as ObjectProperty).value.pathName)
    if (!fuel) throw new Error('Fuel not found: ' + (object.properties.mCurrentFuelClass as ObjectProperty).value.pathName)

    const clockSpeed =
      (object.properties?.mCurrentPotential as FloatProperty)?.value ??
      (object.properties?.mPendingPotential as FloatProperty)?.value ??
      1

    const fuelPerSecond = 1 / (fuel.energyValue / (generator.powerProduction * clockSpeed))
    metrics.getGauge('consumption_per_second').inc({ item: fuel.name }, fuelPerSecond)

    const water = staticData.items.Desc_Water_C
    if (generator.className === 'Desc_GeneratorCoal_C') {
      metrics.getGauge('consumption_per_second').inc({ item: water.name }, (45 / 60) * clockSpeed)
    }
    if (generator.className === 'Desc_GeneratorNuclear_C') {
      metrics.getGauge('consumption_per_second').inc({ item: water.name }, (240 / 60) * clockSpeed)
    }
  }
  // #endregion
}

export {
  metrics as resourcesMetrics,
  parser as resourcesParser,
}
