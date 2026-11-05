// Shared by the Congress data job and the site.

/** "Gilbert Ray Cisneros, Jr." -> "gilbert-ray-cisneros-jr": the member's page address.
 * @param {string} name */
export const memberSlug = (name) => String(name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
