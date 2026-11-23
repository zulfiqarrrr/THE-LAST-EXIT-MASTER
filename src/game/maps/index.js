/* ==========================================================================
   THE LAST EXIT — Map Registry
   Exports all selectable facility maps and helper accessors.
   ========================================================================== */

import * as facilityMap from './map-facility.js';
import * as sewersMap from './map-sewers.js';
import * as archiveMap from './map-archive.js';

export const MAP_REGISTRY = {
  facility: facilityMap,
  sewers: sewersMap,
  archive: archiveMap,
};

export const DEFAULT_MAP_ID = 'facility';

export function getMapConfig(mapId = DEFAULT_MAP_ID) {
  return MAP_REGISTRY[mapId] || MAP_REGISTRY[DEFAULT_MAP_ID];
}
