import { describe, expect, it } from "vitest"
import { MetMuseumHttpClient } from './metmuseum'
import { isArray, isNumber } from "@amcharts/amcharts5/.internal/core/util/Type"
import * as v from "valibot"

describe("MET Museum HTTP client should work", () => {
    const client = new MetMuseumHttpClient()
    it("should get objects", async () => {
        const objects = await client.objects()
        expect(isNumber(objects.total), "Total is not a number.")
        expect(objects.objectIDs && isArray(objects.objectIDs), "objectIDs is not an array.")
        expect(objects.objectIDs.length > 0, "objectIDs should not be empty")
    })
})