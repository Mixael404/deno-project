import { programmeModel } from "../models/programmeModel.js";

export const publicController = {
  listProgrammes(req) {
    const url    = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const level  = url.searchParams.get("level")?.trim().toUpperCase() ?? "";
    const programmes = programmeModel.findPublished({ search, level });
    return Response.json({ programmes });
  },
};
