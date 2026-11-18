import type { Constituent, MetObject } from '#lib/models/metmuseum.ts';
import * as v from 'valibot';

export const TagSchema = v.object({
  term: v.string(),
  AAT_URL: v.string(),
  Wikidata_URL: v.string(),
});

export const ConstituentSchema = v.object({
  constituentID: v.number(),
  role: v.string(),
  name: v.string(),
  constituentULAN_URL: v.string(),
  constituentWikidata_URL: v.string(),
  gender: v.string(),
});

export const DimensionParsedSchema = v.object({
  element: v.string(),
  dimensionType: v.string(),
  dimension: v.number(),
});

export const ElementMeasurementsSchema = v.record(v.string(), v.number());

export const MeasurementSchema = v.object({
  elementName: v.string(),
  elementDescription: v.nullable(v.string()),
  elementMeasurements: ElementMeasurementsSchema,
});

export const DepartmentSchema = v.object({
  departmentId: v.number(),
  displayName: v.string(),
});

export const DepartmentsResponseSchema = v.object({
  departments: v.array(DepartmentSchema),
});

export const ObjectsResponseSchema = v.object({
  total: v.number(),
  objectIDs: v.array(v.number()),
});

export const SearchResponseSchema = v.object({
  total: v.number(),
  objectIDs: v.array(v.number()),
});

export const MetObjectSchema = v.object({
  objectID: v.number(),
  isHighlight: v.boolean(),
  accessionNumber: v.string(),
  accessionYear: v.string(),
  isPublicDomain: v.boolean(),
  primaryImage: v.string(),
  primaryImageSmall: v.string(),
  additionalImages: v.array(v.string()),
  constituents: v.nullable(v.array(ConstituentSchema)),
  department: v.string(),
  objectName: v.string(),
  title: v.string(),
  culture: v.string(),
  period: v.string(),
  dynasty: v.string(),
  reign: v.string(),
  portfolio: v.string(),
  artistRole: v.string(),
  artistPrefix: v.string(),
  artistDisplayName: v.string(),
  artistDisplayBio: v.string(),
  artistSuffix: v.string(),
  artistAlphaSort: v.string(),
  artistNationality: v.string(),
  artistBeginDate: v.string(),
  artistEndDate: v.string(),
  artistGender: v.string(),
  artistWikidata_URL: v.string(),
  artistULAN_URL: v.string(),
  objectDate: v.string(),
  objectBeginDate: v.number(),
  objectEndDate: v.number(),
  medium: v.string(),
  dimensions: v.string(),
  dimensionsParsed: v.optional(v.array(DimensionParsedSchema)),
  measurements: v.nullable(v.array(MeasurementSchema)),
  creditLine: v.string(),
  geographyType: v.string(),
  city: v.string(),
  state: v.string(),
  county: v.string(),
  country: v.string(),
  region: v.string(),
  subregion: v.string(),
  locale: v.string(),
  locus: v.string(),
  excavation: v.string(),
  river: v.string(),
  classification: v.string(),
  rightsAndReproduction: v.string(),
  linkResource: v.string(),
  metadataDate: v.string(),
  repository: v.string(),
  objectURL: v.string(),
  tags: v.nullable(v.array(TagSchema)),
  objectWikidata_URL: v.string(),
  isTimelineWork: v.boolean(),
  GalleryNumber: v.string(),
});