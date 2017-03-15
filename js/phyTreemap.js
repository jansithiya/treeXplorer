/**
 *  TreeMap layout to visualize phylogenetic tree
 */
var jsonTree;

function getData(newickInput) {

    jsonTree = parseNewick(newickInput);

    initialSettings();

}

/* Initial values for all parameters within the control panel */

function initialSettings() {

    var hiData = d3.hierarchy(jsonTree, function (d) {
        return d.children;
    });

    var interpolators = ["Magma", "Viridis", "Inferno", "Plasma", "Warm", "Cool", "Rainbow", "CubehelixDefault",

        // d3-scale-chromatic
        "Blues", "Greens", "Greys", "Oranges", "Purples", "Reds", "BuGn", "BuPu", "GnBu", "OrRd", "PuBuGn", "PuBu", "PuRd", "RdPu", "YlGnBu", "YlGn", "YlOrBr", "YlOrRd"];

    var colorTag = document.getElementById("colorPalette");
    for (var i = 0; i < interpolators.length; i++) {
        var opt = document.createElement('option');
        opt.innerHTML = interpolators[i];
        opt.value = interpolators[i];
        colorTag.appendChild(opt);
    }
    document.getElementById("colorLeavesON").checked = true;
    render(hiData);
}

function d_root_bl(d) {

    if (!d.parent) {
        return 0;
    }
    else {
        return (d.data.length + d.parent.data.dRoot);
    }

}


function render(hiData) {

    var w = 1200, h = 1000, i = 0, duration = 750;
    var margin = {top: 20, right: 50, bottom: 20, left: 50},
        height = screen.height,
        width = document.getElementById("visual").offsetWidth;

    var svg = d3.select("#visual").append("svg")
        .style("width", width + margin.right + margin.left)
        .style("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate("
            + 40 + "," + margin.top + ")");

    var format = d3.format(",d");

    hiData.descendants().forEach(function (d, i) {
        d.id = i;
        d.data.dRoot = d_root_bl(d);
    });

    var maxDepth = d3.max(hiData.descendants(), function (d) {
        return d.depth;
    });

    /* tool tip for treemap layout to provide node related info */

    var toolTip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var nodes = hiData.descendants();
    var leaves = hiData.leaves();
    var color = d3.scaleSequential(d3.interpolateMagma).domain([-maxDepth, maxDepth]);

    /* fill leaves by branch length from root */

    var leaf_minBL = d3.min(leaves, function (d) {
            return d.data.dRoot
        }),
        leaf_maxBL = d3.max(leaves, function (d) {
            return d.data.dRoot
        });
    var colorLeaves = d3.scaleSequential().interpolator(d3["interpolate" + "Greys"]).domain([leaf_minBL, leaf_maxBL]);
    var branchLength_format = d3.format(".1f");


    var treemap = d3.treemap()
        .size([width, height])
        .paddingOuter(1)
        .paddingTop(5)
        .paddingInner(1)
        .round(true);

    var root = hiData
        .eachBefore(function (d) {
            d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.id;
        })
        .sum(function (d) {
            return d.children ? 0 : 1;
        })
        .sort(function (a, b) {
            return b.height - a.height || b.value - a.value;
        });

    console.log(root);
    console.log(hiData.descendants());
    treemap(root);


    treemap(root);

    var cell = svg
        .selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("transform", function (d) {
            return "translate(" + d.x0 + "," + d.y0 + ")";
        })
        .attr("class", "node")
        .each(function (d) {
            d.node = this;
        })
        .on("mouseover", hovered(true))
        .on("mouseout", hovered(false));

    cell.append("rect")
        .attr("id", function (d) {
            return d.data.id;
        })
        .attr("width", function (d) {
            return d.x1 - d.x0;
        })
        .attr("height", function (d) {
            return d.y1 - d.y0;
        })
        .style("fill", function (d) {
            if (d.children) {
                return color(d.depth);
            }
            else {
                return colorLeaves(d.data.dRoot);
            }
        })
        .on("mouseover", function (d) {
            toolTip.transition()
                .duration(200)
                .style("opacity", .9);
            toolTip.html("<b>" + "Name:    " + "</b>" + d.data.name + "<br/>" + "<b>" + "Branch Length:   " + "</b>" + branchLength_format(d.data.dRoot) + "<br/>" + "<b>" + "Depth:   " + "</b>" + d.depth)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            toolTip.transition()
                .duration(500)
                .style("opacity", 0);
        });


    cell.append("text")
        .attr("y", function (d) {
            return (d.y1 - d.y0) / 2
        })
        .text(function (d) {
            if (!d.children) {
                return d.data.name;
            }
        });

    /* Draw legend on the top */
    //var legendLeaves = [0,leaf_maxBL/6,(leaf_maxBL/6)*2,(leaf_maxBL/6)*3,(leaf_maxBL/6)*4,(leaf_maxBL/6)*5,leaf_maxBL];
    var legendLeaves = 7;
    var legendData = [0, maxDepth / 6, (maxDepth / 6) * 2, (maxDepth / 6) * 3, (maxDepth / 6) * 4, (maxDepth / 6) * 5, maxDepth];
    var svgLegend = d3.select("#legend").append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", 50)
        .append("g")
        .attr("transform", "translate("
            + 40 + "," + margin.top + ")");

    var intFormat = d3.format(",.0f");

    /* title for legend */
    svgLegend.append("text")
        .attr("x", 10)
        .attr("y", 25)
        .text("Depth Color Range");

    var legend = svgLegend.selectAll("g.node")
        .data(legendData);

    var legendEnter = legend.enter().append("g")
        .attr("class", "node")
        .attr("transform", "translate(" + 120 + "," + 10 + ")");

    legendEnter.append("rect")
        .attr("x", function (d, i) {
            return i * 30;
        })
        .attr("y", 0)
        .attr("width", 30)
        .attr("height", 20)
        .style("fill", function (d) {
            return color(d)
        });

    legendEnter.append("text")
        .attr("x", function (d, i) {
            return (i * 30) + 10;
        })
        .attr("y", -5)
        .text(function (d) {
            return intFormat(d);
        });

    /* legend for leaves branch length */

    var leafLegendTitle = svgLegend.selectAll("g.title")
        .data(["Leaves branch length from root "]);

    var leafLegendTitle_Enter = leafLegendTitle.enter().append("g")
        .attr("class", "title");

    leafLegendTitle_Enter.append("text")
        .attr("x", (120 + (legendLeaves * 30) + 200))
        .attr("y", 25)
        .text(function (d) {
            return d;
        });

    var legendBL = svgLegend.selectAll("g.nodenew")
        .data(colorLeaves.ticks(legendLeaves));

    var legendBL_Enter = legendBL.enter().append("g")
        .attr("class", "nodenew")
        .attr("transform", "translate(" + (120 + (legendLeaves * 30) + 150 + 230) + "," + 10 + ")");

    legendBL_Enter.append("rect")
        .attr("x", function (d, i) {
            return i * 30;
        })
        .attr("y", 0)
        .attr("width", 30)
        .attr("height", 20)
        .style("fill", colorLeaves)
        .style("stroke", "black");

    legendBL_Enter.append("text")
        .attr("x", function (d, i) {
            return (i * 30) + 10;
        })
        .attr("y", -5)
        .text(function (d) {
            return branchLength_format(d);
        });

    /* *** Actions on change in parameter settings or mouse over/mouse out ***  */
    function hovered(hover) {
        return function (d) {
            d3.selectAll(d.ancestors().map(function (d) {
                return d.node;
            }))
                .classed("node--hover", hover)
                .select("rect")
                .attr("width", function (d) {
                    return d.x1 - d.x0 - hover;
                })
                .attr("height", function (d) {
                    return d.y1 - d.y0 - hover;
                });
        };
    }

    /*
     on change in tile type update the treemap layout
     */
    d3.select("#tileType").on("change", function () {
        var YlGnB = ["#edf8b1", "#081d58"];
        var tileVal = eval($("#tileType").val());
        treemap.tile(tileVal);
        treemap(root);
        cell.transition()
            .duration(750)
            .attr("transform", function (d) {
                return "translate(" + d.x0 + "," + d.y0 + ")";
            })
            .select("rect")
            .attr("width", function (d) {
                return d.x1 - d.x0;
            })
            .attr("height", function (d) {
                return d.y1 - d.y0;
            });
    });

    /*
     on color palette change modify interpolator and update rect fill this uses color palette from d3 scale chromatic
     */
    d3.select("#colorPalette").on("change", function () {

        var colorChosen = $("#colorPalette").val();


        color.interpolator(d3["interpolate" + colorChosen]);

        cell.transition()
            .duration(750)
            .select("rect")
            .style("fill", function (d) {
                if (d.children) {
                    return color(d.depth);
                }
                else {
                    return colorLeaves(d.data.dRoot);
                }
            });
        legendEnter.transition()
            .duration(750)
            .select("rect")
            .style("fill", function (d) {
                return color(d)
            });

    });
    /*
     ColorDarkness is used to alter minimum in domain value when minimum is passed as 0
     then more darker else if it is negative of max value it is less darker
     */
    d3.select("#colorDarkness").on("change", function () {

        var colorDarkness = $("#colorDarkness").val();

        if (colorDarkness == "ON") {

            color.domain([0, maxDepth]);
        }
        else {
            color.domain([-maxDepth, maxDepth]);

        }
        cell.transition()
            .duration(750)
            .select("rect")
            .style("fill", function (d) {
                if (d.children) {
                    return color(d.depth);
                }
                else {
                    return colorLeaves(d.data.dRoot);
                }
            });
        legendEnter.transition()
            .duration(750)
            .select("rect")
            .style("fill", function (d) {
                return color(d)
            });
    });

    /*
     Disable leaf coloring by branch length from the root and colors all the rect in treemap based on depth
     */
    d3.select("#colorLeavesOFF").on("click", function () {
        cell.transition()
            .duration(750)
            .select("rect")
            .style("fill", function (d) {
                return color(d.depth);
            });

        leafLegendTitle.transition()
            .duration(750)
            .select("text")
            .style("fill-opacity", 0);

        legendBL_Enter.transition()
            .duration(750)
            .select("rect")
            .style("fill", "none")
            .style("stroke", "none");

        legendBL_Enter.transition()
            .select("text")
            .style("fill-opacity", 0);

        leafLegendTitle_Enter.transition()
            .select("text")
            .style("fill-opacity", 0)

    });
    /*
     Enable leaf coloring by branch length (grey scale) from the root whereas all non-leaf nodes are colored by depth
     */
    d3.select("#colorLeavesON").on("click", function () {
        cell.transition()
            .duration(750)
            .select("rect")
            .style("fill", function (d) {
                if (d.children) {
                    return color(d.depth);
                }
                else {
                    return colorLeaves(d.data.dRoot);
                }
            });
        leafLegendTitle.transition()
            .duration(750)
            .select("text")
            .style("fill-opacity", 1);

        legendBL_Enter.transition()
            .duration(750)
            .select("rect")
            .style("fill", colorLeaves)
            .style("stroke", "black");

        legendBL_Enter.transition()
            .select("text")
            .style("fill-opacity", 1);

        leafLegendTitle_Enter.transition()
            .select("text")
            .style("fill-opacity", 1)
    });


    /*
     To show/hide text in treemap
     */
    d3.select("#textShow").on("change", function () {

        var colorDarkness = $("#textShow").val();

        if (colorDarkness == "HIDE") {

            d3.select("#visual").selectAll("text").style("fill-opacity", 0);
        }
        else {
            d3.select("#visual").selectAll("text").style("fill-opacity", 1);

        }
    });
}


