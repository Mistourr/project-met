import { Fetcher } from "#lib/fetcher.ts";
import type { MetObject } from "#lib/models/metmuseum.ts";
import { MET_COLLECTION_API_BASE } from "$app/env/public"
import * as v from "valibot"

export interface MetMuseumApi {
    objects: () => Promise<{ total: number; objectIDs: number[]; }>
}

export class MetMuseumHttpClient implements MetMuseumApi {

    // Initialize a Fetcher with 80 RPS
    private fetcher = new Fetcher(80)
    
    /**
     * Returns all objects (only IDs)
     */
    objects = async (): Promise<{ total: number; objectIDs: number[]; }> => {
        return await this.fetcher.getJson<{
            total: number;
            objectIDs: number[];
        }>(`${MET_COLLECTION_API_BASE}/v1/objects`);
    }

    object = async (id: number): Promise<MetObject> => {
        return await this.fetcher.getJson<MetObject>(
            `${MET_COLLECTION_API_BASE}/v1/objects/${id}`
        )
    }

    

}
