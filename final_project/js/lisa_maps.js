$.getJSON("geovisprog_all_wgs84.geojson",function(data){
// add GeoJSON layer to the map once the file is loaded
var datalayer = L.geoJson(data ,{
onEachFeature: function(feature, featureLayer) {
featureLayer.bindPopup(feature.properties.NAME_1);
}
}).addTo(newMap);
newMap.fitBounds(datalayer.getBounds());
});
