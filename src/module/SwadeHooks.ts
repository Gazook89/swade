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
import * as chaseUtils from './chaseUtils';
import * as chat from './chat';
import { SWADE } from './config';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import SwadeCombatant from './documents/SwadeCombatant';
import * as migrations from './migration';
import * as setup from './setup/setupHandler';
import SwadeVehicleSheet from './sheets/SwadeVehicleSheet';
import SwadeCombatTracker from './sidebar/SwadeCombatTracker';

export default class SwadeHooks {
  static onSetup() {
    //localize the protoype modifers
    for (const group of SWADE.prototypeRollGroups) {
      group.name = game.i18n.localize(group.name);
      for (const modifier of group.modifiers) {
        modifier.label = game.i18n.localize(modifier.label);
      }
    }
  }
  public static async onReady() {
    //set up the world if needed
    await setup.setupWorld();

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
      ui.notifications.error('SWADE.SysMigrationWarning', {
        permanent: true,
        localize: true,
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
    const entries = html.find('.document-name');
    const actors: Array<SwadeActor> = app.documents;
    const wildcards = actors.filter(
      (a) => a.isWildcard && a.type === 'character',
    );

    //if the player is not a GM, then don't mark the NPC wildcards
    if (!game.settings.get('swade', 'hideNPCWildcards') || game.user?.isGM) {
      const npcWildcards = actors.filter(
        (a) => a.isWildcard && a.type === 'npc',
      );
      wildcards.push(...npcWildcards);
    }

    for (let i = 0; i < entries.length; i++) {
      const element = entries[i];
      const actorID = element.parentElement?.dataset.documentId;
      const wildcard = wildcards.find((a) => a.id === actorID);

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
    //don't mark if the user is not a GM
    if (game.settings.get('swade', 'hideNPCWildcards') && !game.user?.isGM)
      return;
    //Mark Wildcards in the compendium
    if (app.metadata.type === 'Actor') {
      const content = data.index;
      const ids: string[] = content
        .filter(
          (a) =>
            getProperty(a, 'data.wildcard') && a.name !== '#[CF_tempEntity]',
        )
        .map((actor) => actor._id);

      const found = html.find('.directory-item');
      found.each((i, el) => {
        const id = el.dataset.documentId!;
        if (ids.includes(id)) {
          const name = el.children[1];
          name.children[0].insertAdjacentHTML(
            'afterbegin',
            `<img src="${SWADE.wildCardIcons.compendium}" class="wildcard-icon">`,
          );
        }
      });
    }
  }

  public static onGetCardsDirectoryEntryContext(
    html: JQuery,
    options: ContextMenu.Item[],
  ) {
    const actionCardEditor: ContextMenu.Item = {
      name: 'SWADE.OpenACEditor',
      icon: '<i class="fas fa-edit"></i>',
      condition: (li) => {
        //return early if there's no canvas or scene to lay out cards
        if (!canvas || !canvas.ready || !canvas.scene) return false;
        const deck = game.cards!.get(li.data('documentId'), { strict: true });
        return (
          deck.type === 'deck' &&
          deck.cards.contents.every((c) => c.data.type === 'poker') &&
          deck.isOwner
        );
      },
      callback: async (li) => {
        const deck = game.cards!.get(li.data('documentId'), { strict: true });
        new ActionCardEditor(deck).render(true);
      },
    };
    const chaseLayout: ContextMenu.Item = {
      name: 'SWADE.LayOutChaseWithDeck',
      icon: '<i class="fas fa-shipping-fast"></i>',
      condition: (li) => {
        const cards = game.cards!.get(li.data('documentId'), { strict: true });
        return cards.type === 'deck';
      },
      callback: (li) => {
        const deck = game.cards!.get(li.data('documentId'), { strict: true });
        chaseUtils.layoutChase(deck);
      },
    };
    options.push(actionCardEditor, chaseLayout);
  }

  public static onGetCompendiumDirectoryEntryContext(
    html: JQuery<HTMLElement>,
    options: ContextMenu.Item[],
  ) {
    options.push({
      name: 'SWADE.ConvertToDeck',
      icon: '<i class="fas fa-file-export"></i>',
      condition: (li) => {
        const pack = game.packs.get(li.data('pack'), { strict: true });
        return pack.metadata.type === 'JournalEntry';
      },
      callback: async (li) => {
        const pack = game.packs.get(li.data('pack'), {
          strict: true,
        }) as CompendiumCollection<JournalMetadata>;
        const docs = await pack.getDocuments();
        const allDocsHaveCardFlags = docs.every((c) =>
          hasProperty(c, 'data.flags.swade'),
        );
        if (!allDocsHaveCardFlags) {
          return ui.notifications.warn('SWADE.NotADeckCompendium', {
            localize: true,
          });
        }

        const suits = ['', 'clubs', 'diamonds', 'hearts', 'spades'];
        //get the vital information from the journal entry
        const cards = docs.map((entry) => {
          return {
            name: entry.name,
            text: entry.data.content,
            img: entry.data.img,
            suit: entry.getFlag('swade', 'suitValue') as number,
            value: entry.getFlag('swade', 'cardValue') as number,
          };
        });
        //create the empty deck
        const deck = await Cards.create({
          name: pack.metadata.label,
          type: 'deck',
        });
        //map the journal entry data to the raw card data
        const rawCardData = cards.map((card) => {
          return {
            name: card.name,
            type: 'poker',
            suit: suits[card.suit],
            value: card.value,
            description: card.text,
            faces: [
              {
                img: card.img,
                name: card.name,
              },
            ],
            face: 0,
            origin: deck?.id,
            sort: card.suit * 13 + card.value,
            data: {
              suit: card.suit,
              isJoker: card.value > 90,
            },
          };
        });
        //create the cards in the deck
        deck?.createEmbeddedDocuments('Card', rawCardData);
        //open the sheet once we're done
        deck?.sheet?.render(true);
      },
    });
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

  /** Add roll data to the message for formatting of dice pools*/
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

  /** Add benny management to the player list */
  public static async onRenderPlayerList(
    list: PlayerList,
    html: JQuery<HTMLElement>,
    options: any,
  ) {
    html.find('.player').each((id, player) => {
      Bennies.append(player, options);
    });
  }

  public static onRenderChatLog(
    app: ChatLog,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
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
    //get the measured template tools
    const measure = sceneControlButtons.find((a) => a.name === 'measure')!;
    //add buttons
    const newTemplateButtons = SWADE.measuredTemplatePresets.map(
      (t) => t.button,
    );
    measure.tools.splice(measure.tools.length - 1, 0, ...newTemplateButtons);

    //get the tile tools
    const tile = sceneControlButtons.find((a) => a.name === 'tiles')!;
    //added the button to clear chase cards
    tile.tools.push({
      name: 'clear-chase-cards',
      title: 'SWADE.ClearChaseCards',
      icon: 'fas fa-shipping-fast',
      onClick: () => chaseUtils.removeChaseTiles(canvas.scene!),
    });
  }

  public static async onDropActorSheetData(
    actor: SwadeActor,
    sheet: ActorSheet,
    data: any,
  ) {
    const sheetIsVehicleSheet = sheet instanceof SwadeVehicleSheet;

    if (data.type === 'Actor' && sheetIsVehicleSheet) {
      const activeTab = getProperty(sheet, '_tabs')[0].active;
      if (activeTab === 'summary') {
        let idToSet = `Actor.${data.id}`;
        if (data.pack) {
          idToSet = `Compendium.${data.pack}.${data.id}`;
        }
        await sheet.actor.update({ 'data.driver.id': idToSet });
      }
    }
    //handle race item creation
    const isNewItemDrop = data.type === 'Item' && !data.data;
    if (isNewItemDrop && !sheetIsVehicleSheet) {
      let item: SwadeItem | StoredDocument<SwadeItem>;
      //retrieve the item
      if (data.pack) {
        const pack = game.packs.get(data.pack, {
          strict: true,
        }) as CompendiumCollection<ItemMetadata>;
        item = (await pack.getDocument(data.id)) as StoredDocument<SwadeItem>;
      } else if (data.actorId) {
        item = new SwadeItem(data.data);
      } else {
        item = game.items!.get(data.id, { strict: true });
      }
      //check if it's the proper type and subtype
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
    const actionDeckID = game.settings.get('swade', 'actionDeck');
    const deck = game.cards!.get(actionDeckID, { strict: true });

    const cards = Array.from(deck.cards.values()).sort((a, b) => {
      const cardA = a.data.value!;
      const cardB = b.data.value!;
      const card = cardA - cardB;
      if (card !== 0) return card;
      const suitA = a.data.data['suit'];
      const suitB = b.data.data['suit'];
      const suit = suitA - suitB;
      return suit;
    });

    //prep list of cards for selection

    const cardList = new Array<any>();
    for (const card of cards) {
      const cardValue = card.data.value!;
      const suitValue = card.data.data['suit'];
      const color =
        suitValue === 2 || suitValue === 3 ? 'color: red;' : 'color: black;';
      const isDealt =
        options.document.cardValue === cardValue &&
        options.document.suitValue === suitValue;

      const isAvailable = card?.data.drawn
        ? 'text-decoration: line-through;'
        : '';

      cardList.push({
        id: card.id,
        isDealt,
        color,
        isAvailable,
        name: card.name,
        cardString: card.data.description,
        isJoker: card.data.data['isJoker'],
      });
    }
    const numberOfJokers = cards.filter(
      (card) => card.data.data['isJoker'],
    ).length;

    //render and inject new HTML
    const path = 'systems/swade/templates/combatant-config-cardlist.hbs';
    $(await renderTemplate(path, { cardList, numberOfJokers })).insertBefore(
      `#combatant-config-${options.document.id} footer`,
    );

    //pull the combatant from the Config Object
    const combatant = app.object;
    const combat = combatant.parent;

    //Attach click event to button which will call the combatant update as we can't easily modify the submit function of the FormApplication
    html.find('footer button').on('click', async (ev) => {
      const selectedCard = html.find('input[name=action-card]:checked');
      if (selectedCard.length === 0) {
        return;
      }

      const cardId = selectedCard.data().cardId as string;
      const card = deck.cards.get(cardId, { strict: true });

      const cardValue = card.data.value as number;
      const suitValue = card.data.data['suit'] as number;
      const hasJoker = card.data.data['isJoker'] as boolean;
      const cardString = card.data.description;

      //move the card to the discard pile
      const discardPileId = game.settings.get('swade', 'actionDeckDiscardPile');
      const discardPile = game.cards!.get(discardPileId, { strict: true });
      await card.discard(discardPile, { chatNotification: false });

      //update the combatant with the new card
      const updates = new Array<Record<string, unknown>>();
      updates.push({
        _id: combatant.id,
        initiative: suitValue + cardValue,
        'flags.swade': { cardValue, suitValue, hasJoker, cardString },
      });

      //update followers, if applicable
      if (combatant.isGroupLeader) {
        const followers =
          combat?.combatants.filter((f) => f.groupId === combatant.id) ?? [];
        for (const follower of followers) {
          updates.push({
            _id: follower.id,
            initiative: suitValue + cardValue,
            'flags.swade': {
              cardString,
              cardValue,
              hasJoker,
              suitValue: suitValue - 0.001,
            },
          });
        }
      }
      await combat?.updateEmbeddedDocuments('Combatant', updates);
    });
  }

  public static onRenderActiveEffectConfig(
    app: ActiveEffectConfig,
    html: JQuery<HTMLElement>,
    data,
  ) {
    const expiration = app.document.getFlag('swade', 'expiration');
    const loseTurnOnHold = app.document.getFlag('swade', 'loseTurnOnHold');
    const createOption = (
      exp: ValueOf<typeof SWADE.CONST.STATUS_EFFECT_EXPIRATION> | undefined,
      label: string,
    ) => {
      return `<option value="${exp}" ${
        exp === expiration ? 'selected' : ''
      }>${label}</option>`;
    };
    const expirationOpt = [
      createOption(undefined, game.i18n.localize('SWADE.Expiration.None')),
      createOption(
        SWADE.CONST.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto,
        game.i18n.localize('SWADE.Expiration.BeginAuto'),
      ),
      createOption(
        SWADE.CONST.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
        game.i18n.localize('SWADE.Expiration.BeginPrompt'),
      ),
      createOption(
        SWADE.CONST.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
        game.i18n.localize('SWADE.Expiration.EndAuto'),
      ),
      createOption(
        SWADE.CONST.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
        game.i18n.localize('SWADE.Expiration.EndPrompt'),
      ),
    ];
    const tab = `
    <a class="item" data-tab="expiration">
      <i class="fas fa-step-forward"></i> ${game.i18n.localize(
        'SWADE.Expiration.TabLabel',
      )}
    </a>`;
    const section = `
    <section class="tab" data-tab="expiration">
    ${game.i18n.localize('SWADE.Expiration.Description')}
    <div class="form-group">
      <label>${game.i18n.localize('SWADE.Expiration.Behavior')}</label>
      <div class="form-fields">
        <select name="flags.swade.expiration" data-dtype="Number">
          ${expirationOpt.join('\n')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize('SWADE.Expiration.LooseTurnOnHold')}</label>
      <div class="form-fields">
        <input type="checkbox" name="flags.swade.loseTurnOnHold"
        data-dtype="Boolean" ${loseTurnOnHold ? 'checked' : ''}>
      </div>
    </div>
  </section>`;

    html.find('nav.sheet-tabs a[data-tab="duration"]').after(tab);
    html.find('section[data-tab="duration"]').after(section);
  }

  /** This hook only really exists to stop Races from being added to the actor as an item */
  public static onPreCreateItem(
    item: SwadeItem,
    options: object,
    userId: string,
  ) {
    if (item.parent && item.data.type === 'ability') {
      const subType = item.data.data.subtype;
      if (subType === 'race' || subType === 'archetype') return false; //return early if we're doing race stuff
    }
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
    import(foundry.utils.getRoute('/modules/dice-so-nice/DiceColors.js'))
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
