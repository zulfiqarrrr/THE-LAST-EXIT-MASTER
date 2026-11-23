/* ==========================================================================
   THE LAST EXIT — Creature Factory
   Constructs the 3D model and animated physics rig for each specialized monster.
   ========================================================================== */

import { WardenRig } from '../warden-model.js';
import { buildCrawlerModel, loadCrawlerModel, getLoadedCrawlerModel, CrawlerRig } from './crawler-model.js';
import { buildArchivistModel, loadArchivistModel, getLoadedArchivistModel, ArchivistRig } from './archivist-model.js';

export function createMonsterInstance(monsterId, { wardenModel, quality }) {
  if (monsterId === 'crawler') {
    const glb = getLoadedCrawlerModel();
    const crawler = glb || buildCrawlerModel(quality);
    return {
      type: 'crawler',
      object: crawler.object,
      mesh: crawler.mesh,
      rig: new CrawlerRig(crawler),
      dispose: crawler.isGlb ? () => {} : crawler.dispose,
    };
  }

  if (monsterId === 'archivist') {
    const glb = getLoadedArchivistModel();
    const archivist = glb || buildArchivistModel(quality);
    return {
      type: 'archivist',
      object: archivist.object,
      mesh: archivist.mesh,
      rig: new ArchivistRig(archivist),
      dispose: archivist.isGlb ? () => {} : archivist.dispose,
    };
  }

  // Default: The Warden (Sublevel 4 Medical Facility)
  wardenModel.mesh.castShadow = !!quality.shadows;
  return {
    type: 'warden',
    object: wardenModel.object,
    mesh: wardenModel.mesh,
    rig: new WardenRig(),
    dispose: () => {},
  };
}
