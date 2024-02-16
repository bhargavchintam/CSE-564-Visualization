const dataColumns = {
    catCols: ["Year", "Stage", "Stadium", "City", "Home Team Name", "Away Team Name", "Referee", "Assistant 1", "Assistant 2", "RoundID", "Home Team Initials", "Away Team Initials"],
    numCols: ["Datetime", "Home Team Goals", "Away Team Goals", "Attendance", "Half-time Home Goals", "Half-time Away Goals", "MatchID"],
    ignoreCols: ["Win conditions"]
};

d3.csv("./WorldCupDataset.csv").then(function(data) {
    console.log(data[0]);
    console.log(dataColumns.ignoreCols)
    const columnNames = Object.keys(data[0]).filter(col => !dataColumns.ignoreCols.includes(col));
    // Get the dropdown elements
    const dropdown = document.getElementById('columnDropdown');

    // Get the toggle button element
    const toggleButton = document.getElementById('orientationToggle');
    const variableToggle = document.getElementById('VariableToggle');

    // Add Select OPtion to Dropdown box
    option = document.createElement('option');
    option.value = "";
    option.text = "Column";
    dropdown.appendChild(option);


    // Add each column name as an option in the dropdown
    columnNames.forEach(function(columnName) {
        const option = document.createElement('option');
        option.value = columnName;
        option.text = columnName;
        dropdown.appendChild(option);
    });

    // Update for scatterplot: Add a second dropdown for the second variable
    const variable2Dropdown = document.getElementById('variable2Dropdown');
    option = document.createElement('option');
    option.value = "";
    option.text = "Column";
    variable2Dropdown.appendChild(option);

    // Populate the second dropdown with column names
    columnNames.forEach(function(columnName) {
        const option = document.createElement('option');
        option.value = columnName;
        option.text = columnName;
        variable2Dropdown.appendChild(option);
    });

    console.log("Column Names:", columnNames);

    function createChart(selectedColumn, orientation, dataColumns) {
        // dataColumns should be a dictionary with keys 'catCols' and 'numCols', like:
        // {catCols: ["category1", "category2"], numCols: ["number1", "number2"]}
        
        // Remove ignored columns from columnNames
        const columnNames = Object.keys(data[0]).filter(col => !dataColumns.ignoreCols.includes(col));

        // After filtering out ignored columns, check if the selected column is still present
        if (!columnNames.includes(selectedColumn)) {
            console.error("Selected column", selectedColumn, "is ignored or does not exist.");
            return;
        }

        // Check if the selected column is numerical or categorical
        const isNumeric = dataColumns.numCols.includes(selectedColumn);
        const isCategorical = dataColumns.catCols.includes(selectedColumn);
    
        console.log(selectedColumn);
    
        if (isNumeric) {
            // Plot histogram for numerical data
            createHistogram(selectedColumn, orientation);
        } else if (isCategorical) {
            // Plot bar chart for categorical data
            createBarChart(selectedColumn, orientation);
        } else {
            // Handle cases where the column type is not specified or recognized
            console.error("Column type for", selectedColumn, "is not specified or recognized.");
        }
    }
    
    // Function to create bar chart
    function createBarChart(selectedColumn, orientation) {
        // Remove existing chart if any
        d3.select("svg").remove();

        // Filter data to get the selected column values
        const selectedData = data.map(d => d[selectedColumn]);

        // Calculate frequency of each category
        const categoryCounts = selectedData.reduce((acc, curr) => {
            acc[curr] ? acc[curr]++ : (acc[curr] = 1);
            return acc;
        }, {});

        // Convert categoryCounts object to array of objects
        const categories = Object.keys(categoryCounts).map(category => ({
            category: category,
            count: categoryCounts[category]
        }));

        // Set up dimensions and margins for the chart
        const margin = { top: 40, right: 30, bottom: 100, left: 120 };
        let width, height;
        if (orientation === 'vertical') {
            width = 1500 - margin.left - margin.right;
            height = 600 - margin.top - margin.bottom;
        } else {
            width = 600 - margin.left - margin.right;
            height = 1500 - margin.top - margin.bottom;
        }

        // Create SVG element
        const svg = d3.select("body")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style("margin-top", "25px")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Define x and y scales based on orientation
        const x = orientation === 'vertical' ? 
            d3.scaleBand().domain(categories.map(d => d.category)).range([0, width]).padding(0.1) :
            d3.scaleLinear().domain([0, d3.max(categories, d => d.count)]).nice().range([0, width]);
        
        const y = orientation === 'vertical' ? 
            d3.scaleLinear().domain([0, d3.max(categories, d => d.count)]).nice().range([height, 0]) :
            d3.scaleBand().domain(categories.map(d => d.category)).range([height, 0]).padding(0.1);

        // Define orientation-specific axis functions
        const xAxis = d3.axisBottom(x);
        const yAxis = d3.axisLeft(y);

        // Append bars to the chart
        svg.selectAll(".bar")
            .data(categories)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => orientation === 'vertical' ? x(d.category) : 0)
            .attr("y", d => orientation === 'vertical' ? y(d.count) : y(d.category))
            .attr("width", d => orientation === 'vertical' ? x.bandwidth() : x(d.count))
            .attr("height", d => orientation === 'vertical' ? height - y(d.count) : y.bandwidth());

        // Append x-axis to the chart
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.5em")
            .attr("transform", "rotate(-45)");

        // Append y-axis to the chart
        svg.append("g")
            .call(yAxis);

        // Update x-axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 20)
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text(orientation === 'vertical' ? selectedColumn : "Count");

        // Update y-axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -(height / 2))
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text(orientation === 'vertical' ? "Count" : selectedColumn);


        // Append plot title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "25px")
            .style("font-weight", "bold")
            .text("Bar Chart of " + selectedColumn);
    }

    // Function to create histogram
    function createHistogram(selectedColumn, orientation) {
        // Remove existing chart if any
        d3.select("svg").remove();
    
        // Determine if the data is numeric or datetime
        const isDatetime = data.some(d => !isNaN(Date.parse(d[selectedColumn])));
    
        // Convert Data to appropriate type and filter out non-valid values
        const convertedData = isDatetime ? 
            data.map(d => new Date(d[selectedColumn])).filter(d => !isNaN(d.getTime())) :
            data.map(d => parseFloat(d[selectedColumn])).filter(d => !isNaN(d));
    
        // Set up dimensions and margins for the chart
        const margin = { top: 40, right: 30, bottom: 100, left: 120 };
        let width, height;
        if (orientation === 'vertical') {
            width = 1500 - margin.left - margin.right;
            height = 600 - margin.top - margin.bottom;
        } else {
            // Swap width and height for horizontal orientation
            width = 600 - margin.top - margin.bottom;
            height = 1500 - margin.left - margin.right;
        }
    
        // Create SVG element
        const svg = d3.select("body")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style("margin-top", "25px")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
        // Calculate histogram bins
        const histogram = d3.histogram()
            .value(d => d)
            .domain(isDatetime ? d3.extent(convertedData) : d3.extent(convertedData))
            .thresholds(isDatetime ? 
                d3.scaleTime().domain(d3.extent(convertedData)).ticks(20) :
                d3.scaleLinear().domain(d3.extent(convertedData)).ticks(20));
    
        const bins = histogram(convertedData);
    
        // Define scales and axes based on orientation and data type
        let x, y, xAxis, yAxis;
        if (orientation === 'vertical') {
            x = isDatetime ? 
                d3.scaleTime().domain(d3.extent(convertedData)).range([0, width]) :
                d3.scaleLinear().domain(d3.extent(convertedData)).range([0, width]);
            y = d3.scaleLinear()
                .domain([0, d3.max(bins, d => d.length)]).range([height, 0]);
            
            xAxis = d3.axisBottom(x);
            yAxis = d3.axisLeft(y);
        } else {
            // For horizontal orientation, swap the roles of x and y scales
            y = isDatetime ? 
                d3.scaleTime().domain(d3.extent(convertedData)).range([0, height]) :
                d3.scaleLinear().domain(d3.extent(convertedData)).range([0, height]);
            x = d3.scaleLinear()
                .domain([0, d3.max(bins, d => d.length)]).range([0, width]);
            
            yAxis = d3.axisLeft(y);
            xAxis = d3.axisBottom(x).ticks(20);
        }
    
        // Append and adjust bars for orientation
        svg.selectAll(".bar")
            .data(bins)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => orientation === 'vertical' ? x(d.x0) : 0)
            .attr("y", d => orientation === 'vertical' ? y(d.length) : y(d.x0))
            .attr("width", d => orientation === 'vertical' ? Math.max(0, x(d.x1) - x(d.x0) - 1) : x(d.length))
            .attr("height", d => orientation === 'vertical' ? height - y(d.length) : Math.max(0, y(d.x1) - y(d.x0) - 1));
    
        // Append axes to the chart
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-0.8em")
            .attr("dy", "0.15em")
            .attr("transform", "rotate(-45)");
    
        svg.append("g")
            .call(yAxis);
    
        // Update axis labels
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 20)
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text(orientation === 'vertical' ? selectedColumn : "Frequency");
    
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -(height / 2))
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text(orientation === 'vertical' ? "Frequency" : selectedColumn);
    
        // Append plot title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "25px")
            .style("font-weight", "bold")
            .text("Histogram of " + selectedColumn);
    }    


    function createScatterplot(var1, var2, orientation) {
        d3.select("svg").remove(); // Clear previous plots
    
        const svgWidth = 800, svgHeight = 600;
        const margin = {top: 50, right: 50, bottom: 60, left: 80};
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;
    
        const svg = d3.select("body").append("svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
        // Decide which variable goes on which axis based on the toggle state
        const xValue = variableToggle.checked ? var2 : var1;
        const yValue = variableToggle.checked ? var1 : var2;
    
        // Compute dynamic scales based on data
        const xScale = d3.scaleLinear()
            .domain([d3.min(data, d => +d[xValue]), d3.max(data, d => +d[xValue])])
            .range([0, width])
            .nice(); // .nice() makes the axis end at a round value
    
        const yScale = d3.scaleLinear()
            .domain([d3.min(data, d => +d[yValue]), d3.max(data, d => +d[yValue])])
            .range([height, 0])
            .nice();
    
        svg.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(d[xValue]))
            .attr("cy", d => yScale(d[yValue]))
            .attr("r", 3.5);
    
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));
    
        svg.append("g")
            .call(d3.axisLeft(yScale));

        // Add X axis label
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 15)
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text(xValue);

        // Add Y axis label
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text(yValue);

        // Add plot title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "25px")
            .style("font-weight", "bold")
            .text(`Scatterplot of ${var1} vs ${var2}`);
    }

    // Event listener for dropdown change
    // dropdown.addEventListener("change", function() {
    //     const selectedColumn = this.value;
    //     const orientation = toggleButton.checked ? 'horizontal' : 'vertical'; // Check if toggle button is checked
    //     createChart(selectedColumn, orientation, dataColumns);
    // });

    // Event listener for toggle button change
    // toggleButton.addEventListener("change", function() {
    //     const selectedColumn = dropdown.value;
    //     const orientation = this.checked ? 'horizontal' : 'vertical'; // Check if toggle button is checked
    //     createChart(selectedColumn, orientation, dataColumns);
    // });


    dropdown.addEventListener("change", function() {
        updateVisualization();
    });
    
    variable2Dropdown.addEventListener("change", function() {
        updateVisualization();
    });
    
    variableToggle.addEventListener("change", function() {
        updateVisualization();
    });

    toggleButton.addEventListener("change", function() {
        updateVisualization();
    });
    
    function updateVisualization() {
        const var1 = dropdown.value;
        const var2 = variable2Dropdown.value;
        const orientation = toggleButton.checked ? 'horizontal' : 'vertical';
        if (var1 && var2) { // Ensure both variables are selected
            createScatterplot(var1, var2, orientation);
        } else if (var1) {
            createChart(var1, orientation, dataColumns); // Fallback to single variable charting
        }
    }
    
    // Initially call updateVisualization to setup the default view
    updateVisualization();
}).catch(function(error) {
    console.error("Error loading the CSV file: ", error);
});
