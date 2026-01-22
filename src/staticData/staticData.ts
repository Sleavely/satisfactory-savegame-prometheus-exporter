import {
  type Miner,
  type Miners,
  type Building,
  type DescGenerator,
  type Generators,
  type Item,
  type Recipe,
  type StaticData,
} from '../types/staticData.types'
import { type ResourceNode, resourceNodes } from './resourceNodes'
import rawJsonData from './data.json'

export const staticData = {
  ...(rawJsonData as StaticData),
  resourceNodes,
}

/**
 * @example Input path: '/Game/FactoryGame/Recipes/Smelter/Recipe_IngotCopper.Recipe_IngotCopper_C'
 */
const pathToClassName = (path: string): string => {
  const className = (path.split('.').at(1) ?? '').replace(/^Build_/, 'Desc_')
  return className
}

export const pathToBuilding = (path: string): Building => {
  return staticData.buildings[pathToClassName(path)]
}

export const pathToGenerator = (path: string): DescGenerator => {
  return staticData.generators[pathToClassName(path) as keyof Generators]
}

export const pathToItem = (path: string): Item => {
  return staticData.items[pathToClassName(path)]
}

export const pathToMiner = (path: string): Miner => {
  return staticData.miners[pathToClassName(path) as keyof Miners]
}

export const pathToRecipe = (path: string): Recipe => {
  return staticData.recipes[pathToClassName(path)]
}

export const pathToResourceNode = (path: string): ResourceNode => {
  return staticData.resourceNodes[path]
}
