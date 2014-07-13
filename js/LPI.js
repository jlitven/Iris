var LPI = (function () {
    var canvas = document.getElementsByTagName('canvas');
    var context = canvas[0].getContext('2d');
    context.globalCompositeOperation = 'lighter';
    var simulationManager = (function () {
        
        var plateManager = (function () {
            
            // place holder variables till actual functionality of generating simulations is implemented
            var timesteps = 100;
            var channels = 2;
            var intensities = generateRandomIntensities(timesteps, $("#columns").val(), $("#rows").val(), channels);
            var currentStep = 0;
            var interval = 200; //refresh rate in milliseconds

            //Generates an array containting random intensities of 0-255
            //For testing purposes only
            function generateRandomIntensities (timesteps, xNum, yNum, channels) {
                randomIntensities = [];
                for (var h = 0; h < timesteps; h++) {
                    randomIntensities[h] = []
                    for (var i = 0; i < xNum; i++) {
                        randomIntensities[h][i] = [];
                        for (var j = 0; j < yNum; j++) {
                            randomIntensities[h][i][j] = [];
                            for (var k = 0; k < channels; k++) {
                                randomIntensities[h][i][j][k] = Math.random();
                            }
                        }
                    }
                }
                return randomIntensities;
            }            
            
            //Gets the amount of steps that should be advanced each interval
            function getStepMagnitude() {
                return 1;
            }
            
            //Gets the maximum number of steps of the simulation
            function getMaxSteps() {
                return intensities.length - 1;
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
                $("#displayTime").text(prettyTime(time))
                //Converts a time in milliseconds to a human readable string

            }
            
            //Redraws the plate view. Takes deviceChange as a boolean input. If deviceChange = undefined, it will evaluate to false
            // and the intensity values will not be changed (temporary feature till actual simulation data is presented)
            function updatePlate(deviceChange) {
                deviceChange = deviceChange || false;
                if (deviceChange == true) {
                    intensities = generateRandomIntensities(timesteps, $("#columns").val(), $("#rows").val(), channels);
                    currentStep = 0;
                }
                drawPlate(intensities[currentStep]);
            }
            
            //Draws a plate given a 3D array of x,y,channel intensities
            function drawPlate(intensityStep) {
                //Executes drawing of a well
                function drawWell(xPosition, yPosition, spacing, fillStyle, lineWidth, lineColor) {
                    context.beginPath();
                    context.fillStyle = fillStyle;
                    context.arc(xPosition * spacing + spacing * 0.5 + lineWidth * 2,
				        yPosition * spacing + spacing * 0.5 + lineWidth * 2,
				        spacing * 0.5, 0, 2 * Math.PI, false);
                    context.fill();
                    context.lineWidth = lineWidth;
                    context.strokeStyle = lineColor;
                    context.stroke();
                    context.closePath();
                }
                
                var canvas = document.querySelector('canvas');
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                var spacing = getSpacing($("#columns").val(), $("#rows").val())
                context.clearRect(0, 0, context.canvas.width, context.canvas.height);
                for (var x = 0; x < intensityStep.length; x++) {
                    for (var y = 0; y < intensityStep[x].length; y++) {
                        //Draw black background
                        drawWell(x, y, spacing, 'rgba(0,0,0,1)', 3, '#000000')
                        for (var c = 0; c < intensityStep[x][y].length; c++) {
                            drawWell(x, y, spacing, 'rgba(255,0,0,' + intensityStep[x][y][c] + ')', 3, '#000000')
                        }
                    }
                }
            }
            //Calculates the spacing given current values of the canvas element
            function getSpacing(xNum, yNum) {
                return Math.min(Math.floor((context.canvas.width - 10) / xNum)
            , Math.floor((context.canvas.height - 10) / yNum));
            }

            //Toggle between playing and pausing the well simulation
            $("#play").click(function () {
                var button = $("#play");
                if (button.val() == "Play") {
                    playWellSim();
                    button.val("Pause");
                }
                else if (button.val() == "Pause") {
                    pauseWellSim();
                    button.val("Play");
                }
            });
            $("#time").change(function () {
                currentStep = Math.round($('#time').val() * getMaxSteps());
                updatePlate();
                updateTime(currentStep / getMaxSteps());
            });
            //Redraws the wells when a custom number of rows or columns is inputted by the user
            $("#rows, #columns").change(function () {
                updatePlate(deviceChange = true);
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
                    $("#WellRow").val(row);
                    $("#WellCol").val(col);   
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
            chart = new CanvasJS.Chart("wellSim",
		        {
		            title: {
		                text: "Time Course for Well 1, 1",
		                fontSize: 24,
		            },
                    zoomEnabled: true, 
		            axisX: {
		                valueFormatString: "DD/MMM"
		            },
		            toolTip: {
		                shared: true
		            },
		            legend: {
                        cursor: "pointer",
                        itemclick: function (e) {
                            //console.log("legend click: " + e.dataPointIndex);
                            //console.log(e);
                            if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                                e.dataSeries.visible = false;
                            } else {
                                e.dataSeries.visible = true;
                            }

                            chart.render();
                        }
		            },

		            data: [
			        {
			            type: "line",
			            showInLegend: true,
			            lineThickness: 2,
			            name: "LED1",
			            markerType: "square",
			            color: "#F08080",
			            dataPoints: [
				        { x: new Date(2010, 0, 3), y: 650 },
				        { x: new Date(2010, 0, 5), y: 700 },
				        { x: new Date(2010, 0, 7), y: 710 },
				        { x: new Date(2010, 0, 9), y: 658 },
				        { x: new Date(2010, 0, 11), y: 734 },
				        { x: new Date(2010, 0, 13), y: 963 },
				        { x: new Date(2010, 0, 15), y: 847 },
				        { x: new Date(2010, 0, 17), y: 853 },
				        { x: new Date(2010, 0, 19), y: 869 },
				        { x: new Date(2010, 0, 21), y: 943 },
				        { x: new Date(2010, 0, 23), y: 970 }
				        ]
			        },
			        {
			            type: "line",
			            showInLegend: true,
			            name: "LED2",
			            color: "#20B2AA",
			            lineThickness: 2,

			            dataPoints: [
				        { x: new Date(2010, 0, 3), y: 510 },
				        { x: new Date(2010, 0, 5), y: 560 },
				        { x: new Date(2010, 0, 7), y: 540 },
				        { x: new Date(2010, 0, 9), y: 558 },
				        { x: new Date(2010, 0, 11), y: 544 },
				        { x: new Date(2010, 0, 13), y: 693 },
				        { x: new Date(2010, 0, 15), y: 657 },
				        { x: new Date(2010, 0, 17), y: 663 },
				        { x: new Date(2010, 0, 19), y: 639 },
				        { x: new Date(2010, 0, 21), y: 673 },
				        { x: new Date(2010, 0, 23), y: 660 }
				        ]
			        }


			        ]
		        });
		        chart.render();
        }

        //Toggle between types of visualization
        $("#view").click(function () {
            var button = $("#view");
            if (button.val() == "Plate View") {
                $(".plate").show();
                $(".well").hide();
                button.val("Well View");
                plateManager.init();
            }
            else if (button.val() == "Well View") {
                $(".plate").hide();
                $(".well").show();
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
                        var newLED = $("#LEDsDisplay").children().filter(".template").clone(); //Pull and clone the html template of an LED
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
            // Check to see if the counter has been initialized
            if (typeof addFunc.index == 'undefined') {
                // It has not perform the initilization
                addFunc.index = 0;
            }
            //Otherwise increment the index
            else {
                addFunc.index++;
            }
            var newFunc = $("." + type + ".template").clone();
            newFunc.removeClass("template");
            //Fields to give unique identifiers
            var fields;
            if (type == "const") { fields = ["funcType", "start", "replicates", "funcWavelength", "ints", "RC", "CR"]; }
            else if (type == "step") { fields = ["funcType", "start", "replicates", "funcWavelength", "RC", "CR", "amplitude", "stepTime", "samples", "stepUp", "stepDown"]; }
            else if (type == "sine") { fields = ["funcType", "start", "replicates", "funcWavelength", "RC", "CR", "amplitude", "phase", "period", "offset", "samples"] };
            //Cycle through each of the fields giving them unique IDs, names, and associating the labels
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                newFunc.find("input." + field).attr("id", field + addFunc.index);
                newFunc.find("input." + field).attr("name", field + addFunc.index);
                newFunc.find("label." + field).attr("for", field + addFunc.index);
            }

            //Give radio buttons the same name but differnent 
            newFunc.find("input.RC").attr("name", "orientation" + addFunc.index).attr("value", "row");
            newFunc.find("input.CR").attr("name", "orientation" + addFunc.index).attr("value", "column");
            if (type === "step") {
                newFunc.find("input.stepUp").attr("name", "sign" + addFunc.index).attr("value", "stepUp");
                newFunc.find("input.stepDown").attr("name", "sign" + addFunc.index).attr("value", "stepDown");
            }
            //Insert element
            $("#LPSpecs").append(newFunc);
            console.log("Function added");
            //Remove function entry when close is clicked
            //This has to be done each time to register the new button
            $(".close").click(function () {
                $(this).parents(".func").remove();

            });
        }
        //Listeners for adding functions
        $("#constButt").click(function () {
            console.log("Adding constant function");
            addFunc("const");
        });
        $("#stepButt").click(function () {
            console.log("Adding step function");
            addFunc("step");
        });
        $("#sineButt").click(function () {
            console.log("Adding sine function");
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
                if (device == "LTA") { setDeviceFields(8, 8, [10, 20, 30, 40]); }
                else if (device == "LPA") { setDeviceFields(4, 6, [11, 22], [[1, 0, 0], [0, 1, 0]]) }
                else if (device == "TCA") { setDeviceFields(8, 12, [12, 23], [[0, 1, 0], [0, 0, 1]]) }
            }
            simulation.init();
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
    simulationManager.init();
})();