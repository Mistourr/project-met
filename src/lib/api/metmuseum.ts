import { Fetcher } from "#lib/fetcher.ts";
import type { MetObject, SearchParams, SearchResponse } from "#lib/models/metmuseum.ts";
import { MET_COLLECTION_API_BASE } from "$app/env/public"
import * as v from "valibot"

export interface MetMuseumApi {
    objects: () => Promise<{ total: number; objectIDs: number[]; }>
    search: (params: SearchParams) => Promise<SearchResponse>
}

class MetMuseumHttpClient implements MetMuseumApi {

    // Retries throttled requests with exponential backoff until they go through
    private fetcher = new Fetcher()
    
    /**
     * Returns all objects (only IDs)
     */
    objects = async (): Promise<{ total: number; objectIDs: number[]; }> => {
        return await this.fetcher.getJson<{
            total: number;
            objectIDs: number[];
        }>(`${MET_COLLECTION_API_BASE}/v1/objects`);
    }

    // Objects already fetched, so scrolling back doesn't request them again.
    private objectCache = new Map<number, MetObject>()

    /**
     * Returns one object. Pass a signal to cancel the request while it is
     * still queued (e.g. when its row scrolls out of view).
     */
    object = async (id: number): Promise<MetObject> => {
        const cached = this.objectCache.get(id)
        if (cached)
            return cached
        const object = await this.fetcher.getJson<MetObject>(
            `${MET_COLLECTION_API_BASE}/v1/objects/${id}`
        )
        this.objectCache.set(id, object)
        return object
    }

    /**
     * Searches objects (only IDs), one page at a time.
     */
    search = async (params: SearchParams): Promise<SearchResponse> => {
        const query = new URLSearchParams()
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined)
                continue
            query.set(key, Array.isArray(value) ? value.join("|") : String(value))
        }
        const response = await this.fetcher.getJson<{ total: number; objectIDs: number[] | null }>(
            `${MET_COLLECTION_API_BASE}/v1.1/search?${query}`
        )
        // The API answers `objectIDs: null` when nothing matches
        return { total: response.total, objectIDs: response.objectIDs ?? [] }
    }

}

export const metMuseumHttpClient = new MetMuseumHttpClient()