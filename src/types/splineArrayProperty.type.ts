import {
  type StructArrayProperty,
  type StructProperty,
  type vec3,
} from '@etothepii/satisfactory-file-parser'

interface Vec3StructProperty extends StructProperty {
  value: vec3
}
interface SplinePointData {
  type: 'SplinePointData'
  properties: {
    Location: Vec3StructProperty
    ArriveTangent: Vec3StructProperty
    LeaveTangent: Vec3StructProperty
  }
}
export interface SplinePointProperty extends StructProperty {
  value: SplinePointData
}
export interface SplineArrayProperty extends StructArrayProperty {
  values: SplinePointProperty[]
}
