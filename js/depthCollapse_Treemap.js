/**
 * Created by Jansi on 1/4/17.
 */
var jsonTree, branchInclude, maxDepth, treeType = document.getElementById("treeType").value;

function getData(newickInput) {

    jsonTree = parseNewick(newickInput);

    var unmodifiedTree = d3.hierarchy(jsonTree);

    initialSettings();

}

/* Initial values for all parameters within the control panel */

function initialSettings() {

    var hiData = d3.hierarchy(jsonTree, function (d) {
        return d.children;
    });


    console.log(hiData);

    maxDepth = d3.max(hiData.descendants().map(function (d) {
        return d.depth;
    }));
    /* Assign variable name for all controls */

    var depthSlider = document.getElementById("depthSlider");
    var linkType = document.getElementById("linkType");
    var fontSize = document.getElementById("fontSize");
    var fontType = document.getElementById("fontType");

    /* Assign initial value for depth collpase slider */

    depthSlider.value = maxDepth / 2;
    depthSlider.max = maxDepth;
    depthSlider.min = 0;
    depthSlider.step = 1;

    render(hiData);

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

/* find the highest ever node collapsed at the moment for transition back to the */
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

function dyFactorAppx(leaves) {

    if (leaves > 0 && leaves <= 100) {

        return 150;
    }

    else if (leaves > 100 && leaves < 1000) {

        return 100;
    }

    else {
        return 50;
    }

}

/** parameter: descendants for each node
 *  Description: Computes the branch length from the root adding up all the ancestors
 */


function d_root_bl(d) {

    if (!d.parent) {
        return 0;
    }
    else {
        return (d.data.length + d.parent.data.dRoot);
    }

}

/* Function that is all about drawing tree */

function render(hiData) {


    var w = 1200, h = 1000, i = 0, duration = 750, dyFactor = 50, init_dyFactor = 50;
    var margin = {top: 20, right: 120, bottom: 20, left: 120},
        initWidth = document.getElementById("visual").offsetWidth,
        initHeight = screen.height,
        height = screen.height,
        width = document.getElementById("visual").offsetWidth;

    var svg = d3.select("#visual").append("svg")
        .style("width", width)
        .style("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate("
            + 40 + "," + margin.top + ")");

    var root = hiData;
    var leavesArray = hiData.leaves();


    root.descendants().forEach(function (d, i) {

        d.nDescendants = countDescendants(d);
        d.uniqueId = "n" + i;
        d.leaves = checkLeaf(d);
        d.leavesCount = countLeaves(d);
        d.data.Depth = d.depth;
        d.data.dRoot = d_root_bl(d);
    });


    var totalLeaves = root.leaves.length;

    root.x0 = height / 2;
    root.y0 = 0;

    /* Color Palettes for Depth */

    var Greys = ["#fffff", "#969696", "#000000"], RdPu = ["#fff7f3", "#f768a1", "#49006a"], YlOrRd = ["#ffffcc", "#fd8d3c", "#800026"],
        YlGnBu = ["#edf8b1", '#41b6c4', "#081d58"];
    var leafDepthDomain = [document.getElementById("depthSlider").value, (10 + maxDepth) / 2, maxDepth];

    var leafDepthColor = d3.scaleLinear()
        .domain(leafDepthDomain)
        .range(YlGnBu);

    var strokeWidth = d3.scaleLinear()
        .domain([3, 30])
        .range([1, 20]);

    var treeLayout = d3.cluster().size([height, width - 100]);

    treeLayout(root);

    root.descendants().forEach(function (d, i) {
        d.ycopy = d.y;
    });
    branchInclude = root.descendants().slice(1).forEach(function (d) {
        return d.y = (d.parent.y) + (d.data.length) * dyFactor;
    });

    root.descendants().forEach(function (d) {
        collapseByDepth(d, document.getElementById("depthSlider").value);
    });
    var mainGroup, mainEnter, padOuter = 0, padTop = 0, padBottom = 0, wi, hi;

    console.log(root);

    updateTree(root);

    var tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden");

    function updateTree(source) {
        // Creates x and y position for the input tree, nodes -> get all nodes and  links -> all nodes except root
        var nodes = root.descendants(),
            links = root.descendants().slice(1);

        console.log(width);
        // if branchLength is considered
        console.log(nodes);

        // update the nodes with id
        var node = svg.selectAll('g.node')
            .data(nodes, function (d) {
                return d.id || (d.id = ++i)
            });

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

        nodeEnter.append('circle')
            .attr('class', 'node')
            .attr('r', 1e-6);

        var treeEnter = nodeEnter.append("g")
            .attr("class", 'rec')
            .attr("transform", function (d) {
                if (d._children) {
                    return "translate(" + 0 + "," + 0 + ")"
                }
            });

        var nodeUpdate = nodeEnter.merge(node);

        nodeUpdate.transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")"
            });
        nodeUpdate.selectAll('circle')
            .attr('class', 'node')
            .attr('r', function (d) {
                    if (!d.leaves) {
                        return 1e-6;
                    }
                    else {
                        return 1e-6;
                    }
                }
            );

        var treeUpdate = nodeUpdate.selectAll("g.rec")
            .attr("transform", function (d) {
                if (d._children) {
                    return "translate(" + 0 + "," + (d.leaves[0].x - d.x) + ")"
                }
            });


        mainGroup = treeUpdate.selectAll("g.main")
            .data(function (d) {
                if (d._children) {
                    var maxlength = leafLongestLength(d);
                    wi = (d.leaves[maxlength].y - d.y);
                    hi = (d.leaves[d.leaves.length - 1].x - d.leaves[0].x);
                    treemap = d3.treemap()
                        .tile(d3.treemapBinary)
                        .size([wi, hi])
                        .paddingInner(1)
                        .paddingOuter(1)
                        .paddingBottom(1)
                        .paddingTop(1)
                        .round(true);
                    unco(d);
                    var r = d.copy()
                        .sum(function (d) {
                            return d.leaves ? 0 : 1;
                        })
                        .sort(function (a, b) {
                            return b.height - a.height || b.value - a.value;
                        });
                    treemap(r);
                    console.log(r);
                    return r.descendants();
                }
                else {
                    return 0;
                }

            });

        mainEnter = mainGroup.enter()
            .append("g")
            .classed('main', true)
            .attr("transform", function (d) {
                return "translate(" + d.x0 + "," + d.y0 + ")";
            });

        mainEnter.append("rect")
            .attr("id", function (d) {
                return d.data.name;
            })
            .attr("width", function (d) {
                return d.x1 - d.x0;
            })
            .attr("height", function (d) {
                return d.y1 - d.y0;
            })
            .style("fill", function (d) {
                    return leafDepthColor(d.data.Depth)

            })
            .on("mouseover", function(d){return tooltip.style("visibility", "visible").text( d.data.Depth);})
            .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
            .on("mouseout", function(){return tooltip.style("visibility", "hidden");});

        var mainExit = mainGroup.exit().remove();

        var nodeExit = node.exit().remove();

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

    function inner(f) {

        var hhd = f.data.name;
        var mi = d3.select("#visual").transition();

        var trans = mi.selectAll("g.main").filter(function (d) {
            return hhd == d.data.name
        }).select("rect").style("fill", "black");

    }

    /*  ************************* Function that handles the transition on tree  ************************************ */

    function treeTransition() {

        var treeTransition = d3.select("#visual").transition().duration(750);


        treeTransition.selectAll(".link")
            .attr('d', function (d) {
                return "M" + d.y + "," + d.x
                    + "H" + d.parent.y
                    + "V" + d.parent.x;
            });
        var nodeTrans = treeTransition.selectAll(".node")
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")"
            });


    }


    /*  ***************  Render the barCode type chart that provides overview of leaf related data ***************** */

    var marginOverview = {top: 20, right: 120, bottom: 20, left: 120},
        initWidth_Overview = document.getElementById("overview").offsetWidth,
        height_Overview = 50,
        width_Overview = document.getElementById("overview").offsetWidth;

    /* var sortLeaves = leavesArray.sort(function(a,b){

     return a.data.dRoot - b.data.dRoot;
     }); */

    var maxBranchL = d3.extent(leavesArray, function (d) {
        return d.data.dRoot;
    });

    var xScale_Overview = d3.scaleLinear()
        .domain([0, leavesArray.length])
        .range([0, width_Overview + margin.right]);

    var yScale_Overview = d3.scaleLinear()
        .domain(maxBranchL)
        .range([3, 50]);

    var lineToolTip = d3.select("body").append("div")
        .attr("class", "linetoolTip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden");


    var svgOverview = d3.select("#overview").append("svg")
        .attr("width", width_Overview + margin.right + margin.left)
        .attr("height", height_Overview + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate("
            + 40 + "," + margin.top + ")");

    var linesData = svgOverview.selectAll("g.lineOverview")
        .data(leavesArray);

    var gEnter = linesData.enter()
        .append("g");

    var lineEnter = gEnter.append("line")
        .attr("class", "lineOverview")
        .attr("x1", function (d, i) {
            return xScale_Overview(i);
        })
        .attr("y1", 0)
        .attr("x2", function (d, i) {
            return xScale_Overview(i);
        })
        .attr("y2", function (d) {
            return yScale_Overview(d.data.dRoot);
        })
        .attr("stroke", function (d) {
            return leafDepthColor(d.depth);
        })
        .on("mouseover", function (d) {
            inner(d);
        })
        .on("mousemove", function () {
            return lineToolTip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            return lineToolTip.style("visibility", "hidden");
        });

    /* function to update the width of the barCode type chart on "increase width" button click */

    function updateOverview() {

        xScale_Overview.range([0, width_Overview + margin.right]);

        var svgOverview_Trans = d3.select("#overview").transition();

        svgOverview_Trans.selectAll("line")
            .duration(750)
            .attr("x1", function (d, i) {
                return xScale_Overview(i);
            })
            .attr("y1", 0)
            .attr("x2", function (d, i) {
                return xScale_Overview(i);
            })
            .attr("y2", function (d) {
                return yScale_Overview(d.data.dRoot);
            })
    }

    /* functions accessible within the update and render */

    function changeDepthCollapse(root, depth, update) {
        console.log(depth);
        update = root.descendants().forEach(function (d) {

            collapseByDepth(d, depth);
        });
        updateTree(update);
    }

    /* Function that expands the collapsed node by making dummy children object nulll */

    function unco(d) {
        if (d._children) {
            d.children = d._children;
            d._children.forEach(unco);
            d._children = null;
        }
    }

    /* Compute the node with longest length overall needed for laying out the treemap width and height */
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

    /* List of function to be executed on any change in parameter settings */

    // Change in depth collapse value or the depth limit

    d3.select("#depthSlider").on("input", function () {
        var current = isNaN($(this).val());
        if (!current) {
            root.descendants().forEach(function (d) {
                uncollapse(d);
            });
            changeDepthCollapse(root, this.value);
        }

    });

    /*  ******************* functions associated with parameter settings change action ******************** */

    // Change in type of tree layout "phylogram vs dendogram"
    d3.select("#treeType").on("change", function () {
        document.getElementById("depthSlider").value = maxDepth;
        var type = $(this).val();
        if (type == "Dendogram") {
            root.descendants().slice(1).forEach(function (d) {
                return d.y = d.ycopy;
            });
        }
        else {
            root.descendants().slice(1).forEach(function (d) {
                return d.y = (d.parent.y) + (d.data.length) * 50;
            });
        }
        treeTransition();
    });

    //click button to increase width of the svg and also expand branch length scale
    d3.select("#increaseWidth").on("click", function () {
        dyFactor = dyFactor + 20;
        console.log(dyFactor);
        width = width + 50;
        width_Overview = width_Overview + 50;
        d3.select("#visual").select("svg").style("width", width).style("height", height + margin.top + margin.bottom);
        //d3.select("#overview").select("svg").style("width", width_Overview + margin.right + margin.left).style("height", height_Overview + margin.top + margin.bottom);

        //updateOverview();
        branchInclude = root.descendants().slice(1).forEach(function (d) {
            return d.y = (d.parent.y) + (d.data.length) * dyFactor;
        });
        treeTransition();

    });

    //click button to decrease width of the svg and also decrease branch length scale
    d3.select("#decreaseWidth").on("click", function () {
        dyFactor = dyFactor - 20;
        width = width - 50;
        d3.select("#visual").select("svg").style("width", width).attr("height", height + margin.top + margin.bottom);
        branchInclude = root.descendants().slice(1).forEach(function (d) {
            return d.y = (d.parent.y) + (d.data.length) * dyFactor;
        });

        treeTransition();

    });

    //click button to increase height of the svg and also decrease branch length scale
    d3.select("#increaseHeight").on("click", function () {

        height = height + 50;
        d3.select("#visual").select("svg").style("width", width).style("height", height + margin.top + margin.bottom);


        treeLayout = d3.cluster().size([height, width - 100]);
        treeLayout(root);
        branchInclude = root.descendants().slice(1).forEach(function (d) {
            return d.y = (d.parent.y) + (d.data.length) * dyFactor;
        });
        treeTransition();

    });

    //click button to decrease height of the svg and also decrease branch length scale
    d3.select("#decreaseHeight").on("click", function () {
        height = height - 50;
        d3.select("#visual").select("svg").style("width", width).style("height", height + margin.top + margin.bottom);
        treeLayout = d3.cluster().size([height, width - 100]);
        treeLayout(root);
        if (treeType == "Regular") {
            branchInclude = root.descendants().slice(1).forEach(function (d) {
                return d.y = (d.parent.y) + (d.data.length) * dyFactor;
            });
        }
        treeTransition();

    });

    //restore the size of svg to original
    d3.select("#restoreSize").on("click", function () {

        d3.select("#visual").select("svg").style("width", initWidth).style("height", initHeight + margin.top + margin.bottom);
        treeLayout = d3.cluster().size([initHeight, initWidth - 100]);
        treeLayout(root);
        if (treeType == "Regular") {
            branchInclude = root.descendants().slice(1).forEach(function (d) {
                return d.y = (d.parent.y) + (d.data.length) * init_dyFactor;
            });
        }
        treeTransition();

    });

}

