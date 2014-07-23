var LPI = (function () {
    var canvas = document.getElementsByTagName('canvas');
    var context = canvas[0].getContext('2d');
    
    // LPF encoder holds all the intensities and device variables.
    // It also parses the input functions, updates the intensities, and writes the output file.
    var encoder = new LPFEncoder();
    var functionIDs = []; //Holds all open function IDs

    var simulationManager = (function () {
        var selectedRow = 1; //Default selected row
    	var selectedCol = 1; //Default selected column
	var currentStep = 0; // index of current step in simulation
        
        var plateManager = (function () {    
    	    // derived vars
            var interval = 100; //refresh rate in milliseconds 
            var deviceAtributes = encoder.deviceLEDs()["colors"];
            LEDselect(); // generates LED display toggle list for simulation

            //Generates LED selection dropdown menu for simulation
            function LEDselect() {
                $('#LEDdisplay').children().remove();
                $('#LEDdisplay').append($('<option>', { "value" : 0 }).text("All LEDs")); 
                for (var i = 0; i < deviceAtributes.length; i++) {
                    $('#LEDdisplay').append($('<option>', { "value" : (i+1) }).text("LED:" +
                                                             encoder.deviceLEDs()["waves"][i])); 
                }
            }

            //Gets the amount of steps that should be advanced each interval
            function getStepMagnitude() {
                var steps = 100;
                //sliderValue normalized to 1
                var sliderValue = parseFloat($("#speed").val())/parseFloat($("#speed").prop('max'));
                var speed = Math.sqrt(sliderValue) //where x = 0 to 1.
                var stepMagnitude = Math.round(1.0*getMaxSteps()/200*speed + getMaxSteps()/200.0);
                return stepMagnitude;
            }
            
            //Gets the maximum number of steps of the simulation
            function getMaxSteps() {
                return encoder.numPts - 1;
            }
            
            //Starts playing the well simulation from the current time
            //If the full simulation just played restart it
            function playWellSim() {
                //If stopped at end of run, restart
                if (currentStep >= getMaxSteps()) {
                    currentStep = 0;
                    updateTime(currentStep / getMaxSteps());
                }
                intervalFunc = setInterval(timestep, interval);
            }
            
            //Pauses the well simulation
            function pauseWellSim() {
                clearInterval(intervalFunc);
            }
            
            //Increments the well simulation one timestep
            function timestep() {
                updatePlate();
                updateTime(currentStep / getMaxSteps());
                //IncrementStep
                if (currentStep == getMaxSteps()) {
                    clearInterval(intervalFunc);
                    $("#play").val("Play");
                }
                else {
                    currentStep = currentStep + getStepMagnitude();
                    if (currentStep > getMaxSteps()) {
                        currentStep = getMaxSteps();
                    }
                }
            }
            
            //Updates the time interface
            function updateTime(percent) {
                function prettyTime(totalSeconds) {
                    function prettyTimeString(num) {
                        return (num < 10 ? "0" : "") + num;
                    }
                    var hours = Math.floor(totalSeconds / 3600);
                    totalSeconds = totalSeconds % 3600;
                    var minutes = Math.floor(totalSeconds / 60);
                    totalSeconds = totalSeconds % 60;
                    var seconds = Math.floor(totalSeconds);
                    // Pad the minutes and seconds with leading zeros, if required
                    hours = prettyTimeString(hours);
                    minutes = prettyTimeString(minutes);
                    seconds = prettyTimeString(seconds);
                    // Compose the string for display
                    return hours + ":" + minutes + ":" + seconds;
                }
                var time = percent * $("#length").val() * 60;
                $("#time").val(percent);
                $("#displayTime").text(prettyTime(time));
                //Converts a time in milliseconds to a human readable string

            }

            //Resizes range bars (simulation progress and simulation speed bars) to
            // width of plate.
            function drawRangeBars(spacing) {
                var plateWidth = spacing * $("#columns").val(); 
                var controlElements = ["#view", "#wellIndex", "#LEDdisplay", 
                                       "label.plate", "#play.plate", "#displayTime"];
                var controlerBaseSize = 0; //seed value
                var controlerPadding = 6; //guessed value
                var minSpeedWidth = 10; //look at CSS for value, don't know how to call in JS
                for (el in controlElements) {
                    var addition = $(controlElements[el]).width();
                    controlerBaseSize += ($(controlElements[el]).width() + controlerPadding);
                }
                var speedWidth = plateWidth - controlerBaseSize;
                $("#time").css("width", plateWidth);
                $("#speed").css("width", (minSpeedWidth > speedWidth) ? minSpeedWidth:speedWidth);
            }

            //Redraws the plate view. Takes deviceChange as a boolean input. If deviceChange = undefined, it will evaluate to false
            // and the intensity values will not be changed (temporary feature till actual simulation data is presented)
            function updatePlate(deviceChange) {
                deviceChange = deviceChange || false;
        		if (deviceChange == true) {
                    deviceAtributes = encoder.deviceLEDs()["colors"];
                    LEDselect();
                    currentStep = 0;
                    encoder.pullData();
                }
    		    drawPlate(encoder.getCurrentIntensities(currentStep));
            }
            
            //Draws a plate given a 3D array of x,y,channel intensities
            function drawPlate(intensityStep) {
                //Executes drawing of a well
                function drawWell(xPosition, yPosition, spacing, fillStyle, lineWidth, lineColor) {
                    context.beginPath();
                    context.fillStyle = fillStyle;
                    context.arc(xPosition * spacing + spacing * 0.5 + strokeWidth,
				        yPosition * spacing + spacing * 0.5 + strokeWidth,
				        spacing * 0.5, 0, 2 * Math.PI, false);
                    context.fill();
                }
                var strokeWidth = 3;
                var canvas = document.querySelector('canvas');
                canvas.style.width = '100%'; 
                canvas.style.height = '100%';
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                var spacing = getSpacing($("#columns").val(), $("#rows").val());
                drawRangeBars(spacing);
                // Upper bound of LED intensities to be displayed
                var numOfLEDs = ($("#LEDdisplay").val() == 0) ? deviceAtributes.length : $("#LEDdisplay").val() - 1; 
                for (var x = 0; x < $("#columns").val(); x++) {
                    for (var y = 0; y < $("#rows").val(); y++) {
                        //Draw black background
                        drawWell(x, y, spacing, 'rgba(0,0,0,1)', strokeWidth, '#000000'); //This draws a black background well color
                        // Lower bound of LED intensities to be displayed
                        var c = (numOfLEDs  == deviceAtributes.length ) ? 0:numOfLEDs; 
                        context.globalCompositeOperation = "lighter"; //Adds colors together
                        //Draw intensities (alpha modulation)
                        for (c; c < numOfLEDs+1; c++) {
                            drawWell(x, y, spacing, deviceAtributes[c] + intensityStep[y][x][c]/encoder.maxGSValue + ')', strokeWidth, '#000000');
                        }
                        
                        context.globalCompositeOperation = "source-over"; //draws outline of existing circle
                        context.lineWidth = strokeWidth;
                        context.strokeStyle = '#0000000';
                        context.stroke();
                        context.closePath();
                    }
                }
            }

            //Calculates the spacing given current values of the canvas element
            function getSpacing(xNum, yNum) {
                return Math.min(Math.floor((context.canvas.width - 10) / xNum),
                       Math.floor((context.canvas.height - 10) / yNum));
            }

            //Toggle between playing and pausing the well simulation
            function simToggle(){
                var button = $("#play");
                if (button.val() == "Play") {
                    playWellSim();
                    button.val("Pause");
                }
                else if (button.val() == "Pause") {
                    pauseWellSim();
                    button.val("Play");
                }
            }

            function revealDownload() {
                if (functionIDs.length != 0) {
                    $("#submit").css("width", "50%")
                                .css("border-radius", "0px")
                                .css("border-top-left-radius", "28px")
                                .css("border-bottom-left-radius", "28px")
                                .prop("value", "Reload Simuation")
                                .hide().fadeIn("slow");

                    $("#download").fadeIn("slow").show();
                }
            }

            //----------------------------------------------//
            //------------User Initiated Events-------------//
            //----------------------------------------------//

            $("#LEDdisplay").change(function () {
                updatePlate();
            });

            $("#speed").change(function () {
                //interval = updateSpeed();
                if ($("#play").val() == "Pause") {
                   simToggle();
                   simToggle();
                }
            });

            $("#play").click(function () {
                simToggle();
            });

            //Udates simulation and displayed time after every time step
            $("#time").change(function () {
                currentStep = Math.round($('#time').val() * getMaxSteps());
                updatePlate();
                updateTime(currentStep / getMaxSteps());
            });

            //Redraws the wells when a custom number of rows or columns is inputted by the user
            $("#rows, #columns").change(function () {
                updatePlate(deviceChange = true);
            });

            // Listen for 'Submt' click --> on click, calculate output & serve file
            $("#submit").click(function () {
                var startTimer = new Date().getTime();
                // read current inputs
                encoder.pullData();
            
                // calculate function output
                encoder.parseFunctions(functionIDs.length-1);

                encoder.runFunctions();
                revealDownload(); //reveals download button
            
                var endTimer = new Date().getTime();
                var elapsedTime = endTimer - startTimer;
                console.log("Elapsed time: " + elapsedTime)
            
            // Update plate
                updatePlate(false);
            });

            //When clicked, simulation is downloaded
            $("#download").click(function () {
                encoder.writeLPF();
            });

            //Redraws wells to fit the window after resizing; does not resize if plate is hidden
            $(window).resize(function () {
                if ($("#view").val() == "Well View") {
                    updatePlate();
                } else {
                    null;
                }
            });

            //Called when a well is clicked on
            $("#canvas").click(function (e) {
                var parentOffset = $(this).offset();
                var relX = e.pageX - parentOffset.left;
                var relY = e.pageY - parentOffset.top;
                var xNum = $("#columns").val();
                var yNum = $("#rows").val();
                var spacing = getSpacing(xNum, yNum);
                var realxNum = Math.ceil(relX / spacing);
                var realyNum = Math.ceil(relY / spacing);
                if (realxNum <= xNum && realyNum <= yNum) {
                    var col = Math.min(Math.ceil(relX / spacing), xNum);
                    var row = Math.min(Math.ceil(relY / spacing), yNum);
                    var spacing = getSpacing($("#columns").val(), $("#rows").val())
                    $("#WellRow").text(row);
                    $("#WellCol").text(col);
                    selectedRow = row;
                    selectedCol = col;
                    drawRangeBars(spacing);
                }
            });

            return {
                init: function (deviceChange) {
                    updatePlate(deviceChange);
                }
            }
        })();

        //Recreates the chart, probably not efficient, but allows it to scale size correctly
        function createChart() {
    	    var wellNum = (selectedRow-1)*encoder.rows + (selectedCol-1);
    	    //var channelColors = ['#CC0000', '#005C00', '#0000A3', '#4D0000'] // R, G, B, "FR"
	    var channelColors = encoder.deviceLEDs().hex;
    	    var chartData = []; // list of data objects
    	    for (var i=0;i<encoder.channelNum;i++) {		
    		// pull data for each channel of the selected tube
        	   var dataPoints = encoder.getWellChartIntensities(wellNum, i);
        		// set data point properties
        		var dp = {
        		    type: "stepLine",
        		    showInLegend: true,
        		    lineThickness: 2,
        		    name: "Channel " + i,
        		    markerType: "none",
        		    color: channelColors[i],
        		    dataPoints: dataPoints
        		}
			if (i==0) {
			    dp.click = function(e){
				currentStep = e.dataPoint.x*1000*60/encoder.totalTime*(encoder.numPts-1)
			    }
			}
    		// add to data array
                chartData.push(dp);
    	    }
            chart = new CanvasJS.Chart("wellSim",
		        {
		            title: {
		                text: "Time Course for Well (" + selectedRow + ", " + selectedCol + ")",
		                fontSize: 32,
				fontFamily: 'helvetica'
		            },
			    zoomEnabled: true, 
		            axisX: {
		                valueFormatString: "###",
				labelFontSize: 22,
				titleFontSize: 24,
				titleFontFamily: 'helvetica',
				title: "Time (min)"
		            },
			    axisY: {
				minimum: 0,
				maximum: 4100,
				interval: 500,
				labelFontSize: 22,
				titleFontSize: 24,
				titleFontFamily: 'helvetica',
				title: "Intensity (GS)"
			    },
		            toolTip: {
		                shared: true,
				borderColor: 'white'
		            },
		            legend: {
				fontFamily: "helvetica",
				cursor: "pointer",
				itemclick: function (e) {
				    console.log("legend click: " + e.dataPointIndex);
				    console.log(e);
				    if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
					e.dataSeries.visible = false;
				    } else {
					e.dataSeries.visible = true;
				    }
				    chart.render();
				},
				fontSize: 16
		            },
		            data: chartData
		        });
		        chart.render();
        }

        //Toggle between types of visualization
        $("#view").click(function () {
            var button = $("#view");
            if (button.val() == "Plate View") {
                $(".well").hide();
                $(".plate").show();
                button.val("Well View");
                plateManager.init();
            }
            else if (button.val() == "Well View") {
                $(".plate").hide();
                $(".well").css("z-index", 0).show();
                button.val("Plate View");
                createChart();
            }
        });

        return {
            init: function () {
               plateManager.init(true);
            },
            updateDisplayedLEDs: function () {
                var newLEDnum = $("#LEDnum").val(); //The currently selected number of LEDs
                var maxLEDnum = $("#LEDnum").attr("max"); //The maximum number of LEDs
                //=======================================
                //Manage LEDs in visualization
                var displayedLEDs = $("#LEDsDisplay").children().not(".template"); //A list of current LED display settings
                //If there are too many LED objects remove the ones at the end
                if (displayedLEDs.length > newLEDnum) {
                    //Iterate through all the LEDs and start removing them when the current number is surpassed
                    displayedLEDs.each(function (index, elem) {
                        if (index >= newLEDnum) {
                            $(elem).remove();
                        }
                    });
                }
                //If there are too few LED objects append on more
                else if (displayedLEDs.length < newLEDnum) {
                    for (var i = displayedLEDs.length; i < newLEDnum && i < maxLEDnum; i++) {
                        //Pull and clone the html template of an LED
                        var newLED = $("#LEDsDisplay").children().filter(".template").clone(); 
                        newLED.removeClass("template");
                        newLED.css("display", "inline");
                        //newLED.attr("id", "LEDDisplay" + i);
                        //Bind event listener
                        //Add the modified LED html to the page
                        $("#LEDsDisplay").append(newLED);
                    }
                }
            }
        }
    })();

    var inputsManager = (function () {
        /*
        / Add and remove different function types
        */
        //Add functions
        function addFunc(type) {
            // Unique ID of the function         
            function getFunctionID() {
                var ID = functionIDs.length;
                functionIDs.push(ID);
                return ID;    
            }

            //Cycle through each of the fields giving them unique IDs, names, and associating the labels
            function updateFields(newFunc, fields, ID) {
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];
                    newFunc.find("select." + field).attr("id", field + ID)
                    newFunc.find("select." + field).attr("name", field + ID)
                    newFunc.find("input." + field).attr("id", field + ID);
                    newFunc.find("input." + field).attr("name", field + ID);
                    newFunc.find("label." + field).attr("for", field + ID);
                }
                //Give radio buttons the same name but differnent 
                newFunc.find("input.RC").attr("name", "orientation" + ID).attr("value", "row");
                newFunc.find("input.CR").attr("name", "orientation" + ID).attr("value", "column");
                if (type === "step") {
                    newFunc.find("input.stepUp").attr("name", "sign" + ID).attr("value", "stepUp");
                    newFunc.find("input.stepDown").attr("name", "sign" + ID).attr("value", "stepDown");
                }
            }

            //Decrements the object's ID and updates all ID values throughout the object as
            // as well as updates the stored list of ID to reflect the change
            function decrementID() {
                var newID = ID - 1;
                functionIDs[functionIDs.indexOf(ID)] = newID;
                ID = newID
                updateFields(newFunc, fields, ID);
            }

            var ID = getFunctionID();
            var newFunc = $("." + type + ".template").clone();
            newFunc.removeClass("template");
            //Fields to give unique identifiers
            var fields;
            if (type == "const") { fields = ["funcType", "start", "replicates", "funcWavelength", "ints", "RC", "CR", "close"]; }
            else if (type == "step") { fields = ["funcType", "start", "replicates", "funcWavelength", "RC",
                                                 "CR", "amplitude", "stepTime", "samples", "stepUp", "stepDown", "close"]; }
            else if (type == "sine") { fields = ["funcType", "start", "replicates", "funcWavelength", "RC",
                                                 "CR", "amplitude", "phase", "period", "offset", "samples", "close"] };
            updateFields(newFunc, fields, ID);

            //Insert new function element
            $("#LPSpecs").append(newFunc);
            newFunc.hide().toggle(300);
            
            //Removes and closes the selected function and updates all existing function IDs to
            // reflect the change
            $(".close").click(function () {
                var element = this;    
                $(element).parents(".func").toggle(300);
                setTimeout(function() { $(element).parents(".func").remove()}, 300);
                if (element.id == ("close" + ID)) {
                    if (functionIDs.indexOf(ID) != -1) {
                        functionIDs.splice(functionIDs.indexOf(ID), 1);
                    }
                } else {
                    decrementID();
                }
                //Hides download button from view
                $("#download").hide();
                $("#submit").css("width", "100%")
                            .css("border-radius", "28px")
                            .prop("value", "Load New Simuation");
                simulationManager.init(false); // clears the function from the simulation
            });
        }
        //Listeners for adding functions
        $("#constButt").click(function () {
            addFunc("const");
        });
        $("#stepButt").click(function () {
            addFunc("step");
        });
        $("#sineButt").click(function () {
            addFunc("sine");
        });
        return {
            updateInputsWavelengths: function () {
                $(".funcWavelength > option").each(function () {
                    $(this).text($("#" + $(this).attr("value")).val());
                });
            },
            removeLED: function (index) {
                $(".wavelength" + index).remove();
            },
            addLED: function (index, id, wavelength) {
                $(".funcWavelength").append($('<option/>').attr("class", "wavelength" + index).attr("value", id).text(wavelength));
            }
        }
    })();

    var devicesManager = (function (inputs, simulation) {
        function update() {
            var fields = $("#LDSpecs").children().not("#devicesli");
            var device = $("#devices").val()
            if (device == "custom") {
                fields.show();
            }
            else {
                fields.hide();
                if (device == "LTA") { setDeviceFields(8, 8, encoder.deviceLEDs()["waves"]); }
                else if (device == "LPA") { setDeviceFields(4, 6, encoder.deviceLEDs()["waves"]); } 
                else if (device == "TCA") { setDeviceFields(8, 12, encoder.deviceLEDs()["waves"]); }
            }
            simulation.init(true);
        }
        //Updates the wavelengths in each of the inputs open

        function setDeviceFields(rows, columns, wavelengths) {
            $("#rows").val(rows);
            $("#columns").val(columns);
            $("#LEDnum").val(wavelengths.length);
            updateWavelengthNumber();
            updateWavelengthValues(wavelengths);
            //Update wavelengths in the inputs
            inputs.updateInputsWavelengths();
            //Update the LEDs displayed in the simulation
            simulation.updateDisplayedLEDs();
        }
        function updateWavelengthNumber() {
            //Update LED number
            var newLEDnum = $("#LEDnum").val(); //The currently selected number of LEDs
            var maxLEDnum = $("#LEDnum").attr("max"); //The maximum number of LEDs
            //===================================
            //Manage LEDs in inputs
            var currentLEDs = $("#LEDs").children().not(".template"); //A list of current LED objects
            //If there are too many LED objects remove the ones at the end
            if (currentLEDs.length > newLEDnum) {
                //Iterate through all the LEDs and start removing them when the current number is surpassed
                currentLEDs.each(function (index, elem) {
                    if (index >= newLEDnum) {
                        $(elem).remove();
                        //Remove LED entry from dropdown in  inputs
                        inputs.removeLED(index);
                    }
                });
            }
            //If there are too few LED objects append on more
            else if (currentLEDs.length < newLEDnum) {
                for (var i = currentLEDs.length; i < newLEDnum && i < maxLEDnum; i++) {
                    var newLED = $("#LEDs").children().filter(".template").clone(); //Pull and clone the html template of an LED
                    newLED.removeClass("template");
                    //Add unique identifiers to the varius inputs of the LED
                    newLED.children().filter("label").attr("for", "LED" + i);
                    newLED.children().filter("input").attr("id", "LED" + i).attr("name", "LED" + i);
                    //Change the text
                    newLED.children().filter("label").text("Wavelength for LED " + (i + 1));
                    //Bind event listener
                    newLED.children().filter("input").bind("change", function () {
                        inputs.updateInputsWavelengths();
                    });
                    //Add the modified LED html to the page
                    $("#LEDs").append(newLED);
                    //Add LED entry to dropdown in inputs
                    inputs.addLED(i, newLED.children().filter("input").attr("id"), newLED.children().filter("input").attr("value"));
                    //Changes width of Wavelength intensity box
                    $("#LED" + i).css("width", "60px");
                }
            }
        }
        function updateWavelengthValues(wavelengths) {
            //Update LED wavelengths
            for (var i = 0; i < wavelengths.length; i++) {
                $("#LED" + i).val(wavelengths[i]);
            }
        }
        //Listen for changes to the device selector
        $("#devices").change(function () {
            update();
        });
        //Event listening to changes in LED number
        $("#LEDnum").change(function () {
            updateWavelengthNumber();
            inputs.updateInputsWavelengths();
            simulation.updateDisplayedLEDs();
        });

        update();

    })(inputsManager, simulationManager);
})();