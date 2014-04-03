require.config({
    paths: {
        'jquery': 'vendor/jquery-1.9.1.min',
        'D3': 'vendor/d3.v3.min',
        'cf': 'vendor/crossfilter.min',
        'queue': 'vendor/queue.v1.min',
        'bootstrap': 'vendor/bootstrap/js/bootstrap.min',
        'slider': 'vendor/slider/js/bootstrap-slider',
        'tablesorter': 'vendor/tablesorter/js/jquery.tablesorter.min'
    },
    shim: {
        'D3': {
            exports: 'd3'
        },
        'queue': {
            exports: 'queue'
        },
        'cf': {
            exports: 'cf'
        },
        'bootstrap': {
            deps: ['jquery']
        },
        'slider': {
            deps: ['jquery']
        },
        'tablesorter': {
            deps: ['jquery']
        }
    }
});

// Place any jQuery/helper plugins in here.

define(['jquery','D3','cf','queue','bootstrap','slider','tablesorter'], function($, d3, cf, queue){
    // initialize a variable for crossfilter
    var cf,byNumOfCpus, byWallClockTime, byProcPerNode, byCoresPerProc, byNumOfNodes, byRamPerCpu, byRamBusSpd, byProcessor, byOS, byProblem, byCodeVer;
    var globalMaximum = [];

    // initialize svg section
    var paddingH, paddingV, widthOffset, svg;
    var masterArray = [];
    var absoluteMode = 0; // all data are shown relatively by default

    // helper functions
    function debouncer(func, timeout) {
        var timeoutID , timeout = timeout || 200;
        return function () {
            var scope = this , args = arguments;
            clearTimeout( timeoutID );
            timeoutID = setTimeout( function () {
                func.apply( scope , Array.prototype.slice.call( args ) );
            } , timeout );
        }
    }

    function parse2Integer(input){
        try{
            if(!isNaN(parseInt(input))){
                return parseInt(input);
            }else{
                return 0;
            }
        }catch(err){
            alert(err);
        }
    }

    function sort(byWhat, order){
        var result;
        // if order = 1 -> asc, order = -1 -> desc
        try{
            result = crossfilter.quicksort.by(function(d){ return d[byWhat]*order; });
            return result;
        }catch(err){
            alert(err);
            return false;
        }
    }

    function initializeD3(){
        paddingH = 120;
        paddingV = 50;
        widthOffset= ($('svg').innerWidth() - paddingH * 2)/4;
        svg = d3.select('.row.svgArea').select('svg');

        d3.select('g.axes').remove();
        d3.select('g.axesText').remove();

        // parallel coordinates: axes
        var axes = svg.append('g').attr('class','axes');
        axes.append('line').attr({'x1': paddingH, 'x2': $('svg').innerWidth()-paddingH, 'y1': 250, 'y2': 250}).style('stroke','#000000');
        axes.append('line').attr({'x1': paddingH, 'x2': paddingH, 'y1': 50, 'y2': 250}).style('stroke','#000000');
        axes.append('line').attr({'x1': paddingH+widthOffset, 'x2': paddingH+widthOffset, 'y1': 50, 'y2': 250}).style('stroke','#000000');
        axes.append('line').attr({'x1': paddingH+widthOffset*2, 'x2': paddingH+widthOffset*2, 'y1': 50, 'y2': 250}).style('stroke','#000000');
        axes.append('line').attr({'x1': paddingH+widthOffset*3, 'x2': paddingH+widthOffset*3, 'y1': 50, 'y2': 250}).style('stroke','#000000');
        axes.append('line').attr({'x1': paddingH+widthOffset*4, 'x2': paddingH+widthOffset*4, 'y1': 50, 'y2': 250}).style('stroke','#000000');

        //
        var axesText = svg.append('g').attr('class','axesText');
        axesText.append('text').text('# of CPUs').attr({'x': paddingH, 'y': 270, 'text-anchor': 'middle'}).style({'font-size': '12px'});
        axesText.append('text').text('# of Cores per CPU').attr({'x': paddingH+widthOffset, 'y': 270, 'text-anchor': 'middle'}).style({'font-size': '12px'});
        axesText.append('text').text('RAM Bus Speed').attr({'x': paddingH+widthOffset*2, 'y': 270, 'text-anchor': 'middle'}).style({'font-size': '12px'});
        axesText.append('text').text('RAM per CPU').attr({'x': paddingH+widthOffset*3, 'y': 270, 'text-anchor': 'middle'}).style({'font-size': '12px'});
        axesText.append('text').text('Wall Clock Time').attr({'x': paddingH+widthOffset*4, 'y': 270, 'text-anchor': 'middle'}).style({'font-size': '12px'});
    }

    function getHeight(datapoint, dimension, mode){
        // if mode == 0: relative mode, if mode ==1: absolute mode
        if(mode == 0){
            // using d3, calculate the relative position of a given data point
            var maxVal, minVal;
            if(dimension == 'byNumOfCpus'){
                maxVal = eval(dimension+'.top(1)')[0].number_of_cpus;
                minVal = eval(dimension+'.bottom(1)')[0].number_of_cpus;
            }else if(dimension == 'byCoresPerProc'){
                maxVal = eval(dimension+'.top(1)')[0].cores_per_processor;
                minVal = eval(dimension+'.bottom(1)')[0].cores_per_processor;
            }else if(dimension == 'byRamBusSpd'){
                maxVal = eval(dimension+'.top(1)')[0].ram_bus_speed;
                minVal = eval(dimension+'.bottom(1)')[0].ram_bus_speed;
            }else if(dimension == 'byRamPerCpu'){
                maxVal = eval(dimension+'.top(1)')[0].ram_per_cpu;
                minVal = eval(dimension+'.bottom(1)')[0].ram_per_cpu;
            }else if(dimension == 'byWallClockTime'){
                maxVal = eval(dimension+'.top(1)')[0].wall_clock_time;
                minVal = eval(dimension+'.bottom(1)')[0].wall_clock_time;
            }
            var scale = d3.scale.linear().domain([minVal, maxVal]).range([300-paddingV, paddingV]);

        }else if(mode == 1){
            var maxVal, minVal;
            if(dimension == 'byNumOfCpus'){
                maxVal = globalMaximum[0];
                minVal = 1;
            }else if(dimension == 'byCoresPerProc'){
                maxVal = globalMaximum[1];
                minVal = 1;
            }else if(dimension == 'byRamBusSpd'){
                maxVal = globalMaximum[2];
                minVal = 0;
            }else if(dimension == 'byRamPerCpu'){
                maxVal = globalMaximum[3];
                minVal = 0;
            }else if(dimension == 'byWallClockTime'){
                maxVal = globalMaximum[4];
                minVal = 0;
            }
            var scale = d3.scale.linear().domain([minVal, maxVal]).range([300-paddingV, paddingV]);
        }

        return scale(datapoint);
    }

    function updateGraphics(){
        var isAbsolute = absoluteMode;
        masterArray = [];
        byNumOfCpus.top(Infinity).forEach(function(d){
            var tempArray = [];
            tempArray.push(d.number_of_cpus);
            tempArray.push(d.cores_per_processor);
            tempArray.push(d.ram_bus_speed);
            tempArray.push(d.ram_per_cpu);
            tempArray.push(d.wall_clock_time);
            masterArray.push(tempArray);

        });

        d3.selectAll('g.dataPoint').remove();
        var dataPoints = d3.select('g.dataGroup').selectAll('g.dataPoint').data(masterArray).enter().append('g').attr('class', 'dataPoint');
        // data points (circles)
        dataPoints.append('circle').transition().attr('cx', paddingH).attr('cy', function(d){ return getHeight(d[0], 'byNumOfCpus', isAbsolute); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');
        dataPoints.append('circle').transition().attr('cx', paddingH+widthOffset).attr('cy', function(d){ return getHeight(d[1], 'byCoresPerProc', isAbsolute); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');
        dataPoints.append('circle').transition().attr('cx', paddingH+widthOffset*2).attr('cy', function(d){ return getHeight(d[2], 'byRamBusSpd', isAbsolute); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');
        dataPoints.append('circle').transition().attr('cx', paddingH+widthOffset*3).attr('cy', function(d){ return getHeight(d[3], 'byRamPerCpu', isAbsolute); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');
        dataPoints.append('circle').transition().attr('cx', paddingH+widthOffset*4).attr('cy', function(d){ return getHeight(d[4], 'byWallClockTime', isAbsolute); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');

        // nodes (lines)
        dataPoints.append('line').transition().attr('x1', paddingH).attr('x2', paddingH+widthOffset).attr('y1', function(d){ return getHeight(d[0], 'byNumOfCpus', isAbsolute); }).attr('y2', function(d){ return getHeight(d[1], 'byCoresPerProc', isAbsolute); }).style('stroke', function(d){ if(d[4]/globalMaximum[4] < 0.25){ return 'rgba(0,255,0,0.5)'; }else if(d[4]/globalMaximum[4] >= 0.25 && d[4]/globalMaximum[4] < 0.5){ return 'rgba(255,255,0,0.5)'}else if(d[4]/globalMaximum[4] >= 0.5 && d[4]/globalMaximum[4] < 0.75){ return 'rgba(242,101,34,0.5)'}else if(d[4]/globalMaximum[4] >= 0.75 && d[4]/globalMaximum[4] <= 1){ return 'rgba(255,0,0,0.5)'}else{ return 'rgba(0,0,0,0.5)'; } });
        dataPoints.append('line').transition().attr('x1', paddingH+widthOffset).attr('x2', paddingH+widthOffset*2).attr('y1', function(d){ return getHeight(d[1], 'byCoresPerProc', isAbsolute); }).attr('y2', function(d){ return getHeight(d[2], 'byRamBusSpd', isAbsolute); }).style('stroke', function(d){ if(d[4]/globalMaximum[4] < 0.25){ return 'rgba(0,255,0,0.5)'; }else if(d[4]/globalMaximum[4] >= 0.25 && d[4]/globalMaximum[4] < 0.5){ return 'rgba(255,255,0,0.5)'}else if(d[4]/globalMaximum[4] >= 0.5 && d[4]/globalMaximum[4] < 0.75){ return 'rgba(242,101,34,0.5)'}else if(d[4]/globalMaximum[4] >= 0.75 && d[4]/globalMaximum[4] <= 1){ return 'rgba(255,0,0,0.5)'}else{ return 'rgba(0,0,0,0.5)'; } });
        dataPoints.append('line').transition().attr('x1', paddingH+widthOffset*2).attr('x2', paddingH+widthOffset*3).attr('y1', function(d){ return getHeight(d[2], 'byRamBusSpd', isAbsolute); }).attr('y2', function(d){ return getHeight(d[3], 'byRamPerCpu', isAbsolute); }).style('stroke', function(d){ if(d[4]/globalMaximum[4] < 0.25){ return 'rgba(0,255,0,0.5)'; }else if(d[4]/globalMaximum[4] >= 0.25 && d[4]/globalMaximum[4] < 0.5){ return 'rgba(255,255,0,0.5)'}else if(d[4]/globalMaximum[4] >= 0.5 && d[4]/globalMaximum[4] < 0.75){ return 'rgba(242,101,34,0.5)'}else if(d[4]/globalMaximum[4] >= 0.75 && d[4]/globalMaximum[4] <= 1){ return 'rgba(255,0,0,0.5)'}else{ return 'rgba(0,0,0,0.5)'; } });
        dataPoints.append('line').transition().attr('x1', paddingH+widthOffset*3).attr('x2', paddingH+widthOffset*4).attr('y1', function(d){ return getHeight(d[3], 'byRamPerCpu', isAbsolute); }).attr('y2', function(d){ return getHeight(d[4], 'byWallClockTime', isAbsolute); }).style('stroke', function(d){ if(d[4]/globalMaximum[4] < 0.25){ return 'rgba(0,255,0,0.5)'; }else if(d[4]/globalMaximum[4] >= 0.25 && d[4]/globalMaximum[4] < 0.5){ return 'rgba(255,255,0,0.5)'}else if(d[4]/globalMaximum[4] >= 0.5 && d[4]/globalMaximum[4] < 0.75){ return 'rgba(242,101,34,0.5)'}else if(d[4]/globalMaximum[4] >= 0.75 && d[4]/globalMaximum[4] <= 1){ return 'rgba(255,0,0,0.5)'}else{ return 'rgba(0,0,0,0.5)'; } });

        refreshTable();
    }

    function refreshTable(){
        // refresh the table
        $('.tableView table tbody tr').remove();
        byNumOfCpus.top(Infinity).forEach(function(d){
            var indicator;
            if(d.wall_clock_time / globalMaximum[4] < 0.25){
                indicator = ' success';
            }else if(d.wall_clock_time / globalMaximum[4] >= 0.25 && d.wall_clock_time / globalMaximum[4] < 0.5){
                indicator = ' warning';
            }else if(d.wall_clock_time / globalMaximum[4] >= 0.5 && d.wall_clock_time / globalMaximum[4] < 0.75){
                indicator = ' fair';
            }else if(d.wall_clock_time / globalMaximum[4] >= 0.75 && d.wall_clock_time / globalMaximum[4] <= 1){
                indicator = ' danger';
            }
            $('.tableView table tbody').append("" +
                "<tr class='datum"+indicator+"'><td>"
                + d.computer_system+
                "</td><td>"
                + d.processor+
                "</td><td>"
                + d.number_of_cpus+
                "</td><td>"
                + d.cores_per_processor+
                "</td><td>"
                + d.cpu_interconnects+
                "</td><td>"
                + d.number_of_nodes+
                "</td><td>"
                + d.ram_bus_speed+
                "</td><td>"
                + d.ram_per_cpu+
                "</td><td>"
                + d.operating_system+
                "</td><td>"
                + d.problem_name+
                "</td><td>"
                + d.code_version_number+
                "</td><td>"
                + d.wall_clock_time+
                "</td></tr>")
        });

        // make sure the tablesorter data is updated
        $('.table').trigger('update');
    }

    // load and parse data asynchronously. after the data is processed, execute the run function
    queue()
        .defer(function(i, callback){
            try{
                d3.tsv('topcrunch_db_feb28_2014.tsv', function(d){
                    var arr = [];
                    d.forEach(function(data){
                        data.number_of_cpus = parse2Integer(data.number_of_cpus);
                        data.wall_clock_time = parse2Integer(data.wall_clock_time);
                        data.processors_per_node = parse2Integer(data.processors_per_node);
                        data.cores_per_processor = parse2Integer(data.cores_per_processor);
                        data.number_of_nodes = parse2Integer(data.number_of_nodes);
                        data.ram_per_cpu = parse2Integer(data.ram_per_cpu);
                        data.ram_bus_speed = parse2Integer(data.ram_bus_speed);
                        arr.push(data);
                    });

                    cf = crossfilter(arr);

                    // scaled dimensions
                    byNumOfCpus = cf.dimension(function(d){ return d.number_of_cpus; });
                    byWallClockTime = cf.dimension(function(d){ return d.wall_clock_time; });
                    byProcPerNode = cf.dimension(function(d){ return d.processors_per_node; });
                    byCoresPerProc = cf.dimension(function(d){ return d.cores_per_processor; });
                    byNumOfNodes = cf.dimension(function(d){ return d.number_of_nodes; });
                    byRamPerCpu = cf.dimension(function(d){ return d.ram_per_cpu; });
                    byRamBusSpd = cf.dimension(function(d){ return d.ram_bus_speed; });

                    // nominal dimensions
                    byProcessor = cf.dimension(function(d){ return d.processor; });
                    byOS = cf.dimension(function(d){ return d.operating_system; });
                    byProblem = cf.dimension(function(d){ return d.problem_name; });
                    byCodeVer = cf.dimension(function(d){ return d.code_version_number; });

                    callback(null,i);
                });
            }catch(err){
                alert(err);
            }


        }, 'bg').await(run);

    function run() {
        // fix for firefoxp-specific bug where the size of the svg canvas is not properly set
        $('svg').width($(window).innerWidth() - 10);

        // summary function with multiple filters support
        function summaryWithFilters(groupBy, conditions){
            var conditionalString = '';
            try{
                conditionalString+= conditions;
                if(!conditions){
                    conditionalString = 1;
                }

                function reduceAdd(p, v) {
                    eval("if ( " + conditionalString + "){ p.count = p.count + 1; }");

                    return p;
                }

                function reduceRemove(p, v) {
                    eval("if ( " + conditionalString+ "){ p.count = p.count - 1; }");

                    return p;
                }

                function reduceInitial() {
                    return { count: 0};
                }


                var results = eval(groupBy).filter(null).group().reduce(reduceAdd, reduceRemove, reduceInitial).order(function(p){ return p.count });
                return results;

            }catch(err){
                alert(err);
            }

        }
//        var filter1 = summaryWithFilters('byProcessor', ''); // no filter applied
//        var filter2 = summaryWithFilters('byProcessor', 'v.number_of_cpus <= 30'); // one filter applied
//        var filter3 = summaryWithFilters('byProcessor', 'v.number_of_cpus >= 60 && v.ram_bus_speed >= 1000'); // two filters applied

        // populate each dropdown menu with the data queried
        var AllCpus = summaryWithFilters('byProcessor','').orderNatural().top(Infinity);
        var AllOSs = summaryWithFilters('byOS','').orderNatural().top(Infinity);
        var AllProblems = summaryWithFilters('byProblem','').orderNatural().top(Infinity);
        var AllCodeVers = summaryWithFilters('byCodeVer','').orderNatural().top(Infinity);

        $(AllCpus).each(function(){
            $('.btn-group.cpu .dropdown-menu').append('<li><a>'+this.key+'</a></li>');
        });
        $(AllOSs).each(function(){
            $('.btn-group.os .dropdown-menu').append('<li><a>'+this.key+'</a></li>');
        });
        $(AllProblems).each(function(){
            $('.btn-group.problem .dropdown-menu').append('<li><a>'+this.key+'</a></li>');
        });
        $(AllCodeVers).each(function(){
            $('.btn-group.codever .dropdown-menu').append('<li><a>'+this.key+'</a></li>');
        });

        // set up quicksort functions
        var sortByNumOfCpus = sort('number_of_cpus', -1);
        var sortByNumOfCoresPerCpu = sort('cores_per_processor', -1);
        var sortByRamBusSpd = sort('ram_bus_speed', -1);
        var sortByRamPerCpu = sort('ram_per_cpu', -1);

        var maxNumOfCpus = sortByNumOfCpus(byNumOfCpus.top(Infinity), 0, byNumOfCpus.top(Infinity).length)[0]['number_of_cpus'];
        var maxNumOfCoresPerCpu = sortByNumOfCoresPerCpu(byCoresPerProc.top(Infinity), 0, byCoresPerProc.top(Infinity).length)[0]['cores_per_processor'];
        var maxRamBusSpd = sortByRamBusSpd(byRamBusSpd.top(Infinity), 0, byRamBusSpd.top(Infinity).length)[0]['ram_bus_speed'];
        var minRamBusSpd = sortByRamBusSpd(byRamBusSpd.top(Infinity), 0, byRamBusSpd.top(Infinity).length)[byRamBusSpd.top(Infinity).length-1]['ram_bus_speed'];
        var maxRamPerCpu = sortByRamPerCpu(byRamPerCpu.top(Infinity), 0, byRamPerCpu.top(Infinity).length)[0]['ram_per_cpu'];
        var minRamPerCpu = sortByRamPerCpu(byRamPerCpu.top(Infinity), 0, byRamPerCpu.top(Infinity).length)[byRamPerCpu.top(Infinity).length-1]['ram_per_cpu'];
        $('#cpus').attr('data-slider-max',maxNumOfCpus).attr('data-slider-value','[1,'+maxNumOfCpus+']');
        $('#cpuCoresPerCPU').attr('data-slider-max',maxNumOfCoresPerCpu).attr('data-slider-value','[1,'+maxNumOfCoresPerCpu+']');
        $('#ramBus').attr('data-slider-min',minRamBusSpd).attr('data-slider-max',maxRamBusSpd).attr('data-slider-value','['+minRamBusSpd+','+maxRamBusSpd+']');
        ///////// there seemed to be invalid numbers which were extremely big so I've used the second largest number as the upper limit
        $('#ramPerCPU').attr('data-slider-min',minRamPerCpu).attr('data-slider-max',8192).attr('data-slider-value','['+minRamPerCpu+','+8192+']');

        // set the behaviors of the sliders tooltips
        $('#cpus, #cpuCoresPerCPU, #ramBus, #ramPerCPU').slider({'handle': 'square'})
            .on('slideStart', function(e){
                $(this).parent().find('.tooltip').removeClass('hide').css('opacity',1);
            })
            .on('slideStop', function(e){
                $(this).parent().find('.tooltip').addClass('hide').css('opacity',0);
            });

        // set up the dropdown menu behaviors and trigger data update
        $('.dropdown-menu li').click(function(e){

            $(this).parent().parent().find('button').html($(this).text()+"<span class='caret'></span>");
            var tag = $(this).parent().parent().attr('data-tag');
            if($(this).parent().parent().find('button').text() != 'All'){
                if($('.row.selectedFilters .col-xs-12 .alert').find('.filterExists').html() == undefined){
                    $('.row.selectedFilters .col-xs-12 .alert').fadeIn(300);
                    $('.row.selectedFilters .col-xs-12 .alert').append('<h4 class="filterExists" style="display: inline">Filters applied: </h4>')
                }
                $('.row.selectedFilters .col-xs-12 .alert').find('.'+tag).remove();
                $('.row.selectedFilters .col-xs-12 .alert').append('<span class="label label-primary '+tag+'">'+$(this).text()+'</span>');
            }else{
                $('.row.selectedFilters .col-xs-12 .alert').find('.'+tag).remove();
                if($('.row.selectedFilters .col-xs-12 .alert').find('.label').html() == undefined){
                    $('.filterExists').remove();
                    $('.row.selectedFilters .col-xs-12 .alert').fadeOut(300);
                }
            }

            // changing the dropdown menu value will update the graphics as well as the table
            var useWhichDim = $(this).parent().parent().attr('data-tag');
            if($(this).text() != 'All'){
                var keyword = $(this).text();
            }else{
                var keyword = null;
            }
            var result = eval(useWhichDim+'.filter(keyword).top(Infinity)');
            updateGraphics();
            console.log(result);

        });

        // update data when slider value is updated
        $('input[data-slider-min]').on('slideStop', function(e){
            var split = $(this).val().split(',');
            var result = eval($(this).parent().parent().attr('data-tag')+'.filter')([parse2Integer(split[0]), parse2Integer(split[1])]).top(Infinity);
            $(this).parent().parent().find('input[id=minVal]').val(parse2Integer(split[0]));
            $(this).parent().parent().find('input[id=maxVal]').val(parse2Integer(split[1]));

            updateGraphics();
            console.log(result);
        });


        /////////////////////////////////////
        // below is the visualization part //
        /////////////////////////////////////

        // initialize svg & d3
        initializeD3();

        // (temporary) initialization
        byNumOfCpus.filter(null);
        globalMaximum.push(byNumOfCpus.top(1)[0]['number_of_cpus']);
        byCoresPerProc.filter(null);
        globalMaximum.push(byCoresPerProc.top(1)[0]['cores_per_processor']);
        byRamBusSpd.filter(null);
        globalMaximum.push(byRamBusSpd.top(1)[0]['ram_bus_speed']);
        byRamPerCpu.filter([0,8193]);
        globalMaximum.push(byRamPerCpu.top(1)[0]['ram_per_cpu']);
        byWallClockTime.filter(null);
        globalMaximum.push(byWallClockTime.top(1)[0]['wall_clock_time']);
        refreshTable();

        // create a new type of array where each data point consists of cpu #, core #, ram bus spd, ram per cpu and wall clock time
        byNumOfCpus.top(Infinity).forEach(function(d){
            var tempArray = [];
            tempArray.push(d.number_of_cpus);
            tempArray.push(d.cores_per_processor);
            tempArray.push(d.ram_bus_speed);
            tempArray.push(d.ram_per_cpu);
            tempArray.push(d.wall_clock_time);
            masterArray.push(tempArray);
        });

        var dataGroup = svg.append('g').attr('class', 'dataGroup');
        var dataPoints= dataGroup.selectAll('g.dataPoint').data(masterArray).enter().append('g').attr('class', 'dataPoint');

        // data points (circles)
        dataPoints.append('circle').transition().attr('cx', paddingH).attr('cy', function(d){ return getHeight(d[0], 'byNumOfCpus', 0); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');
        dataPoints.append('circle').transition().attr('cx', paddingH+widthOffset).attr('cy', function(d){ return getHeight(d[1], 'byCoresPerProc', 0); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');
        dataPoints.append('circle').transition().attr('cx', paddingH+widthOffset*2).attr('cy', function(d){ return getHeight(d[2], 'byRamBusSpd', 0); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');
        dataPoints.append('circle').transition().attr('cx', paddingH+widthOffset*3).attr('cy', function(d){ return getHeight(d[3], 'byRamPerCpu', 0); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');
        dataPoints.append('circle').transition().attr('cx', paddingH+widthOffset*4).attr('cy', function(d){ return getHeight(d[4], 'byWallClockTime', 0); }).attr('r',5).style('fill', 'rgba(0,0,0,0.2)');

        // nodes (lines)
        dataPoints.append('line').transition().attr('x1', paddingH).attr('x2', paddingH+widthOffset).attr('y1', function(d){ return getHeight(d[0], 'byNumOfCpus', 0); }).attr('y2', function(d){ return getHeight(d[1], 'byCoresPerProc', 0); }).style('stroke', function(d){ if(d[4]/globalMaximum[4] < 0.25){ return 'rgba(0,255,0,0.5)'; }else if(d[4]/globalMaximum[4] >= 0.25 && d[4]/globalMaximum[4] < 0.5){ return 'rgba(255,255,0,0.5)'}else if(d[4]/globalMaximum[4] >= 0.5 && d[4]/globalMaximum[4] < 0.75){ return 'rgba(242,101,34,0.5)'}else if(d[4]/globalMaximum[4] >= 0.75 && d[4]/globalMaximum[4] <= 1){ return 'rgba(255,0,0,0.5)'}else{ return 'rgba(0,0,0,0.5)'; } });
        dataPoints.append('line').transition().attr('x1', paddingH+widthOffset).attr('x2', paddingH+widthOffset*2).attr('y1', function(d){ return getHeight(d[1], 'byCoresPerProc', 0); }).attr('y2', function(d){ return getHeight(d[2], 'byRamBusSpd', 0); }).style('stroke', function(d){ if(d[4]/globalMaximum[4] < 0.25){ return 'rgba(0,255,0,0.5)'; }else if(d[4]/globalMaximum[4] >= 0.25 && d[4]/globalMaximum[4] < 0.5){ return 'rgba(255,255,0,0.5)'}else if(d[4]/globalMaximum[4] >= 0.5 && d[4]/globalMaximum[4] < 0.75){ return 'rgba(242,101,34,0.5)'}else if(d[4]/globalMaximum[4] >= 0.75 && d[4]/globalMaximum[4] <= 1){ return 'rgba(255,0,0,0.5)'}else{ return 'rgba(0,0,0,0.5)'; } });
        dataPoints.append('line').transition().attr('x1', paddingH+widthOffset*2).attr('x2', paddingH+widthOffset*3).attr('y1', function(d){ return getHeight(d[2], 'byRamBusSpd', 0); }).attr('y2', function(d){ return getHeight(d[3], 'byRamPerCpu', 0); }).style('stroke', function(d){ if(d[4]/globalMaximum[4] < 0.25){ return 'rgba(0,255,0,0.5)'; }else if(d[4]/globalMaximum[4] >= 0.25 && d[4]/globalMaximum[4] < 0.5){ return 'rgba(255,255,0,0.5)'}else if(d[4]/globalMaximum[4] >= 0.5 && d[4]/globalMaximum[4] < 0.75){ return 'rgba(242,101,34,0.5)'}else if(d[4]/globalMaximum[4] >= 0.75 && d[4]/globalMaximum[4] <= 1){ return 'rgba(255,0,0,0.5)'}else{ return 'rgba(0,0,0,0.5)'; } });
        dataPoints.append('line').transition().attr('x1', paddingH+widthOffset*3).attr('x2', paddingH+widthOffset*4).attr('y1', function(d){ return getHeight(d[3], 'byRamPerCpu', 0); }).attr('y2', function(d){ return getHeight(d[4], 'byWallClockTime', 0); }).style('stroke', function(d){ if(d[4]/globalMaximum[4] < 0.25){ return 'rgba(0,255,0,0.5)'; }else if(d[4]/globalMaximum[4] >= 0.25 && d[4]/globalMaximum[4] < 0.5){ return 'rgba(255,255,0,0.5)'}else if(d[4]/globalMaximum[4] >= 0.5 && d[4]/globalMaximum[4] < 0.75){ return 'rgba(242,101,34,0.5)'}else if(d[4]/globalMaximum[4] >= 0.75 && d[4]/globalMaximum[4] <= 1){ return 'rgba(255,0,0,0.5)'}else{ return 'rgba(0,0,0,0.5)'; } });

        // sort by wall clock time by default (asc)
        $('.table').tablesorter({'sortList': [[11,0]]});

        $('label.modeSwitch').click(function(){
            if($(this).text().trim() == 'Absolute'){
                absoluteMode = 1;
            }else if($(this).text().trim() == 'Relative'){
                absoluteMode = 0;
            }
            updateGraphics();
        });

        $(window).resize(debouncer(function(e){
            // fix for firefoxp-specific bug where the size of the svg canvas is not properly set
            $('svg').width($(window).innerWidth() - 10);

            initializeD3();
            updateGraphics();
        }));

        $('.glyphicon-pencil').show();

        $('.glyphicon-pencil').click(function(e){
            var selected = $(this);

            var values = selected.parent().find('input').attr('data-slider-value').replace('[','').replace(']','').split(',');

            selected.parent().find('.manualInputContainer .manualInput button').click(function(e){
                if(selected.parent().find('.manualInputContainer').css('display') != 'none'){
                    selected.parent().find('.manualInputContainer').hide();
                    if(isNaN(selected.parent().find('.manualInputContainer .manualInput #minVal').val()) || isNaN(selected.parent().find('.manualInputContainer .manualInput #maxVal').val())){
                        alert('numbers only');
                    }else{
                        selected.parent().find('input').not('.form-control').slider('setValue', [parse2Integer(selected.parent().find('.manualInputContainer .manualInput #minVal').val()), parse2Integer(selected.parent().find('.manualInputContainer .manualInput #maxVal').val())])
                        selected.parent().find('input').not('.form-control').attr('data-slider-value','['+selected.parent().find('.manualInputContainer .manualInput #minVal').val()+','+selected.parent().find('.manualInputContainer .manualInput #maxVal').val()+']')
                        var result = eval(selected.parent().attr('data-tag')+'.filter')([parse2Integer(selected.parent().find('.manualInputContainer .manualInput #minVal').val()), parse2Integer(selected.parent().find('.manualInputContainer .manualInput #maxVal').val())]).top(Infinity);
                        updateGraphics();
                        console.log(result);
                    }
                }

            });

            selected.parent().find('.manualInputContainer').toggle();

        });

        // enhance the usability in the manual input popup: hitting the enter key will update the graphics
        $('input.form-control').on('keydown',function(e){
            var container = $(this).parent().parent().parent().parent();
            if(container.css('display') != 'none'){
                if(e.which == 13){
                    container.hide();
                    if(isNaN(container.parent().find('.manualInputContainer .manualInput #minVal').val()) || isNaN(container.parent().find('.manualInputContainer .manualInput #maxVal').val())){
                        alert('numbers only');
                    }else{
                        container.parent().find('input').not('.form-control').slider('setValue', [parse2Integer(container.parent().find('.manualInputContainer .manualInput #minVal').val()), parse2Integer(container.parent().find('.manualInputContainer .manualInput #maxVal').val())])
                        container.parent().find('input').not('.form-control').attr('data-slider-value','['+container.parent().find('.manualInputContainer .manualInput #minVal').val()+','+container.parent().find('.manualInputContainer .manualInput #maxVal').val()+']')
                        var result = eval(container.parent().attr('data-tag')+'.filter')([parse2Integer(container.parent().find('.manualInputContainer .manualInput #minVal').val()), parse2Integer(container.parent().find('.manualInputContainer .manualInput #maxVal').val())]).top(Infinity);
                        updateGraphics();
                        console.log(result);
                    }

                }
            }

        });


        console.log('done');

    }

});

