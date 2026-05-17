import { renderView } from "../utils/renderView.js";

export const pageController = {
  home:    () => renderView("home"),
  about:   () => renderView("about"),
  profile: () => renderView("profile"),
};
