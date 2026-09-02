/**
 * Master switch for the Pokémon catalog/image/set-logo/nameEn automation
 * jobs — on by default (unlike SPORTS_IMAGE_SCRAPE_ENABLED, these sources
 * are real provider/publisher data, not a ToS-gray scrape), so a human can
 * flip it off in an emergency (e.g. a bad run hammering a source) without
 * undeploying workers/cron-image-automation/.
 */
export function isImageAutomationEnabled(): boolean {
  return process.env.IMAGE_AUTOMATION_ENABLED !== "false";
}
