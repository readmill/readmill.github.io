(function () {
  // Data global var

  var dataset;
  var tooltipLabels = {}; // set of labels for the milestones. Populated lazily.

  // Find or create a tooltip for a piece of data
  function getToolTip(data) {
    var tooltip = tooltipLabels[data.milestone];
    var date = new Date(data.date)
    var format = d3.time.format("%b %e, %Y");
    if(!tooltip) {
      console.log('Creating tooltip: ' + data.milestone);
      tooltip = jQuery('<div class="milestone-label">'
          + '<span class="date">' + format(date) + '</span>'
          + '<span class="title">' + data.milestone + '</span>'
          + '<span class="desc">' + data.description + '</span>'
        + '</div>')
        .prependTo(jQuery('.numbers'));

      tooltip.hover(function() {
        console.log('mouse over');
        if(tooltip.clearTimer) {
          clearTimeout(tooltip.clearTimer);
          tooltip.addClass('show');
        }
      }, function() {
        console.log('mouse out');
        tooltip.clearTimer = setTimeout(tooltip.clearFn, 200);
      });

      tooltipLabels[data.milestone] = tooltip;

    }
    return tooltip;
  }

  function positionTooltip(w, h, elm, data) {
    var tooltip = getToolTip(data);

    // cancel removal of tooltip
    if(tooltip.clearTimer) {
      clearTimeout(tooltip.clearTimer);
      tooltip.clearTimer = null;
    }

    var magicalOffset = 107; // padding top for section.numbers - the space between the charts and the bottom of the graph
    var chart = jQuery('.chart'), svg = jQuery('.svg');

    // cx, cy is relative to the svg coordinate system, but we need them as css pixel offsets
    var svgScaleFactorY = chart.height() / h;
    var svgScaleFactorX = (svg.prop('viewBox').baseVal.width * 1.0) / svg.width();

    console.log(svgScaleFactorX);
    console.log(svgScaleFactorY);

    var arrowNudge = -5; // adjust so that arrow is in i middle

    var cx = parseInt(elm.attr('cx'), 10) / svgScaleFactorX;
    var cy = parseInt(elm.attr('cy'), 10) / svgScaleFactorY;
    var newCY = (parseInt(elm.attr('cy'), 10) * chart.height()) / h; // recalculate the cy of the circle after the chart is resized

    tooltip.tt_position = {
      x: Math.round(cx + chart.offset().left - tooltip.outerWidth() * 0.5 + arrowNudge),
      y: Math.round(parseInt(jQuery('section.numbers').css('padding-top'), 10) + newCY - tooltip.height() - 90)
    };

    console.log(tooltip.tt_position);

    tooltip.css({
      left: tooltip.tt_position.x,
      top: tooltip.tt_position.y
    });

    setTimeout(function() { tooltip.addClass('show'); }, 10);
  }

  // Pull data from json file
  d3.json("public/signups_per_3_days.json", function(error, json) {
    if (error) return console.warn(error);
    dataset = json;

    var tooltip = d3.select('#milestone-label');
    var chartOffset = 0;

    //Width and height
    var margin = {top: 40, right: 20, bottom: 20, left:20};
    var w = $('.wrap').width();
    var h = $('.wrap').width() / 2;
    var barPadding = 1;

    // X Scale
    var xScale = d3.time.scale().range([0, w])
      .domain(
        d3.extent(dataset, function(d) {
          return new Date(d.date);
        })
      );

    // Y Scale
    var yScale = d3.scale.linear()
      .domain([
        0,
        d3.max(dataset, function(d) { return d.count; })
      ])
      .range([0, h - margin.top - margin.bottom]);

    // Find the middle date
    function medianDate(){
      var date = dataset[Math.floor(dataset.length / 2)].date;
      date = new Date(date)
      return date;
    }

    // Define how the X Axis will be drawn
    var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .ticks(3)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d3.time.format("%B %Y"))
      .tickValues([
        d3.min(dataset, function(d) {
          var date = new Date(d.date);
          return date;
        }),
        medianDate(),
        d3.max(dataset, function(d) {
          var date = new Date(d.date);
          return date;
        })
      ]);

    // Create SVG element
    var svg = d3.select(".chart")
      .append("svg")
      .attr("class", "svg")
      // .attr("preserveAspectRatio", "xMidYMid")
      .attr("viewBox", "0 0 " + (w + 20) + " " + h)
      .attr("width", w)
      .attr("height", h);

    var g = svg.selectAll("g")
      .data(dataset)
      .enter()
      .append("g")
      .attr("date", function(d){
        // Add date attr to SVG
        var date = new Date(d.date)
        return date;
      })
      .attr("milestone", function(d){
        // Add milestone attr to SVG
        return d.milestone;
      })
      .attr("desc", function(d){
        // Add desc attr to SVG
        return d.description;
      })
      .attr("class", function(d){
        if (d.milestone !== "") {
          return "milestone-g";
        }
      });

    // Draw rect
    g.append("rect")
      .attr("fill", "#404040")
      .attr("x", function(d, i) {
        // Set the X position for each bar
        return i * ((w / dataset.length));
      })
      .attr("y", function(d) {
        // Set the Y position for each bar
        return (h - 40) - yScale(d.count);  //Height minus data value
      })
      .attr("width", w / dataset.length - barPadding) // Set the width for each bar
      .attr("height", function(d){
        return yScale(d.count); // Set the height for each bar
      })
      .attr("class", function(d) {
        if (d.milestone !== "") {
          return "milestone rect";
        }
      });

    // Draw small circle
    g.append("circle")
      .attr('r', 2)
      .attr("cx", function(d, i) { return i * (w / dataset.length) + 1; })
      .attr("cy", function(d) { return (h - 40) - yScale(d.count); })
      .attr("class", function(d) {
        if (d.milestone !== "") {
          return "milestone small-cir";
        }
      });

    // Draw large circle
    g.append("circle")
      .attr('r', 18)
      .attr('opacity', 0.1)
      .attr("cx", function(d, i) { return i * (w / dataset.length) + 1; })
      .attr("cy", function(d) { return (h - 40) - yScale(d.count); })
      .attr("class", function(d) {
      if (d.milestone !== "") {
        return "milestone large-cir";
      }
    })
    .on("mouseover", function(data){
      var elm = d3.select(this);
      var parent = d3.select(elm.node().parentNode);

      elm
        .transition()
        .duration(100)
        .ease("in-out")
        .attr("r", 25);

      // Enlarge small white circle on hover
      parent
        .select('.small-cir')
        .transition()
        .duration(100)
        .ease("in-out")
        .attr("r", 3);

      parent
        .select('.rect')
        .transition()
        .duration(100)
        .ease("in-out")
        .attr("fill", "#fff");

      // Update milestone text
      if (data.milestone){
        positionTooltip(w, h, elm, data);
      }
    })
    .on("mouseout", function(data){
      var elm = d3.select(this);
      var parent = d3.select(elm.node().parentNode);

      if(data.milestone) {
        var tooltip = getToolTip(data);
        tooltip.removeClass('show');
        tooltip.clearFn = function() {
          console.log('moving out');
          tooltip.clearTimer = null;
          tooltip.removeClass('show');
          tooltip.css({ top: -100000 });

          // Shrink small circle to original size
          parent
            .select('.small-cir')
            .transition()
            .duration(200)
            .ease("in-out")
            .attr("r", 2);

          // Shrink large circle to original size
          elm
            .transition()
            .duration(200)
            .ease("in-out")
            .attr("r", 18);

          parent
            .select('.rect')
            .transition()
            .duration(100)
            .ease("in-out")
            .attr("fill", "#404040");
            };

        tooltip.clearTimer = setTimeout(tooltip.clearFn, 250);
      }
    });

    // Draw x-axis
    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0, ' + (h - 40) + ')')
      .attr('fill', '#404040')
      .call(xAxis);

    var chart = $(".svg"),
        aspect = chart.width() / chart.height(),
        container = chart.parent();

    $(window).on("resize", function() {
      var targetWidth = container.width();
      chart.attr("width", targetWidth);
      chart.attr("height", Math.round(targetWidth / aspect));
      // $('.milestone-label').remove();
    }).trigger("resize");

    window.onorientationchange = detectIPadOrientation;

    function detectIPadOrientation () {
      // if ( orientation == 0 || orientation == 180 ) {
      //   $('.milestone-label').remove();
      // }
      // else if ( orientation == 90 || orientation == -90 ) {
      //   $('.milestone-label').remove();
      // }
    }
  });
})();
