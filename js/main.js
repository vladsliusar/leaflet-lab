function createMap(){
  var darkscale   = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.dark',
        detectRetina: true,
        accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NDg1bDA1cjYzM280NHJ5NzlvNDMifQ.d6e-nNyBDtmQCVwVNivz7A'
      }),

      lightscale =   L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.light',
        detectRetina: true,
        accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA'
      });

  var map = L.map('map', {
      zoomControl: false,
      center: [37.3783, -119.4179],
      zoom: 6,
      // having only one layer listed here (darkscale) ensures that the 'baselayerchange' event is fired
      layers: [darkscale]
      });
  var baseMaps = {
      "Lightscale": lightscale,
      "Darkscale": darkscale
      };
  L.control.layers(baseMaps).addTo(map);

  //change color of year count legend when base layer is changed
  map.on('baselayerchange', function(e){
    if  (e.name === "Lightscale"){
      $("#year-count").css("color","#000");
    } else if
      (e.name === "Darkscale"){
        $("#year-count").css("color","#fff");
    }
  });


  var zoomHome = L.Control.zoomHome();
  zoomHome.addTo(map);

  //call getData function
  getData(map);

};


//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 0.0013;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;

};


//Popup constructor function
function Popup(properties, attribute, layer, radius){
    this.properties = properties;
    this.attribute = attribute;
    this.layer = layer;
    this.year = attribute.split("_")[1];
    this.price = this.properties[attribute];
    // .toLocaleString method adds separators for numbers
    this.content = "<p><b>City:</b> " + this.properties.City + "</p><p><b>Median Housing Price in " + this.year + ":</b><br> " + this.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " US Dollars</p>";

    this.bindToLayer = function(){
        this.layer.bindPopup(this.content, {
            offset: new L.Point(0,-radius),
            //removes close button icon from popups
            closeButton: false
        });
    };
};


//Function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Step 4: Assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];
    //check
    //console.log(attribute);

    //create marker options
    var options = {
        fillColor: "#ff7800",//#67a1d3
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7,
        className: "circle",
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    var popup = new Popup(feature.properties, attribute, layer, options.radius);
    //add popup to circle marker
    popup.bindToLayer();


      //event listeners to open popup on hover and fill panel on click
     layer.on({
         mouseover: function(){
             this.openPopup();
         },
         mouseout: function(){
             this.closePopup();
         },
         click: function(){
             $("#panel").html(popupContent);
         }
     });

     // change border-weight of circles when hovered
     // class .circle was adeed to options to apply stule in CSS
     layer.on({
  	"mouseover": function () {
    	this.setStyle({
        weight: 3,
        color: '#75f9ec' //#a4e0f5 #6df9eb #4cf7e5 #A7EFFF #75f9ec
      })
    },
    "mouseout": function () {
    	this.setStyle({
        weight: 1,
        color: '#fff'
      })
    }
  });

    // bring circle to front when hovered and back on mouse out
    layer.on({'mouseover': function(e) {
    this.bringToFront()
  },
    "mouseout": function () {
    this.bringToBack()}
  });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
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


// Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
      if (layer.feature && layer.feature.properties[attribute]){
          //access feature properties
          var props = layer.feature.properties;

          //update each feature's radius based on new attribute values
          var radius = calcPropRadius(props[attribute]);
          layer.setRadius(radius);

          var popup = new Popup(props, attribute, layer, radius);
          //add popup to circle marker
          popup.bindToLayer();
          updateLegend(map, attribute);
          updateYearCount(map, attribute);
      };
   });
};


//Step 1: Create new sequence controls
function createSequenceControls(map, attributes){
    var SequenceControl = L.Control.extend({
          options: {
              position: 'bottomleft'
          },

          onAdd: function (map) {
              // create the control container div with a particular class name
              var container = L.DomUtil.create('div', 'sequence-control-container');

              //create range input element (slider)
              $(container).append('<input class="range-slider" type="range">');

              //add skip buttons
              $(container).append('<button class="skip" id="reverse" title="Reverse">Reverse</button>');
              $(container).append('<button class="skip" id="forward" title="Forward">Forward</button>');

                //prevent map zooming while using the slider buttons
              $(container).on('mousedown dblclick', function(e){
                L.DomEvent.stopPropagation(e);
              });
              //prevent map panning while using the slider
              $(container).mousedown(function () {
                  map.dragging.disable();
              });
              $(document).mouseup(function () {
                  map.dragging.enable();
              });

              return container;
          }
      });

    map.addControl(new SequenceControl());

    //set slider attributes
    $('.range-slider').attr({
        max: 8,
        min: 0,
        value: 0,
        step: 1
    });
    // set skip buttons attributes
    $('#reverse').html('<img src="img/left.png">');
    $('#forward').html('<img src="img/right.png">');

   //click listener for buttons
   $('.skip').click(function(){
    //get the old index value
    var index = $('.range-slider').val();

    // increment or decrement depending on button clicked
    if ($(this).attr('id') == 'forward'){
        index++;
        // if past the last attribute, wrap around to first attribute
        index = index > 8 ? 0 : index;
    } else if ($(this).attr('id') == 'reverse'){
        index--;
        // if past the first attribute, wrap around to last attribute
        index = index < 0 ? 8 : index;
    };

    // update slider
    $('.range-slider').val(index);

    // pass new attribute to update symbols
    updatePropSymbols(map, attributes[index]);
    });


    // input listener for slider
     $('.range-slider').on('input', function(){

         //get the new index value
         var index = $(this).val();

     updatePropSymbols(map, attributes[index]);
     });

};




//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

//Update the legend with new attribute
function updateLegend(map, attribute){
    //create content for legend
    var year = attribute.split("_")[1];
    var content = "Median Housing Price in " + year;

    //replace legend content
    $('#temporal-legend').html(content);

    //.get the max, mean, and min values as an object
      var circleValues = getCircleValues(map, attribute);

      for (var key in circleValues){
          //get the radius
          var radius = calcPropRadius(circleValues[key]);

          //Step 3: assign the cy and r attributes
          $('#'+key).attr({
              cy: 60 - radius,
              r: radius
          });

          //Step 4: add legend text
        $('#'+key+'-text').text("$" + (Math.round(circleValues[key])).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,"));

      };
};


//function to create the legend
function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
          // create the control container with a particular class name
          var container = L.DomUtil.create('div', 'legend-control-container');

          //add temporal legend div to container
          $(container).append('<div id="temporal-legend">')

            //Step 1: start attribute legend svg string
          var svg = '<svg id="attribute-legend" width="160px" height="60px">';

          ///object to base loop on...replaces Example 3.10 line 1
          var circles = {
              max: 18,
              mean: 38,
              min: 58
          };

        //loop to add each circle and text to svg string
        for (var circle in circles){
            //circle string
              svg += '<circle class="legend-circle" id="' + circle +
              '" fill="#ff7800" fill-opacity="0.7" stroke="#fff" cx="30"/>';

              //text string
              svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '"></text>';
      };

          //close svg string
          svg += "</svg>";

          //add attribute legend svg to container
          $(container).append(svg);

          return container;
        }
    });

    map.addControl(new LegendControl());

    updateLegend(map, attributes[0]);
};


//Update the legend with new attribute
function updateYearCount(map, attribute){
    //create content for
    var year = attribute.split("_")[1];
    var content = year;

    //replace legend content
    $('#year-count').html(content);

};


//function to create the legend
function createYearCount(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomleft',
            className: 'year-label'
        },

        onAdd: function (map) {
          // create the control container with a particular class name
          var container = L.DomUtil.create('div', 'year-control-container');

          //add temporal legend div to container
          $(container).append('<div id="year-count">')

          return container;
        }
    });

    map.addControl(new LegendControl());

    updateYearCount(map, attributes[0]);
};


//build an attributes array from the data
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

    //check result
    //console.log(attributes);
    return attributes;
};



//Import GeoJSON data
function getData(map){
    //load the data
    $.ajax("data/CA_HousingPrices.geojson", {
        dataType: "json",
        success: function(response){


          var geoJsonLayer = L.geoJson(response)
          var markers = new L.MarkerClusterGroup();
          markers.addLayer(geoJsonLayer);
          map.addLayer(markers);


            //create an attributes array
            var attributes = processData(response);

            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
            createLegend(map, attributes);
            createYearCount(map, attributes);

        }
    });
};

$(document).ready(createMap);
