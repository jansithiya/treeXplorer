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
    hiData.descendants().forEach(function (d, i) {

        d.id = i;
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

    render(hiData);
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

    var maxDepth = d3.max(hiData.descendants(), function (d) {
        return d.depth;
    });

    var color = d3.scaleSequential(d3.interpolateMagma).domain([-maxDepth, maxDepth]);

    /* var color = d3.scaleMagma()
     .domain([-4, 4]); */

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
            return color(d.depth);
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
                return color(d.depth)
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
                return color(d.depth)
            });
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



