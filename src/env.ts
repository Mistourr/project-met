import { defineEnvVars } from "@sveltejs/kit/env";

// Taken from defineEnvVars doc, nice validation
import * as v from "valibot"

export const variables = defineEnvVars({
    MET_COLLECTION_API_BASE: {
        schema: v.pipe(v.string(), v.url()),
        public: true
    }
})