/* eslint-disable @typescript-eslint/no-unused-vars */
import { SysItemData } from '../interfaces/item-data';
import Bennies from './bennies';
import * as chat from './chat';
import { SWADE } from './config';
import DiceSettings from './DiceSettings';
import SwadeActor from './entities/SwadeActor';
import SwadeItem from './entities/SwadeItem';
import SwadeTemplate from './entities/SwadeTemplate';
import { TemplatePreset } from './enums/TemplatePresetEnum';
import * as migrations from './migration';
import { SwadeSetup } from './setup/setupHandler';
import SwadeVehicleSheet from './sheets/SwadeVehicleSheet';
import { createActionCardTable } from './util';

export default class SwadeHooks {
  public static onSetup() {
    // Do anything after initialization but before ready
    // Localize CONFIG objects once up-front
    const toLocalize = [];
    for (const o of toLocalize) {
      SWADE[o] = Object.entries(SWADE[o]).reduce((obj, e: any) => {
        obj[e[0]] = game.i18n.localize(e[1]);
        return obj;
      }, {});
    }
  }

  public static async onReady() {
    const packChoices = {};
    game.packs
      //FIXME once new definitions come along
      //@ts-ignore
      .filter((p) => p.documentClass.documentName === 'JournalEntry')
      .forEach((p) => {
        packChoices[
          p.collection
        ] = `${p.metadata.label} (${p.metadata.package})`;
      });

    game.settings.register('swade', 'cardDeck', {
      name: 'Card Deck to use for Initiative',
      scope: 'world',
      type: String,
      config: true,
      default: SWADE.init.defaultCardCompendium,
      choices: packChoices,
      onChange: async (choice: string) => {
        console.log(
          `Repopulating action cards Table with cards from deck ${choice}`,
        );
        await createActionCardTable(true, choice);
        ui.notifications.info('Table re-population complete');
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
          diceColor: game.user['color'],
          outlineColor: game.user['color'],
          edgeColor: game.user['color'],
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
    if (!game.user.isGM) return;
    const currentVersion = game.settings.get(
      'swade',
      'systemMigrationVersion',
    ) as string;
    //TODO Adjust this version every time a migration needs to be triggered
    const NEEDS_MIGRATION_VERSION = '0.18.0';
    //Minimal compativle version needed for the migration
    const COMPATIBLE_MIGRATION_VERSION = '0.15.0';
    //If the needed migration version is newer than the old migration version then migrate the world
    const needsMigration =
      currentVersion && isNewerVersion(NEEDS_MIGRATION_VERSION, currentVersion);
    if (!needsMigration) return;

    // Perform the migration

    if (
      currentVersion &&
      isNewerVersion(COMPATIBLE_MIGRATION_VERSION, currentVersion)
    ) {
      ui.notifications.error(game.i18n.localize('SWADE.SysMigrationWarning'), {
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

    let wildcards = app.entities.filter(
      (a: SwadeActor) => a.isWildcard && a.hasPlayerOwner,
    ) as SwadeActor[];

    //if the player is not a GM, then don't mark the NPC wildcards
    if (!game.settings.get('swade', 'hideNPCWildcards') || game.user.isGM) {
      const npcWildcards = app.entities.filter(
        (a: SwadeActor) => a.isWildcard && !a.hasPlayerOwner,
      ) as SwadeActor[];
      wildcards = wildcards.concat(npcWildcards);
    }

    for (let i = 0; i < found.length; i++) {
      const element = found[i];
      const enitityId = element.parentElement.dataset.entityId;
      const wildcard = wildcards.find((a) => a.id === enitityId);

      if (wildcard) {
        element.innerHTML = `
					<a><img src="${SWADE.wildCardIcons.regular}" class="wildcard-icon">${wildcard.data.name}</a>
					`;
      }
    }
  }

  public static async onRenderCompendium(
    app: Compendium,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
    //Mark Wildcards in the compendium
    if (app.entity === 'Actor') {
      const content = await app.getContent();
      const wildcards = content.filter(
        (entity: SwadeActor) => entity.isWildcard,
      );
      const ids: string[] = wildcards.map((e) => e._id);

      const found = html.find('.directory-item');
      found.each((i, el) => {
        const entryId = el.dataset.entryId;
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

  //TODO remove later
  public static onUpdateActor(
    actor: SwadeActor,
    updateData: any,
    options: any,
    userId: string,
  ) {
    if (actor.data.type === 'npc') {
      ui.actors.render();
    }
    // Update the player list to display new bennies values
    if (hasProperty(updateData, 'data.bennies') && actor.hasPlayerOwner) {
      ui.players.render(true);
    }
  }

  public static onRenderCombatTracker(
    app: CombatTracker,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
    const currentCombat: Combat =
      data.combats[data.currentIndex - 1] || data.combat;
    html.find('.combatant').each((i, el) => {
      const combId = el.getAttribute('data-combatant-id');
      //@ts-ignore
      const combatant = currentCombat.combatants.find((c) => c.id == combId);
      const initdiv = el.getElementsByClassName('token-initiative');
      if (combatant.initiative && combatant.initiative !== 0) {
        //@ts-ignore
        const cardString = combatant.getFlag('swade', 'cardString') as string;
        initdiv[0].innerHTML = `<span class="initiative">${cardString}</span>`;
      } else if (!game.user.isGM) {
        initdiv[0].innerHTML = '';
      }
    });
  }

  public static async onUpdateCombatant(
    combatant: any,
    updateData: any,
    options: any,
    userId: string,
  ) {
    // Return early if we are NOT a GM OR we are not the player that triggered the update AND that player IS a GM
    const user = game.users.get(userId);
    if (!game.user.isGM || (game.userId !== userId && user.isGM)) return;

    //return early if there's no flag updates
    if (!getProperty(updateData, 'flags.swade')) return;

    const jokersWild = game.settings.get('swade', 'jokersWild');

    if (jokersWild && combatant.getFlag('swade', 'hasJoker')) {
      const template = await renderTemplate(SWADE.bennies.templates.joker, {
        speaker: game.user,
      });
      const isCombHostile =
        combatant.token.data.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;

      //Give bennies to PCs
      if (combatant.actor.type === 'character') {
        await ChatMessage.create({ user: game.user, content: template });
        //filter combatants for PCs and give them bennies
        const combatants = game.combat.combatants.filter(
          (c) => c.actor.data.type === 'character',
        );
        for (const combatant of combatants) {
          const actor = (combatant.actor as unknown) as SwadeActor;
          await actor.getBenny();
        }
      } else if (combatant.actor.type === 'npc' && isCombHostile) {
        await ChatMessage.create({ user: game.user, content: template });
        //give all GMs a benny
        const gmUsers = game.users.filter((u) => u.active && u.isGM);
        for (const gm of gmUsers) {
          const currBennies = (gm.getFlag('swade', 'bennies') as number) || 0;
          await gm.setFlag('swade', 'bennies', currBennies + 1);
          await chat.createGmBennyAddMessage(gm, true);
        }

        //give all enemy wildcards a benny
        const enemyWCs = game.combat.combatants.filter((c) => {
          const a = (c.actor as unknown) as SwadeActor;
          const hostile =
            //FIXME once the new definitions come along
            //@ts-ignore
            c.token.data.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
          return a.data.type === 'npc' && hostile && a.isWildcard;
        });
        for (const enemy of enemyWCs) {
          const a = (enemy.actor as unknown) as SwadeActor;
          await a.getBenny();
        }
      }
    }
  }

  public static async onRenderChatMessage(
    message: ChatMessage,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
    if (message.isRoll && message.isContentVisible) {
      //FIXME once new definitions come along
      await chat.formatRoll(message, html, data);
    }

    chat.hideChatActionButtons(message, html, data);
  }

  public static onGetChatLogEntryContext(
    html: JQuery<HTMLElement>,
    options: any[],
  ) {
    const canApply = (li: JQuery<HTMLElement>) => {
      const message = game.messages.get(li.data('messageId'));
      const actor = ChatMessage.getSpeakerActor(message.data['speaker']);
      const isRightMessageType =
        message?.isRoll &&
        message?.isContentVisible &&
        !message.getFlag('core', 'RollTable');
      return isRightMessageType && !!actor && (game.user.isGM || actor.owner);
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

  public static onGetCombatTrackerEntryContext(
    html: JQuery<HTMLElement>,
    options: any[],
  ) {
    const index = options.findIndex((v) => v.name === 'COMBAT.CombatantReroll');
    if (index !== -1) {
      options[index].name = 'SWADE.Redraw';
      options[index].icon = '<i class="fas fa-sync-alt"></i>';
    }
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
    context: any[],
  ) {
    const players = html.find('#players');
    if (!players) return;
    context.push(
      {
        name: game.i18n.localize('SWADE.BenniesGive'),
        icon: '<i class="fas fa-plus"></i>',
        condition: (li) =>
          game.user.isGM && game.users.get(li[0].dataset.userId).isGM,
        callback: (li) => {
          const selectedUser = game.users.get(li[0].dataset.userId);
          selectedUser
            .setFlag(
              'swade',
              'bennies',
              (selectedUser.getFlag('swade', 'bennies') as number) + 1,
            )
            .then(async () => {
              ui['players'].render(true);
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
        condition: (li) => game.user.isGM,
        callback: (li) => {
          const user = game.users.get(li[0].dataset.userId);
          Bennies.refresh(user);
        },
      },
      {
        name: game.i18n.localize('SWADE.AllBenniesRefresh'),
        icon: '<i class="fas fa-sync"></i>',
        condition: (li) => game.user.isGM,
        callback: (li) => {
          Bennies.refreshAll();
        },
      },
    );
  }

  public static onGetSceneControlButtons(sceneControlButtons: any[]) {
    const measure = sceneControlButtons.find((a) => a.name === 'measure');
    let template: SwadeTemplate = null;
    const newButtons = [
      {
        name: 'swcone',
        title: 'SWADE.Cone',
        icon: 'cone far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          if (template) template.destroy();
          template = SwadeTemplate.fromPreset(TemplatePreset.CONE);
          if (template) template.drawPreview();
        },
      },
      {
        name: 'sbt',
        title: 'SWADE.SBT',
        icon: 'sbt far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          if (template) template.destroy();
          template = SwadeTemplate.fromPreset(TemplatePreset.SBT);
          if (template) template.drawPreview();
        },
      },
      {
        name: 'mbt',
        title: 'SWADE.MBT',
        icon: 'mbt far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          if (template) template.destroy();
          template = SwadeTemplate.fromPreset(TemplatePreset.MBT);
          if (template) template.drawPreview();
        },
      },
      {
        name: 'lbt',
        title: 'SWADE.LBT',
        icon: 'lbt far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          if (template) template.destroy();
          template = SwadeTemplate.fromPreset(TemplatePreset.LBT);
          if (template) template.drawPreview();
        },
      },
    ];
    measure.tools.splice(measure.tools.length - 1, 0, ...newButtons);
  }

  public static async onDropActorSheetData(
    actor: Actor,
    sheet: ActorSheet,
    data: any,
  ) {
    if (data.type === 'Actor' && actor.data.type === 'vehicle') {
      const vehicleSheet = sheet as SwadeVehicleSheet;
      const activeTab = getProperty(vehicleSheet, '_tabs')[0].active;
      if (activeTab === 'summary') {
        let idToSet = `Actor.${data.id}`;
        if ('pack' in data) {
          idToSet = `Compendium.${data.pack}.${data.id}`;
        }
        sheet.actor.update({ 'data.driver.id': idToSet });
      }
      return false;
    }
    //handle race item creation
    if (data.type === 'Item' && !(sheet instanceof SwadeVehicleSheet)) {
      let item: SwadeItem;
      if ('pack' in data) {
        const pack = game.packs.get(data.pack);
        item = (await pack.getEntity(data.id)) as SwadeItem;
      } else if ('actorId' in data) {
        item = new SwadeItem(data.data, {});
      } else {
        item = game.items.get(data.id) as SwadeItem;
      }
      const isRightItemTypeAndSubtype =
        item.data.type === 'ability' && item.data.data.subtype === 'race';
      if (!isRightItemTypeAndSubtype) return false;

      //set name
      await actor.update({ 'data.details.species.name': item.name });
      //process embedded entities
      const map = new Map<string, SysItemData>(
        (item.getFlag('swade', 'embeddedAbilities') as [
          string,
          SysItemData,
        ][]) || [],
      );
      const creationData = [];
      for (const entry of map.values()) {
        //if the item isn't a skill, then push it to the new items
        if (entry.type !== 'skill') {
          creationData.push(entry);
        } else {
          //else, check if there's already a skill like that that exists
          const skill = actor.items.find(
            (i) => i.type === 'skill' && i.name === entry.name,
          );
          if (skill) {
            //if the skill exists, set it to the value of the skill from the item
            const skillDie = getProperty(entry, 'data.die') as any;
            await actor.updateOwnedItem({
              _id: skill.id,
              data: { die: skillDie },
            });
          } else {
            //else, add it to the new items
            creationData.push(entry);
          }
        }
      }
      if (creationData.length > 0) {
        await actor.createOwnedItem(creationData, { renderSheet: null });
      }

      //copy active effects
      const effects = item.effects.map((ae) => ae.data) as any;
      if (!!effects && effects.length > 0) {
        await actor.createEmbeddedEntity('ActiveEffect', effects);
      }
    }
  }

  public static async onRenderCombatantConfig(
    app: FormApplication,
    html: JQuery<HTMLElement>,
    options: any,
  ) {
    // resize the element so it'll fit the new stuff
    html.css({ height: 'auto' });

    //remove the old initiative input
    html.find('input[name="initiative"]').parents('div.form-group').remove();

    //grab cards and sort them
    const cardPack = game.packs.get(
      game.settings.get('swade', 'cardDeck') as string,
    ) as Compendium;
    const cards = (await cardPack.getContent()).sort(
      (a: JournalEntry, b: JournalEntry) => {
        const cardA = a.getFlag('swade', 'cardValue') as number;
        const cardB = b.getFlag('swade', 'cardValue') as number;
        const card = cardA - cardB;
        if (card !== 0) return card;
        const suitA = a.getFlag('swade', 'suitValue') as number;
        const suitB = b.getFlag('swade', 'suitValue') as number;
        const suit = suitA - suitB;
        return suit;
      },
    ) as JournalEntry[];

    //prep list of cards for selection
    const cardTable = game.tables.getName(SWADE.init.cardTable);

    const cardList = [];
    for (const card of cards) {
      const cardValue = card.getFlag('swade', 'cardValue') as number;
      const suitValue = card.getFlag('swade', 'suitValue') as number;
      const color =
        suitValue === 2 || suitValue === 3 ? 'color: red;' : 'color: black;';
      const isDealt =
        options.document.data.flags.swade &&
        options.document.getFlag('swade', 'cardValue') === cardValue &&
        options.document.getFlag('swade', 'suitValue') === suitValue;
      const isAvailable = cardTable.results.find(
        //FIXME once new definitions come along
        //@ts-ignore
        (r) => r.data.text === card.name,
      ).drawn
        ? 'text-decoration: line-through;'
        : '';

      cardList.push({
        cardValue,
        suitValue,
        isDealt,
        color,
        isAvailable,
        name: card.name,
        cardString: getProperty(card, 'data.content'),
        isJoker: card.getFlag('swade', 'isJoker'),
      });
    }
    const numberOfJokers = cards.filter((c) => c.getFlag('swade', 'isJoker'))
      .length;

    //render and inject new HTML
    const path = 'systems/swade/templates/combatant-config-cardlist.html';
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
      const cardString = selectedCard.val() as String;
      game.combat.updateEmbeddedEntity('Combatant', {
        _id: options.document.id,
        initiative: suitValue + cardValue,
        flags: { swade: { cardValue, suitValue, hasJoker, cardString } },
      });
    });
    return false;
  }

  public static onDiceSoNiceInit(dice3d: any) {
    game.settings.registerMenu('swade', 'dice-config', {
      name: game.i18n.localize('SWADE.DiceConf'),
      label: game.i18n.localize('SWADE.DiceConfLabel'),
      hint: game.i18n.localize('SWADE.DiceConfDesc'),
      icon: 'fas fa-dice',
      type: DiceSettings,
      restricted: false,
    });
  }

  public static onDiceSoNiceReady(dice3d: any) {
    //@ts-expect-error Load the DiceColors file. This should work fine since the file is only present in the same situation in which the hook is fired
    import('/modules/dice-so-nice/DiceColors.js')
      .then((obj) => {
        SWADE.dsnColorSets = obj.COLORSETS;
        SWADE.dsnTextureList = obj.TEXTURELIST;
      })
      .catch((err) => console.error(err));

    const customWilDieColors =
      game.user.getFlag('swade', 'dsnCustomWildDieColors') ||
      getProperty(SWADE, 'diceConfig.flags.dsnCustomWildDieColors.default');

    const customWilDieOptions =
      game.user.getFlag('swade', 'dsnCustomWildDieOptions') ||
      getProperty(SWADE, 'diceConfig.flags.dsnCustomWildDieOptions.default');

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

    dice3d.addDicePreset(
      {
        type: 'db',
        labels: [SWADE.bennies.textures.front, SWADE.bennies.textures.back],
        system: 'standard',
        colorset: 'black',
      },
      'd2',
    );
  }
}
