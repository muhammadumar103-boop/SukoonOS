import { itemHandlers } from "@/server/http/crud";
import { resourceService } from "@/server/services/resources";

export const { GET, PATCH, DELETE } = itemHandlers(resourceService.transfers);
