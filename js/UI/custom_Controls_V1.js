/**
 * Created by Jansi on 9/26/16.
 */


/* Toggle action for parameter control sidebar using task glyphicon */


$(".controlToggle").click(function(){

    $(".sidebar").toggle();

    if($(".sidebar").is(":hidden")){

        $(".topnav").css("margin-left","0");
        var width = $( window ).width();

        $("#optionsBar").css("width", width);

    }

    else{
        $(".topnav").css("margin-left","15%");

    }

});


/* Hide the parameter options within each category by default */

$(".pc2").hide();
$(".pc3").hide();
$(".pc4").hide();
$(".pc5").hide();

/* Toggle parameter options for respective category on clicking chevron-down icon */




$(".d1").click(function(){

    $(".pc1").toggle();
});

$(".d2").click(function(){

    $(".pc2").toggle();
});

$(".d3").click(function(){

    $(".pc3").toggle();
});

$(".d4").click(function(){

    $(".pc4").toggle();
});

