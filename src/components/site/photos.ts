/**
 * Alt text for every photograph, keyed by its public path. The photos are
 * stand-ins until the resort supplies its own; replace a file under the same
 * name and update its line here.
 */
const ALT: Record<string, string> = {
  "/hero.webp": "Mist over coffee plantations at sunrise, with ripe coffee cherries in front",
  "/rooms/plantation-view-room-1.webp": "Bed beside floor-to-ceiling windows looking into tall palms",
  "/rooms/plantation-view-room-2.webp": "Coffee rows climbing a hillside below a tiled pavilion",
  "/rooms/plantation-view-room-3.webp": "A basket of freshly picked red coffee cherries between the bushes",
  "/rooms/estate-deluxe-room-1.webp": "Bedroom with an armchair by the window and hills beyond",
  "/rooms/estate-deluxe-room-2.webp": "Round wooden soaking tub under a slatted wood ceiling",
  "/rooms/estate-deluxe-room-3.webp": "Pickers among rows of green bushes on misty rolling hills",
  "/rooms/valley-suite-1.webp": "Living room with a linen sofa, walnut shelves and a fireplace",
  "/rooms/valley-suite-2.webp": "Wooden deck with wicker chairs over a valley at sunset",
  "/rooms/valley-suite-3.webp": "Sun setting over layers of mountain ridges",
  "/rooms/coffee-bungalow-villa-1.webp": "Long verandah with carved wooden furniture and lanterns",
  "/rooms/coffee-bungalow-villa-2.webp": "Chairs set out on a lawn for a ceremony, with misty hills behind",
  "/rooms/coffee-bungalow-villa-3.webp": "Living room under wooden beams with a lit stone fireplace",
  "/rooms/private-pool-villa-1.webp": "Plunge pool on a wooden deck at the edge of the forest",
  "/rooms/private-pool-villa-2.webp": "Outdoor shower with green tiles under a reed roof",
  "/rooms/private-pool-villa-3.webp": "Bed facing a tall glass wall that opens onto trees at dusk",
};

export function photoAlt(src: string, fallback: string) {
  return ALT[src] ?? fallback;
}
