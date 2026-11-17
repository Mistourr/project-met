import { Fetcher } from "#lib/fetcher.ts";
import { MET_COLLECTION_API_BASE } from "$app/env/public"

// Initialize a Fetcher with 80 RPS
const fetcher = new Fetcher(80)

/**
 * Returns all objects (only IDs)
 */
export const objects = async (): Promise<{ total: number; objectIDs: number[]; }> => {
    return await fetcher.getJson<{
        total: number;
        objectIDs: number[];
    }>(`${MET_COLLECTION_API_BASE}/objects`);
}