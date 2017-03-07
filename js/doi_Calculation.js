/**
 * Degree of interest applied to phylogenetic tree originally based on paper by Stuart K and David Nation
 * Reference Paper: http://dl.acm.org/citation.cfm?id=1556300
 */


function set_doi(tree_var, focus_node_id, min_doi) {
    var desc_indic = contains_node(tree_var, focus_node_id);
    if (desc_indic) {
        tree_var.doi = 0;
        if (tree_var.children != null) {
            for (var i = 0; i < tree_var.children.length; i++) {
                tree_var.children[i] = set_doi(tree_var.children[i], focus_node_id, min_doi);
            }
        }
    } else {
        tree_var = set_tree_fisheye(tree_var, -1);
    }
    return tree_var;
}


function contains_node(tree_var, node_id) {
    if (tree_var.name == node_id) {
        return true;
    }

    if (tree_var.children == null) {
        return false;
    }

    var children_indic = []
    for (var i = 0; i < tree_var.children.length; i++) {
        var cur_indic = contains_node(tree_var.children[i], node_id);
        children_indic.push(cur_indic);
    }
    return children_indic.some(function(x) { return x; })
}


function set_tree_fisheye(tree_var, doi) {
    if (tree_var.doi == undefined) {
        tree_var.doi = doi;
    }

    if (tree_var.children != undefined) {
        for (var i = 0; i < tree_var.children.length; i++) {
            tree_var.children[i] = set_tree_fisheye(tree_var.children[i], doi - 1);
        }
    }
    return tree_var;

}


function filter_depth(x, i) {
    return x.filter(function(d) { return d.depth == i; });

}

function set_node_segments(nodes, depths) {
    // set 0 for root [any nodes at depth 0]
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].depth == 0) {
            nodes[i].segment = 0;
        }
    }

    // intentionally skip root, and iterate over depths
    for (var i = 1; i <= d3.max(depths); i++) {
        var parents = filter_depth(nodes, i - 1).map(function(d) { return d.name; });
        var children = filter_depth(nodes, i);

        // iterate over nodes at this depth
        for (var j = 0; j < children.length; j++) {
            var cur_ix = nodes.map(function(d) { return d.name })
                .indexOf(children[j].name);
            nodes[cur_ix].segment = parents.indexOf(children[j].parent.name);
        }
    }
    return nodes;

}


function segment_tree(tree_var) {
    var nodes = d3.layout.cluster()
        .nodes(tree_var);

    console.log(nodes);
    var depths = nodes.map(function(d) { return d.depth });
    nodes = set_node_segments(nodes, depths);
    return tree_var;

}

function get_layout(tree_var, focus_node_id, display_dim, node_size) {
    var nodes = d3.layout.cluster()
        .nodeSize(node_size)
        .nodes(tree_var);
    var focus = nodes.filter(function(d) {
        return d.name == focus_node_id; })[0];
    var x_move = focus.x - display_dim[0] / 2

    for (var i = 0; i < nodes.length; i++) {
        nodes[i].x -= x_move
        nodes[i].y = node_size[1] * (nodes[i].depth - focus.depth) +
            display_dim[1] / 3
    }
    return nodes;
}


function get_layout_bounds(tree_var, focus_node_id, display_dim, node_size) {
    var nodes = get_layout(tree_var, focus_node_id, display_dim, node_size);
    var nodes_pos = {"x": nodes.map(function(d) { return d.x }),
        "y": nodes.map(function(d) { return d.y })};
    return {"x_min": d3.min(nodes_pos.x), "x_max": d3.max(nodes_pos.x),
        "y_min": d3.min(nodes_pos.y), "y_max": d3.max(nodes_pos.y)};
}


function filter_doi(tree_var, min_doi) {
    var keys = Object.keys(tree_var)
    if (keys.indexOf("children") != -1) {
        var children_copy = tree_var.children.slice();
        tree_var.children = []

        for (var i = 0; i < children_copy.length; i++) {
            if (children_copy[i].doi >= min_doi) {
                tree_var.children.push(filter_doi(children_copy[i], min_doi));
            }
        }
    }

    var tree_var_res = {}
    for (var k = 0; k < keys.length; k++) {
        if (keys[k] != "children") {
            tree_var_res[keys[k]] = tree_var[keys[k]];
        } else {
            if (tree_var.children.length > 0) {
                tree_var_res[keys[k]] = tree_var[keys[k]];
            }
        }
    }

    return tree_var_res;
    console.log(tree_var_res);
}


function filter_block(tree_var, depth, segment) {
    if (tree_var.depth == depth && tree_var.segment == segment) {
        return;
    }

    if (Object.keys(tree_var).indexOf("children") != -1) {
        var subtree = []
        for (var i = 0; i < tree_var.children.length; i++) {
            var filtered = filter_block(tree_var.children[i], depth, segment);
            if (typeof filtered != "undefined") {
                subtree.push(filtered);
            }
        }
        tree_var.children = subtree;
    }
    return tree_var;

}


function get_block_dois(tree_var) {
    var nodes = d3.layout.cluster()
        .nodes(tree_var);

    var block_dois = {};
    unique_depths = _.uniq(nodes.map(function(d) { return d.depth }));

    // initialize structure to store dois
    for (var i = 0; i < unique_depths.length; i++) {
        block_dois[i] = {};
        cur_nodes = nodes.filter(function(d) { return d.depth == i });
        unique_segments = _.uniq(cur_nodes.map(function(d) { return d.segment; }));
        for (var j = 0; j < unique_segments.length; j++) {
            block_dois[unique_depths[i]][unique_segments[j]] = [];
        }
    }

    // fill in actual values
    for (var i = 0; i < nodes.length; i++) {
        cur_depth = nodes[i].depth
        cur_segment = nodes[i].segment
        block_dois[cur_depth][cur_segment].push(nodes[i].doi);
    }

    return block_dois;
}


function average_block_dois(tree_var) {
    var block_dois = get_block_dois(tree_var);
    var averages_values = [],
        averages_segments = [],
        averages_depths = [];

    var depths = Object.keys(block_dois);
    for (var i = 0; i < depths.length; i++) {
        var segments = Object.keys(block_dois[i]);
        for (var j = 0; j < segments.length; j++) {
            averages_depths.push(depths[i])
            averages_segments.push(segments[j])
            averages_values.push(d3.mean(block_dois[depths[i]][segments[j]]));
        }
    }

    return {"depths": averages_depths,
        "segments": averages_segments,
        "values": averages_values};
}


function trim_width(tree_var, focus_node_id, display_dim, node_size) {
    var average_dois = average_block_dois(tree_var);
    var sorted_dois = average_dois.values
        .concat()
        .sort(function(a, b) { return a - b; });
    sorted_dois = _.uniq(sorted_dois);

    // iterate over DOIs, starting with the smallest
    for (var i = 0; i < sorted_dois.length; i++) {
        cur_bounds = get_layout_bounds(tree_var, focus_node_id,
            display_dim, node_size);
        if (cur_bounds.x_max < display_dim[0] & cur_bounds.x_min > 0) {
            break;
        }

        // find all blocks with the current DOI value
        for (var j = 0; j < average_dois.values.length; j++) {
            if (average_dois.values[j] == sorted_dois[i]) {
                tree_var = filter_block(tree_var, average_dois.depths[j], average_dois.segments[j]);
            }
        }

    }
    return tree_var;
    console.log(tree_var);

}

function trim_height(tree_var) {
    return tree_var;
    console.log(tree_var);
}



function tree_block(tree_var0, focus_node_id, min_doi = -10,
                    display_dim = [500, 500],
                    node_size = [4, 10]) {
    console.log(tree_var0);


    var tree_var = jQuery.extend(true, {}, tree_var0);

    console.log(tree_var);

    tree_var = supplement_tree(tree_var, 0);
    tree_var = set_doi(tree_var, focus_node_id, min_doi);
    tree_var = filter_doi(tree_var, min_doi);
    tree_var = segment_tree(tree_var);

    var cur_bounds = get_layout_bounds(tree_var, focus_node_id,
        display_dim, node_size);
    if (cur_bounds.x_min < 0 || cur_bounds.x_max > display_dim[0]) {
        tree_var = trim_width(tree_var, focus_node_id, display_dim, node_size);
    }
    if (cur_bounds.y_min < 0 || cur_bounds.y_max > display_dim[1]) {
        tree_var = trim_height(tree_var, display_dim, node_size);
    }

    var nodes = get_layout(tree_var, focus_node_id, display_dim, node_size);

    return {"tree_var": tree_var, "nodes": nodes}


}

function supplement_tree(tree_var, depth) {
    tree_var.depth = depth;
    tree_var.hidden_desc = false;
    if (Object.keys(tree_var).indexOf("children") != -1) {
        for (var i = 0; i < tree_var.children.length; i++) {
            tree_var.children[i] = supplement_tree(tree_var.children[i],
                depth + 1);
        }
    }
    return tree_var;
}

