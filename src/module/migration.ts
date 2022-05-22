import { ActorDataSource } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData';
import { ItemDataSource } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData';
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
      const updateData = migrateActorData(actor.toObject());
      if (!foundry.utils.isObjectEmpty(updateData)) {
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
      const updateData = migrateItemData(item.toObject());
      if (!foundry.utils.isObjectEmpty(updateData)) {
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
  for (const doc of documents) {
    let updateData: Record<string, any> = {};
    try {
      switch (type) {
        case 'Actor':
          updateData = migrateActorData(doc.toObject() as ActorDataSource);
          break;
        case 'Item':
          updateData = migrateItemData(doc.toObject() as ItemDataSource);
          break;
        case 'Scene':
          updateData = migrateSceneData(doc.data as SceneData);
          break;
      }
      if (isObjectEmpty(updateData)) continue;

      // Save the entry, if data was changed
      await doc.update(updateData);
      console.log(
        `Migrated ${type} document ${doc.name} in Compendium ${pack.collection}`,
      );
    } catch (err) {
      // Handle migration failures
      err.message = `Failed swade system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
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
 * @param {object} actor    The actor data object to update
 * @return {Object}         The updateData to apply
 */
export function migrateActorData(actor: ActorDataSource) {
  const updateData: Record<string, any> = {};

  // Actor Data Updates
  _migrateVehicleOperator(actor, updateData);

  // Migrate Owned Items
  if (!actor.items) return updateData;
  const items = actor.items.reduce((arr, i) => {
    // Migrate the Owned Item
    const itemUpdate = migrateItemData(i);

    // Update the Owned Item
    if (!isObjectEmpty(itemUpdate)) {
      itemUpdate._id = i._id;
      arr.push(foundry.utils.expandObject(itemUpdate));
    }

    return arr;
  }, new Array<Record<string, unknown>>());

  if (items.length > 0) updateData.items = items;
  return updateData;
}

export function migrateItemData(data: ItemDataSource) {
  const updateData: Record<string, any> = {};
  if (data.type === 'weapon') {
    _migrateWeaponAPToNumber(data, updateData);
  }
  if (data.type === 'power') {
    _migratePowerEquipToFavorite(data, updateData);
  }
  return updateData;
}

/**
 * Migrate a single Scene document to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} scene  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
export function migrateSceneData(scene: SceneData) {
  const tokens = scene.tokens.map((token) => {
    const t = token.toObject();
    const update: Record<string, unknown> = {};
    if (Object.keys(update).length) foundry.utils.mergeObject(t, update);
    if (!t.actorId || t.actorLink) {
      t.actorData = {};
    } else if (!game?.actors?.has(t.actorId)) {
      t.actorId = null;
      t.actorData = {};
    } else if (!t.actorLink) {
      const actorData = foundry.utils.duplicate(t.actorData) as any;
      actorData.type = token.actor?.type;
      const update = migrateActorData(actorData);
      ['items', 'effects'].forEach((embeddedName) => {
        if (!update[embeddedName]?.length) return;
        const updates = new Map<string, any>(
          update[embeddedName].map((u) => [u._id, u]),
        );
        t.actorData[embeddedName].forEach((original) => {
          const update = updates.get(original._id);
          if (update) foundry.utils.mergeObject(original, update);
        });
        delete update[embeddedName];
      });
      foundry.utils.mergeObject(t.actorData, update);
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
  data: ActorDataSource,
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
  data: ItemDataSource,
  updateData: Record<string, unknown>,
) {
  if (data.type !== 'weapon') return updateData;

  if (data.data.ap && typeof data.data.ap === 'string') {
    updateData['data.ap'] = Number(data.data.ap);
  }
}

function _migratePowerEquipToFavorite(
  data: ItemDataSource,
  updateData: Record<string, unknown>,
) {
  if (data.type !== 'power') return updateData;
  const isOld = foundry.utils.hasProperty(data, 'data.equipped');
  if (isOld) {
    updateData['data.favorite'] = data.data.equipped;
    updateData['data.-=equipped'] = null;
    updateData['data.-=equippable'] = null;
  }
}
