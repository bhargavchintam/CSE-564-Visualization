let globalPCAData = null;

// Fetching PCA data from the backend
fetch('/pca-data')
.then(response => response.json())
.then(data => {
    globalPCAData = data;
    
    // Plot Scree Plot
    plotScreePlot(data.eigenvalues);
    
    // Plot Biplot
    plotBiplot(data.transformed, data.loadings, data.features);

    if(data.transformed.length > 0 && data.top_attributes_indices.length > 0){
        plotScatterplotMatrix(
            data.transformed,
            data.top_attributes_indices,
            data.attributes
        );
    } else {
        console.log('Data is not loaded or in the incorrect format');
    }

    // Plot k-means MSE plot
    plotKMeansMSE(data.mse, data.elbow_point);

    // Plot Table 
    updateAttributesTable(data.top_attributes_loadings);
});

function findElbowPoint(eigenvalues) {
    // Calculate the cumulative sum of eigenvalues
    let cumulativeSum = 0;

    // Go through the sorted eigenvalues (sorted in descending order)
    for (let i = 0; i < eigenvalues.length; i++) {
        cumulativeSum += eigenvalues[i];

        // Check if the cumulative sum has exceeded the 0.75 threshold
        if (cumulativeSum / d3.sum(eigenvalues) > 0.75) {
            // Return the index, as principal components are 1-indexed
            return i;
        }
    }

    // If the loop finishes without returning, all components are needed to exceed 0.75 cumulative variance
    return eigenvalues.length;
}

function plotScreePlot(eigenvalues) {

    const svgWidth = 700, svgHeight = 400;
    const margin = { top: 35, right: 20, bottom: 60, left: 60 }; // Adjusted for axis names
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
          y = d3.scaleLinear().rangeRound([height, 0]);

    const svg = d3.select("#scree-plot").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    x.domain(eigenvalues.map((d, i) => i + 1));
    y.domain([0, 1]);

    // X Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append("text")
        .attr("y", 35) // Move axis name below x axis
        .attr("x", svgWidth / 2)
        .style("text-anchor", "end")
        .attr("stroke", "black")
        .attr("font-size", "12px")
        .text("Principal Components");

    // Y Axis
    svg.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", 0 - (height / 2))
        .attr("dy", "0.5em")
        .style("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("stroke", "black")
        .text("Eigenvalue / Variance Explained");

    // Plot Title
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "24px") 
        .style("font-weight", "bold")
        // .style("text-decoration", "underline")  
        .text("PCA - Scree Plot");

    const elbowIndex = findElbowPoint(eigenvalues);
    
    let cumulativeSum = eigenvalues.reduce((acc, val, i) => {
        if(i === 0) return [val];
        else return acc.concat(val + acc[i-1]);
    }, []);

    let cumulativeProportion = cumulativeSum.map(val => val / d3.sum(eigenvalues));

    // Scale for the cumulative line
    const yCumulative = d3.scaleLinear().rangeRound([height, 0]);
    yCumulative.domain([0, d3.max(cumulativeSum, d => d)]);

    // Line generator for the cumulative sum
    const line = d3.line()
        .x((d, i) => x(i + 1) + x.bandwidth() / 2) // Center the line in the band
        .y(d => yCumulative(d));

    // Draw the cumulative sum line
    svg.append("path")
        .datum(cumulativeSum)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 1.5)
        .attr("d", line);

    // Draw points on the cumulative sum line
    svg.selectAll(".cumulative-point")
        .data(cumulativeSum)
        .enter().append("circle")
        .attr("class", "cumulative-point")
        .attr("cx", (d, i) => x(i + 1) + x.bandwidth() / 2) // Center the point in the band
        .attr("cy", d => yCumulative(d))
        .attr("r", 3)
        .attr("fill", "red");


    // // Bars
    svg.selectAll(".bar")
        .data(eigenvalues)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", (d, i) => x(i + 1))
        .attr("y", d => y(d))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d))
        .on("click", function(event, d) {
            svg.selectAll(".bar")
                .style("fill", "steelblue")
                .style("stroke", "none"); // Reset all bars to default color and no stroke
            d3.select(this)
                .style("fill", "orange")
                .style("stroke", "black")
                .style("stroke-width", "2px"); // Highlight selected bar with stroke
            // Update the Biplot based on the selected dimensionality
            updateBiplot(eigenvalues.indexOf(d) + 1);
        });

    // Initial highlighting for the bar at the elbow point (assumed to be at index 2 for demonstration)
    svg.selectAll(".bar")
        .filter((d, i) => i === elbowIndex)
        .style("fill", "orange");

    let elbowValue = cumulativeProportion[elbowIndex ]; // -1 because findElbowPoint returns a 1-indexed value
    let xElbow = x(elbowIndex + 1) + x.bandwidth() / 2; // x position of the elbow point

    // Vertical line from the x-axis to the cumulative graph
    svg.append('line')
        .attr('x1', xElbow)
        .attr('x2', xElbow)
        .attr('y1', yCumulative(elbowValue))
        .attr('y2', yCumulative(0))
        .attr('stroke', 'red')
        .attr('stroke-dasharray', '5,5'); // Dashed line for visual differentiation

    // Horizontal line from 75% on y-axis to the point of contact on the cumulative graph
    svg.append('line')
        .attr('x1', xElbow)
        .attr('x2', x(1)) // x position of the first bar
        .attr('y1', yCumulative(0.75))
        .attr('y2', yCumulative(0.75))
        .attr('stroke', 'red')
        .attr('stroke-dasharray', '5,5');

    // Highlight the elbow point with a yellow circle
    svg.append('circle')
        .attr('cx', xElbow)
        .attr('cy', y(elbowValue))
        .attr('r', 8) // Radius of the yellow circle
        .attr('fill', 'yellow')
        .attr('stroke', 'black')
        .attr('stroke-width', '1');
    
    // Calculate legend positions
const legendX = width - 100; // X position of the legend
const legendY = 30; // Starting Y position of the legend

// Legend Background
svg.append("rect")
    .attr("x", legendX - 10)
    .attr("y", legendY - 10)
    .attr("width", 120)
    .attr("height", 100)
    .style("fill", "white")
    .style("stroke", "black");

// Legend Title
svg.append("text")
    .attr("x", legendX)
    .attr("y", legendY + 10)
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Legend");

// Bar Sample
svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY + 20)
    .attr("width", 15)
    .attr("height", 10)
    .style("fill", "steelblue");

// Bar Label
svg.append("text")
    .attr("x", legendX + 20)
    .attr("y", legendY + 30)
    .style("font-size", "12px")
    .text("Eigenvalue");

// Cumulative Line Sample
svg.append("line")
    .attr("x1", legendX)
    .attr("x2", legendX + 15)
    .attr("y1", legendY + 50)
    .attr("y2", legendY + 50)
    .attr("stroke", "red")
    .attr("stroke-width", 1.5);

// Cumulative Line Label
svg.append("text")
    .attr("x", legendX + 20)
    .attr("y", legendY + 55)
    .style("font-size", "12px")
    .text("Cumulative");

// Elbow Point Sample
svg.append('circle')
    .attr('cx', legendX + 7.5)
    .attr('cy', legendY + 75)
    .attr('r', 4)
    .attr('fill', 'yellow')
    .attr('stroke', 'black')
    .attr('stroke-width', '1');

// Elbow Point Label
svg.append("text")
    .attr("x", legendX + 20)
    .attr("y", legendY + 80)
    .style("font-size", "12px")
    .text("Elbow Point");
}

// Function to update the Biplot based on selected principal components
function updateBiplot(selectedDimension) {
    d3.select("#biplot svg").remove();

    console.log("Selected Dimension:", selectedDimension);

    // const updatedLoadings = globalPCAData.loadings.map(loading => loading.slice(0, selectedDimension));
    const updatedLoadings = globalPCAData.loadings.slice(0, selectedDimension);
    const updatedTransformedData = globalPCAData.transformed;
    const updatedFeatureNames = globalPCAData.features.slice(0, selectedDimension);

    plotBiplot(updatedTransformedData, updatedLoadings, updatedFeatureNames);
}

function plotBiplot(transformedData, loadings, featureNames) {

    const svgWidth = 650, svgHeight = 400;
    const margin = { top: 60, right: 80, bottom: 60, left: 60 }; // Adjusted for axis names
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const x = d3.scaleLinear().range([0, width]),
          y = d3.scaleLinear().range([height, 0]);

    const svg = d3.select("#biplot").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxX = d3.max(transformedData, d => Math.abs(d[0]));
    const maxY = d3.max(transformedData, d => Math.abs(d[1]));

    // Set the domain of x and y to be symmetrical around the origin
    x.domain([-maxX, maxX]);
    y.domain([-maxY, maxY]);

    // X Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
      // X Axis Name
      .append("text")
        .attr("y", 45)
        .attr("x", width / 2)
        .attr("text-anchor", "middle")
        .attr("stroke", "black")
        .attr("font-size", "12px")
        .text("Principle Component 1");

    // Y Axis
    svg.append("g")
        .call(d3.axisLeft(y))
      // Y Axis Name
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -45) // Adjust position next to y axis
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .attr("stroke", "black")
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Principle Component 2");

    // Plot Title
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "24px") 
        .style("font-weight", "bold")
        // .style("text-decoration", "underline")  
        .text("PCA Biplot");

    // Data Points
    svg.selectAll(".dot")
        .data(transformedData)
      .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d[0]))
        .attr("cy", d => y(d[1]))
        .attr("r", 3);
    
    // Loading Vectors
    const loadingScale = Math.min(width, height) / 5; // Adjust scale for loading vectors
    const vectorColor = d3.scaleOrdinal(d3.schemeCategory10);

    // Drawing Loading Vectors with Colors
    loadings.forEach((loading, i) => {
        const endX = x(loading[0] * loadingScale);
        const endY = y(loading[1] * loadingScale);

        svg.append("line")
            .attr("class", "loading")
            .attr("x1", x(0))
            .attr("y1", y(0))
            .attr("x2", endX)
            .attr("y2", endY)
            .style("stroke", vectorColor(i))
            .attr("stroke-width", 3);
    });

    // Adding a Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 30)`); // Position the legend on the right side

    featureNames.forEach((name, i) => {
        const legendY = i * 20; // Position each legend item vertically

        legend.append("rect")
            .attr("x", 0)
            .attr("y", legendY)
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", vectorColor(i));

        legend.append("text")
            .attr("x", 20) // Offset text to the right of the color square
            .attr("y", legendY + 9) // Vertically align text with the color square
            .text(name)
            .style("font-size", "12px")
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "middle");
    });

    svg.append("clipPath")
    .attr("id", "plot-area-clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height);

    // When drawing vectors, use the clipping path
    svg.selectAll(".loading")
        .attr("clip-path", "url(#plot-area-clip)");
    }


function plotScatterplotMatrix(transformedData, topAttributeIndices, attributeNames, clusterLabels) {
    const size = 150;
    const padding = 60;
    const n = topAttributeIndices.length;

    d3.select("#scatter-plot-matrix svg").remove();

    // Create the SVG container for the scatterplot matrix
    const svg = d3.select('#scatter-plot-matrix')
        .append("svg")
        .attr("width", size * n + padding)
        .attr("height", size * n + padding)
        .append("g")
        .attr("transform", `translate(${padding}, ${padding / 2})`);
    
    // Append the title to the SVG container
    svg.append("text")
        .attr("class", "scatter-plot-matrix-title")
        .attr("x", (size * n + padding) / 2) // Center the title
        .attr("y", -20 / 2) // Position the title above the scatterplot matrix
        .attr("text-anchor", "middle")
        .attr("font-size", "24px") // Large font size for the title
        .attr("font-weight", "bold") // Bold font weight for the title
        .text("Scatter Plot Matrix");

    // Create scales for each attribute
    // Adjusting range to add a margin inside the plot area
    const margin = 10; // Margin inside each plot
    const scales = topAttributeIndices.map(index => {
        const extent = d3.extent(transformedData, d => d[index]);
        return d3.scaleLinear().domain(extent).range([margin, size - padding / 2 - margin]);
    });

    const uniqueClusters = Array.from(new Set(clusterLabels));
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueClusters);

    // Create axes and cells for the scatterplot matrix
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const cell = svg.append("g")
                .attr("transform", `translate(${j * size + padding / 2}, ${i * size})`);
            
            cell.append("rect")
                .attr("class", "cell-border")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", size - padding / 2)
                .attr("height", size - padding / 2)
                .style("fill", "none")
                .style("stroke", "black")
                .style("stroke-width", 1);
            
            // Display feature1 vs. feature2 in the diagonal cells
            if (i === j) {
                cell.append("text")
                    .attr("x", (size - padding / 2) / 2)
                    .attr("y", (size - padding / 2) / 2)
                    .attr("text-anchor", "middle")
                    .attr("dy", "0.35em")
                    .text(attributeNames[i]);
            } else {
                // Plot the points for non-diagonal cells
                cell.selectAll("circle").remove();
                cell.selectAll("circle")
                    .data(transformedData)
                    .enter().append("circle")
                    .attr("cx", d => scales[j](d[topAttributeIndices[j]]))
                    .attr("cy", d => scales[i](d[topAttributeIndices[i]]))
                    .attr("r", 2)
                    .style("fill", (d, index) => {
                        // Check if clusterLabels is defined and has an entry for the current index
                        if (clusterLabels && clusterLabels[index] !== undefined) {
                            return color(clusterLabels[index]);
                        } else {
                            return null;
                        }
                    });
            }

            // Draw axes along the bottom and left edges
            if (i === n - 1) {
                cell.append("g")
                    .attr("transform", `translate(0, ${size - padding / 2})`)
                    .call(d3.axisBottom(scales[j]).ticks(3));
            }

            if (j === 0 ) { // Adjust to prevent overlap with diagonal text
                cell.append("g")
                    .call(d3.axisLeft(scales[i]).ticks(3));
            }
        }
    }

    // Add X axis labels
    svg.selectAll(".x.label")
        .data(attributeNames)
        .enter().append("text")
        .attr("class", "label")
        .attr("x", (d, i) => i * size + size / 2 + padding / 2)
        .attr("y", n * size + 10)
        .attr("text-anchor", "middle")
        .text(d => d);

    // Add Y axis labels
    svg.selectAll(".y.label")
        .data(attributeNames)
        .enter().append("text")
        .attr("class", "label")
        .attr("y", (d, i) => i * size + size / 2)
        .attr("x", -10)
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "middle")
        .text(d => d);
}

function plotKMeansMSE(mse, elbowPoint, ) {
    const svgWidth = 700, svgHeight = 350;
    const margin = { top: 35, right: 60, bottom: 60, left: 60 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const svg = d3.select("#kmeans-plot").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(mse.map((d, i) => i + 1))
        .padding(0.1);

    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(mse)]);

    // X Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Y Axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Title
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "24px") 
        .style("font-weight", "bold")
        .text("K-Means MSE Plot");

    // X Axis Label
    svg.append("text")
        .attr("transform", `translate(${width / 2},${height + margin.bottom - 5})`)
        .style("text-anchor", "middle")
        .attr("stroke", "black")
        .text("Number of Clusters (k)");

    // Y Axis Label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .attr("stroke", "black")
        .text("MSE Values");

    // Bars
    svg.selectAll(".bar")
        .data(mse)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", (d, i) => x(i + 1))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d))
        .attr("height", d => height - y(d))
        .style("fill", (d, i) => i === (elbowPoint - 1) ? "orange" : "steelblue");

    
    // add a line to mark the elbow point
    if(elbowPoint) {
        const xElbow = x(elbowPoint) + x.bandwidth() / 2;
        const yElbow = y(mse[elbowPoint - 1]);

        svg.append('line')
            .attr('x1', xElbow)
            .attr('x2', xElbow)
            .attr('y1', yElbow)
            .attr('y2', height)
            .attr('stroke', 'yellow')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
    }
    const lineGenerator = d3.line()
        .x((d, i) => x(i + 1) + x.bandwidth() / 2) // Center of the band
        .y(d => y(d));

    // Append the path for the line chart
    svg.append("path")
        .datum(mse)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

    // Append dots for each data point on the line
    svg.selectAll(".dot")
        .data(mse)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", (d, i) => x(i + 1) + x.bandwidth() / 2)
        .attr("cy", d => y(d))
        .attr("r", 4)
        .style("fill", (d, i) => i === (elbowPoint - 1) ? "yellow" : "green");

    // Highlight the elbow point with a larger yellow circle
    if(elbowPoint) {
        svg.append("circle")
            .attr("cx", x(elbowPoint) + x.bandwidth() / 2)
            .attr("cy", y(mse[elbowPoint - 1]))
            .attr("r", 6)
            .attr("fill", "yellow")
            .attr("stroke", "black")
            .attr("stroke-width", "1");
    }

    svg.selectAll(".bar")
        .on("click", function(event, d, i) {
            svg.selectAll(".bar")
                .style("fill", "steelblue")
                .style("stroke", "none"); // Reset all bars to default color and no stroke
            d3.select(this)
                .style("fill", "orange")
                .style("stroke", "black")
                .style("stroke-width", "2px"); // Highlight selected bar with stroke
            // Update the scatterplot based on the selected dimensionality
            const selectedBarIndex = mse.indexOf(d); // Get the index of the clicked bar based on its data
            const selectedK = selectedBarIndex + 1;
            fetch(`/cluster-data/${selectedK}`)
                .then(response => response.json())
                .then(data => {
                    plotScatterplotMatrix(data.transformed, 
                        data.top_attributes_indices,
                        data.attributes, 
                        data.labels);
                });
        });
    
    // Draw a legend at the top right of the plot
    const legend = svg.append("g")
    .attr("class", "legend")
    // Move the legend to the top right corner. Adjust the x value as needed based on your SVG width
    .attr("transform", `translate(${width - 180},${20})`); // Adjust as needed

    const legendItemHeight = 20; // Height of each legend item, including spacing

    // Unselected bar legend
    legend.append("rect")
    .attr("x", 0)
    .attr("y", 0 * legendItemHeight) // Multiplying by the index (0) for vertical positioning
    .attr("width", 15)
    .attr("height", 15)
    .style("fill", "steelblue");

    legend.append("text")
    .attr("x", 20)
    .attr("y", 0 * legendItemHeight + 12.5) // Center text vertically within the rectangle
    .text("MSE Values")
    .style("font-size", "12px");

    // Selected bar legend
    legend.append("rect")
    .attr("x", 0)
    .attr("y", 1 * legendItemHeight) // Multiplying by the index (1) for vertical positioning
    .attr("width", 15)
    .attr("height", 15)
    .style("fill", "orange");

    legend.append("text")
    .attr("x", 20)
    .attr("y", 1 * legendItemHeight + 12.5) // Center text vertically within the rectangle
    .text("Selected K")
    .style("font-size", "12px");

    // Elbow point legend
    legend.append("circle")
    .attr("cx", 7.5)
    .attr("cy", 2 * legendItemHeight + 7.5) // Multiplying by the index (2) for vertical positioning
    .attr("r", 5)
    .style("fill", "yellow");

    legend.append("text")
    .attr("x", 20)
    .attr("y", 2 * legendItemHeight + 12.5) // Center text vertically within the circle
    .text("Elbow Point")
    .style("font-size", "12px");
}

function updateAttributesTable(topAttributesData) {
    console.log(topAttributesData);

    // Clear the current table contents
    const tableDiv = document.getElementById('table');
    tableDiv.innerHTML = '<h2>Top Attributes by Squared Loading Sum</h2>';

    // Create a table element
    const table = document.createElement('table');
    table.classList.add('attributes-table');
    table.style.width = '100%';
    table.setAttribute('border', '1');
    table.setAttribute('cellspacing', '0');
    table.setAttribute('cellpadding', '5');

    // Create the header row
    let headerRow = table.insertRow();
    let headerCell1 = headerRow.insertCell(0);
    headerCell1.innerHTML = 'Attribute';
    let headerCell2 = headerRow.insertCell(1);
    headerCell2.innerHTML = 'Squared Loading Sum';

    // Inserting data into table
    topAttributesData.forEach(attrData => {
        let row = table.insertRow();
        let cell1 = row.insertCell(0);
        cell1.innerHTML = attrData.attribute;
        let cell2 = row.insertCell(1);
        cell2.innerHTML = attrData.loading_square.toFixed(4); // Assuming you want to round to 4 decimal places
    });

    // Append the table to the div
    tableDiv.appendChild(table);
}

