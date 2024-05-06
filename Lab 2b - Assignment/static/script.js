// // Function to calculate distance from a point to a line
// function distanceFromPointToLine(p, a, b) {
//     const numerator = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x);
//     const denominator = Math.sqrt(Math.pow(b.y - a.y, 2) + Math.pow(b.x - a.x, 2));
//     return numerator / denominator;
// }

// function KmeansElbowPlot() {
//     fetch('/elbow')
//     .then(response => response.json())
//     .then(data => {
//         const svg = d3.select("svg#kmeans"), // Ensure your SVG has an ID
//             margin = {top: 30, right: 30, bottom: 70, left: 60},
//             width = +svg.attr("width") - margin.left - margin.right,
//             height = +svg.attr("height") - margin.top - margin.bottom,
//             g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        
//         const x = d3.scaleLinear().domain([0, d3.max(data.K)]).range([0, width]),
//         y = d3.scaleLinear().domain([1000, d3.max(data.Distortions) * 1.1]).range([height, 0]);
        
//         // Axis Labels
//         g.append("g")
//             .attr("transform", `translate(0,${height})`)
//             .call(d3.axisBottom(x))
//             .append("text")
//             .attr("y", 50)
//             .attr("x", width / 2)
//             .attr("text-anchor", "middle")
//             .attr("stroke", "black")
//             .text("Number of Clusters (k)");
        
//         g.append("g")
//             .call(d3.axisLeft(y))
//             .append("text")
//             .attr("transform", "rotate(-90)")
//             .attr("y", -50)
//             .attr("x", -height / 2)
//             .attr("dy", "1em")
//             .attr("text-anchor", "middle")
//             .attr("stroke", "black")
//             .text("Distortion");

//         // Line
//         g.append("path")
//             .datum(data.K.map((k, i) => ({k, distortion: data.Distortions[i]})))
//             .attr("fill", "none")
//             .attr("stroke", "steelblue")
//             .attr("stroke-width", 1.5)
//             .attr("d", d3.line()
//                 .x(d => x(d.k))
//                 .y(d => y(d.distortion))
//             );
        
//         // Points
//         g.selectAll(".dot")
//             .data(data.K.map((k, i) => ({k, distortion: data.Distortions[i]})))
//             .enter().append("circle")
//             .attr("class", "dot")
//             .attr("cx", d => x(d.k))
//             .attr("cy", d => y(d.distortion))
//             .attr("r", 5);

//         // Elbow Point
//         const distances = data.K.map((k, i) => {
//             const firstPoint = {x: x(data.K[0]), y: y(data.Distortions[0])};
//             const lastPoint = {x: x(data.K[data.K.length - 1]), y: y(data.Distortions[data.Distortions.length - 1])};
//             const thisPoint = {x: x(k), y: y(data.Distortions[i])};
//             return distanceFromPointToLine(thisPoint, firstPoint, lastPoint);
//         });

//         const elbowIndex = distances.indexOf(Math.max(...distances));
//         const elbowPoint = {k: data.K[elbowIndex], distortion: data.Distortions[elbowIndex]};

//         g.append("circle")
//             .attr("cx", x(elbowPoint.k))
//             .attr("cy", y(elbowPoint.distortion))
//             .attr("r", 10)
//             .attr("fill", "green");

//         // Legend Box
//         const legendBox = svg.append("g")
//                               .attr("transform", `translate(${width - 150},${20})`);
        
//         legendBox.append("rect")
//                  .attr("width", 140)
//                  .attr("height", 50)
//                  .style("fill", "white")
//                  .style("stroke", "black");

//         legendBox.append("text")
//                  .attr("x", 70)
//                  .attr("y", 15)
//                  .attr("text-anchor", "middle")
//                  .style("font-size", "14px")
//                  .text("Legend");

//         legendBox.append("circle")
//                  .attr("cx", 10)
//                  .attr("cy", 35)
//                  .attr("r", 6)
//                  .style("fill", "green");

//         legendBox.append("text")
//                  .attr("x", 25)
//                  .attr("y", 35)
//                  .attr("alignment-baseline", "middle")
//                  .text("Elbow Point");
//     })
//     .catch(error => console.error('Error:', error));
// }

// // Function to initialize SVG canvas and scales
// function initializePlot(svgId, margin, width, height, titleText) {
//     const svg = d3.select(svgId)
//                   .append("g")
//                   .attr("transform", `translate(${margin.left},${margin.top})`);

//     const xScale = d3.scaleLinear().range([0, width - margin.right]);
//     const yScale = d3.scaleLinear().range([height - margin.bottom, 0]);

//     drawAxes(svg, xScale, yScale, width, height, margin, titleText);

//     return { svg, xScale, yScale };
// }

// // Function to draw axes with labels
// function drawAxes(svg, xScale, yScale, width, height, margin, titleText) {
//     // X-axis
//     svg.append("g")
//        .attr("transform", `translate(0,${height})`)
//        .call(d3.axisBottom(xScale))
//        .append("text")
//        .attr("y", 40)
//        .attr("x", width / 2)
//        .attr("text-anchor", "middle")
//        .attr("fill", "black")
//        .text("Component 1");

//     // Y-axis
//     svg.append("g")
//        .call(d3.axisLeft(yScale))
//        .append("text")
//        .attr("transform", "rotate(-90)")
//        .attr("y", -50)
//        .attr("x", -height/2)
//        .attr("dy", "1em")
//        .attr("text-anchor", "middle")
//        .attr("fill", "black")
//        .text("Component 2");

//     // Adding title
//     svg.append("text")
//        .attr("x", (width / 2))             
//        .attr("y", 0 - (margin.top / 2))
//        .attr("text-anchor", "middle")  
//        .style("font-size", "16px") 
//        .style("text-decoration", "underline")  
//        .text(titleText);
// }

// // Function to plot MDS data
// function plotMDSData(endpoint, svgId, titleText) {
//     const margin = {top: 30, right: 30, bottom: 70, left: 60},
//           width = +d3.select(svgId).attr("width") - margin.left - margin.right,
//           height = +d3.select(svgId).attr("height") - margin.top - margin.bottom;

//     const { svg, xScale, yScale } = initializePlot(svgId, margin, width, height, titleText);

//     fetch(endpoint)
//         .then(response => response.json())
//         .then(data => {
            
//             xScale.domain(d3.extent(data, d => d.x));
//             yScale.domain(d3.extent(data, d => d.y));

//             const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

//             svg.selectAll(".dot")
//                .data(data)
//                .enter().append("circle")
//                .attr("class", "dot")
//                .attr("cx", d => xScale(d.x))
//                .attr("cy", d => yScale(d.y))
//                .attr("r", 5)
//                .style("fill", d => colorScale(d.cluster));
            
//             svg.selectAll(".text")
//                 .data(data)
//                 .enter().append("text")
//                 .attr("x", d => xScale(d.x) + 5) 
//                 .attr("y", d => yScale(d.y))
//                 .text(d => d.variable)
//                 .attr("class", "text")
//                 .style("font-size", "12px")
//                 .attr("alignment-baseline", "middle");
//         })
//         .catch(error => console.error('Error:', error));
// }

// // Data MDS plot
// plotMDSData('/data_mds', "svg#dataMDS", "Data MDS Plot");

// // Variables MDS plot
// plotMDSData('/vars_mds', "svg#varsMDS", "Variables MDS Plot");

// KmeansElbowPlot();

const clusterColors = d3.scaleOrdinal(d3.schemeCategory10);
let selectedVariables = [];
let n_cluster = 2;

function fetchKMeansData() {
    return fetch('/elbow')
        .then(response => response.json())
        .then(data => {
            createKMeansMSEPlot(data.K.map((k, i) => ({k: k, MSE: data.Distortions[i]})), data.ElbowPoint);
            return data.ElbowPoint;
        });
}

function fetchMDSData(elbowPoint) {
    return fetch(`/data_mds?clusters=${elbowPoint}`)
        .then(response => response.json())
        .then(data => {
            createMDSPlot(data);
        });
}

function createKMeansMSEPlot(data, elbowPoint) {
    const svg = d3.select("#kmeans"),
          margin = {top: 20, right: 20, bottom: 60, left: 80},
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    const x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
          y = d3.scaleLinear().rangeRound([height, 0]);
    
    const line = d3.line()
                   .x(d => x(d.k) + x.bandwidth() / 2) // Center the line in the band
                   .y(d => y(d.MSE));

    const g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(data.map(d => d.k));
    y.domain([0, d3.max(data, d => d.MSE)+1000]);

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .append("text")
        .attr("class", "axis-title")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 5)
        .attr("text-anchor", "middle")
        .attr("stroke", "black")
        .attr("font-size", "12px")
        .text("No of Clusters");

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(10))
        .append("text")
        .attr("class", "axis-title")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("dy", "0.71em")
        .attr("text-anchor", "middle")
        .attr("stroke", "black")
        .attr("font-size", "12px")
        .text("MSE Values/Distortion");

    let selectedBar = 2; // As the Elbow is 2

    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.k))
        .attr("y", d => y(d.MSE))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.MSE))
        .attr("fill", d => clusterColors(d.k)) // Use the color scale for fill
        .attr("opacity", d => d.k === selectedBar ? 1 : 0.8) // Increase opacity for selected bar
        .on("mouseover", function() {
            d3.select(this).style("stroke", "black").style("stroke-width", 2);
        })
        .on("mouseout", function() {
            d3.select(this).style("stroke", "none");
        })
        .on("click", function(_, d) {
            selectedBar = d.k; // Update the selectedBar to the clicked bar's key
            // Redraw bars to update opacity based on the new selection
            g.selectAll(".bar")
                .attr("opacity", d => d.k === selectedBar ? 1 : 0.8); // Update opacity based on selection
            console.log("Cluster selected: ", d.k);
            // Call function to update MDS plot based on selected k
            n_cluster = d.k;
            fetchMDSData(d.k);
            createPCPPlot_Cat(d.k);
            createPCPPlot_Num(d.k, selectedVariables);
    });


    // Line Chart
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Elbow Point Indicator on Line Chart
    g.selectAll(".elbow-point")
        .data(data.filter(d => d.k === elbowPoint))
        .enter().append("circle")
        .attr("class", "elbow-point")
        .attr("r", 8)
        .attr("cx", d => x(d.k) + x.bandwidth() / 2)
        .attr("cy", d => y(d.MSE))
        .attr("fill", "yellow")
        .attr("stroke", "black");

    // Legend
    const legendData = [{color: "black", text: "Selected"}, {color: "yellow", text: "Elbow Point (Line)"}];
    const legend = svg.selectAll(".legend")
        .data(legendData)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => "translate(0," + i * 20 + ")");

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => d.color);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(d => d.text);
}

function createMDSPlot(data) {
    // First, remove any existing SVG to start fresh
    d3.select("#dataMDS svg").remove();

    // Define margins, width, and height
    const margin = {top: 20, right: 20, bottom: 30, left: 40},
          container = d3.select("#dataMDS"),
          containerWidth = parseInt(container.style("width")),
          containerHeight = parseInt(container.style("height")),
          width = containerWidth - margin.left - margin.right,
          height = containerHeight - margin.top - margin.bottom;

    // Append a new SVG element to the container with adjusted width and height
    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales with the adjusted width and height
    const x = d3.scaleLinear().range([0, width]),
          y = d3.scaleLinear().range([height, 0]);

    // Set the domains for the scales based on the data
    x.domain(d3.extent(data, d => d.x));
    y.domain(d3.extent(data, d => d.y));

    // Append circles for each data point within the transformed 'g' element
    svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 5)
        .attr("cx", d => x(d.x))
        .attr("cy", d => y(d.y))
        .style("fill", d => clusterColors(d.cluster + 1)); // Adjust this line as needed
}

function fetchVarsMDSData() {
    fetch('/vars_mds')
        .then(response => response.json())
        .then(data => {
            createVarsMDSPlot(data);
        })
        .catch(error => console.error("Error fetching MDS Variables data: ", error));
}

function createVarsMDSPlot(data) {
    const margin = { top: 40, right: 20, bottom: 60, left: 60 },
          width = 650 - margin.left - margin.right,
          height = 450 - margin.top - margin.bottom;

    // Append SVG for the plot
    const svg = d3.select("#varsMDS").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

    // Append a transparent background rectangle
    svg.append("rect")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("transform", `translate(0,0)`)
        .style("fill", "none") // Make it transparent
        .style("pointer-events", "all") // Capture pointer events
        .on("click", clearEverything);

    // Create scales
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.x))
        .range([0, width])
        .nice();
    
    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.y))
        .range([height, 0])
        .nice();

    // Draw dots for each variable
    svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 8)
        .attr("cx", d => x(d.x))
        .attr("cy", d => y(d.y))
        .style("fill", "black")
        .on("click", function(event, d) {
            const index = selectedVariables.indexOf(d.variable);
            if (index === -1) {
                selectedVariables.push(d.variable);
                d3.select(this)
                .style("stroke", "yellow")
                .style("stroke-width", "2px");
            }
            else {
                // Variable was previously selected, remove it
                selectedVariables.splice(index, 1);
                d3.select(this)
                  .style("stroke", "none");
            }
            // Assuming you have a function to handle the variable selection
            // and update the PCP plot accordingly
            onVariableSelected(d.variable);
            updateLabels();
        })
        .on("mouseover", function(event, d) {
            d3.select(this)
              .attr("r", 12); // Increase radius on hover
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
              .attr("r", 8); // Revert radius when not hovering
        });
    
    function updateLabels() {
        // Remove existing labels to prevent duplication
        svg.selectAll(".order-label").remove();
        
        // Add labels indicating the order of selection
        svg.selectAll(".order-label")
            .data(selectedVariables, d => d)
            .enter().append("text")
            .attr("class", "order-label")
            .attr("x", d => x(data.find(v => v.variable === d).x))
            .attr("y", d => y(data.find(v => v.variable === d).y))
            .attr("dy", "1.5em")
            .attr("text-anchor", "middle")
            .style("fill", "red")
            .text(d => selectedVariables.indexOf(d) + 1);
    }

    function clearEverything() {
        // Clear selected variables state
        selectedVariables = [];
        
        // Optionally, clear or reset other parts of your visualization
        // For example, remove highlights or reset the visual state
        d3.selectAll(".dot")
          .style("stroke", "none");
        
        d3.selectAll(".order-label").remove(); // If you're using labels to show order

        // Redraw or update your visualization as needed
        // For example, you might call createPCPPlot_Num again to reset the PCP
    }

    updateLabels();

    // Label dots with variable names
    svg.selectAll(".text")
        .data(data)
      .enter().append("text")
        .attr("x", d => x(d.x))
        .attr("y", d => y(d.y))
        .attr("dy", "-1em")
        .attr("text-anchor", "middle")
        .text(d => d.variable);


    // Draw X and Y axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
      .append("text") // X-axis Label
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 10) // Adjust for positioning
        .style("text-anchor", "middle")
        .attr("stroke", "black")
        .attr("font-size", "12")
        .text("Dimension 1");

    svg.append("g")
        .call(d3.axisLeft(y))
      .append("text") // Y-axis Label
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2 )
        .attr("y", -margin.left + 10) // Adjust for positioning
        .attr("dy", "1em") // Further adjustment
        .style("text-anchor", "middle")
        .attr("stroke", "black")
        .attr("font-size", "12")
        .text("Dimension 2");
}

function onVariableSelected(variable) {
    // Update PCP plot based on the selected variable
    console.log("Selected variable:", variable);
    
    createPCPPlot_Num(clusterNum=n_cluster, orderedDimensions=selectedVariables);
}

function createPCPPlot_Cat(clusterNum=n_cluster) {
    d3.json(`/pcp_data?clusters=${clusterNum}`).then(function(data) {
        // Define dimensions and margins for the plot
        const margin = {top: 30, right: 10, bottom: 40, left: 10},
            width = 1420 - margin.left - margin.right,
            height = 550 - margin.top - margin.bottom;

        // Append a new SVG element to the container with adjusted width and height
        const svg = d3.select("#pcpPlot").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const dimensions = Object.keys(data[0]).filter(d => d !== "cluster");

        // Initialize the dragging object
        let dragging = {};

        // Define a scalePoint for x-axis positioning and domain
        let x = d3.scalePoint().range([0, width]).padding(1).domain(dimensions);

        // Define a linear scale for each dimension
        const y = {};
        for (const d of dimensions) {
            y[d] = d3.scaleLinear().domain(d3.extent(data, p => +p[d])).range([height, 0]);
        }

        function path(d) {
            return d3.line()(dimensions.map(p => {
                return [x(p), y[p](d[p] || 0)]; // Fallback to 0 (or another suitable value) if undefined
            }));
        }

        svg.selectAll("path")
            .data(data)
            .enter().append("path")
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", d => clusterColors(d.cluster+1)); // Ensure 'clusterColors' is defined

        // Function to update position of the dimension on drag
        function position(d) {
            var v = dragging[d];
            return v == null ? x(d) : v;
        }

        // Function to reorder dimensions
        function dragended(event, d) {
            if (!event.active) svg.selectAll("path").style("stroke-opacity", null);
            svg.selectAll(".dimension").attr("transform", d => `translate(${position(d)})`);
            svg.selectAll("path").attr("d", path);
        }

        // Draggable dimensions
        const g = svg.selectAll(".dimension")
            .data(dimensions)
          .enter().append("g")
            .attr("class", "dimension")
            .attr("transform", d => `translate(${x(d)})`)
            .call(d3.drag()
                .subject(d => ({x: x(d)}))
                .on("start", function(event, d) {
                    dragging[d] = x(d);
                    svg.selectAll("path").style("stroke-opacity", 0.5);
                })
                .on("drag", function(event, d) {
                    dragging[d] = Math.min(width, Math.max(0, event.x));
                    dimensions.sort((a, b) => position(a) - position(b));
                    x.domain(dimensions);
                    g.attr("transform", d => `translate(${position(d)})`);
                })
                .on("end", dragended));
        
        // Add an axis for each dimension
        g.append("g")
            .each(function(d) { d3.select(this).call(d3.axisLeft(y[d])); })
            .append("text")
            .attr("class", "axis-label") // Add a class for styling if needed
            .style("text-anchor", "middle")
            .attr("y", -9)
            .attr("transform", "translate(0," + (height + 20) + ")") // Move labels below the axes
            .text(d => d); // Use dimension names as labels

        // Optionally, adjust labels' appearance here
        svg.selectAll(".axis-label")
            .style("fill", "black") // Set the text color
            .style("font-size", "12px") // Set the text size
            .style("font-weight", "bold"); // Set the text weight

        svg.selectAll(".dimension .domain")
            .style("stroke-width", "2px");  // Increase the thickness of the main axis lines
        
        // Adjusting the ticks' thickness
        svg.selectAll(".dimension line")
            .style("stroke-width", "2px");

        g.selectAll(".domain, .axis-label")
            .on("mouseover", function() { d3.select(this).style("stroke-width", "5px"); }) // Highlight
            .on("mouseout", function() { d3.select(this).style("stroke-width", "2px"); }); // Revert
        
    }).catch(error => console.error("Error loading the data: ", error));
}

function createPCPPlot_Num(clusterNum=n_cluster, orderedDimensions=[]) {
    d3.json(`/pcp_data_num?clusters=${clusterNum}`).then(function(data) {
        // Clear existing SVG to redraw the plot
        d3.select("#pcpPlot1 svg").remove();

        const margin = {top: 30, right: 20, bottom: 50, left: 10},
              width = 700 - margin.left - margin.right,
              height = 450 - margin.top - margin.bottom;

        const svg = d3.select("#pcpPlot1").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Initialize the dragging object
        let dragging = {};

        // Use orderedDimensions if it has been set; otherwise, use the default order
        const dimensions = orderedDimensions.length > 0 ? orderedDimensions : Object.keys(data[0]).filter(d => d !== "cluster");

        let x = d3.scalePoint().range([0, width]).padding(1).domain(dimensions);

        const y = {};
        dimensions.forEach(d => {
            y[d] = d3.scaleLinear().domain(d3.extent(data, p => +p[d])).range([height, 0]);
        });

        function path(d) {
            return d3.line()(dimensions.map(p => [x(p), y[p](d[p] || 0)]));
        }

        svg.selectAll("path")
            .data(data)
            .enter().append("path")
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", d => clusterColors(d.cluster+1)); // Ensure 'clusterColors' is defined

        // Function to update position of the dimension on drag
        function position(d) {
            var v = dragging[d];
            return v == null ? x(d) : v;
        }

        // Function to reorder dimensions
        function dragended(event, d) {
            if (!event.active) svg.selectAll("path").style("stroke-opacity", null);
            svg.selectAll(".dimension").attr("transform", d => `translate(${position(d)})`);
            svg.selectAll("path").attr("d", path);
        }

        // Draggable dimensions
        const g = svg.selectAll(".dimension")
            .data(dimensions)
          .enter().append("g")
            .attr("class", "dimension")
            .attr("transform", d => `translate(${x(d)})`)
            .call(d3.drag()
                .subject(d => ({x: x(d)}))
                .on("start", function(event, d) {
                    dragging[d] = x(d);
                    svg.selectAll("path").style("stroke-opacity", 0.5);
                })
                .on("drag", function(event, d) {
                    dragging[d] = Math.min(width, Math.max(0, event.x));
                    dimensions.sort((a, b) => position(a) - position(b));
                    x.domain(dimensions);
                    g.attr("transform", d => `translate(${position(d)})`);
                })
                .on("end", dragended));

        g.append("g")
            .each(function(d) { d3.select(this).call(d3.axisLeft(y[d])); })
            .append("text")
            .attr("class", "axis-label") // Add a class for styling if needed
            .style("text-anchor", "middle")
            .attr("y", -9)
            .attr("transform", "translate(0," + (height + 20) + ")") // Move labels below the axes
            .text(d => d); // Use dimension names as labels

        // Optionally, adjust labels' appearance here
        svg.selectAll(".axis-label")
            .style("fill", "black") // Set the text color
            .style("font-size", "12px") // Set the text size
            .style("font-weight", "bold"); // Set the text weight

        svg.selectAll(".dimension .domain")
            .style("stroke-width", "2px");  // Increase the thickness of the main axis lines
        
        // Adjusting the ticks' thickness
        svg.selectAll(".dimension line")
            .style("stroke-width", "2px");

        g.selectAll(".domain, .axis-label")
            .on("mouseover", function() { d3.select(this).style("stroke-width", "5px"); }) // Highlight
            .on("mouseout", function() { d3.select(this).style("stroke-width", "2px"); }); // Revert

    }).catch(error => console.error("Error loading the data: ", error));
}


function main() {
    fetchKMeansData().then(elbowPoint => {
        // Assuming the elbow point is used as the default number of clusters
        fetchMDSData(elbowPoint);
    });

    fetchVarsMDSData();
    createPCPPlot_Cat();
    createPCPPlot_Num();
}

main();