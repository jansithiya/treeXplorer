/**
 *
 *
 *
 */

var jsonTree, rootTree, branchInclude, maxDepth;

function getData(newickInput) {

    jsonTree = parseNewick(newickInput);

    var unmodifiedTree = d3.hierarchy(jsonTree);

    rootTree = d3.hierarchy(jsonTree);

    init(rootTree);

}

/* Initial Settings for the control panel/parameter settings and called every time a new sub-window needs to be opened */

function init(hTree, activeWindow, activeDocument) {
    /* Ensure proper current window/document */

    if (activeDocument == undefined) {
        activeDocument = this.document;
        activeWindow = this.window;
    }

    /* compute the max depth for slider input -> depth collapse */
    var maxDepth = d3.max(hTree.descendants().map(function (d) {
        return d.depth;
    }));

    activeWindow.console.log(maxDepth);
    activeWindow.console.log(hTree);

    /* Assign default values for depth collapse slider */

    var depthSlider = activeDocument.getElementById("depthSlider");
    depthSlider.value = maxDepth / 2;
    depthSlider.max = maxDepth;
    depthSlider.min = 0;
    depthSlider.step = 1;

    render(hTree, activeWindow, activeDocument);

}

function render(hTree, activeWindow, activeDocument) {

    activeWindow.console.log(activeDocument);
    var activeSelection = d3.select(activeDocument);
    var w = 960, h = 800, i = 0, duration = 750, dyFactor = 130, root, branchInclude;
    var margin = {top: 20, right: 120, bottom: 20, left: 120},
        width = w - margin.right - margin.left,
        height = h - margin.top - margin.bottom;

    var svg = activeSelection.select("#visual").append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate("
            + margin.left + "," + margin.top + ")");

    root = hTree;

    root.descendants().forEach(function (d, i) {
        d.nDescendants = countDescendants(d);
        d.uniqueId = "n" + i;
        d.leaves = checkLeaf(d);
        d.leavesCount = countLeaves(d);
    });

    root.x0 = height / 2;
    root.y0 = 0;

    var treeLayout = d3.cluster().size([height, width - 160]);

    treeLayout(root);

    branchInclude = root.descendants().slice(1).forEach(function(d){

        return d.y = d.parent.y + (d.data.length) * dyFactor;
    });


    root.descendants().forEach(function (d) {

        collapseByDepth(d, activeDocument.getElementById("depthSlider").value);

    });

    activeWindow.console.log(root.descendants());

    updateTree(root);

    function updateTree(source) {

        activeWindow.console.log(root.descendants());
        // Creates x and y position for the input tree, nodes -> get all nodes and  links -> all nodes except root
        var nodes = root.descendants(),
            links = root.descendants().slice(1);
        activeWindow.console.log(links);

        // update the nodes with id
        var node = svg.selectAll('g.node')
            .data(nodes, function (d) {
                return d.id || (d.id = ++i)
            });

        // Enter any new node at parent's position

        var nodeEnter = node.enter().append('g')
            .attr("class", 'node')
            .attr("transform", function (d) {
                if (d.parent) {
                    if (!d.parent.x0) {
                        return "translate(" + d.parent.y + "," + d.parent.x + ")"
                    }
                    else {
                        return "translate(" + d.parent.y0 + "," + d.parent.x0 + ")"
                    }
                }
                else {
                    return "translate(" + source.y0 + "," + source.x0 + ")"
                }
            });

        // Add circle for the nodes

        nodeEnter.append('circle')
            .attr('class', 'node')
            .attr('r', 1e-6);


        nodeEnter.append('path')
            .attr("d", function (d) {
                if (d._children) {
                    return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
                }
            });


        var nodeUpdate = nodeEnter.merge(node);

        // Transition to new position

              nodeUpdate.transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")"
            });

        nodeUpdate.select("circle.node")
            .attr('r', function (d) {
                if (d._children) {
                    return 2;
                }
                else if (d.leaves == null) {
                    return 2;
                }
                else {
                    return 1e-6;
                }
            });


        nodeUpdate.select('path')
            .attr("d", function (d) {
                if (d._children) {
                    var maxlen = leafLongestLength(d);
                    return "M" + 0 + "," + 0 + "L" + (d.leaves[maxlen].y - d.y) + "," + (d.leaves[0].x - d.x) + "L" + (d.leaves[maxlen].y - d.y) + "," + (d.leaves[(d.leaves.length - 1)].x - d.x) + "L" + 0 + "," + 0;
                }
            })
            .on("click", subwindowViz);


        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function (d) {
                if (d.parent) {
                    var e = findHighestCollapsed(d);
                    return "translate(" + e.y + "," + e.x + ")";
                }
                else {
                    return "translate(" + source.y0 + "," + source.x0 + ")"
                }
            });

        // On exit reduce the node circles size to 0
        nodeExit.select('circle')
            .attr('r', 1e-6);

        nodeExit.select('text')
            .style('fill-opacity', 1e-6);

        nodeExit.select('path')
            .attr("d", function (d) {
                if (d._children) {
                    return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
                }
            });

        // ****************** links section ***************************

        // Update the links...
        var link = svg.selectAll('path.link')
            .data(links, function (d) {
                return d.id;
            });

        // Enter any new links at the parent's previous position.
        var linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .attr('d', function (d) {
                if (d.parent) {
                    if (!d.parent.x0) {
                        return "M" + d.parent.y + "," + d.parent.x
                            + "H" + d.parent.y
                            + "V" + d.parent.x;
                    }
                    else {
                        return "M" + d.parent.y0 + "," + d.parent.x0
                            + "H" + d.parent.y0
                            + "V" + d.parent.x0;
                    }
                }
                else {
                    return "M" + source.y + "," + source.x
                        + "H" + source.y
                        + "V" + source.x;
                }

            });

        // UPDATE
        var linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(duration)
            .attr('d', function (d) {
                return "M" + d.y + "," + d.x
                    + "H" + d.parent.y
                    + "V" + d.parent.x;
            });

        // Remove any exiting links
        var linkExit = link.exit().transition()
            .duration(duration)
            .attr('d', function (d) {
                if (d.parent) {
                    var e = findHighestCollapsed(d);
                    return "M" + e.y + "," + e.x
                        + "H" + e.y
                        + "V" + e.x;
                }
                else {
                    return "M" + source.y + "," + source.x
                        + "H" + source.y
                        + "V" + source.x;
                }

            })
            .remove();

        // Store the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

    }

    function changeDepthCollapse(root, depth, update) {

        console.log(depth);

        update = root.descendants().forEach(function (d) {

            collapseByDepth(d, depth);
        });

        updateTree(update);

    }

    /* List of function to be executed on any change in parameter settings */

    // Change in depth collapse value or the depth limit

    activeSelection.select("#depthSlider").on("input", function () {


        var current = isNaN($(this).val());

        if (!current) {


            root.descendants().forEach(function (d) {

                uncollapse(d);

            });

            changeDepthCollapse(root, this.value);

        }
    });

}


function subwindowViz(d) {

    unco(d);
    var newTree = d.copy();
    var newWindow = window.open("http://localhost:63342/phyXPLORE/pages/depthCollapse_subWindow.html");
    newTree.descendants().forEach(function (d) {
        delete d._children;
    });
    newWindow.onload = function () {
        newWindow.console.log(d);
        var activeDocument = newWindow.document;
        newWindow.focus();
        newWindow.console.log(newTree.descendants());
        init(newTree, newWindow, newWindow.document);

    }
}

function unco(d) {

    if (d._children) {
        d.children = d._children;
        d._children.forEach(unco);
        d._children = null;
    }

}


function countDescendants(d) {

    if (!d.children) {
        return 0;
    }
    var desc = 0;
    d.children.forEach(function (d) {
        desc += 1 + countDescendants(d);
    });
    return desc;
}

// Checks if the node has any children if so then obtains all the leaves
function checkLeaf(d) {

    if (d.children) {

        return getLeafNodes(d, [])
    }
    else {
        return null;
    }
}

// Creates Array of leaf nodes for every node on tree
function getLeafNodes(d, leaves) {

    if (d.children) {
        d.children.forEach(function (d) {
            getLeafNodes(d, leaves)
        })
    }
    else {
        leaves.push(d)
    }

    return leaves;
}

function countLeaves(d) {

    if (d.children) {
        return d.leaves.length;
    }

    else {
        return null;
    }
}

function findHighestCollapsed(d) {
    if (d.parent) {
        if (d._children && d.parent.children) {
            return d;
        } else {
            return (findHighestCollapsed(d.parent));
        }
    } else {
        return d;
    }
}

function collapseByDepth(d, depthLimit) {


    if (d.depth >= depthLimit) {

        if (d.children) {
            d._children = d.children;
            d.collapsed = true;
            d.children = null;
        }

    }

}

function uncollapse(d) {

    if (d._children) {
        d.children = d._children;
        d._children = null;
    }

}

function initCollapse(d, depthLimit) {

    if (d.depth >= depthLimit) {

        if (d.children) {
            d._children = d.children;
            d.collapsed = true;
            d.children = null;
        }

    }
}

function leafLongestLength(d) {

    var max = d.leaves[0].data.length;
    var maxIndex = 0;
    for (var i = 1; i < d.leaves.length; i++) {
        if (d.leaves[i].data.length > max) {
            maxIndex = i;
            max = d.leaves[i].data.length;
        }
    }

    return maxIndex;

}
