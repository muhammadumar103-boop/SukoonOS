import { collectionHandlers } from "@/server/http/crud";
import { resourceService } from "@/server/services/resources";

export const { GET, POST } = collectionHandlers(resourceService.donations);
