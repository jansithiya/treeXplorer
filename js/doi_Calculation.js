/**
 * Calculate Degree of Interest for nodes based on focus node selected. The idea is based on DOI approach for space
 * constrained visualizations
 * http://dl.acm.org/citation.cfm?id=1556300
 */

/* ***** Read input file in newick format and parse convert to JSON **** */

var tree;


function getData(newickInput) {

    try {

        parseNewick(newickInput);

    }
    catch (err) {

        alert("Parse error: Please upload a valid newick file ");
    }
    tree = parseNewick(newickInput);

    countDescendants(tree);
    document.getElementById("doiValue").value = document.getElementById("doiSlider").value;
    render();
}


/* **** All the functions used to assign DOI to nodes and compute layout and filter tree are in this section **** */

/*
 Create unique id for each node in the tree as name is not always reliable as some tree file does not come with name
 */

function id(tree, treeid) {
    var idname = "id";
    tree.name = idname.concat(treeid);
    if (Object.keys(tree).indexOf("children") != -1) {
        for (var i = 0; i < tree.children.length; i++) {
            tree.children[i] = id(tree.children[i],
                treeid + 1);
        }
    }
    return tree;
}

/*
 Calculate the number of descendants for each node in the tree useful to indicate the nodes hidden under highest collapsed
 node
 */

function countDescendants(d) {
    if (!d.children) {
        return 0;
    }
    var desc = 0;
    d.children.forEach(function (d) {
        desc += 1 + countDescendants(d);
    });
    return d.des = desc;
}

/*
 Checks the selected focus node for the tree parameter passed and assigns doi for other nodes based on the focus node
 selected. The tree passed is in d3 hierarchy format and the focus node is identified using the id set for every node
 initially. The minimum doi is based on the user input from the slider
 * Return: d3 tree with doi identifier for every node
 */

function doi_calc(tree_input, focus_node, doi_min) {
    var desc_indic = check_node(tree_input, focus_node);
    if (desc_indic) {
        tree_input.doi = 0;
        if (tree_input.children != null) {
            for (var i = 0; i < tree_input.children.length; i++) {
                tree_input.children[i] = doi_calc(tree_input.children[i], focus_node, doi_min);
            }
        }
    } else {
        tree_input = set_fisheye(tree_input, -1);
    }
    return tree_input;
}


/*
 Function checks whether node of specified id is found in the tree and returns true or false.
 The parameter is passed from doi_calc function.
 */

function check_node(tree_input, node_id) {
    if (tree_input.name == node_id) {
        return true;
    }

    if (tree_input.children == null) {
        return false;
    }
    var children_indic = [];
    for (var i = 0; i < tree_input.children.length; i++) {
        var check_recur = check_node(tree_input.children[i], node_id);
        children_indic.push(check_recur);
    }
    return children_indic.some(function (x) {
        return x;
    })
}

/*
 Assigns doi for current and the children and descendants in order. For example current doi to current node and -1 to immediate
 children and -2 to the one after and so on till it gets to the minimum doi selected
 */

function set_fisheye(tree_input, doi) {
    if (tree_input.doi == undefined) {
        tree_input.doi = doi;
    }

    if (tree_input.children != undefined) {
        for (var i = 0; i < tree_input.children.length; i++) {
            tree_input.children[i] = set_fisheye(tree_input.children[i], doi - 1);
        }
    }
    return tree_input;
}


/*
 filters the array passed based on depth value provided; the depth is obtained after passing the tree input to d3's
 hierarchy layout; this filters the nodes beyond the depth value passed.
 */

function depthFilter(tree_array, depthValue) {
    return tree_array.filter(function (d) {
        return d.depth == depthValue;
    });

}

/*
 Define node segmentation for depth; the nodes and given depth level for the nodes are passed as arguments and
 segment field is returned which is used in the node segmentation for tree algorithm to layout the tree
 */

function set_segment(nodes, depths) {

    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].depth == 0) {
            nodes[i].segment = 0;
        }
    } // 0 for root which is at depth 0

    for (i = 1; i <= d3.max(depths); i++) {  //skip the root
        var parents = depthFilter(nodes, i - 1).map(function (d) {
            return d.name;
        });
        var children = depthFilter(nodes, i);

        for (var j = 0; j < children.length; j++) {
            var current = nodes.map(function (d) {
                return d.name
            })
                .indexOf(children[j].name);
            nodes[current].segment = parents.indexOf(children[j].parent.name);
        }
    }
    return nodes;
}

/*
 pass the nodes of the tree to d3 cluster layout to get dendogram layout, i.e., nodes of fixed depth are assigned
 same level/block however this can be altered by modifying the y field of the result of passing to cluster layout to
 take into account the branch length
 */

function tree_segmentation(tree_input) {

    var nodes = d3.layout.cluster()  //cluster layout for dendogram type tree in d3
        .nodes(tree_input);
    var depths = nodes.map(function (d) {
        return d.depth
    });
    nodes = set_segment(nodes, depths);
    return tree_input;

}

/*
 Tree node positioning
 */

function tree_layout(tree_input, focus_node, display_dim, node_size) {

    var nodes = d3.layout.cluster()
        .nodeSize(node_size)
        .nodes(tree_input);
    var focus = nodes.filter(function (d) {
        return d.name == focus_node;
    })[0];

    var x_move = focus.x - display_dim[0] / 2;
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].x -= x_move;
        nodes[i].y = node_size[1] * (nodes[i].depth - focus.depth) +
            display_dim[1] / 3;
    }
    return nodes;
}

/*
 Breadth and width of tree and node size; used for trimming the tree
 */

function layout_bounds(tree_input, focus_node, display_dim, node_size) {
    var nodes = tree_layout(tree_input, focus_node, display_dim, node_size);
    var nodes_pos = {
        "x": nodes.map(function (d) {
            return d.x
        }),
        "y": nodes.map(function (d) {
            return d.y
        })
    };
    return {
        "x_min": d3.min(nodes_pos.x), "x_max": d3.max(nodes_pos.x),
        "y_min": d3.min(nodes_pos.y), "y_max": d3.max(nodes_pos.y)
    };
}

/*
 Filter the nodes that does not satisfy doi and keep the interesting nodes.
 */

function doiFilter(tree_input, doi_min) {
    var keys = Object.keys(tree_input);
    if (keys.indexOf("children") != -1) {
        var children_copy = tree_input.children.slice();
        tree_input.children = [];

        for (var i = 0; i < children_copy.length; i++) {
            if (children_copy[i].doi >= doi_min) {
                tree_input.children.push(doiFilter(children_copy[i], doi_min));
            }
        }
    }
    var tree_result = {};
    for (var k = 0; k < keys.length; k++) {
        if (keys[k] != "children") {
            tree_result[keys[k]] = tree_input[keys[k]];
        } else {
            if (tree_input.children.length > 0) {
                tree_result[keys[k]] = tree_input[keys[k]];
            }
        }
    }
    return tree_result;
}

/*
 Filter away block of nodes based on doi within single tree block
 */

function blockFilter(tree_input, depth, segment) {
    if (tree_input.depth == depth && tree_input.segment == segment) {
        return;
    }

    if (Object.keys(tree_input).indexOf("children") != -1) {
        var subtree = [];
        for (var i = 0; i < tree_input.children.length; i++) {
            var filtered = blockFilter(tree_input.children[i], depth, segment);
            if (typeof filtered != "undefined") {
                subtree.push(filtered);
            }
        }
        tree_input.children = subtree;
    }
    return tree_input;

}

/*
 Rearrange the doi into blocks
 */

function getBlock_DOI(tree_input) {
    var nodes = d3.layout.cluster()
        .nodes(tree_input);

    var block_dois = {};
    var unique_depths = _.uniq(nodes.map(function (d) {
        return d.depth
    }));

    // initialize structure to store dois
    for (var i = 0; i < unique_depths.length; i++) {
        block_dois[i] = {};
        cur_nodes = nodes.filter(function (d) {
            return d.depth == i
        });
        unique_segments = _.uniq(cur_nodes.map(function (d) {
            return d.segment;
        }));
        for (var j = 0; j < unique_segments.length; j++) {
            block_dois[unique_depths[i]][unique_segments[j]] = [];
        }
    }
    for (i = 0; i < nodes.length; i++) {
        cur_depth = nodes[i].depth;
        cur_segment = nodes[i].segment;
        block_dois[cur_depth][cur_segment].push(nodes[i].doi);
    }

    return block_dois;
}

/*
 Compute the average DOI in each block
 */

function average_block_dois(tree_input) {
    var block_dois = getBlock_DOI(tree_input);
    var averages_values = [],
        averages_segments = [],
        averages_depths = [];

    var depths = Object.keys(block_dois);
    for (var i = 0; i < depths.length; i++) {
        var segments = Object.keys(block_dois[i]);
        for (var j = 0; j < segments.length; j++) {
            averages_depths.push(depths[i]);
            averages_segments.push(segments[j]);
            averages_values.push(d3.mean(block_dois[depths[i]][segments[j]]));
        }
    }

    return {
        "depths": averages_depths,
        "segments": averages_segments,
        "values": averages_values
    };
}

/*
 Breadth trimming function that is used to trim the width of the tree until it fits the specified width
 */

function trimWidth(tree_input, focus_node, display_dim, node_size) {
    var average_dois = average_block_dois(tree_input);
    var sorted_dois = average_dois.values
        .concat()
        .sort(function (a, b) {
            return a - b;
        });
    sorted_dois = _.uniq(sorted_dois);

    // iterate over DOIs, starting with the smallest
    for (var i = 0; i < sorted_dois.length; i++) {
        cur_bounds = layout_bounds(tree_input, focus_node,
            display_dim, node_size);
        if (cur_bounds.x_max < display_dim[0] & cur_bounds.x_min > 0) {
            break;
        }

        // find all blocks with the current DOI value
        for (var j = 0; j < average_dois.values.length; j++) {
            if (average_dois.values[j] == sorted_dois[i]) {
                tree_input = blockFilter(tree_input, average_dois.depths[j], average_dois.segments[j]);
            }
        }

    }
    return tree_input;
}

/*
 Wrapper to implement all the functions and layout tree accordingly
 */

function tree_implement(tree, focus_node, min_doi = -10,
                        display_dim = [500, 500],
                        node_size = [4, 10]) {
    console.log(tree);
    var tree_input = jQuery.extend(true, {}, tree);
    tree_input = treeAttributes(tree_input, 0);
    tree_input = doi_calc(tree_input, focus_node, min_doi);
    tree_input = doiFilter(tree_input, min_doi);
    tree_input = tree_segmentation(tree_input);
    console.log(tree_input);
    var cur_bounds = layout_bounds(tree_input, focus_node,
        display_dim, node_size);
    if (cur_bounds.x_min < 0 || cur_bounds.x_max > display_dim[0]) {
        tree_input = trimWidth(tree_input, focus_node, display_dim, node_size);
    }
    var nodes = tree_layout(tree_input, focus_node, display_dim, node_size);
    return {"tree_var": tree_input, "nodes": nodes}
}

/*
 Set tree attributes like depth and if nodes are hidden
 */

function treeAttributes(tree_input, depth) {
    tree_input.depth = depth;
    tree_input.hidden_desc = false;
    if (Object.keys(tree_input).indexOf("children") != -1) {
        for (var i = 0; i < tree_input.children.length; i++) {
            tree_input.children[i] = treeAttributes(tree_input.children[i],
                depth + 1);
        }
    }
    return tree_input;
}


/* ****  Draw and update the tree  **** */


//var colorPalette_Blue = ["#deebf7","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#08519c","#08306b"];


function updateTree() {

    var layout = tree_implement(tree, focus_node, min_doi,
        display_dim, node_size);

    var links = d3.layout.cluster()
        .links(layout.nodes);

    var colorPalette_Blue = ["#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"];

    console.log(d3.extent(d3.extent(layout.nodes, function (d) {
        return d.des;
    })));

    var desc_indicator = d3.scale.linear().domain(d3.extent(layout.nodes, function (d) {
        if (!d.children) {
            return d.des;
        }
    })).range(["#deebf7", "#08306b"]);

    /* tooltip to display all relevant node attributes */

    var toolTip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var diagonal = d3.svg.diagonal()
        .projection(function (d) {
            return [d.x, d.y]
        });

    var line = d3.svg.line()
        .x(function (point) {
            return point.lx;
        })
        .y(function (point) {
            return point.ly;
        });

    function lineData(d) {
        // i'm assuming here that supplied datum
        // is a link between 'source' and 'target'
        var points = [
            {lx: d.source.x, ly: d.source.y},
            {lx: d.target.x, ly: d.source.y},
            {lx: d.target.x, ly: d.target.y}
        ];
        return line(points);
    }


    var link_selection = d3.select("svg")
        .selectAll(".tree_link")
        .data(links, function (d) {
            return d.source.name + "-" + d.target.name
        });

    console.log(layout.nodes);

    var node_selection = d3.select("svg")
        .selectAll("g.node")
        .data(layout.nodes, function (d) {
            return d.name
        });

    link_selection.exit().remove();
    node_selection.exit().remove();

    // enter links and nodes that haven't been entered yet
    link_selection.enter()
        .append("path", "g")
        .classed("tree_link", true)
        .style({"opacity": 0});

    var col_scale = d3.scale.linear()
        .domain([-7, 0])
        .range(["#deebf7", "#08519c"]);

    var nodes_Enter = node_selection.enter().append("g").attr("class", "node");

    nodes_Enter.append("circle")
        .style({
            "opacity": 0,
            "fill": function (d) {
                return col_scale(d.doi)
            }
        })
        .on("click",
            function (d) {
                focus_node = d.name;
                updateTree();
            })
        .on("mouseover", function (d) {

            var nodesHidden;
            if (!d.children) {
                if (d.des) {
                    nodesHidden = d.des;
                }
                else {
                    nodesHidden = 0;
                }
            }
            else {
                nodesHidden = "NA"
            }
            toolTip.transition()
                .duration(200)
                .style("opacity", .9);
            toolTip.html("<b>" + "Name:    " + "</b>" + d.names + "<br/>" + "<b>" + "DOI:   " + "</b>" + d.doi + "<br/>" + "<b>" + "Depth:   " + "</b>" + d.depth + "<br/>" + "<b> Nodes Hidden:  </b>" + nodesHidden)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            toolTip.transition()
                .duration(500)
                .style("opacity", 0);
        });


    nodes_Enter.append("text")
        .attr('class', 'nodeText')
        .text(function (d) {
            return d.names;
        })
        .style("fill-opacity", 0);


    link_selection
        .transition()
        .duration(1000)
        .attr("d", lineData)
        .style({"opacity": 1});

    var nodes_update = node_selection.transition()
        .duration(1000);


    nodes_update.select("circle")
        .attr({
            "cx": function (d) {
                return d.x
            },
            "cy": function (d) {
                return d.y
            },
            "r": function (d) {
                if (d.name == focus_node) {
                    return 6;
                }
                else if (!d.children) {
                    if (d.des) {//highlight nodes that has hidden nodes or descendants
                        return 4;
                    }
                    else {
                        return 3;     //leaf nodes
                    }
                }
                else {
                    return 3;
                }
            }
        })
        .style("fill", function (d) {
            if (d.name == focus_node) {
                return "#a50f15";
            }
            else if (!d.children) {
                if (d.des) {//highlight nodes that has hidden nodes or descendants

                    console.log(d.des, desc_indicator(d.des));
                    return desc_indicator(d.des);
                }
                else {
                    return "#525252";     //leaf nodes
                }
            }
            else {
                return "#969696";
            }

        })
        .style("opacity", 1);

    nodes_update.select("text")
        .attr({
            "dx": function (d) {
                return d.x
            },
            "dy": function (d) {
                return d.y
            }
        })
        .style("fill-opacity", 1)
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        });


}

var height = 1000,
    width = 1000;
var node_size = [10, 50];
var min_doi = d3.select("#doiSlider").value;
var focus_node;
var display_dim = [width, height];

/*
 Append svg to div and draw tree
 */

function render() {
    focus_node = tree.name;

    var svg = d3.select("#visual")
        .append("svg")
        .attr({
            "width": width,
            "height": height
        });
    d3.select("svg")
        .append("rect")
        .attr({
            "width": width,
            "height": height,
            "fill": "#fff"
        });

    updateTree();


}

/*  *****   Functions that implements some action on parameter and update the tree     **** */

d3.select("#doiSlider")
    .on("input", function () {
        min_doi = this.value;
        document.getElementById("doiValue").value = min_doi;
        updateTree();
    });

d3.select("#xSlider")
    .on("input", function () {
        node_size[0] = this.value;
        updateTree();
    });

d3.select("#ySlider")
    .on("input", function () {
        node_size[1] = this.value;
        updateTree();
    });

$('#textShow button').click(function () {
    if ($(this).hasClass('off_active') || $(this).hasClass('on_inactive')) {
        /* code to show text */
        d3.select("#visual").selectAll("text").style("fill-opacity", 0);
    } else {
        /* code to do when locking */
        d3.select("#visual").selectAll("text").style("fill-opacity", 1);
    }

    /* reverse locking status */
    $('#textShow button').eq(0).toggleClass('off_inactive off_active btn-default btn-primary');
    $('#textShow button').eq(1).toggleClass('on_inactive on_active btn-primary btn-default');
});