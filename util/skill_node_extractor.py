# -*- coding: utf-8 -*-
"""
skill_node_extractor.py

Parses skill tree and node information from XML to JSON files.
Requires relevant data sources to be in the './src/' dir.
"""

import json
from lxml import etree as ET

# Ensure wdir is current
import os
abspath = os.path.abspath(__file__)
dname = os.path.dirname(abspath)
os.chdir(dname)

NODE_TREE = ET.parse('src/MechSkillTreeNodes.xml')
NODE_ROOT = NODE_TREE.getroot()

DISPLAY_TREE = ET.parse('src/MechSkillTreeNodesDisplay.xml')
DISPLAY_ROOT = DISPLAY_TREE.getroot()

LOCALE_TREE = ET.parse('src/TheRealLoc.xml')
LOCALE_ROOT = LOCALE_TREE.getroot()

def map_node_effects():
    """
    Map Base Node IDs to node effects
    """
    node_effects = {}
    base_node_id = 0

    for base_node in NODE_ROOT.iter('Node'):
        effects = []
        for effect in base_node.iter('Effect'):
            effects.append(effect.attrib['name'])

        node_effects[base_node_id] = effects
        base_node_id += 1

    return node_effects


def map_node_variants():
    """
    Map Variant Nodes and Names to Base Node IDs
    """
    variants = {}
    node_id = 0
    base_node_id = 0

    for base_node in NODE_ROOT.iter('Node'):
        node_variants = base_node.attrib['names'].split(',')
        for variant in node_variants:
            variants[variant] = {
                'id': node_id,
                'base': base_node_id
            }
            node_id += 1
        base_node_id += 1

    return variants


def map_node_locations():
    """
    Map Variant Node names to locations
    """
    node_locations = {}

    for node in DISPLAY_ROOT.iter('Node'):
        name = node.attrib['name']
        col = int(node.attrib['column'])
        row = int(node.attrib['row'])

        node_locations[name] = {
            'col': col,
            'row': row
        }

    return node_locations


def map_node_discriminators():
    """
    Map discrimincators and effect values to effect name strings
    """
    node_effects = {}

    for base_node in NODE_ROOT.iter('Node'):
        for effect in base_node.iter('Effect'):
            discriminator = process_discriminators(effect)
            node_effects[effect.attrib['name']] = discriminator

    return node_effects


def process_discriminators(effect):
    """
    Determine which discriminators apply to each effect
    """
    discriminators = {
        'faction': False,
        'class': False,
        'tonnage': False
    }

    # Effect has a discriminator; Faction discriminator is default
    if effect.attrib['value'] == '0.0':
        discriminators['faction'] = True
        # Iterate over faction classifiers
        for faction in effect.iter('Faction'):
            # Faction has no base value; Class discriminator in place
            if faction.attrib['value'] == '0.0':
                discriminators['class'] = True
                for weight_class in faction.iter('WeightClass'):
                    # Weight has no base value; Tonnage discriminator in place
                    if weight_class.attrib['value'] == "0.0":
                        discriminators['tonnage'] = True

    return discriminators


def map_effect_values():
    """
    Map effects to effect values
    """
    effect_values = {}

    for base_node in NODE_ROOT.iter('Node'):
        for effect in base_node.iter('Effect'):
            effect_values[effect.attrib['name']] = process_values(effect)

    return effect_values


def process_values(effect):
    """
    Enumerate values based on discriminator patterns
    """
    values = {}

    # Base has no value, discriminators apply--iterate to next level
    if effect.attrib['value'] == '0.0':
        values['factions'] = {}

        for faction in effect.iter('Faction'):
            fac = faction.attrib['name']
            fac_val = faction.attrib['value']

            if faction.attrib['value'] == '0.0':
                values['factions'][fac] = {}

                for weight_class in faction.iter('WeightClass'):
                    wc = weight_class.attrib['name']
                    wc_val = weight_class.attrib['value']

                    if weight_class.attrib['value'] == '0.0':
                        values['factions'][fac][wc] = {}

                        for tonnage in weight_class.iter('Tonnage'):
                            ton = tonnage.attrib['name']
                            ton_val = tonnage.attrib['value']
                            values['factions'][fac][wc][ton] = float(ton_val)
                    else:
                        values['factions'][fac][wc] = float(wc_val)
            else:
                values['factions'][fac] = float(fac_val)
    else:
        values = float(effect.attrib['value'])

    return values


def map_node_localizations():
    localizations = {}

    ns = {'ns': 'urn:schemas-microsoft-com:office:spreadsheet'}
    node_prefix = 'EMechTreeNode_'
    node_prefix2 = 'emechtreenode_'  # because some nodes are speshul
    desc_suffix = '_desc'

    """
    TODO NOTICE:
    TorsoYaw and EnhancedECM are currently typed as torsoyaw and enhancedecm,
    so all name indices are UPPERCASED to ensure access consistency.
    """

    name_string = '//*[starts-with(text(),"{0}")]'
    name_nodes = LOCALE_ROOT.xpath(name_string.format(node_prefix), namespaces=ns)
    name_nodes += LOCALE_ROOT.xpath(name_string.format(node_prefix2), namespaces=ns)

    for name_node in name_nodes:
        name_row = name_node.getparent().getparent()
        name = name_node.text[len(node_prefix):].upper()

        if not name.endswith(desc_suffix):
            # Translated text resides on child of second child of Row
            local_name = name_row.getchildren()[1][0].text

            localizations[name] = {}
            localizations[name]['name'] = local_name

    desc_string = '//*[starts-with(text(),"{0}") and contains(text(),"{1}")]'.format(node_prefix, desc_suffix)
    desc_nodes = LOCALE_ROOT.xpath(desc_string, namespaces=ns)
    for desc_node in desc_nodes:
        desc_row = desc_node.getparent().getparent()
        name_raw = desc_node.text
        name = name_raw[len(node_prefix):len(name_raw) - len(desc_suffix)].upper()
        description = desc_row.getchildren()[1][0].text
        localizations[name]['desc'] = description

    return localizations


def export_skill_tree_components():
    """
    Export XML data to JSON
    """
    with open('out/ExtractedNodeEffects.json', 'w') as effects_json:
        effects_json.write(json.dumps(map_node_effects(), indent=2))

    with open('out/ExtractedEffectValues.json', 'w') as values_json:
        values_json.write(json.dumps(map_effect_values(), indent=2))

    with open('out/ExtractedNodeVariants.json', 'w') as variants_json:
        variants_json.write(json.dumps(map_node_variants(), indent=2))

    with open('out/ExtractedNodeLocations.json', 'w') as locations_json:
        locations_json.write(json.dumps(map_node_locations(), indent=2))

    with open('out/ExtractedNodeDiscriminators.json', 'w') as discriminators_json:
        discriminators_json.write(json.dumps(map_node_discriminators(), indent=2))

    with open('out/ExtractedNodeLocalizations.json', 'w') as localizations_json:
        localizations_json.write(json.dumps(map_node_localizations(), indent=2))

def export_skill_tree():
    effects = map_node_effects()
    values = map_effect_values()
    variants = map_node_variants()
    locations = map_node_locations()
    discriminators = map_node_discriminators()
    localizations = map_node_localizations()

    tree = {}

    # TODO: pull links and root data from game
    with open('out/NodeLinks.json', 'r') as links_json:
        links = json.load(links_json)

    with open('out/NodeCategories.json', 'r') as categories_json:
        categories = json.load(categories_json)

    roots = {
        'Firepower': '0',
        'Survival': '64',
        'Mobility': '117',
        'Jump Jets': '156',
        'Operations': '161',
        'Sensors': '195',
        'Auxiliary': '215'
    }

    for name in categories:
        tree[name] = {
            'root': roots[name],
            'nodes': {}
        }

    for name in variants:
        name_upper = name.upper()
        node_id = variants[name]['id']
        base_id = variants[name]['base']
        node_effects = effects[base_id]
        node_col = locations[name]['col']
        node_row = locations[name]['row']
        local = localizations[name_upper]
        node_name = local['name']
        node_desc = local['desc']

        node_category = ""
        for name in categories:
            if str(node_id) in categories[name]:
                node_category = name

        node_links = []
        if str(node_id) in links:
            node_links = links[str(node_id)]
            #node_links = [int(id) for id in links[str(node_id)]]

        tree[node_category]['nodes'][node_id] = {
            'name': node_name,
            'desc': node_desc,
            'col': node_col,
            'row': node_row,
            'effects': node_effects,
            'links': node_links
        }

    with open('out/SkillTree.json', 'w') as skilltree_json:
        skilltree_json.write(json.dumps(tree, indent=2))

if __name__ == "__main__":
    print('Exporting Component Skill Tree Data...')
    export_skill_tree_components()

    print('Exporting Aggregate Skill Tree Data...')
    export_skill_tree()

    print('Data export complete!')
