import { Fetcher } from "#lib/fetcher.ts";
import type { MetObject } from "#lib/models/metmuseum.ts";
import { MET_COLLECTION_API_BASE } from "$app/env/public"
import * as v from "valibot"

export interface MetMuseumApi {
    objects: () => Promise<{ total: number; objectIDs: number[]; }>
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
    object = async (id: number, signal?: AbortSignal): Promise<MetObject> => {
        const cached = this.objectCache.get(id)
        if (cached)
            return cached
        const object = await this.fetcher.getJson<MetObject>(
            `${MET_COLLECTION_API_BASE}/v1/objects/${id}`,
            { signal }
        )
        this.objectCache.set(id, object)
        return object
    }

    

}

export const metMuseumHttpClient = new MetMuseumHttpClient()