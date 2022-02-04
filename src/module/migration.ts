import {
  ActorData,
  ItemData,
  SceneData,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs';

export async function migrateWorld() {
  ui.notifications.info(
    `Applying SWADE System Migration for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`,
  );

  // Migrate World Actors
  for (const actor of game.actors!) {
    try {
      const updateData = migrateActorData(actor.data as unknown as ActorData);
      if (!isObjectEmpty(updateData)) {
        console.log(`Migrating Actor document ${actor.name}`);
        await actor.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `Failed swade system migration for Actor ${actor.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Items
  for (const item of game.items!) {
    try {
      const updateData = migrateItemData(item.data as unknown as ItemData);
      if (!isObjectEmpty(updateData)) {
        console.log(`Migrating Item document ${item.name}`);
        await item.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `Failed swade system migration for Item ${item.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Compendium Packs
  for (const p of game.packs) {
    if (p.metadata.package !== 'world') continue;
    if (!['Actor', 'Item', 'Scene'].includes(p.metadata['type'])) continue;
    await migrateCompendium(p);
  }

  // Set the migration as complete
  await game.settings.set(
    'swade',
    'systemMigrationVersion',
    game.system.data.version,
  );
  ui.notifications.info(
    `SWADE System Migration to version ${game.system.data.version} completed!`,
    { permanent: true },
  );
}

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack The compendium to migrate. Only Actor, Item or Scene compendiums are processed
 */
export async function migrateCompendium(
  pack: CompendiumCollection<CompendiumCollection.Metadata>,
) {
  const type = pack.metadata['type'];
  if (!['Actor', 'Item', 'Scene'].includes(type)) return;

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate({});
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for (const document of documents) {
    let updateData: Record<string, any> = {};
    try {
      switch (type) {
        case 'Actor':
          updateData = migrateActorData(document.data as unknown as ActorData);
          break;
        case 'Item':
          updateData = migrateItemData(document.data as unknown as ItemData);
          break;
        case 'Scene':
          updateData = migrateSceneData(document.data as SceneData);
          break;
      }
      if (isObjectEmpty(updateData)) continue;

      // Save the entry, if data was changed
      await document.update(updateData);
      console.log(
        `Migrated ${type} document ${document.name} in Compendium ${pack.collection}`,
      );
    } catch (err) {
      // Handle migration failures
      err.message = `Failed swade system migration for document ${document.name} in pack ${pack.collection}: ${err.message}`;
      console.error(err);
    }
  }

  // Apply the original locked status for the pack
  await pack.configure({ locked: wasLocked });
  console.log(
    `Migrated all ${type} documents from Compendium ${pack.metadata.label}`,
  );
}

/* -------------------------------------------- */
/*  Document Type Migration Helpers             */
/* -------------------------------------------- */

/**
 * Migrate a single Actor document to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {object} data    The actor data object to update
 * @return {Object}         The updateData to apply
 */
export function migrateActorData(data: ActorData) {
  const updateData: Record<string, any> = {};

  // Actor Data Updates
  _migrateVehicleOperator(data, updateData);

  // Migrate Owned Items
  if (!data.items) return updateData;
  let hasItemUpdates = false;
  const items = data.items.map((i) => {
    // Migrate the Owned Item
    const itemUpdate = migrateItemData(i.data);

    // Update the Owned Item
    if (!isObjectEmpty(itemUpdate)) {
      hasItemUpdates = true;
      return mergeObject(i, itemUpdate, {
        enforceTypes: false,
        inplace: false,
      });
    } else return i;
  });
  if (hasItemUpdates) updateData.items = items;
  return updateData;
}

export function migrateItemData(data: ItemData) {
  const updateData: Record<string, any> = {};
  if (data.type === 'weapon') {
    _migrateWeaponAPToNumber(data, updateData);
  }
  return updateData;
}

/**
 * Migrate a single Scene document to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} data  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
export function migrateSceneData(data: SceneData) {
  const tokens = data.tokens.map((token) => {
    const t = token.data;
    if (!t.actorId || t.actorLink) {
      t.actorData = {};
    } else if (!game.actors?.has(t.actorId)) {
      t.actorId = null;
      t.actorData = {};
    } else if (!t.actorLink) {
      const actorData = foundry.utils.duplicate(t.actorData);
      actorData.type = token.actor?.type;
      const update = migrateActorData(actorData as unknown as ActorData);
      ['items', 'effects'].forEach((embed) => {
        if (!update[embed]?.length) return;
        const updates = new Map(update[embed].map((u) => [u._id, u]));
        t.actorData[embed].forEach((original) => {
          const update = updates.get(original._id) as any;
          if (update) foundry.utils.mergeObject(original, update);
        });
        delete update[embed];
      });
      mergeObject(t.actorData, update);
    }
    return t;
  });
  return { tokens };
}

/**
 * Purge the data model of any inner objects which have been flagged as _deprecated.
 * @param {object} data   The data to clean
 * @private
 */
export function removeDeprecatedObjects(data: ItemData | ActorData) {
  for (const [k, v] of Object.entries(data)) {
    if (getType(v) === 'Object') {
      if (v['_deprecated'] === true) {
        console.log(`Deleting deprecated object key ${k}`);
        delete data[k];
      } else removeDeprecatedObjects(v);
    }
  }
  return data;
}

function _migrateVehicleOperator(
  data: ActorData,
  updateData: Record<string, unknown>,
) {
  if (data.type !== 'vehicle') return updateData;
  const driverId = data.data.driver.id;
  const hasOldID = !!driverId && driverId.split('.').length === 1;
  if (hasOldID) {
    updateData['data.driver.id'] = `Actor.${driverId}`;
  }
  return updateData;
}

function _migrateWeaponAPToNumber(
  data: ItemData,
  updateData: Record<string, unknown>,
) {
  if (data.type !== 'weapon') return updateData;

  if (data.data.ap && typeof data.data.ap === 'string') {
    updateData['data.ap'] = Number(data.data.ap);
  }
}
