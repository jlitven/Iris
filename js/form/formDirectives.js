//Load html templates into cache
app.run(function($templateCache,$http){
    $http.get('html/const.html', {cache:$templateCache});
    $http.get('html/step.html', {cache:$templateCache});
    $http.get('html/sine.html', {cache:$templateCache});
    $http.get('html/arb.html', {cache:$templateCache});
});
//Directive for experiments, directs loading of the html file
app.directive('myExperiment', function(){
    return {
        restrict: 'A',
        templateUrl: 'html/experiment.html',
        transclude: false,
        scope: {
            experiment: '=myExperiment',
            device: '=device'
        }
    };
});
//Directive for the waveforms, directions conditional loading of the waveform html file
app.directive('myWaveform',['$compile', '$templateCache','formData','formValidation', function ($compile, $templateCache, formData, formValidation) {
    return {
        scope: {
            waveform: '=myWaveform',
            device: '=device'
        },
        restrict: 'A',
        link: function(scope, element) {
            var template = $templateCache.get(scope.waveform.file)[1];
            element.html(template);
            $compile(element.contents())(scope);
            if(scope.waveform.type === "arb") {
                //Creates variables for HandsonTables
                scope.waveform.arbData = [
                    ["Initial", 0]
                ];
                //Hack to trigger update of waveform data since it won't watch the whole list
                scope.waveform.arbDataChangedTrigger = 0;
                scope.arbTable = new Handsontable(element.find(".arbData")[0], {
                    colHeaders: ["Time[min]", "Intensity"],
                    contextMenu: ["row_above", "row_below", "remove_row", "undo", "redo"],
                    height: 120,
                    width: 170,
                    copyRowsLimit: 10000,//Default is 1000, hopefully 10 fold more doesn't break it
                    minSpareRows: 3,
                    stretchH: 'all',
                    //Validation
                    columns: [{
                        type: 'numeric',
                        format: '0.000'
                    }, {
                        type: 'numeric'
                    }],
                    cells: function (row, col, prop) {
                        var cellProperties = {}
                        if (row === 0 && col === 0) {
                            cellProperties.readOnly = true;
                            cellProperties.type = "text";
                            cellProperties.className = "htRight"
                        }
                        return cellProperties;
                    },
                    //Data source
                    data: scope.waveform.arbData
                });
                Handsontable.hooks.add("afterChange",function(changes, source){
                    scope.arbTable.validateCells(function(valid){
                        scope.waveform.handsonTableValid = valid;
                        //Hack to trigger update of waveform data since it won't watch the whole list
                        scope.$apply(scope.waveform.arbDataChangedTrigger++);
                    });
                },scope.arbTable);
                //After validation is run by handsontable run my custom validation
                Handsontable.hooks.add("afterValidate",function(isValid, value, row, prop, source){
                        //If Time
                        if(prop===0){
                            //If not initial timepoint
                            if(row !== 0) {
                                if(value === null) {
                                    return true;
                                }
                                else if(value<0){
                                    return false;
                                }
                                else if(value>formData.getParam().time){
                                    return false;
                                }
                            }
                        }
                        //If intensity
                        else if(prop===1){
                            if(value === null || value === '') {
                                return true;
                            }
                            else if(typeof value!=='number'){
                                return false;
                            }
                            else if(value<0){
                                return false;
                            }
                            else if(value>4095){
                                return false;
                            }
                        }
                    },scope.arbTable);

                //Watches for changes made by the controller when a file is loaded, does not watch for changes to individual
                //cells, handsontable handels that
                scope.$watchCollection('waveform.arbData', function () {
                    scope.arbTable.render();
                }, true);
            }
        }
    };
}]);
