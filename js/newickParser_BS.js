
/**
 *  Parse the Newick format file with bootstrap value
 *  Newick format with Boot strap
 * ((raccoon:19.19959,bear:6.80041):0.84600[50],((sea_lion:11.99700, seal:12.00300):7.52973[100],((monkey:100.85930,cat:47.14069):20.59201[80], weasel:18.87953):2.09460[75]):3.87382[50],dog:25.46154);
 */

function parseNewick(a) {
    for (var e = [], r = {}, s = a.split(/\s*(;|\(|\)|,|:|\[|\])\s*/), t = 0; t < s.length; t++) {
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

            case "[":
                break;

            case "]":
                break;
            default:
                var h = s[t - 1];
                ")" == h || "(" == h || "," == h ? r.names = n : ":" == h ? (r.length = parseFloat(n)) : "[" == h && (r.bs = parseFloat(n));
                console.log(s);

        }
    }
    console.log(s);

    return r
}
