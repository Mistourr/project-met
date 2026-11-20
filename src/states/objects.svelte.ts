import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";

export const objects = $state(metMuseumHttpClient.objects())