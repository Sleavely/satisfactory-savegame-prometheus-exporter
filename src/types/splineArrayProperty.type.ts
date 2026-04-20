import {
  type StructArrayProperty,
  type StructProperty,
  type vec3,
} from '@etothepii/satisfactory-file-parser'

interface Vec3StructProperty extends StructProperty {
  value: vec3
}
export interface SplinePointValue extends StructProperty {
  properties: {
    Location: Vec3StructProperty
    ArriveTangent: Vec3StructProperty
    LeaveTangent: Vec3StructProperty
  }
}
export interface SplineArrayProperty extends StructArrayProperty {
  values: SplinePointValue[]
}
