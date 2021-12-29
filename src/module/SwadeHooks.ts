/* eslint-disable @typescript-eslint/no-unused-vars */
import { ItemData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs';
import { ItemMetadata, JournalMetadata } from '../globals';
import {
  DsnCustomWildDieColors,
  DsnCustomWildDieOptions,
} from '../interfaces/DiceIntegration';
import { Dice3D } from '../interfaces/DiceSoNice';
import ActionCardEditor from './apps/ActionCardEditor';
import DiceSettings from './apps/DiceSettings';
import SwadeCombatGroupColor from './apps/SwadeCombatGroupColor';
import Bennies from './bennies';
import CharacterSummarizer from './CharacterSummarizer';
import * as chat from './chat';
import { SWADE } from './config';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import SwadeCombatant from './documents/SwadeCombatant';
import * as migrations from './migration';
import { SwadeSetup } from './setup/setupHandler';
import SwadeVehicleSheet from './sheets/SwadeVehicleSheet';
import SwadeCombatTracker from './sidebar/SwadeCombatTracker';

export default class SwadeHooks {
  public static async onReady() {
    const deckChoices: Record<string, string> = {};
    const pokerDecks = game
      .cards!.filter((stack) => {
        const cards = Array.from(stack.cards.values());
        return stack.type === 'deck' && cards.every((c) => c.type === 'poker');
      })
      .forEach((d) => (deckChoices[d.id] = d.name!));
    game.settings.register('swade', 'cardDeck', {
      name: game.i18n.localize('SWADE.InitCardDeck'),
      scope: 'world',
      type: String,
      config: true,
      choices: deckChoices,
      onChange: async (choice: string) => {
        console.log(
          `Repopulating action cards Table with cards from deck ${choice}`,
        );
      },
    });
    await SwadeSetup.setup();

    SWADE.diceConfig.flags = {
      dsnShowBennyAnimation: {
        type: Boolean,
        default: true,
        label: game.i18n.localize('SWADE.ShowBennyAnimation'),
        hint: game.i18n.localize('SWADE.ShowBennyAnimationDesc'),
      },
      dsnWildDie: {
        type: String,
        default: 'none',
        label: game.i18n.localize('SWADE.WildDiePreset'),
        hint: game.i18n.localize('SWADE.WildDiePresetDesc'),
      },
      dsnCustomWildDieColors: {
        type: Object,
        default: {
          labelColor: '#000000',
          diceColor: game.user?.data.color,
          outlineColor: game.user?.data.color,
          edgeColor: game.user?.data.color,
        },
      },
      dsnCustomWildDieOptions: {
        type: Object,
        default: {
          font: 'auto',
          material: 'auto',
          texture: 'none',
        },
      },
    };

    // Determine whether a system migration is required and feasible
    if (!game.user!.isGM) return;
    const currentVersion = game.settings.get('swade', 'systemMigrationVersion');
    //TODO Adjust this version every time a migration needs to be triggered
    const needsMigrationVersion = '0.21.3';
    //Minimal compatible version needed for the migration
    const compatibleMigrationVersion = '0.20.0';
    //If the needed migration version is newer than the old migration version then migrate the world
    const needsMigration =
      currentVersion && isNewerVersion(needsMigrationVersion, currentVersion);
    if (!needsMigration) return;

    // Perform the migration
    if (
      currentVersion !== '0.0.0' &&
      foundry.utils.isNewerVersion(currentVersion, compatibleMigrationVersion)
    ) {
      ui.notifications?.error(game.i18n.localize('SWADE.SysMigrationWarning'), {
        permanent: true,
      });
    }
    migrations.migrateWorld();
  }

  public static onRenderActorDirectory(
    app: ActorDirectory,
    html: JQuery<HTMLElement>,
    options: any,
  ) {
    // Mark all Wildcards in the Actors sidebars with an icon
    const found = html.find('.entity-name');
    const actors: Array<SwadeActor> = app.documents;
    let wildcards = actors.filter((a) => a.isWildcard && a.hasPlayerOwner);

    //if the player is not a GM, then don't mark the NPC wildcards
    if (!game.settings.get('swade', 'hideNPCWildcards') || game.user!.isGM) {
      const npcWildcards = actors.filter(
        (a) => a.isWildcard && !a.hasPlayerOwner,
      );
      wildcards = wildcards.concat(npcWildcards);
    }

    for (let i = 0; i < found.length; i++) {
      const element = found[i];
      const enitityId = element.parentElement!.dataset.documentId;
      const wildcard = wildcards.find((a) => a.id === enitityId);

      if (wildcard) {
        element.innerHTML = `
					<a><img src="${SWADE.wildCardIcons.regular}" class="wildcard-icon">${wildcard.data.name}</a>
					`;
      }
    }
  }

  public static async onGetActorDirectoryEntryContext(
    html: JQuery<HTMLElement>,
    options: ContextMenu.Item[],
  ) {
    const newOptions: ContextMenu.Item[] = [];

    // Invoke character summarizer on selected character
    newOptions.push({
      name: 'SWADE.ShowCharacterSummary',
      icon: '<i class="fas fa-users"></i>',
      callback: async (li) => {
        const selectedUser = game.actors?.get(li[0].dataset.documentId!)!;
        CharacterSummarizer.summarizeCharacters([selectedUser]);
      },
      condition: (li) => {
        const selectedUser = game.actors?.get(li[0].dataset.documentId!)!;
        return CharacterSummarizer.isSupportedActorType(selectedUser);
      },
    });
    options.splice(0, 0, ...newOptions);
  }

  public static async onRenderCompendium(
    app: CompendiumCollection<CompendiumCollection.Metadata>,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
    //Mark Wildcards in the compendium
    if (app.documentName === 'Actor') {
      const content = (await app.getDocuments()) as Array<SwadeActor>;
      const wildcards = content.filter((entity) => entity.isWildcard);
      const ids: string[] = wildcards.map((e) => e.id!);

      const found = html.find('.directory-item');
      found.each((i, el) => {
        const entryId = el.dataset.entryId!;
        if (ids.includes(entryId)) {
          const entityName = el.children[1];
          entityName.children[0].insertAdjacentHTML(
            'afterbegin',
            `<img src="${SWADE.wildCardIcons.compendium}" class="wildcard-icon">`,
          );
        }
      });
    }
  }

  public static onGetCompendiumDirectoryEntryContext(
    html: JQuery,
    options: ContextMenu.Item[],
  ) {
    //TODO Update ACE to the foundry Card API or depreceate it
    const obj: ContextMenu.Item = {
      name: 'SWADE.OpenACEditor',
      icon: '<i class="fas fa-edit"></i>',
      condition: (li) => {
        const pack = game.packs.get(li.data('pack'), {
          strict: true,
        });
        return pack.documentName === 'JournalEntry' && game.user!.isGM;
      },
      callback: async (li) => {
        const pack = game.packs.get(li.data('pack'), {
          strict: true,
        }) as CompendiumCollection<JournalMetadata>;
        if (pack.locked) {
          return ui.notifications?.warn('SWADE.WarningPackLocked', {
            localize: true,
          });
        }
        const editor = await ActionCardEditor.fromPack(pack);
        editor.render(true);
      },
    };
    options.push(obj);
  }

  public static onRenderCombatTracker(
    app: SwadeCombatTracker,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
    const currentCombat: Combat =
      data.combats[data.currentIndex - 1] || data.combat;
    if (currentCombat) {
      currentCombat.setupTurns();
    }

    let draggedEl, draggedId, draggedCombatant;
    html.find('.combatant').each((i, el) => {
      const combId = el.getAttribute('data-combatant-id') as string;
      const combatant = currentCombat.combatants.get(combId, { strict: true });
      const initdiv = el.getElementsByClassName('token-initiative');

      if (combatant.groupId || combatant.data.defeated) {
        initdiv[0].innerHTML = '';
      } else if (combatant.roundHeld) {
        initdiv[0].innerHTML =
          '<span class="initiative"><i class="fas fa-hand-rock"></span>';
      } else if (combatant.turnLost) {
        initdiv[0].innerHTML =
          '<span class="initiative"><i class="fas fa-ban"></span>';
      } else if (combatant.cardString) {
        const cardString = combatant.cardString;
        initdiv[0].innerHTML = `<span class="initiative">${cardString}</span>`;
      }

      // Drag and drop listeners
      // On dragstart
      el.addEventListener(
        'dragstart',
        function (e) {
          // store the dragged item
          draggedEl = e.target;
          draggedId = draggedEl.getAttribute('data-combatant-id');

          draggedCombatant = game.combat?.combatants.get(draggedId);
        },
        false,
      );

      // On dragOver
      el.addEventListener('dragover', (e) => {
        $(e.target!).closest('li.combatant').addClass('dropTarget');
      });

      // On dragleave
      el.addEventListener('dragleave', (e) => {
        $(e.target!).closest('li.combatant').removeClass('dropTarget');
      });

      // On drop
      el.addEventListener(
        'drop',
        async (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          const leaderId = $(e.target!)
            .closest('li.combatant')
            .attr('data-combatant-id')!;

          const leader = game.combat?.combatants.get(leaderId)!;
          // If a follower, set as group leader
          if (draggedCombatant.id !== leaderId) {
            if (!leader.isGroupLeader) {
              await leader.update({
                flags: {
                  swade: {
                    isGroupLeader: true,
                    '-=groupId': null,
                  },
                },
              });
            }
            const fInitiative = leader.data.initiative;
            const fCardValue = leader.cardValue;
            const fSuitValue = leader.suitValue! - 0.01;
            const fHasJoker = leader.hasJoker;
            // Set groupId of dragged combatant to the selected target's id

            await draggedCombatant.update({
              initiative: fInitiative,
              flags: {
                swade: {
                  cardValue: fCardValue,
                  suitValue: fSuitValue,
                  hasJoker: fHasJoker,
                  groupId: leaderId,
                },
              },
            });
            // If a leader, update its followers
            if (draggedCombatant.isGroupLeader) {
              const followers =
                game.combat?.combatants.filter(
                  (f) => f.groupId === draggedCombatant.id,
                ) ?? [];

              for (const f of followers) {
                await f.update({
                  initiative: fInitiative,
                  flags: {
                    swade: {
                      cardValue: fCardValue,
                      suitValue: fSuitValue,
                      hasJoker: fHasJoker,
                      groupId: leaderId,
                    },
                  },
                });
              }
              await draggedCombatant.unsetIsGroupLeader();
            }
          }
        },
        false,
      );
    });
  }

  public static async onRenderChatMessage(
    message: ChatMessage,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
    if (message.isRoll && message.isContentVisible) {
      await chat.formatRoll(message, html, data);
    }

    chat.hideChatActionButtons(message, html, data);
  }

  public static onGetChatLogEntryContext(
    html: JQuery<HTMLElement>,
    options: ContextMenu.Item[],
  ) {
    const canApply = (li: JQuery<HTMLElement>) => {
      const message = game.messages?.get(li.data('messageId'))!;
      const actor = ChatMessage.getSpeakerActor(message.data['speaker']);
      const isRightMessageType =
        message?.isRoll &&
        message?.isContentVisible &&
        !message.getFlag('core', 'RollTable');
      return (
        isRightMessageType && !!actor && (game.user?.isGM! || actor.isOwner)
      );
    };
    options.push(
      {
        name: game.i18n.localize('SWADE.RerollWithBenny'),
        icon: '<i class="fas fa-dice"></i>',
        condition: canApply,
        callback: (li) => chat.rerollFromChat(li, true),
      },
      {
        name: game.i18n.localize('SWADE.FreeReroll'),
        icon: '<i class="fas fa-dice"></i>',
        condition: canApply,
        callback: (li) => chat.rerollFromChat(li, false),
      },
    );
  }

  public static async onGetCombatTrackerEntryContext(
    html: JQuery<HTMLElement>,
    options: ContextMenu.Item[],
  ) {
    const index = options.findIndex((v) => v.name === 'COMBAT.CombatantReroll');
    if (index !== -1) {
      options[index].name = 'SWADE.Redraw';
      options[index].icon = '<i class="fas fa-sync-alt"></i>';
    }

    const newOptions = new Array<ContextMenu.Item>();

    // Set as group leader
    newOptions.push({
      name: 'SWADE.MakeGroupLeader',
      icon: '<i class="fas fa-users"></i>',
      condition: (li) => {
        const targetCombatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat!.combatants.get(targetCombatantId)!;
        return (
          !hasProperty(combatant, 'data.flags.swade.isGroupLeader') &&
          combatant!.actor!.isOwner
        );
      },
      callback: async (li) => {
        const targetCombatantId = li.attr('data-combatant-id') as string;
        const targetCombatant = game.combat!.combatants.get(targetCombatantId)!;
        await targetCombatant.update({
          flags: {
            swade: {
              isGroupLeader: true,
              '-=groupId': null,
            },
          },
        });
      },
    });

    // Set Group Color
    newOptions.push({
      name: 'SWADE.SetGroupColor',
      icon: '<i class="fas fa-palette"></i>',
      condition: (li) => {
        const targetCombatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(targetCombatantId)!;
        return combatant.isGroupLeader && combatant!.actor!.isOwner;
      },
      callback: (li) => {
        const targetCombatantId = li.attr('data-combatant-id') as string;
        const targetCombatant = game.combat?.combatants.get(targetCombatantId)!;
        new SwadeCombatGroupColor(targetCombatant).render(true);
      },
    });

    // Remove Group Leader
    newOptions.push({
      name: 'SWADE.RemoveGroupLeader',
      icon: '<i class="fas fa-users-slash"></i>',
      condition: (li) => {
        const targetCombatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(targetCombatantId)!;
        return combatant.isGroupLeader && combatant!.actor!.isOwner;
      },
      callback: async (li) => {
        const targetCombatantId = li.attr('data-combatant-id') as string;
        const targetCombatant = game.combat?.combatants.get(targetCombatantId)!;
        // Remove combatants from this leader's group.
        if (game.combat) {
          const followers = game.combat.combatants.filter(
            (f) => f.groupId === targetCombatantId,
          );
          for (const f of followers) {
            await f.unsetGroupId();
          }
        }
        // Remove as group leader
        await targetCombatant.unsetIsGroupLeader();
      },
    });

    // Add selected tokens as followers
    newOptions.push({
      name: 'SWADE.AddTokenFollowers',
      icon: '<i class="fas fa-users"></i>',
      condition: (li) => {
        const selectedTokens = canvas?.tokens?.controlled ?? [];
        return (
          canvas?.ready &&
          selectedTokens.length > 0 &&
          selectedTokens.every((t) => t!.actor!.isOwner)
        );
      },
      callback: async (li) => {
        const targetCombatantId = li.attr('data-combatant-id') as string;
        const targetCombatant = game.combat?.combatants.get(targetCombatantId)!;
        const selectedTokens = canvas?.tokens?.controlled;
        const cardValue = targetCombatant.cardValue! + 0.99;
        if (selectedTokens) {
          await targetCombatant.update({
            flags: {
              swade: {
                cardValue: cardValue,
                suitValue: targetCombatant.suitValue!,
                isGroupLeader: true,
                '-=groupId': null,
              },
            },
          });
          // Filter for tokens that do not already have combatants
          const newTokens = selectedTokens.filter((t) => !t.inCombat);
          // Filter for tokens that already have combatants to add them as followers later
          const existingCombatantTokens = selectedTokens.filter(
            (t) => t.inCombat,
          );
          // Construct array of new combatants data
          const createData = newTokens?.map((t) => {
            return {
              tokenId: t.id,
              actorId: t.data.actorId,
              hidden: t.data.hidden,
            };
          });
          // Create the combatants and create array of combatants created
          const combatants = (await game?.combat?.createEmbeddedDocuments(
            'Combatant',
            createData,
          )) as Array<SwadeCombatant>;
          // If there were preexisting combatants...
          if (existingCombatantTokens.length > 0) {
            // Push them into the combatants array
            for (const t of existingCombatantTokens) {
              const c = game?.combat?.getCombatantByToken(t.id);
              if (c) {
                combatants?.push(c);
              }
            }
          }
          if (combatants) {
            for (const c of combatants) {
              await c.update({
                flags: {
                  swade: {
                    groupId: targetCombatantId,
                    '-=isGroupLeader': null,
                  },
                },
              });
            }
          }
        }
        let suitValue = targetCombatant.suitValue!;
        const followers = game?.combat?.combatants.filter(
          (f) => f.groupId === targetCombatantId,
        );
        if (followers) {
          for (const f of followers) {
            await f.update({
              flags: {
                swade: {
                  cardValue: cardValue,
                  suitValue: (suitValue -= 0.01),
                },
              },
            });
          }
        }
      },
    });

    // Set all combatants with this one's name as its followers.
    newOptions.push({
      name: 'SWADE.GroupByName',
      icon: '<i class="fas fa-users"></i>',
      condition: (li) => {
        const targetCombatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(targetCombatantId)!;
        return (
          !!game.combat!.combatants.find(
            (c) => c.name === combatant.name && c.id !== targetCombatantId,
          ) && game.user!.isGM
        );
      },
      callback: async (li) => {
        const targetCombatantId = li.attr('data-combatant-id') as string;
        const targetCombatant = game.combat?.combatants.get(targetCombatantId, {
          strict: true,
        });
        const matchingCombatants = game.combat?.combatants.filter(
          (c) =>
            c.name === targetCombatant?.name && c.id !== targetCombatant.id,
        );
        if (matchingCombatants && targetCombatant) {
          await targetCombatant.unsetGroupId();
          await targetCombatant.setIsGroupLeader(true);
          for (const c of matchingCombatants) {
            await c?.setGroupId(targetCombatantId);
            await c?.setCardValue(c!.cardValue!);
            await c?.setSuitValue(c!.suitValue! - 0.01);
          }
        }
      },
    });

    // Get group leaders for follow leader options
    const groupLeaders =
      game.combat?.combatants.filter((c) => c.isGroupLeader) ?? [];
    // Enable follow and unfollow if there are group leaders.
    // Loop through leaders
    for (const gl of groupLeaders) {
      // Follow a leader
      newOptions.push({
        name: game.i18n.format('SWADE.Follow', { name: gl.name }),
        icon: '<i class="fas fa-user-friends"></i>',
        condition: (li) => {
          const targetCombatantId = li.attr('data-combatant-id') as string;
          const combatant = game.combat?.combatants.get(targetCombatantId)!;
          return combatant.groupId !== gl.id && targetCombatantId !== gl.id;
        },
        callback: async (li) => {
          const targetCombatantId = li.attr('data-combatant-id') as string;
          const combatant = game.combat?.combatants.get(targetCombatantId)!;

          const groupId = gl.id ?? undefined;
          await gl.setIsGroupLeader(true);
          const fInitiative = getProperty(gl, 'data.initiative');
          const fCardValue = gl.cardValue;
          const fSuitValue = gl.suitValue! - 0.01;
          const fHasJoker = gl.hasJoker;
          // Set groupId of dragged combatant to the selected target's id

          await combatant.update({
            initiative: fInitiative,
            flags: {
              swade: {
                cardValue: fCardValue,
                suitValue: fSuitValue,
                hasJoker: fHasJoker,
                groupId: groupId,
              },
            },
          });
          if (combatant.isGroupLeader) {
            const followers =
              game.combat?.combatants.filter(
                (f) => f.groupId === combatant.id,
              ) ?? [];

            for (const follower of followers) {
              await follower.update({
                initiative: fInitiative,
                flags: {
                  swade: {
                    cardValue: fCardValue,
                    suitValue: fSuitValue,
                    hasJoker: fHasJoker,
                    groupId: groupId,
                  },
                },
              });
            }
            await combatant.unsetIsGroupLeader();
          }
        },
      });

      // Unfollow a leader
      newOptions.push({
        name: game.i18n.format('SWADE.Unfollow', { name: gl.name }),
        icon: '<i class="fas fa-user-friends"></i>',
        condition: (li) => {
          const targetCombatantId = li.attr('data-combatant-id') as string;
          const combatant = game.combat?.combatants.get(targetCombatantId)!;
          return combatant.groupId === gl.id;
        },
        callback: async (li) => {
          const targetCombatantId = li.attr('data-combatant-id') as string;
          const targetCombatant =
            game.combat?.combatants.get(targetCombatantId)!;
          // If the current Combatant is the holding combatant, just remove Hold status.
          await targetCombatant.unsetGroupId();
        },
      });
    }
    options.splice(0, 0, ...newOptions);
  }

  public static async onRenderPlayerList(
    list: any,
    html: JQuery<HTMLElement>,
    options: any,
  ) {
    html.find('.player').each((id, player) => {
      Bennies.append(player, options);
    });
  }

  public static onRenderChatLog(app, html: JQuery<HTMLElement>, data: any) {
    chat.chatListeners(html);
  }

  public static onGetUserContextOptions(
    html: JQuery<HTMLElement>,
    context: ContextMenu.Item[],
  ) {
    const players = html.find('#players');
    if (!players) return;
    context.push(
      {
        name: game.i18n.localize('SWADE.BenniesGive'),
        icon: '<i class="fas fa-plus"></i>',
        condition: (li) =>
          game.user!.isGM && game.users?.get(li[0].dataset.userId!)!.isGM!,
        callback: (li) => {
          const selectedUser = game.users?.get(li[0].dataset.userId!)!;
          selectedUser
            .setFlag(
              'swade',
              'bennies',
              (selectedUser.getFlag('swade', 'bennies') as number) + 1,
            )
            .then(async () => {
              ui.players?.render(true);
              if (game.settings.get('swade', 'notifyBennies')) {
                //In case one GM gives another GM a benny a different message should be displayed
                const givenEvent = selectedUser !== game.user;
                chat.createGmBennyAddMessage(selectedUser, givenEvent);
              }
            });
        },
      },
      {
        name: game.i18n.localize('SWADE.BenniesRefresh'),
        icon: '<i class="fas fa-sync"></i>',
        condition: (li) => game.user!.isGM,
        callback: (li) => {
          game.users?.get(li[0].dataset.userId!)?.refreshBennies();
        },
      },
      {
        name: game.i18n.localize('SWADE.AllBenniesRefresh'),
        icon: '<i class="fas fa-sync"></i>',
        condition: (li) => game.user!.isGM,
        callback: (li) => {
          Bennies.refreshAll();
        },
      },
    );
  }

  public static onGetSceneControlButtons(sceneControlButtons: SceneControl[]) {
    const measure = sceneControlButtons.find((a) => a.name === 'measure')!;
    const newButtons = CONFIG.SWADE.measuredTemplatePresets.map(
      (t) => t.button,
    );
    measure.tools.splice(measure.tools.length - 1, 0, ...newButtons);
  }

  public static async onDropActorSheetData(
    actor: SwadeActor,
    sheet: ActorSheet,
    data: any,
  ) {
    if (data.type === 'Actor' && sheet instanceof SwadeVehicleSheet) {
      const activeTab = getProperty(sheet, '_tabs')[0].active;
      if (activeTab === 'summary') {
        let idToSet = `Actor.${data.id}`;
        if ('pack' in data) {
          idToSet = `Compendium.${data.pack}.${data.id}`;
        }
        await sheet.actor.update({ 'data.driver.id': idToSet });
      }
    }
    //handle race item creation
    if (data.type === 'Item' && !(sheet instanceof SwadeVehicleSheet)) {
      let item: SwadeItem | StoredDocument<SwadeItem>;
      if ('pack' in data) {
        const pack = game.packs.get(data.pack, {
          strict: true,
        }) as CompendiumCollection<ItemMetadata>;
        item = (await pack.getDocument(data.id)) as StoredDocument<SwadeItem>;
      } else if ('actorId' in data) {
        item = new SwadeItem(data.data);
      } else {
        item = game.items!.get(data.id, { strict: true });
      }
      if (item.data.type !== 'ability') return;
      const subType = item.data.data.subtype;
      if (subType === 'special') return;
      //set name from archetype/race
      if (subType === 'race') {
        await actor.update({ 'data.details.species.name': item.name });
      } else if (subType === 'archetype') {
        await actor.update({ 'data.details.archetype': item.name });
      }
      //process embedded documents
      const map = new Map<string, ItemData['_source']>(
        item.getFlag('swade', 'embeddedAbilities') ?? [],
      );
      const creationData = new Array<any>();
      const duplicates = new Array<{ type: string; name: string }>();
      for (const entry of map.values()) {
        const existingItems = actor.items.filter(
          (i) => i.data.type === entry.type && i.name === entry.name,
        );
        if (existingItems.length > 0) {
          duplicates.push({
            type: game.i18n.localize(`ITEM.Type${entry.type.capitalize()}`),
            name: entry.name,
          });
          entry.name += ` (${item.name})`;
        }
        creationData.push(entry);
      }
      if (creationData.length > 0) {
        await actor.createEmbeddedDocuments('Item', creationData, {
          //@ts-expect-error Normally the flag is a boolean
          renderSheet: null,
        });
      }
      if (duplicates.length > 0) {
        new Dialog({
          title: game.i18n.localize('SWADE.Duplicates'),
          content: await renderTemplate(
            '/systems/swade/templates/apps/duplicate-items-dialog.hbs',
            {
              duplicates: duplicates.sort((a, b) =>
                a.type.localeCompare(b.type),
              ),
              bodyText: game.i18n.format('SWADE.DuplicateItemsBodyText', {
                type: game.i18n.localize(SWADE.abilitySheet[subType].dropdown),
                name: item.name,
                target: actor.name,
              }),
            },
          ),
          default: 'ok',
          buttons: {
            ok: {
              label: game.i18n.localize('SWADE.Ok'),
              icon: '<i class="fas fa-check"></i>',
            },
          },
        }).render(true);
      }
      //copy active effects
      const effects = item.effects.map((ae) => ae.data.toObject());
      if (effects.length > 0) {
        await actor.createEmbeddedDocuments('ActiveEffect', effects);
      }
    }
  }

  public static async onRenderCombatantConfig(
    app: CombatantConfig,
    html: JQuery<HTMLElement>,
    options: any,
  ) {
    // resize the element so it'll fit the new stuff
    html.css({ height: 'auto' });

    //remove the old initiative input
    html.find('input[name="initiative"]').parents('div.form-group').remove();

    //grab cards and sort them
    const cardPack = game.packs!.get(game.settings.get('swade', 'cardDeck'), {
      strict: true,
    }) as CompendiumCollection<JournalMetadata>;

    const cards = (await cardPack.getDocuments()).sort((a, b) => {
      const cardA = a.getFlag('swade', 'cardValue');
      const cardB = b.getFlag('swade', 'cardValue');
      const card = cardA - cardB;
      if (card !== 0) return card;
      const suitA = a.getFlag('swade', 'suitValue');
      const suitB = b.getFlag('swade', 'suitValue');
      const suit = suitA - suitB;
      return suit;
    });

    //prep list of cards for selection
    const cardTable = game.tables!.getName(SWADE.init.cardTable, {
      strict: true,
    });

    const cardList: any[] = [];
    for (const card of cards) {
      const cardValue = card.getFlag('swade', 'cardValue') as number;
      const suitValue = card.getFlag('swade', 'suitValue') as number;
      const color =
        suitValue === 2 || suitValue === 3 ? 'color: red;' : 'color: black;';
      const isDealt =
        options.document.getFlag('swade', 'cardValue') === cardValue &&
        options.document.getFlag('swade', 'suitValue') === suitValue;

      const foundCard = cardTable.results.find(
        (r) => r.data['text'] === card.name,
      );
      const isDrawn = foundCard?.data['drawn'];
      const isAvailable = isDrawn ? 'text-decoration: line-through;' : '';

      cardList.push({
        cardValue,
        suitValue,
        isDealt,
        color,
        isAvailable,
        name: card.name,
        cardString: card.data.content,
        isJoker: card.getFlag('swade', 'isJoker'),
      });
    }
    const numberOfJokers = cards.filter((c) =>
      c.getFlag('swade', 'isJoker'),
    ).length;

    //render and inject new HTML
    const path = 'systems/swade/templates/combatant-config-cardlist.hbs';
    $(await renderTemplate(path, { cardList, numberOfJokers })).insertBefore(
      `#combatant-config-${options.document.id} footer`,
    );

    //Attach click event to button which will call the combatant update as we can't easily modify the submit function of the FormApplication
    html.find('footer button').on('click', (ev) => {
      const selectedCard = html.find('input[name=ActionCard]:checked');
      if (selectedCard.length === 0) {
        return;
      }
      const cardValue = selectedCard.data().cardValue as number;
      const suitValue = selectedCard.data().suitValue as number;
      const hasJoker = selectedCard.data().isJoker as boolean;
      const cardString = selectedCard.val() as string;

      game.combat?.combatants
        .get(options.document.id, { strict: true })
        .update({
          initiative: suitValue + cardValue,
          flags: { swade: { cardValue, suitValue, hasJoker, cardString } },
        });
    });
    return false;
  }

  public static onDiceSoNiceInit(dice3d: Dice3D) {
    game.settings.registerMenu('swade', 'dice-config', {
      name: game.i18n.localize('SWADE.DiceConf'),
      label: game.i18n.localize('SWADE.DiceConfLabel'),
      hint: game.i18n.localize('SWADE.DiceConfDesc'),
      icon: 'fas fa-dice',
      type: DiceSettings,
      restricted: false,
    });
  }

  public static onDiceSoNiceReady(dice3d: Dice3D) {
    //@ts-expect-error Load the DiceColors file. This should work fine since the file is only present in the same situation in which the hook is fired
    import('/modules/dice-so-nice/DiceColors.js')
      .then((obj) => {
        SWADE.dsnColorSets = obj.COLORSETS;
        SWADE.dsnTextureList = obj.TEXTURELIST;
      })
      .catch((err) => console.error(err));

    const customWilDieColors =
      game.user!.getFlag('swade', 'dsnCustomWildDieColors') ||
      (getProperty(
        SWADE,
        'diceConfig.flags.dsnCustomWildDieColors.default',
      ) as DsnCustomWildDieColors);

    const customWilDieOptions =
      game.user!.getFlag('swade', 'dsnCustomWildDieOptions') ||
      (getProperty(
        SWADE,
        'diceConfig.flags.dsnCustomWildDieOptions.default',
      ) as DsnCustomWildDieOptions);

    dice3d.addSystem(
      { id: 'swade', name: 'Savage Worlds Adventure Edition' },
      'preferred',
    );

    dice3d.addColorset(
      {
        name: 'customWildDie',
        description: 'DICESONICE.ColorCustom',
        category: 'DICESONICE.Colors',
        foreground: customWilDieColors.labelColor,
        background: customWilDieColors.diceColor,
        outline: customWilDieColors.outlineColor,
        edge: customWilDieColors.edgeColor,
        texture: customWilDieOptions.texture,
        material: customWilDieOptions.material,
        font: customWilDieOptions.font,
      },
      'no',
    );

    const data = {
      type: 'db',
      system: 'swade',
      colorset: 'black',
      labels: [
        game.settings.get('swade', 'bennyImage3DFront'),
        game.settings.get('swade', 'bennyImage3DBack'),
      ].filter(Boolean),
      bumpMaps: [
        game.settings.get('swade', '3dBennyFrontBump'),
        game.settings.get('swade', '3dBennyBackBump'),
      ].filter(Boolean),
    };

    dice3d.addDicePreset(data, 'd2');
  }
}
