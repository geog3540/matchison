
var polygonJSONFile = "data/geovisprog_all_wgs84.geojson";

//change the center of your map in setView
var centerLatitude = 42.17, centerLongitude = -93.45;
//Change the zoom level to fit your dataset
// zoom level 1 shows the whole world, and 15 focuses on a neighborhood level
var zoomLevel = 7;

var numberOfClasses = 5;
var colors = colorbrewer.Reds;

//TODO: change the name and id field of your data. These will be used to link the pcp with the map, and also display labels
var key = "AFFGEOID";
var dropdowntext = "Select Attribute:";

//TODO: change the name of the attributes to include in the parallel coordinate plot
var attNames = ["solid_1_mile", "pctBlack", "pctHispanicLatino", "MedianIncome", "contaminated_1_mile"];

var attLegendFormat = ".2f"

// This string is appended in front of the attribute name to make age groups descriptive
// If your attribute names do not need a preceding text, simply make this an empty string ""
var preAttributeAlias = "";

//DO NOT CHANGE ANYTHING BELOW THIS POINT UNLESS YOU KNOW WHAT YOU ARE DOING
////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

var initialColors = colors[numberOfClasses];
var pcpdata = [];
var expressed;
var regions;

//begin script when window loads
window.onload = initialize();

//the first function called once the html is loaded
function initialize(){
  setMap();
};

function setMap(){
  //TODO: change the center of your map in setView, and change the zoom level (currently set as 2) to fit your dataset
  var map = new L.map('map').setView([centerLatitude, centerLongitude], zoomLevel)
  .addLayer(new L.TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {attribution: 'Stamen'}
));

var svg = d3.select(map.getPanes().overlayPane).append("svg"),
g = svg.append("g").attr("class", "leaflet-zoom-hide");

//create quantile classes with color scale
var color = d3.scale.quantile() //designate quantile scale generator
.range(initialColors);

//d3.json("data/iowa_counties.json", function(error, jsonData) {
d3.json(polygonJSONFile, function(error, jsonData) {
  if (error) throw error;

  //create an attribute array (pcpdata)
  jsonData.features.forEach(function(d){
    var row = {};
    if(d.properties[key]){
      d.id = d.properties[key];
      row.id = d.properties[key];
    }

    attNames.forEach(function(att){
      if(d.properties[att])
      row[att] = +d.properties[att];
    });
    pcpdata.push(row)
  });

  expressed = attNames[0];
  var recolorMap = colorScale(jsonData.features);
  addLegend(recolorMap);

  // Add geography variables
  var transform = d3.geo.transform({point: projectPoint}),
  path = d3.geo.path().projection(transform);

  regions = g.selectAll(".regions")
  .data(jsonData.features)
  .enter().append("path").attr("class", "regions") //assign class for styling
  .attr("id", function(d) { return "id" + d.id; }) //id must begin with a letter
  .attr("d", path) //project data as geometry in svg
  .style("fill", function(d) { return choropleth(d, recolorMap); })
  .on("mouseover", highlight)
  .on("mouseout", dehighlight)
  .on("mousemove", moveLabel);
  //.append("desc") //append the current color
  //.text(function(d) { return choropleth(d, recolorMap); });

  map.on("viewreset", reset);
  reset();
  createDropdown(jsonData); //create the dropdown menu

  // Reposition the SVG to cover the features.
  function reset() {
    var bounds = path.bounds(jsonData),
    topLeft = bounds[0],
    bottomRight = bounds[1];

    svg.attr("width", bottomRight[0] - topLeft[0])
    .attr("height", bottomRight[1] - topLeft[1])
    .style("left", topLeft[0] + "px")
    .style("top", topLeft[1] + "px");

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

    regions.attr("d", path);
  }

  // Use Leaflet to implement a D3 geometric transformation.
  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }

  //visualize pcp
  this.pcp = d3.parcoords()("#pcp")
  .data(pcpdata)
  .color(function(d) {
    if (d[expressed]) { return recolorMap(d[expressed]); }
    else { return "#ccc"; }; })
    .render().brushable()
    .on("brush", function(items) {
      var selected = items.map(function(d) { return d.id; });
      regions.transition()
      .style('opacity', function(d) { return (selected.indexOf(d.id) > -1) ? 0.8: 0.3; })
      .style('fill-opacity', function(d) { return (selected.indexOf(d.id) > -1) ? 0.8: 0.3; })
    });

  });

}

function createDropdown(jsonData){
  //add a select element for the dropdown menu
  var dropdown = d3.select("#dropdown")
  .append("div")
  .html("<h4>Select Attribute: </h4>")
  .append("select")
  .on("change", function(){ changeAttribute(this.value, jsonData) }); //changes expressed attribute

  //create each option element within the dropdown
  dropdown.selectAll("options")
  .data(attNames)
  .enter().append("option")
  .attr("value", function(d){ return d })
  .text(function(d) {
    d = d[0].toUpperCase() + d.substring(1,3) + d.substring(3);
    return d;
  });
};

function colorScale(features){
  var color = d3.scale.quantile() //designate quantile scale generator
  .range(initialColors);
  //build array of all currently expressed values for input domain
  var domainArray = [];
  for (var a=0; a<features.length; a++){
    domainArray.push(Number(features[a].properties[expressed]));
  }
  //pass array of expressed values as domain
  color.domain(domainArray);
  return color;	 //return the color scale generator
};

function choropleth(d, recolorMap){
  //get data value
  var value = d.properties[expressed];
  //if value exists, assign it a color; otherwise assign gray
  if (value) {
    return recolorMap(value); //recolorMap holds the colorScale generator
  } else {
    return "#ccc";
  };
};

function changeAttribute(attribute, jsonData){
  //change the expressed attribute
  expressed = attribute;
  var recolorMap = colorScale(jsonData.features);

  //recolor the map
  d3.selectAll(".regions")//select every region
  .style("fill", function(d) { //color enumeration units
    return choropleth(d, recolorMap); //->
  }).style("opacity", 1)
  .select("desc") //replace the color text in each region's desc element
  .text(function(d) {
    return choropleth(d, recolorMap); //->
  });

  //remove the previous pcp so that they are not drawn on top of each other
  d3.select("#pcp").selectAll("*").remove();
  var pcp = d3.parcoords()("#pcp").data(pcpdata).color(function(d) {
    //if value exists, assign it a color; otherwise assign gray
    if (d[expressed]) {
      return recolorMap(d[expressed]); //recolorMap holds the colorScale generator
    } else {
      return "#ccc";
    };
  }).render().brushable().on("brush", function(items) {
    // select map items
    var selected = items.map(function(d) {
      return d[key];
    });
    regions.style("opacity", 0.2).filter(function(d) {
      return selected.indexOf(d.properties[key]) > -1;
    }).style("opacity", 1);

  });

  addLegend(recolorMap);
};

function addLegend(scale){
  //remove and add legend
  d3.select("#legend").selectAll("*").remove();
  var legsvg = d3.select("#legend");

  legsvg.append("g")
  .attr("class", "legendQuant")
  .attr("transform", "translate(5,5)");

  var legend = d3.legend.color()
  .labelFormat(d3.format(attLegendFormat))
  .useClass(false)
  .scale(scale);

  legsvg.select(".legendQuant")
  .call(legend);
}

function format(number){
  return d3.format(".2f")(number);
};

function highlight(data){
  // json properties
  var props = data.properties;
  var labelAttribute = "<h1>"+ format(props[expressed]) + "%</h1><br><b>" + preAttributeAlias + " " + expressed + "</b><br><b>" + props[key]+ "</b>"; //label content
  var labelName = data.id;

  // Append label
  var infolabel = d3.select("#info-label")
  .append("div") //create the label div
  .attr("class", "infolabel")
  .attr("id", props[key]+"label") //for styling label
  .html(labelAttribute) //add text

  // Select line within parallel coordinates
  pcp.highlight([props]);

  // make all other regions no important
  regions.transition(250)
  .style('opacity', function(d) { return (d.id === data.id) ? 0.9: 0.3; })
  .style('fill-opacity', function(d) { return (d.id === data.id) ? 0.9: 0.3; })
  .style('stroke', function(d) { return (d.id === data.id) ? '#000': '#fff'; });
};

function dehighlight(data){
  var props = data.properties; //json properties
  //var region = d3.selectAll("#id"+props[key]); //select the current region
  // var fillcolor = region.select("desc").text(); //access original color from desc
  // region.style("fill", fillcolor); //reset enumeration unit to orginal color

  d3.select("#id"+data.id+"label").remove(); //remove info label
  d3.select("#info-label").selectAll("*").remove();

  // make sure to unhighlight the parallel coordinates
  pcp.unhighlight([props]);

  // restore country opacity
  regions.transition(250)
  .style('opacity', 0.8)
  .style('fill-opacity', 0.8)
  .style('stroke', '#fff');
};

function moveLabel() {
  var x = d3.event.clientX-50; //horizontal label coordinate based mouse position stored in d3.event
  var y = d3.event.clientY-50; //vertical label coordinate
  d3.select(".infolabel") //select the label div for moving
  .style("margin-left", x+"px") //reposition label horizontal
  .style("margin-top", y+"px"); //reposition label vertical
};
