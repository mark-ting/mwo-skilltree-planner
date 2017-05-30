MWO Skill Tree Planner
===

Skill Tree Planner for PGI's MechWarrior Online.

[WIP build hosted on GitHub.](https://mat3049.github.io/mwo-skilltree-planner/)
___

Web Application
---

The Planner application is a webpage that uses bindings to `<canvas>` elements for its interface.

### Components: ###
* `data/` dir containing `colors.json` (color data) and `latest.json` (skill tree data)
* `HexGrid.js` - ES6 hex-cell grid library
* `setutils.js` - ES6 set operation library
* `stringwrap.js` - string single-wrap function
* `SkillPlanner.js` - skill planner library (again, ES6 reliant)

### System Requirements: ###
One of the following web browsers:
* Firefox 45+
* Chrome 56+
* Safari 9+
* Any other browser that supports ES6 `...spread` operators `classes` (Sorry IE11!)

___

Data Extraction
---

### Dependencies: ###
* Node.js 6.x+ (7.x recommended)
* Python 3.6+ with `lxml`
* ES6 compliant web-browser (Chrome)

### Considerations: ###
* Extract commands must be run in the listed order to succeed!
* If patch version is newer than repo version, replace `MechSkillTreNodes.xml`, `MechSkillTreeNodesDisplay.xml`, and `TheRealLoc.xml` under `./utils/src/`
* Intermediary files and final output will be under `./utils/out`
* DO NOT MODIFY ANY FILES IN `./utils/` WHILE EXTRACTING DATA!

### Automatic Extraction: ###
* Run `npm install`
* Run `npm run ext-all`
* `SkillTreeFinal.json` is ready to use with the Planner (see `latest.json` in `public/data/`)

### Manual Extraction: ###
* Run `npm install`
* Run `node ./util/generateLinks.js` to generate `NodeLinks.json`
* Run `node ./util/generateCategories.js` to generate `NodeCategories.json`
* Run `python ./util/skill_node_extractor.py` to generate component `Extracted_.json` files, `SkillTree.json`, and `locale.json`
* Run `node ./util/offsetTree.js` to generate `latest.json`
* `latest.json` and `locale.json` are now ready to use with the Planner (move to `public/data/`)
