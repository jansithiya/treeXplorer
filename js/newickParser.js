/**
 * Newick format parser in JavaScript based on Jason Davies and altered to handle BootStrap Value in the newick format
<<<<<<< Updated upstream

 * Example tree (from http://en.wikipedia.org/wiki/Newick_format):
 *
 * +--0.1--A
 * F-----0.2-----B            +-------0.3----C
 * +------------------0.5-----E
 *                            +---------0.4------D
 *
=======
 * 
>>>>>>> Stashed changes
 * Newick format:
 * (A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;
 *
 * Converted to JSON:
 * {
 *   name: "F",
 *   branchset: [
 *     {name: "A", length: 0.1},
 *     {name: "B", length: 0.2},
 *     {
 *       name: "E",
 *       length: 0.5,
 *       branchset: [
 *         {name: "C", length: 0.3},
 *         {name: "D", length: 0.4}
 *       ]
 *     }
 *   ]
 * }
 *
 * Converted to JSON, but with no names or lengths:
 * {
 *   branchset: [
 *     {}, {}, {
 *       branchset: [{}, {}]
 *     }
 *   ]
 * }
 */

function parseNewick(a) {
    for (var e = [], r = {}, s = a.split(/\s*(;|\(|\)|,|:)\s*/), t = 0; t < s.length; t++) {
        var n = s[t];
        switch (n) {
            case"(":
                var c = {};
                r.children = [c], e.push(r), r = c;
                break;
            case",":
                var c = {};
                e[e.length - 1].children.push(c), r = c;

                break;
            case")":
                r = e.pop();
                break;
            case":":
                break;
            default:
                var h = s[t - 1];
                var id = "id".concat(t);
                ")" == h || "(" == h || "," == h ? (r.names = n, r.name = id) : ":" == h && (r.length = parseFloat(n))
        }

    }
    return r
}
