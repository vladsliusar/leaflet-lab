/* Map of GeoJSON data from CA_HousingPrices.geojson */

//function to instantiate the Leaflet map
function createMap(){
    //create the map
    var map = L.map('map').setView([36.7783, -119.4179], 5.4);

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.light',
        accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NDg1bDA1cjYzM280NHJ5NzlvNDMifQ.d6e-nNyBDtmQCVwVNivz7A'
    }).addTo(map);

    //call getData function
    getData(map);

};


//Add circle markers for point features to the map
function createPropSymbols(data, map, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};


//Step 2: Import GeoJSON data
function getData(map){
    //load the data
    $.ajax("data/CA_HousingPrices.geojson", {
        dataType: "json",
        success: function(response){

        //create an attributes array
        var attributes = processData(response);
        //call function to create proportional symbols
        createPropSymbols(response, map, attributes);
        createSequenceControls(map, attributes);

        }
    });
};


//Step 3: build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];
    //properties of the first feature in the dataset
    var properties = data.features[0].properties;
    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("Year") > -1){
            attributes.push(attribute);
        };
    };
    console.log(attributes);
    return attributes;
};


//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 0.0009;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    var attribute = attributes[0];
    //check
    console.log(attribute);
    //create marker options
    var options = {
        radius: 8,
        fillColor: "#ff7800",
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
    };


    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    var popupContent = "<p><b>City:</b> " + feature.properties.City + "</p>";

    //add formatted attribute to popup content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Median Housing Price in " + year + ":</b> " + feature.properties[attribute] + " US Dollars</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent);

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
    };


//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
      if (layer.feature && layer.feature.properties[attribute]){
          //access feature properties
          var props = layer.feature.properties;

          //update each feature's radius based on new attribute values
          var radius = calcPropRadius(props[attribute]);
          layer.setRadius(radius);

          //add city to popup content string
          var popupContent = "<p><b>City:</b> " + props.City + "</p>";

          //add formatted attribute to panel content string
          var year = attribute.split("_")[1];
          popupContent += "<p><b>Median Housing Price in " + year + ":</b> " + props[attribute] + " US Dollars</p>";
          //replace the layer popup
          layer.bindPopup(popupContent, {
              offset: new L.Point(0,-radius)
        });
    };
});
};

//Step 1: Create new sequence controls
function createSequenceControls(map){
    //create range input element (slider)
    $('#panel').append('<input class="range-slider" type="range">');
    //set slider attributes
    $('.range-slider').attr({
      max: 8,
      min: 0,
      value: 0,
      step: 1
  });


    $('#panel').append('<button class="skip" id="reverse">Reverse</button>');
    $('#panel').append('<button class="skip" id="forward">Forward</button>');
    $('#reverse').html('<img src="img/reverse.png">');
    $('#forward').html('<img src="img/forward.png">');
    // Step 5: click listener for buttons
    $('.skip').click(function(){

    //get the old index value
    var index = $('.range-slider').val();

      //Step 6: increment or decrement depending on button clicked
      if ($(this).attr('id') == 'forward'){
          index++;
          //Step 7: if past the last attribute, wrap around to first attribute
          index = index > 8 ? 0 : index;
      } else if ($(this).attr('id') == 'reverse'){
          index--;
          //Step 7: if past the first attribute, wrap around to last attribute
          index = index < 0 ? 8 : index;

      };

    //Step 8: update slider
    $('.range-slider').val(index);
    updatePropSymbols(map, attributes[index]);
    });

    //Step 5: input listener for slider
    $('.range-slider').on('input', function(){

    //Step 6: get the new index value
    var index = $(this).val();
    updatePropSymbols(map, attributes[index]);
  });

};










$(document).ready(createMap);
