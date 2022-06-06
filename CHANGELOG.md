# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/)

<!--
## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

### Known Issues
-->

## v1.1.6

### Fixed

- Fixed overeager benny distribution in case of dealing a joker (#534)

## v1.1.5

### Added

- Added `SwadeCombatant.handOutBennies()` function which deals out bennies in case of Joker's wild, if applicable. This function is automatically called when dealing action cards.

### Changed

- Changed the way action card dealing is handled in the codebase, drastically reducing the number of update calls. This should make the whole process snappier.

## v1.1.4

### Added

- Added the number of the advance to the list of advances. (#524)
- Added more clear styling to advance planning toggle (#525)
- Added additional translation keys

## v1.1.3

### Removed

- Removed some unnecessary in the character sheet styles. This is a necessary step towards fixing the setting-specific character sheets

## v1.1.2

### Added

- Added proper symbol for Strength 1 on the character sheet
- Added some hover styles to the attribute dropdown on the character sheet

### Fixed

- Fixed duplicate messages when a gamemaster gets a Benny
- Fixed equip toggle accidentally showing up for all gear items, even if they're not equippable

## v1.1.1

### Fixed

- Fixed a small bug that would prevent automatic creation of an action deck in a world

## v1.1.0

### Added

- Added default duration of 10 rounds to Berserk status effect template.
- Added End of Turn prompt expiration to Berserk status effect template.
- Added Start of Turn auto expiration to Defending status effect template.
- Added `CONFIG.SWADE.CONST` object which will contain constants and enums
- Numerical inputs on the character sheet now accept delta inputs such as `-20` and will save the calculated value.
- _Bound_ and _Entangled_ now also apply all other conditions as described in the rules.
- Added some informative links to system documentation links to the settings tab, under the system version.
- Added the ability to favorite the following item types, as well as Active Effects:
  - Edges
  - Hindrances
  - Special Abilities
  - Powers
  - Weapons
  - Armor
  - Shields
  - Gear
- Added `SwadeActor#rollWealthDie()` function.
- Added the currency controls on NPC sheet.
- Powers can now record an AP value.
- Added new Keybindings, all of which are editable.
  - You can now select a favorite card hand in the user config and open it with the `H` keybinding.
  - You can now spend a Benny by pressing `B` and receive a Benny by pressing `Alt+B`.
- Added new expanded Advancement tracking. In the new Advancement tab you can add advances which are counted up and displayed in the header. Advances are also used to calculate the rank. Each advance can be set to be planned, in which case it won't be used to calculate the rank. Planned Advances are shown in the list with faded colors. To delete or edit and advance you can use the buttons on the right side, similar to how the inventory works.
  - This new system is on by default. If you want to switch back to the legacy way of recording advances you can do so in the actor tweaks
  - All actors have the new Expanded advances activated, though only the Official Sheet for player characters currently supports this.
- Active Effects now record the world time (`game.time.worldTime`) as their start time on creation.
- Added additional translation strings

### Changed

- Changed the way the system is delivered. The system is now bundled as a singular JS file, reducing the number of JS files from 44 to 1. In addition to that we're now delivering sourcemaps which should help with troubleshooting. For more information please visit [ticket #464] (https://gitlab.com/peginc/swade/-/issues/464). All in all this should not have any noticeable drawbacks for end users and should slightly increase the responsiveness of the system on world load.
- Changed the way the Quick Access behaves. Instead of automatically displaying all equipped items it now only displays favored items. See `Added` for the list of document types that can be favored. Status Effects are automatically shown in the Quick Access.
- The inputs for the Crew and Passengers on Vehicles now are now saved as numbers instead of strings.
- Split up the About tab into subsections: `Advances`,`Background` and `Notes`. The `Background` subsection now contains the biography, along some additional fields for character appearance and goals.
- Changed the way the skill dice look in the skill list.
- Changed the name of the Discard Pile that is created by default by the system to make the name more clear.
- Changed the way disabled inputs look on the character sheet to make them more distinctive.
- The system now overrides the builtin card presets instead of removing them.
- Changed the sheet header on the character sheet. Now you can look at your character portrait everywhere. Please keep in mind that this may break the other official character sheets slightly.

### Deprecated

- Started deprecation of `game.swade.SwadeEntityTweaks`. The class has been moved to `game.swade.apps.SwadeDocumentTweaks` and the old accessor will be removed with v1.2.0.
- Started deprecation of `ArmorLocation` enum. This enum has been moved to `CONFIG.SWADE.CONST.ARMOR_LOCATIONS` and the old enum will be removed with v1.2.0.
- Started deprecation of `TemplatePreset` enum. This enum has been moved to `CONFIG.SWADE.CONST.TEMPLATE_PRESET` and the old enum will be removed with v1.2.0.
- Started deprecation of `StatusEffectExpiration` enum. This enum has been moved to `CONFIG.SWADE.CONST.STATUS_EFFECT_EXPIRATION` and the old enum will be removed with v1.2.0.

### Removed

- Removed the Basic Action Cards compendium. Please be aware that only the compendium is removed. The image files for existing decks are still in the system assets.

### Fixed

- Fixed the longstanding issue of pressing enter on the character sheet would trigger the first button in the sheet's DOM.
- Tabs on the character sheet should now retain their scroll position again.
- Users can no longer create initiative groups with combatants they can not edit in the combat tracker.
- Fixed a stylesheet issue that would cause lists not to render properly in edge/hindrance/ability descriptions.
- Fixed a potential issue which could allow the action deck to run out of cards when multiple cards are drawn but none selected. If a joker has been drawn but no card was selected then the joker is automatically picked.
- Fixed a potential issue where no new combat rounds would be started if multiple GMs are logged in.

## v1.0.10

### Removed

- Removed the option to automatically link Wildcard actors

## v1.0.9

### Added

- Added `canBeArcaneDevice` getter to `SwadeItem` class

### Fixed

- Fixed an issue that would prevent Racial/Archetype abilities from being removable from a sheet
- Fixed incorrect translation strings on NPC sheet

## v1.0.8

### Fixed

- Fixed an issue that would cause actor imports to fail. (This time for real, fingers crossed)

## v1.0.7

### Fixed

- Fixed an issue that would cause actor imports to fail

## v1.0.6

### Added

- Added additional translation strings

### Changed

- Renamed `dealForInitative` to `dealForInitiative`. The old function will still be available until v1.1

### Fixed

- Fixed abbreviation for PP in german translation
- The autolink Wildcards setting should now only apply to NPCs again
- Fixed a few spelling mistakes in code comments

## v1.0.5

### Fixed

- Fixed an issue where Active Effects changes wouldn't be applied to an Item if the attribute key contained a non-alphanumerical character
- Fixed an issue where Active Effects changes wouldn't be applied to an Item if the name of the target item contained period
- Damned Regular Expressions

## v1.0.4

### Added

- Added Actor and Item sheet classes to the global `game.swade.sheets` object,
- Added Tweaks application class to the global `game.swade.apps` object
- Added AE changes to Berserk status effect

### Changed

- The system will no longer force vision on on all newly created actors.. If you want to keep similar functionality I suggest using the default token settings in Foundry Core settings

### Fixed

- Fixed a bug which would cause Wildcards to only be marked as such on the sidebar if the actor had at least 1 player owner
- Restored the ability for gear, edges and hindrances to be sorted on the character sheet
- Giving a combatant a new card via the Combatant Config now properly applies the new card to all followers as well
- Fixed a bug that causes Active Effect sheets to have multiple expiration tabs if multiple sheets were opened simultaneously

## v1.0.3

### Changed

- Action Decks created by the system setup function are now automatically shuffled after creation

### Fixed

- Wildcards no longer require a user with owner permissions to display their status in the actor directory

## v1.0.3

### Added

- Added `SwadeActor#toggleActiveEffect` which has the same interface as `TokenDocument#toggleActiveEffect` and behaves roughly the same. When toggling an effect on a linked actor, the effect is applied to all tokens of the actor in the scene.

### Changed

- Changed warning that displays when not enough cards are available to draw initiative. It should be more informative now.
- Renamed Expiration tab to Turn Behavior and added description explaining when the Active Effect ends. (thanks to Kristian Serrano)

### Fixed

- Fixed a bug where status effects were accidentally added to all tokens with the same base actor, even if the token actor was not linked
- Fixed a bug that prevented Player Character actors from being automatically linked on creation. In addition to that, the creation now also respects the automatic wildcard linking setting. Imported actors retain whatever config they have in the compendium
- Wildcards in a compendium are now marked again with an icon
- Fixed an error that would prevent weapons to fire if they have 1 shot only (thanks to Jae Davas)
- Fixed an issue that would prevent the PP for a specific power to show in the Quick Access

## v1.0.2

### Fixed

- Fixed a bug that would prevent a status effect from being removed on the sheet if it was created on the sheet while the actor didn't have a token

### Fixed

- Fixed a bug that would duplicate cards when dealing initiative

## v1.0.0

### Added

- Added a `range` getter on the `SwadeItem` that will return the range brackets from the item, if it is a weapon or power
- Added presets for a Light and Dark Action Deck using `poker` type cards. You can create an Action deck by going to the _Card Stacks_ tab and creating a new stack using the presets.
- Added a multi-action penalty selection for trait rolls in the roll dialog
- Added a Dropdown to the roll Dialog which contains a list of common roll modifiers. To add a modifier, select it from the dropdown and click the add button.
- Added a setting to the Setting Configurator, which controls whether encumbrance penalties are applied in the appropriate places. This setting defaults to off and needs to be enabled by the GM. Please keep in mind that Vigor tests to resist fatigue are not supported at this time
- Added `SwadeActor.isEncumbered` getter which returns true or false and considers whether the setting is even enabled
- Incorporated the chase layout macro into the system. You can right-click on any deck in the system to lay out cards on the currently viewed scene. **This option is only available if the canvas and a scene are available to lay out cards**. There is also a new button in the tile controls to remove all chase cards from the currently viewed scene. Many thanks go out to `Kristian Serrano#5077` and `brunocalado#1650` for creating the macro and allowing it to be added to the system.
- Added the ability to convert old, legacy type decks to Foundry VTT card decks. To do this right-click on a compendium containing cards and then select "Convert to Deck"
- Added Expiration tab to Active Effect sheets
- Status Effects are now synced to the token HUD. In order to achieve this we have move the status effect checkboxes to apply Active Effects. (Thanks to Kristian Serrano)
- Added Active Effect duration support (Thanks to Kristian Serrano)
  - When creating an Active Effect during combat you can now set a duration as well as expiration behavior (such as automatic removal or a prompt). The following status effects now come pre-configured with an expiration:
    - Shaken
    - Distracted
    - Stunned
    - Vulnerable
    - Bleeding Out
    - Protection
- Added additional translation strings

### Changed

- When no name is given for a modifier, the Roll Dialog will default to `Additional`
- In the Roll Dialog when a custom modifier value is entered and the enter key is pressed then the modifier is added to the list instead of directly submitting the roll
- Ported the Initiative system over from the JournalEntry based cards to the Foundry VTT Cards API. Card are dealt from a deck of your choosing (set in the `Setting Configurator`) into a discard pile of your choosing (also in the set in the `Setting Configurator`). By default the system will create an Action Deck and a Discard Pile if none are present or the ones that were chosen in the settings are not available
- Changed the way the `Setting Configurator` is organized. It now has tabs to reduce the overall size and improve the organization. Some settings have been moved into the general system settings.
- Renamed a few translation keys, see the list
  - `SWADE.Rng` -> `SWADE.Range._name`
  - `SWADE.Cover` -> `SWADE.Cover._name`
  - `SWADE.CoverShield` -> `SWADE.Cover.Shield`
  - `SWADE.Mod` -> `SWADE.Modifier`
- Removed all references to entities in migration messages
- Updated the Action Card Editor to now work with the Cards API instead of the legacy deck system
- Improved styling and visibility on the initiative chat cards. Hovering a card will now enlarge it (Thanks to Kristian Serrano)

### Removed

- Finalized depreceation of old roll dialog by removing its class and template.

### Fixed

- Fixed Wildcards not being marked as such in the Actors sidebar tab
- Fixed item creation dialogs and translations that still refered to entities instead of documents
- Vehicle cargo tabs display quantity and weight for items again
- World migrations now migrate compendiums again. If you're not sure if you were affected please run the following sniüüet as either a script macro or directly in the dev tools: `game.swade.migrations.migrateWorld()`

### Known Issues

- Encumbrance penalties currently _DO NOT_ currently support Vigor tests to resist fatigue

## [v0.22.5]

### Fixed

- Fixed a bug that would prevent archetypes from recieving items

## [v0.22.4]

### Fixed

- Fixed a bug that would case a prototype token update to fail when changing the wildcard status on npc actors.

## [v0.22.3]

### Added

- Added Archetype field to character sheet.
- Added Archetype subtype to the Race item. Archetypes work identically to races with the only difference being that the race fills out the race field on the actor it is added to and the archetype filling the archetype field.

### Changed

- Changed the way races and archetypes are added to an Actor. When duplicates (by name and type) are found, they are added, but with a changed name to reflect their source and a dialog detailing which (potential) duplicates have been found/added is shown to the user. If no duplicates are found then no dialog is shown. I have done this as I don't want to make assumptions about which item of a specific name/type is the right one (especially when it comes to skills) and this they are both added and duplicates marked.

### Fixed

- Changed references to objects and a variables that have been marked depreceated

## [v0.22.2]

### Changed

- Made all roll evaluation calls explicitly asynchronous to supress the console warning.

### Fixed

- Fixed leaky CSS in the Setting Configurator
- Fixed The Measured Template presets failing to display properly when switching between presets

## [v0.22.1]

### Changed

- Hardened the Roll dialog a bit more against empty modifier values
- The global item trait and damage modifiers are now only added when they're filled instead of automatically showing up as `+0`

### Fixed

- Under certain circumstances the ItemChatCard helper wouldn't let you use a weapon or power because it was mistankenly thinking the item was missing ammo. This has been fixed

## [v0.22.0]

### Added

- Added a the ability to determine armor per location (head, torso, arms, legs) via the getter `actor.armorPerLocation`
- Added the ability to set a front and back Bump Map for the 3D benny should DSN be installed
- Added a bump map for the default 3D benny
- Added a new roll Dialog that allows players and GMs to more easily add and remove bonuses to the roll.
- Added additional translation strings
- Added compatability for Foundry v9. Large thanks goes to the SWADE dev community for their help in testing and fixing various small issues.

### Changed

- Bound characters now have the status penalty applies correctly. (credit goes to javierriveracastro)
- Moved the following application classes to the new `apps` folder. This has no bearing on features, but might be relevant for anybody who imports these files in their own code
  - ActionCardEditor
  - RollDialog
  - SettingConfigurator
  - SwadeCombatGroupColor
  - SwadeEntityTweaks
  - DiceSettings

### Deprecated

- Deprecated the old roll dialog. It will be removed with version `1.0.0`
- Deprecated the use of bare numbers and strings as modifiers in rolls. Instead please pass an array with objects containing a `label` and a `value` property. See the example below
  ```JS
   [
    {
      label: "Foo",
      value: -2
    },
    {
      label: "Bar",
      value: "+1d6x"
    }
   ]
  ```

### Fixed

- Fixed a bug that would display the wrong card as the old one when drawing a new card for initiative

## [v0.21.4]

### Fixed

- Fixed a small issue with the display of items on the NPC sheet
- Made all items on the NPC sheet draggable
- Fixed an issue which would prevent the quickaccess from displaying properly

## [v0.21.3]

### Added

- Added the ability for Armor to have a toughness bonus. This bonus is only applied when the armor is marked as torso and is equiped.
- Added the first iteration support for _Arcane Devices_. Any weapon, armor, shield or gear item can now be designated to be an Arcane Device, allowing you to add powers to it and store power points.
  1. Create or open a physical item. This can be from within a character's inventory as well.
  1. Mark the checkbox to indicate the item is an Arcane Device.
  1. On the item's Powers tab, enter the amount of Power Points stored.
  1. Drag and drop a power to add it to the item. Powers can be dragged from a character's list of powers or from elsewhere. If desired, you can delete any unwanted powers.
  1. Set the creator's arcane skill. This is used for the new "Activate Device" button on the item/chat cards.

### Changed

- Moved all roll evaluation from synchronous to asynchronous in order to future-proof the rolls
- The weapon Item Sheet now properly saves AP as a number. A migration has been provided to fix items that have AP saved as a text
- Shortened Attribute names are now also applied to the skill list on the character sheet

### Fixed

- Fixed a small issue that would prevent chat cards from being used with unlinked token actors
- Item chat cards will now be generated with the tokens parent scene saved, not the currently active scene
- The running die now correctly uses the adjusted pace for the total distance
- Fixed an issue where Vehicle modslots where not properly calculated

## [v0.21.2]

### Changed

- Changed the `CONFIG.SWADE.templates` global variable to `CONFIG.SWADE.measuredTemplatePresets`
- Changed the `CONFIG.SWADE.activeTemplate` global variable to `CONFIG.SWADE.activeMeasuredTemplatePreview`

### Fixed

- Fixed a small issue with the Tweaks window behaving wierdly when editing values which were affected by an Active Effect

## [v0.21.1]

### Changed

- Refactored the way the one-click template Presets are added to the menu.

### Fixed

- Restored the ability for items to be reordered via Drag&Drop

## [v0.21.0]

### Added

- Added encumbrance limit and current capacity to actor data model under `data.details.encumbrance`
- Added the ability to toggle between metric and imperial Encumbrance limit calculation. This option can be found in the Setting Configurator.Please keep in mind that changing this will **not** change the weight values of items.
- Added an option to use abbreviated Attribute names for PCs/NPCs. The setting is _global_ and can be found in the system settings.
- Added additional translation strings
- Clicking the name of an item in the Gear tab now expands a box to reveal the description, bringing the UX in line with the powers and Edges/Hindrances.
- Added Support for the _Hard Choices_ rule. Enabling this means that all NPC wildcards (without player owners) set their bennies to 0 when refreshed and Whenever a player character spends a benny the GM will be awarded one. For the full experience, please set the GM bennies to 0 in the setting configurator.
- Added a `Parry` slot on weapons. All _equipped_ weapons are now factored into the parry score calculation.
- Added support to modify owned Item via Active Effects (such as skills.). The syntax for the Attribute Key is as follows `@<Type>{<Item name or ID>}[<Attribute Key on the item>]`. As a practical example, to modify the die type on the Notice skill the Attribute Key is `@Skill{Notice}[data.die.sides]`
- Added the ability to Select the images used for Bennies on the character sheet and the 3D Bennies (if DSN is installed and activated). This setting can be found in the Setting Configurator. Please keep in mind that changing the 3D bennies will require you to reload the page and changing the Character sheet bennies will require you to reopen the sheet.

### Changed

- The encumbrance value on the character sheet is now properly truncated to 3 decimal points
- The ammo field on weapons is now always shown.

### Fixed

- The Active Effect controls on the Item sheet are now disabled again if the item is owned by an actor
- Vehicle weapons now count towards the mod slots again
- The Equipped toggle should now work properly again on the Item sheet
- Restored all TinyMCE controls for the Description on the NPC sheet
- Pace now displays properly when not using the automatic adjustment
- Hidden Combatants now no longer generate chat messages when recieving a Benny.

## [v0.20.4]

### Added

- Combatants can now be grouped by name
  - Only appears if other combatants share the same name.
  - Groups all combatants with the same name with the selected combatant as the leader.
- Add Selected Tokens as Followers
  - Appears only when there are tokens selected.
  - Creates combatants for each of the selected tokens (unless one already exists)

### Changed

- Combatants can now only be dragged by GMs and owners of the combatant's actor

### Fixed

- Fixed combatant sorting for unstarted combat encounters
- Races should now properly copy their contents again

## [v0.20.3]

### Fixed

- Fixed a small bug that would prevent active effects from being created inline on the player character sheet
- Fixed a small bug that would prevent weapons from being displayed in the cargo tab on the vehicle sheet
- Fixed `SwadeCombatant.setCardValue()` function

## [v0.20.2]

### Fixed

- Fixed an issue where newly created Action Card tables would not have a roll formula.

## [v0.20.1]

### Changed

- Changed the way Action Card tables are built to account for the fact that the compendium index no longer has all necessary information

### Fixed

- Fixed an issue where combatant sorting would fail if grouped and ungrouped combatants were present
- Fixed an issue that prevented non-GMs from seeing which combatant was dealt which card
- Fixed an issue which would prevent actors from being created when no core skills are defined.
- Fixed an issue that prevent equipment from being equiped or unequiped
- Fixed several issues which would prevent grouped combatants to properly interact with the Holding feature

## [v0.20.0]

### Added

- Added the _Action Card Editor_. This is an alternative interface for Journal Entry compendiums. Any GM can open it by right-clicking a Journal Entry compendium and selecting the "Open in Action Card editor option. This is primarily meant for people that want to create their own Action Card decks.
- Added the character summarizer, which is based on @penllawen 's Summarizer Macro. The Summarizer provides a compact statblock for any NPC or Player character in the form of HTML.
  Currently the summarizer is only usable via a macro, see example
  ```JS
  const actor = game.actors.getName("SomeActor");
  const summarizer = new game.swade.CharacterSummarizer(actor);
  summarizer.getSummary(); //Returns the finished summary as HTML in a string
  ```
- Added new Combat Tracker UI
  - Overhauled the Combat Tracker UI
  - Added a button to the Combat Tracker that lets you shuffle the Action Card deck without having to open up its Rollable Table
  - Combatants are color coded by user color.
- Added Group Initiative
  - Right-click combatants to create group leaders or follow other group leaders.
  - Drag and drop combatants onto other combatants to quickly create leaders and groups.
  - The leader of a group is dealt a card and all followers act on that initiative card.
  - Followers will have the same color indicator as the group leader. Right-click the group leader to customize the group color.
  - **Known Issues:**
    - This is version 1.0 of the group initiative feature. It's possible there are cases we might have overlooked. If you identify any odd behaviors, [please submit an issue](https://gitlab.com/peginc/swade/-/issues).
    - Before combat begins, there is a strange behavior with sorting that occurs when the bottom combatant is grouped with another combatant. This only occurs before combat has begun. The combatants are properly sorted and grouped once initiative is dealt.

### Changed

- Hold, Act Now, Act After Current Combatant, and Toggle Lose Turn context menu options have been moved to the combatant control buttons next to the Visible and Defeated buttons.

### Fixed

- Fixed a bug that would prevent the wild die to be edited on skills

## [v0.19.5]

### Changed

- Changed compatability flag to 0.8.8
- All active effects can now be delete, but transfered effects can have their name clicked to open the sheet of the transfering item.

## [v0.19.4]

### Fixed

- Fixed ammo not subtracting

## [v0.19.3]

### Fixed

- Fixed currency and wealth die not saving
- Fixed Actions no longer subtracting ammo

## [v0.19.2]

### Fixed

- Fixed missing descriptions on NPC sheets

## [v0.19.1]

### Added

- Added the missing Holy/Unholy Warrior edge

### Fixed

- Fixed an issue where arcane backgrounds would not display the powers tab
- Fixed an issue where the smarts die type would always stay as a d4
- Fixed an issue where the contents of the rank field would reset

## [v0.19.0]

### Added

- Added compatability for Foundry VTT 0.8
- When Equipping/unequipping an equippable item _all_ Active Effects that come from that item are now toggled as well
- Added the ability to migrate data models
- Added the ability to set Combatants on Hold in the Combat Tracker. This is done by right-clicking the combatant. You can also set Combatants who are on hold to Act Now and Act after the current combatant, as well as the ability to mark a combatant to have lost their turn until the next round. Thanks to Kristian Serrano for submitting this.
- Added additional translation strings

### Changed

- Vehicles now save the UUID instead of the ID of their operator. As a result you can now use operators from compendiums directly. Existing vehicles will be migrated
- Hostile NPC Wildcards and GMs now recieve a benny each when an NPC Wildcard with a hostile token dispostion draws a Joker in combat
- Improved performance of the action card drawing by reducing the number of asynchronous operations
- Disabled autocomplete on roll dialogs
- Moved the pace input to the tweaks on PCs and NPCs. The pace that is adjusted by wounds can now be found in `data.stats.speed.adjusted`.

### Removed

- Removed the Legacy character sheet.

### Fixed

- Fixed a styling issue which on the character sheet

## [v0.18.4]

### Fixed

- Fixed double Conviction messages for NPCs
- Fixed the conviction activation animation not playing on the NPC sheet

## [v0.18.3]

### Added

- Added `SwadeActor#status` getter which returns an object that contains the current status as booleans

### Fixed

- Fixed Vehicle operators not working properly when no token exists
- Duplicating PCs no longer duplicates core skills

## [v0.18.2]

### Changed

- Changed the labels of the system Compendiums to _Basic Skills_, _Basic Edges_, _Basic Hindrances_ and _Basic Action Cards_ to better differentiate them from the Core Rules
- Renamed the Combat Tracker contextmenu option for rerolling Initiative to give it a more appropriate name and symbol

### Fixed

- Fixed weird behavior of the Biography Editor on the official character sheet

## [v0.18.1]

### Changed

- The `options` parameter for `SwadeActor#rollSkill` and `SwadeActor#rollAttribute` is now optional

### Fixed

- Fixed a small bug which would cause Power chat cards to concatinate numbers instead of adding them when adjusting power points

## [v0.18.0]

### Added

- Added missing translation keys for vehicles
- Added a convenience shortcut on the official sheet which opens the parent itemsheet of transfered Active Effects
- Added Die type additional stat
- Added focus state to checkboxes
- Added support for the No Power Points rule, which can be activated via the Setting Configurator. When this setting rule is effect the recording of power points is disabled and the PP Cost input is instead used to calculate the penalty on the trait roll based on the total PP Cost entered. This works with the inline interaction on the character sheet as well as the chat cards
- Added the ability to define a list of Core Skills in the Setting Configurator
- Added the ability to set which compendium the core skills will be drawn from. This defaults to the system compendium
- Added the ability to drag&drop Active Effects between actors. Please keep in mind that is only possible for AE which are not transfered from an item.
- Added the ability to use Attributes (such a Spirit or Agility) with actions instead of only skills. Adjusted UI of the _Actions & Effects_ tab accordingly. Please keep in mind that Attributes do not currently support actions with an RoF greater than 1 and will roll as if the RoF is 1
- Added a suggestion list to the ammunition field of owned weapons
- Added support for the Quick edge
- Added additional dice labels to damage rolls for Bonus damage and attribute shortcuts
- Jokers now add the appropriate +2 bonus to all trait and damage rolls
- Added `SwadeActor#hasJoker` getter which returns a boolean value
- Added added `profile-img` class to the image element that displays a characters image on the Official Sheet
- Added additional translation strings
- Edges, Hindrances and Special Abilities can now be dragged&dropped to the Hotbar from the character sheet

### Changed

- NPCs now automatically equip equipable items
- Changed order of the stats for Vehicles, armor, shields and weapons to properly reflect the order in the books
- Overhauled the way currencies are handled. You can now select one of **three** options in the Setting Configurator
  1. **Currency**, the system as it has been until now. Selecting this option now also adds an additional input field that lets you name the currency yourself.
  1. **Wealth**, representing the Wealth setting rule, which replaces the currency field with dice controls.
  1. **None / Other**, which hides the currency field. This is ideal for the people that prefer tracking currency and wealth via inventory items.
- Chnaged how rolls are displayed in chat. Trait rolls will now display the result dice, adjusted with all modifiers
- The biography text editor on the character sheet now expands to display it's entire contents
- Updated the item chat cards so their design matches the layout on the character sheet

### Deprecated

- Started depreceation of current hotbar macro functions in favour of posting the chat card

### Fixed

- Fixed how Conviction is rolled. It is now a single `d6` whose result is added to all rolls in a trait roll

## [v0.17.2]

### Changed

- Renamed Community character sheet to Legacy character sheet
- Legacy character sheets and NPC sheets now properly display the powers tab when the actor has a special ability that grants powers

### Fixed

- Removed polish language definition from system manifest

## [v0.17.1]

### Added

- Added `main-grid` class as the parent element for the official character sheet

### Changed

- Changed the order of edges and hindrances on the official character sheet
- Removed restrictions on what can be added to a race as a racial ability. Now the only thing that cannot be added is another race
- Changed the layout of the Ability item sheet, putting the description above the active effects/racial abilities
- Special Abilities can now act like Arcane Backgrounds, unlocking the powers tab
- Item sheets can now scroll
- Active Effects and Actions lists on Item sheets now scroll when they become too long

### Fixed

- Fixed a small bug which would cause toughness not to be calculated correctly
- Fixed a small bug which would cause natural armor not to be calculated when no actual armor is equipped

## [v0.17.0]

### Added

- Added an option to automatically hide NPC Item Chatcards. This setting is on by default and can be found in the System Settings. You can still make a card public by right-click it and selecting the right option from the context menu
- The system now grants a Benny to all player characters when one of them is dealt a Joker. This can be turned off in the Setting Configurator
- Added the ability to automatically calculate parry. This option can be set in actor Tweaks and will default to on for all newly created actors after this point. The calculation also takes any shields which are equipped into account
- Added a new Field to the setting configurator which lets you set the name of the Skill which will be used as the base to calculate Parry. It will default to _Fighting_. Changing this setting will require you to reload the world to have the change take effect
- Added Active Effect to the Defend status which adds +4 Parry
- Added new Status _Protection_ which adds an Active Effect that adds 0 to both toughness and armor, making it easy to apply the power. All you need to do is to put the modifier (4 or 6) into the appropriate Active Effect change.
- Added new Item type `ability`. This item type has two subtypes, `race` and `special`. If the item has the subtype `race` you can drag&drop the following items onto it to create racial abilities:

  - Skills
  - Edges
  - Hindrances
  - Ability items with the subtype `special`

  You can delete these embedded racial abilities from the race item but not edit them.

  When you have prepared the race you can then drag&drop it onto any non-vehicle actor.

  Once that is done, several things happen:

  - The racial abilities are taken from the race and added to the actor
  - Any active effects that were added to the race are copied to the actor
  - The actors race is set to the name of the race item that was dropped onto the actors
    - If one of the racial abilities is a skill and the skill is already present on the actor, the die and modifier are set to the value of the racial ability. Otherwise a new skill is created
  - The race item itself is _not_ added to the actor, it merely acts as a carrier.

- Added blank option to linked attribute selection on skills
- Added new translation keys

### Changed

- Improved permission control for the reroll options
- Newly created Scenes will now default to ther gridless option. This only applies to scenes created in the Sidebar. Scenes imported from compendiums or other sources will retain their scene config
- Set default value of Benny animation to true
- Refactored some of the new turn combat logic
- Set minimum Toughness to 1 when auto-calculating
- Changed the font size of the cards in the Combat Tracker to `20px` for easier readability
- [BREAKING] Refactored the underlying structure of the official sheet so it is easier to modify and skin
- Changed the path of the icons used to describe dice in the roll cards to be relative
- Moved running die roll to a button next to the Pace input which also displays the current running die as an image
- Changed the way the skills display on the official character sheet. They are now more in line with the rest of the sheet. Thanks a lot to Kristian Serrano for that.
- Renamed most of the tabs on the character sheet to be more in line with Savage Worlds terminology
- Actor sheets now display Active Effects which come from Items they own. Item sheets now have _all_ interactions with Active Effects removed when the item is owned by an Actor as they cannot be interacted with anyway.
- Changed the colors of active/inactve tabs on the item sheets and community sheet.

### Removed

- Consolidated the quickaccess item cards into a single file. Thanks a lot to Kristian Serrano for that.
- Removed the polish translation, as announced with v0.16.0

### Fixed

gioness if it is marked as natural armor, has at least the torso location and is equipped

- Fixed a small issue where roll shortcuts would not properly work with multiplications and divisions
- Fixed a bug which would cause preset templates to behave eratically. Many thanks go out to Moerill who was instrumental in solving this.
- Fixed a small bug which would prevent the toughness auto-calculation from taking into account AE that adjust the size of the character

## [v0.16.2]

### Added

- Added missing translations on the official sheet
- Added the ability to reroll rolls in chat by right-clicking the roll in chat and selecting the right option from the context-menu.

### Changed

- Moved the carry capacity calculation to the `Actor` class and adjusted sheet classes accordingly. This should keep it consistent between all sheets.
- Moved the DSN integration settings away from a `client` setting to a flag on the user. This will make these settings consistent across all browsers, but not all worlds.
- Moved URL for the benny image asset on the official sheet to `CONFIG.SWADE.bennies.sheetImage`
- Updated benny assets

### Fixed

- Fixed a bug which would cause chatcards to reopen again after being closed and updated from the chatlog,
- Added missing translation key for Power Trappings
- Added missing labels for major and minor hindrances on the official character sheet
- Fixed a bug which would cause NPC and Vehicle ammo tracking not to behave correctly

## [v0.16.1]

### Changed

- Updated german translation

### Fixed

- Fixed a bug which would stop the system from loading if Dice So Nice was not installed
- Fixed a spelling mistake in the english translation

## [v0.16.0]

### Added

- Added warnings to all item types which display when any action related to an Active Effect is taken on an owned Item
- Added Benny spending animation to all sheets as well as to the player view
- Added a new Configuration Submenu for _Dice So Nice!_ related settings.
- Added option to toggle whether the Benny spending animation should be played. This setting can be found in the new Dice Configuration system settings submenu and is only available if DSN is installed
- Added the ability to set a custom Wild Die color theme. This setting can be found in the new Dice Configuration system settings submenu and is only available if DSN is installed
- Added Ammo Management. Ammo management is a system option that is turned off by default. When activated it allows you to to track how many shots are expended by an attack as well as reload the gun if it's empty. When active you cannot perform an action unless you have enough ammunition in the magazine. Weapons have recieved 2 new options. One marks the weapon if it doesn't need to be reloaded, such as bows. The other is a text field that lets you enter the name of an item that is used as ammunition. There are also options to which enable the usage of ammo from the inventory. Say you have a gun which is missing 10 shots from a magazine while this feature is enabled. Reloading the weapon will pull 10 shots from the appropriate item that you set as ammunition on the weapon from the characters inventory. A warning is displayed if not enough ammunition for a full reload is available.
- Expanded Power Chat Card to now include options to directly adjust PP. This can be used to easily spend PP without having to do it via the character sheet
- Added Shaken icon
- Added Incapacitated icon
- Added additional translation options

### Changed

- Changed background color of SVG skill and `Item` to be more in line with the _Savage Worlds_ color scheme
- Increased width of Power Point input fields on the Official CHaracter sheet.
- Turned the `SwadeCombat` file into a proper class that extends `Combat`
- Skills will now always open their sheet when created on an actor, even when drag&dropped onto the sheet from somewhere.
- Generalized the operation skill dropdown on vehicles by adding the possible skills as an array to the `CONFIG.SWADE.vehicles` object
- Moved paths to Wild Card icon files to `CONFIG.SWADE.wildCardIcons` which means modules can now add their own custom wildcard icons. Testing showed the ideal place is the `setup` Hook.
- Parametrized paths to the benny textures in `CONFIG.SWADE.bennies.textures`. Can be used the same way as the wildcard icons
- Updated a few strings in the german translation

### Deprecated

- Started deprecation of the polish translation as I cannot maintain it. It will be removed from the game system with v0.17.0

### Removed

- Removed ability to interact with Active Effects on skill Items
- Removed ability to interact with Active Effects on owned Items entirely
- Removed Translations with `SSO` prefix and unified translation under the `SWADE` prefix. Adjusted Official sheet accordingly
- Removed unused gradient definitions from skill and `Item` SVG icons

### Fixed

- Fixed maximum wound penalty for pace
- Checkbox styles are properly scoped to the system now
- Fixed a small bug which would not reset initiative properly when clicking the `Reset All` button in the Combat Tracker

## [v0.15.3]

### Added

- Added Drag&Drop functionality to Misc items in the Inventory of the character sheet

### Changed

- Restricted autopopulation of core skills to player characters only

### Fixed

- Implicit dice such as `d4` now explode properly again
- Fixed an unintentional linebreak on the community character sheet
- Fixed a small issue where using the `suppressChat` option on a damage roll would break the roll

## [v0.15.2]

### Added

- Added compatability for Foundry 0.7.9

### Fixed

- Fixed a small error in the token status effects

## [v0.15.1]

### Added

- Added the getter `hasArcaneBackground` accessor to the `SwadeActor` class which returns a boolean
- Added SWADE-Specific status icons
- Added additional translation options

### Changed

- Changed the color scheme of the community sheets to more closely resemble the official sheet

### Fixed

- Fixed a small bug which would prevent chat cards to be posted from vehicle actors
- Fixed a small issue that would cause multiple instances of Core Skills to be created on an actor when multiple GMs are logged in

## [v0.15.0]

### Added

- Added official character sheet. For more information visit `<insert link here>`
- Added Actions to `Shield` type items
- Added ability to define skill override in an action, so the action uses an alternative skill
- Added ability to record how many shots are fired by using this action. This does nothing for now, but can be used by macros or features down the line
- Added additional translation options

### Changed

- Changed unknown driver display to black icon to differentiate from an actor that has the default icon
- Changed Roll Data (the shortcuts with the `@` notation). You can now easily access the following values:
  - all attributes of the selected token (@str, @agi, etc),
  - all skills of the selected token. Names are all lower case, spaces are replaced with dashes and all non-alphanumeric characters (everything that isn't a number or a to z) is removed. E.g. `Language (Native)` can be called with `@language-native`
  - Traits will also include their modifier shoud they have one
  - Current Wounds
  - Current Fatige

### Removed

- Removed spanish translation from core game system because a properly maintained community translation is available here: https://foundryvtt.com/packages/swade-es/

### Fixed

- Fixed a small bug that would cause rolls to crash when attributes had a modifier with value `null`
- Fixed a small bug which would prevent vehicle sheets from rendering under certain circumstances.
- Fixed a small bug which would prevent items on the vehicle sheet from dragging
- Fixed several spelling mistakes

## [v0.14.1]

### Added

- Added additional translation options

### Changed

- Changed the way dice results are displayed. The chat message now displays the rolls as following
  - If applicable, Modifiers are displayed as a list in the flavour text
  - In the middle the adjusted dice rolls, with all the modifiers already applied. Should a roll contain a natural 1 the result will be colored red so you can at a glance tell if you're dealing with snake eyes or Innocent Bystander
  - When clicking to expand the roll you can now see the unmodified dice rolls, in case you want to reference them
- Changed version compatability for Foundry VTT `0.7.7`
- Refactored the dice rolling logic to take more advantage of the Foundry VTT Dice API. This should also take care of most parsing issues for rolls triggered via the sheet and chat cards

## [v0.14]

### Added

- Added Skill and Attribute names to dice when rolling
- Added `SwadeEntityTweaks` class to game object as `game.swade.SwadeEntityTweaks`.
- Added labels to the various Sheet classes
- Added natural armor capabilities
- Added Localization for Actor and Item types (english only)
- Added `suppressChat` option to `Actor.rollSkill`, `Actor.rollAttribute` and `Item.RollDamage` options. When this option is set to true, the method returns an unroll `Roll` class instead of opening the Dialog and rolling. Example: `actor.rollSkill(randomSkillID, {suppressChat: true})`
- Added logic that will optionally adjust pace with the wounds
- Added support for active effects, including UI.
  - **Attention** Should an active effect that modifies something like parry or pace not work it may because the data is still saved as a string. To fix this first enter some bogus value into the field and then the proper base value. This will force the field to update the datatype correctly and the Active Effect should now work properly.
  - **Attention** Editing an Active Effect on an item that is owned by a character is not currently possible as it isn't directly supported in Foundry Core
- Added two new modifier fields to the data model for `character` and `npc` type actors. Both are primarily meant for active effects
  - `data.strength.encumbranceSteps` - Used for Edges which modify the strength die for the purpose of calculating encumbrance. setting this value to 1 means the strength die is considered 1 step higher for the purpose of encumbrance (up to a maximum of a d12)
  - `data.spirit.unShakeBonus` - Should be used for edges which give a bonus or penalty to the unshaking test

### Changed

- Added package name to Action deck selection
- Simplified explosion syntax from `x=` to `x`
- Refactored `getData` of all actor sheets take out duplicate or unused sections
- [POTENTIALLY BREAKING] Changed data types of input fields for attributes and derived values to `Number`. This was a necessary step in order to make Active Effects work properly.
- Changed display text of the Red and Black Joker action cards to "Red J" and "Blk J" respectively to improve readability

### Fixed

- Fixed a small bug which would cause Group Rolls not to behave properly
- Fixed a styling error with Item sheets
- Fixed a bug which caused sheet-inline item creation dialogs to not work properly
- Fixed a bug which would cause skill rolls to throw a permission error when players were making an unskilled attempt
- Fixed a small bug which would cause some token values of actors to be overwritten on import

### Removed

- Removed Handlebars helpers that overwrote helpers defined by Foundry core

## [v0.13]

### Added

- Added support for chat message popout for item chat cards
- Added more localization to Item Chat Cards
- Added ability to assign any card to a combatant via combatant config
- Added image to Action Cards Table. Won't apply to currently existing tables, so either delete the table and re-load the world or set it manually

### Changed

- Changed all the listeners on the sheet classes to no longer use depreceated jQuery Methods
- Updated the Vehicle sheet driver logic to use the new `dropActorSheetData` drop
- Updated Combatant sorting in Combat tracker to be in line with the new method structure
- Moved template presets up in menu so the `Delete All` button is last
- Replaced all instances of the now depreceated `Actor#isPC` with the new `Entity#hasPlayerOwner` property
- Turned on toughness calculation by default for PCs/NPCs made after this patch

### Deprecated

- Finished the deprecation of the util functions `isIncapacitated` and `setIncapacitationSymbol`

### Fixed

- Fix roll dialogs
- Fix item creation dialog
- Fix macro creation drag handler
- Fixed a small bug which could lead to the wrong modifiers on a running die
- Fixed dice roll formatting in the chatlog
- Fixed initiative display
- Fixed a bug which would cause an infinite update cycle when opening actor sheets from a compendium

## [v0.12.1]

### Fixed

- Fixed a bug which would overwrite actor creation data

## [v0.12.0]

### Added

- Added TypeDoc to the repository and configured two scripts to generate the documentation as either a standard web page or in Markdown format.
- Added a way to render sheets only after the templaes are fully loaded. this should help with slower connections.
- Added ability to set a d1 for traits
- Added toggle for Animal smarts
- Option to roll the Running Die. Adjust the die the Tweaks. Set a die type and a modifier as necessary. Click _Pace_ on the actor sheet to roll the running die, including dialog, or shift-click to skip the dialog. **Attention** For existing actors you may need to go into the tweaks, set the proper die and then hit _Save Changes_. Actors created after this patch will have a d6 automatically.
- Added the ability to create chat cards for edges and inventory items. (Thanks to U~Man for that)
- Added the ability to add a skill and modifiers to a weapon or power
- Added the ability to define actions on a weapon or item. There are two types of actions; skill and damage, each allowing you to pre-define some custom shortcuts for attacks
- Additional stats are now present on all items and actors
- Added the ability for players to spend bennies directly from the player list

### Deprecated

- started the deprecation of the util functions `isIncapacitated` and `setIncapacitationSymbol`. They will be fully removed in v0.13
- Finished deprecation of `SwadeActor.configureInitiative()`

### Changed

- Upgraded TypeScript to version `3.9.7` (Repo only)
- Adjusted character/NPC sheet layout a bit
- Updated the SVG icons so they can be used on the canvas
- Changed design and makeup of checkboxes as they were causing issues with unlinked actors
- Changed input type of currency field so it accepts non-numeric inputs

### Fixed

- Fixed a bug where actors of the same name would show up as a wildcard in the actor sidebar if any of them was a wildcard
- Fixed a small bug which could occasionally cause errors when handling additional stats for entities in compendiums

## [v0.11.3]

### Fixed

- Fixed a bug that would prevent Item or Actor sheets from opening if they hadn't been migrated

## [v0.11.2]

### Fixed

- Fixed a bug that would prevent non-GMs from opening items in the sidebar

## [v0.11.1]

### Fixed

- Fixed a small bug that would allow observers to open the Armor/Parry edit windows

## [v0.11.0]

### Added

- Added Classification field to Vehicle Sheet
- Added `calcToughness` function to `SwadeActor` class, that calculates the toughness and then returns the value as a number
- Added auto-calculation to toughness if armor is changed or something about the vigor die is changed.
- Added `isWildcard` getter to `SwadeActor` class
- Added Group Rolls for NPC Extras
- Added `currentShots` property to `weapons`. Addjusted sheets accordingly
- Added Setting Configurator in the Settings
- Added Capability to create custom stats.
  - To use custom stats, create them in the Setting Configurator, then enable them in the Actor/Item Tweaks
  - These custom stats are available on the following sheets: Character, NPC, Weapon, Armor, Shield, Gear
  - **Attention**: Due to a quirk in Foundry's update logic I recommend you only edit unlinked actors in the sidebar and then replace existing tokens that exist on the map with new ones from the side bar
- Added ability to automatically calculate toughness, including armor. This is determined by a toggle in the Actor Tweaks and does not work for Vehicles. The Toughness input field is not editable while automatic toughness calculation is active.
- Added Powers Tab back into NPC Sheets
- On character sheets, added quantity notation to most inventory entries
- Added Initiative capability to `vehicle` type actors. Please keep in mind that Conviction extension does not work at this time. It's heavily recommended that you only add the Operator to the Combat Tracker if you use the Conviction setting rule.

### Changed

- Parry and Pace fields now accept non-numerical inputs
- Power sheet now acceptsnon-numerical input for Power Points
- NPC Hindrances now only show the Major keyword, no longer Minor
- Updated german localization (thanks to KarstenW for that one)
- Changed size of status tickbox container from `100px` to `120px` to allow for longer words
- Re-enabled the Arcane Background toggle on Edges, when they are owned

### Deprecated

- Started deprecation of `SwadeActor.configureInitiative()` function. It will be fully removed with v0.12.0

### Removed

- Removed Status icon two-way binding
- Removed Notes column for misc. Items in the character sheet inventory
- Removed Conviction Refresh message as there is no reliable way to get the current active combatant at the top of a round

### Fixed

- Fixed a bug that would remove fatigue of max wounds was set to 0 on NPC sheets
- Fixed a small bug that would prevent item deletion from NPC sheets
- Fixed a small bug which would cause wound penalties on vehicles to register as a bonus instead
- Fixed a small bug which allowed observers to roll Attribute tests

## [v0.10.2]

### Added

- Added Source code option to advancement tracker editor

### Changed

- Removed armor calculation from NPC actors as it is a likely culprit for a bug. Proper solution to follow

## [v0.10.1]

### Fixed

- Fixed a bug that would cause Drag&Drop macros from actor sheets to be cloned, leading to multiple identical macros on the hotbar (identical in ID too), which could lead to players having macros they couldn't interact with properly.

## [v0.10.0]

### Added

- Added Refresh All Bennies option and Message
- Added the Savage Worlds Cone shape which replaces the vanilla Foundry cone shape for rounded cones (thanks to Godna and Moerill for that one)
- `SwadeTemplate` class, which allows the creation of predefined `MeasuredTemplate`s (based on code by errational and Atropos)
- Buttons for predefined Blast and Cone Templates
- Added Vehicles
  - Added Vehicle `Actor` type
  - Added Vehicular flag to `weapon` and `gear` Items
  - Added Vehicle Sheet
    - Drag&Drop an actor to set an operator
    - Roll Maneuvering checks directly from the vehicle sheet
      - Set Maneuvering skill in the `Description` tab
- Added optional Setting Rules for Vehicles using Modslots and Vehicles using Edges/Hindrances
- Added localization options for Vehicles
- Added `makeUnskilledAttempt` method to `SwadeActor` class
- Added `rollManeuveringCheck` method to `SwadeActor` class
- Added Drag&Drop to PC powers

### Fixed

- Fixed a small bug which would cause the Action Cards deck not to reset when combat was ended in a Round in which a Joker was drawn
- Fixed a small bug which would cause Gear descriptions not to enrich properly on `Actor` sheets
- Fixed broken Drag&Drop for NPC sheets

### Changed

- Changed how many Bennies the GM gets on a refresh. The number is now configured in a setting (Default 0);
- Weapon Notes now support inline rolls and Entity linking

## [v0.9.4]

### Added

- Added some more localization options

### Changed

- Changed the card redraw dialog. It now displays the image of the card as well as a redraw button when appropriate
- Reworked the NPC sheet a bit (thanks to U~Man for that)

### Removed

- Removed the Weapons, Gear, Shields, Armor and Powers compendia due to copyright concerns

## [v0.9.3]

### Added

- Added Benny reset function for each user
  - GM Bennies are calculated based on the number of users
- Benny spend/recieve chat messages
- Added a function to calculate the valuer of the worn armor to the `SwadeActor` entity

## [v0.9.2]

### Fixed

- Fixed a bug that would prevent GMs from rerolling initiative for a given combatant

## [v0.9.1]

### Added

- Added a function to the `SwadeActor` class that calculates and sets the proper armor value
- Added checkboxes to the Armor sheets to mark hit locations

### Changed

- Renamed a few classes to make their function more easily apparent
- Changed `Conviction` Setting Rule to be compliant with SWADE 5.5
- Made Skill names multiline

## Removed

- Took away the player's option to draw their own cards, now only the GM can do that

### Fixed

- Fixed a small bug which would prevent NPCs from rolling power damage
- Fixed a small bug that would prevent multiple combat instances to work at the same time

## [v0.9.0]

### Added

- Layout rework (Thanks to U~Man)

  - Added multiple arcane support, filling the Arcane field of power items will sort it in the powers tab and gives it its own PP pool when the filter is enabled
  - Moved sheet config options (initiative, wounds) to a Tweaks dialog in the sheet header
  - Moved Race and Rank fields to the sheet header
  - Moved Size to Derived stats
  - Fixed Issue with rich HTML links not being processed in power and edge descriptions
  - Each inventory item type has relevant informations displayed in the inventory tab
  - Reworked base colors
  - Moved condition toggles and derived stats to the Summary tab
  - For PCs sheet, lists no longer overflows the sheet size.
  - For PCs sheet, power cards have a fixed size
  - Added an Advances text field above the Description
  - Changed the default item icons to stick with the new layout colors
  - Added dice icons to attributes select boxes
  - Weapon damage can be rolled in the inventory
  - Added an item edit control on NPC inventory

- Added drag&drop capability for PCs and NPCs so you can pull weapons and skills into the hotbar and create macros.
- Added a bunch of icons for skills
- Added the ability to choose cards when rerolling a card

### Changed

- Adjusted Weapon/Armor/Gear/Power Item sheets to be more compact

### Fixed

- Fixed a bug which would duplicate core skills when a PC was duplicated

## [v0.8.6] 2020-05-22

### Fixed

- Fixed Compatability with Foundry v0.6.0

## [v0.8.5] 2020-05-21

### Added

- Added Size modifier to sheet
- Added Roll Raise Button to Damage rolls which automatically applies the extra +1d6 bonus damage for a raise
- Player CHaracters will now automatically recieve the core skills.
- Added FAQ (Thanks to Tenuki Go for getting that started);
- Toggling a `npc` Actor between Wildcard and not-wildcard will link/unlink the actor data. Wildcards will become linked and Extras will become unlinked. This can still be overriden manually in the Token config. This functionality also comes with a system setting to enable/disable it
- Actors of the type `npc` will be created with their tokens not actor-linked

### Fixed

- Fixed a small bug which caused ignored wounds to behave oddly.
- Fixed duplicates and false naming in the Gear compendia (Thanks to Tenuki Go for getting that done);
- Fixed Journal image drop again
- Fixed a small bug where in-sheet created items would not have the correct icon

## [v0.8.4] 2020-05-17

### Fixed

- Fixed a small bug that would prevent the population of the Action Cards table

## [v0.8.3] 2020-05-16

### Fixed

- Fixed a small bug that would allow combat initiative to draw multiples of a card

## [v0.8.2] 2020-05-16

### Added

- Added option to turn off chat messages for Initiative
- Made Hindrance section available for Extras as well
- Made PC gear cards more responsive
- Added more i18n strings
- Compendium packs for Core Rulebook equipment (Thanks to Tanuki Go on GitLab for that)
- Added buttons to quickly add skills, equipment etc (Thanks to U~Man for that)

### Changed

- Updated SWADE for FoundryVTT 0.5.6/0.5.7

### Removed

- Removed French translation as it will become a seperate module for easier maintenance.

### Fixed

- Fixed a small bug which would cause the wrong sheet to be update if two character/npc sheets were opened at the same time.

## [v0.8.1] 2020-05-10

### Added

- Powers now have a damage field. If the field is not empty it shows up on the summary tab. Kudos to Adam on Gitlab
- Fixed an issue with Item Sheets that caused checkboxes to no longer show up
- Stat fields for NPC equimpent only show up when they actually have stats.

## [v0.8.0] 2020-05-09

### Added

- Initiative! Supports all Edges (for Quick simply use the reroll option)
- Added localization strings for Conviction
- Fields in weapon cards will now only be shown when the value isn't empty
- Ability to ignore Wounds (for example by being a `Construct` or having `Nerves of Steel`)

## Changed

- Massively changed the UI and all sheets of SWADE to make it more clean and give it more space.
- Changed data type of the `Toughness` field from `Number` to `String` so you can add armor until a better solution can be found
- Updated French translation (thanks to LeRatierBretonnien)

### Fixed

- Fixed a bug that would display a permission error for players when a token they weren't allowed to update got updated
- Status Effect binding now also works for tokens that are not linked to their base actor
- Fixed a small localization error in the Weapon item sheet
- Fixed requirements for the `Sweep` Edge
- Fixed page reference for the `Sound/Silence` Power
- Fixed an issue with Skill descriptions not being saved correctly

## [v0.7.3] 2020-05-01

### Added

- Added the option to view Item artwork by right-clicking the item image in the sheet

### Changed

- Optimnized setup code a bit

### Fixed

- Added missing Bloodthirsty Hindrance
- Fixed a spelling mistake in the `Improved Level Headed` Edge

## [v0.7.2] 2020-04-28

### Fixed

- Fixed a small bug that would cause an error to be displayed when a player opened te sheet of an actor they only had `Limited` permission on

## [v0.7.1] 2020-04-28

### Added

- Status effect penalties will now be factored into rolls made from the sheet (credit to @atomdmac on GitLab)
- Added option to turn Conviction on or off as it is an optional rule

### Fixed

- Fixed a minor spelling mistake in the german translation

## [v0.7.0] 2020-04-20

### Added

- Damage rolls can now take an `@` modifer to automatically add the attribute requested. For example `@str` will resolve to the Strength attribute, which will be added to the damage roll.
- Added Limited Sheet for NPCs. If the viewer has the `Limited` Permission they get a different sheet which only contains the character artwork, the name of the NPC and their description
- Added Confirm Dialogue when deleting items from the inventory of `character` Actors

### Changed

- Changed automated roll formula a bit to make the code more readable.

### Fixed

- Fixed a small bug where the description of an Edge or Hindrance could show up on multiple `character` sheets at once

## [0.6.1] 2020-04-20

### Added

- Trait rolls now take Wound and Fatigue penalties into account
- `Gear` Items can now be marked as equippable

### Fixed

- Added missing Damage roll option for NPC sheets

## [0.6.0] 2020-04-18

### Added

- Rolls for Attributes, Skills and Weapon Damage (kudos to U~man!)
- Checkboxes for Shaken/Distracted/Vulnerable to Character and NPC Actor sheets
- Two-Way-Binding between Token and Actor for the three status effects (Shaken/Distracted/Vulnerable)
- Setting to determine whether NPC Wildcards should be marked as Wildcards for players

### Changed

- Updated hooks to be compatible with Foundry 0.5.4/0.5.5
- More clearly marked Item description fields
- Renamed `Untrained Skill` to simply `Untrained`

### Fixed

- Power descriptions are now rendered with formatting
- Added missing `Arrogant` hindrance

## [0.5.4] 2020-04-13

### Removed

- Removed empty option from skill attribute select as every skill needs to have a linked attribute anyway

### Fixed

- Rank and Advances fields now point to the correct properties. Make sure to write down what Rank and how many advances all characters have before updating to this version

## [v0.5.3] 2020-04-11

## Added

- Added Quantity fields to relevant Item sheets
- Added Localization options for Conviction
- JournalEntry images can now be dragged onto the canvas (credit goes to U~man)

## Changed

- Changed initiative formula to `1d54`. This is temporarily while a proper Initiative system is being developed

## Fixed

- Fixed localization mistake in de.json

## [v0.5.2] 2020-04-07

### Added

- Compendiums! (Thanks to Anathema M for help there)
  - Edges
  - Hindrances
  - Skills
  - Powers
  - Action Cards (no you can't pull them onto the map, but that's gonna come in the future)
- French Localization (Thanks to Leratier Bretonnien & U~Man for that)
- Spanish Localization (Thanks to Jose Lozano for this one)

### Changed

- Upgraded Tabs to `TabsV2`
- Slight improvements to localization

## [v0.5.0] 2020-03-27

### Added

- Wildcards will now be marked with a card symbol next to their name
- Wound/Fatigue/Benny/Conviction tracking on the Wildcard Sheet
- Extra sheets!
- Polish localization. Credit goes to Piteq#5990 on Discord

### Changed

- Moved Icons to assets folder and split them into icons and UI elements
- Character Image now respects aspect ratio
- The Actor types Wildcard and Extra have been changed to Character and NPC. NPCs can be flagged as Wildcards
- Whole bunch of changes to Actor sheets for both Characters and NPCs

### Fixed

- Localization errors that caused field labels on `Weapon` and `Power` Items to disappear

## [v0.4.0] - 2020-03-12

### Added

- Full localization support for the following languages:
  - English
  - Deutsch

## [0.3.0] - 2020-03-10

### Changed

- Completely reworked how Attribute and Skill dice are handled by the data model
- Modified `wildcard` Actor sheet to fit new data model
- Modifed `skill` Item sheet to fit new data model

## [0.2.0] - 2020-03-09

### Added

- Powers support! (The sheet layout for that will be need some adjustment in the future though)
- Fleshed out Inventory tab on the Wildcard sheet
- Items of the type `Edge` can now be designated as a power Edge. If an Actor has a power Edge, the Powers tab will be automatially displayed on the Wildcard sheet
- Equip/Unequip functionality for weapons, armor and shields from the Inventory Tab
- Weapon/Armor/Shield Notes functionality added to Items/Actor Sheet Summary tab

### Changed

- Rolled `Equipment` and `Valuable` Item types into new `Gear` Item type
- Streamlined the `template.json` to better distinguish Wildcards and Extras

### Fixed

- Various code improvements and refactoring
- Finished gear cards on the Summary tab of the Actor sheets

## [0.1.0] - 2020-02-26

### Added

- Wildcard Actor sheet
- Item sheets for the following
  - Skills
  - Edges
  - Hindrances
  - Weapons
  - Armor
  - Shields
  - Powers
  - Equipment
  - Valuables
