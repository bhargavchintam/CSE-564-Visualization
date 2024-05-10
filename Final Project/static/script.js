document.addEventListener('DOMContentLoaded', function() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            const { nodes, links } = data;
            SankeyChart({ nodes, links }, {
                nodeId: d => d.name,
                nodeWidth: 20,
                nodePadding: 10,
                align: 'justify',
                width: 480,
                height: 650,
                linkColor: 'source-target',
                nodeColor: 'custom',
                colors: d3.schemeCategory10
            }).then(chart => {
                document.getElementById('sankey').appendChild(chart);
            });
        });
    fetch('/loadmapdata')
        .then(response => response.json())
        .then(mapData => {
            worldMapData = mapData;
            GeoMap(mapData, selectedNodesPoints).then(mapContainer => {
                document.getElementById('geomap').appendChild(mapContainer);
            })
            .catch(error => {
                console.error('Error fetching or processing data:', error);
            });
        });
});

let selectedNodes = [];
let selectedNodesPoints = [];
let worldMapData;

async function SankeyChart({ nodes, links }, config) {

    const sankey = d3.sankey()
        .nodeWidth(config.nodeWidth)
        .nodePadding(config.nodePadding)
        .extent([[1, 40], [config.width - 1, config.height - 10]]);

    const sankeyData = sankey({
        nodes: nodes.map(d => ({ ...d })),
        links: links.map(d => ({ ...d, value: +d.value })),
    });

    const svg = d3.create("svg")
        .attr("width", config.width)
        .attr("height", config.height)
        .attr("viewBox", `0 0 ${config.width} ${config.height}`);

    const link = svg.append("g")
        .selectAll("path")
        .data(sankeyData.links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("fill", "none")
        .attr("stroke", "grey")
        .attr("opacity", 0.5)
        .append("title")
        .text(d => `Points: ${d.value}, Year: ${d.year}`);

    const node = svg.append("g")
        .selectAll("g")
        .data(sankeyData.nodes)
        .join("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .on("mouseenter", function(d) {
            d3.select(this).select("rect").attr("opacity", 0.8);
        })
        .on("mouseleave", function(d) {
            d3.select(this).select("rect").attr("opacity", 1); // Restore opacity on mouse leave
        })
        .on("click", async function(d, i) {
            if (selectedNodes.includes(i)) {
                selectedNodes = selectedNodes.filter(index => index !== i);
                d3.select(this).select("rect").attr("fill", (d, i) => (config.nodeColor === 'custom' ? config.colors[i % config.colors.length] : config.colors)); // Revert node color
            } else {
                if (selectedNodes.length == 1) {
                    if(selectedNodes[0]['targetLinks'].length == 0 && i['targetLinks'].length == 0 || 
                    selectedNodes[0]['sourceLinks'].length == 0 && i['sourceLinks'].length == 0
                    ) {
                        selectedNodes.push(i);
                        d3.select(this).select("rect").attr("fill", "yellow");
                    }
                    else {
                        selectedNodes = [i];
                        d3.selectAll("rect").attr("fill", (n, j) => (selectedNodes.includes(n) ? "yellow" : (config.nodeColor === 'custom' ? config.colors[j % config.colors.length] : config.colors)));
                    }
                } else {
                    selectedNodes = [i]; // Select only the clicked node if already 2 nodes selected
                    d3.selectAll("rect").attr("fill", (n, j) => (selectedNodes.includes(n) ? "yellow" : (config.nodeColor === 'custom' ? config.colors[j % config.colors.length] : config.colors)));
                }
            }
            console.log("Selected nodes:", selectedNodes);
            displayImages(selectedNodes.map(node => node.name));
            loadAndDisplayLineChart();
            projectMapPoints(selectedNodes).then(selectedNodesPoints => {
                GeoMap(worldMapData, selectedNodesPoints).then(mapContainer => {
                    document.getElementById("geomap").innerHTML = "";
                    document.getElementById('geomap').appendChild(mapContainer);
                })
                .catch(error => {
                    console.error('Error fetching or processing data:', error);
                });
            });
            
        });

    // Add rectangles for nodes
    node.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", (d, i) => (config.nodeColor === 'custom' ? config.colors[i % config.colors.length] : config.colors))
        .attr("stroke", "black");

    // Add text labels inside nodes
    node.append("text")
        .attr("x", d => {
            if (d.sourceLinks.length) {
                return 25; // Position on the left for source nodes
            } else {
                return d.x1 - d.x0 - 25; // Position on the right for target nodes
            }
        })
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => {
            if (d.sourceLinks.length) {
                return "start"; // Anchor to start for left-aligned text
            } else {
                return "end"; // Anchor to end for right-aligned text
            }
        })
    .text(d => d.name)
    .style("fill", "white");

    svg.append("text")
        .attr("x", config.width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "white")
        .text("Sankey Diagram - Drivers vs Constructor");

    return svg.node();
}

function displayImages(selectedNodes) {
    const box1 = document.querySelector('.small-box1');
    box1.innerHTML = ''; // Clear the box before adding new content

    const driversData = [];
    const constructorsData = [];
    const con_details = document.querySelector('.details-container');

    async function fetchAndDisplayDriverDetails(driverName, container) {
        fetch(`/get_drivers_details`)
        .then(response => response.json())
        .then(data => {
            let driverDetails;

            // If no driverName was provided, handle potentially multiple data entries
            driverDetails = data.find(driver => driver['Name of the Driver'].toLowerCase() === driverName.toLowerCase());
            driversData.push(driverDetails);

            // Display driver details under the image
            const details = document.createElement('div');
            details.innerHTML = `<p>Name: ${driverDetails['Name of the Driver']}</p>
                                <p>Nationality: ${driverDetails['nationality']}</p>
                                <p>Current Team: ${driverDetails['Current Team']}</p>
                                <p>Years Active: ${driverDetails['Years Active']}</p>`;
            container.appendChild(details);

            // Add a canvas for the radar chart
            const radarContainer = document.createElement('div');
            radarContainer.classList.add("radar");
            const canvas = document.createElement('canvas');
            const canvasId = `driver-radarChart`;
            const existingCanvas = document.getElementById(canvasId);
            if (existingCanvas) {
                existingCanvas.remove(); // Remove existing canvas to prevent conflicts
            }
            canvas.id = canvasId;
            radarContainer.appendChild(canvas);
            box1.appendChild(radarContainer)
            

            const maxScales = {};
            const labelMapping = {
                'No. of Wins': 'Wins',
                'Total Podiums': 'Podiums',
                'Total Points': 'Points',
                'Pole Positions': 'Pole Positions',
                'No. of Fastest Laps': 'Fastest Laps'
            };
            
            Object.keys(driverDetails).forEach(key => {
                if (typeof driverDetails[key] === 'number' && labelMapping[key]) {
                    const maxVal = Math.max(...data.map(driver => driver[key] || 0));
                    maxScales[labelMapping[key]] = maxVal;
                }
            });

            // Generate radar chart data
            updateRadarChart(driversData, maxScales, canvasId);
        })
        .catch(error => console.error('Error:', error));
    }

    async function fetchAndDisplayConstructorDetails(constructorName, container) {
        fetch(`/get_constructors_details`)
        .then(response => response.json())
        .then(data => {
            let constructorDetails;

            // If no driverName was provided, handle potentially multiple data entries
            constructorDetails = data.find(constructor => constructor['name'].toLowerCase() === constructorName.toLowerCase());
            constructorsData.push(constructorDetails);

            // Display driver details under the image
            const details = document.createElement('div');
            details.innerHTML = `<p>Name: ${constructorDetails['name']}</p>
                                <p>Nationality: ${constructorDetails['nationality']}</p>
                                <p>Best Driver: ${constructorDetails['BestDriver']}</p>`;

            container.appendChild(details);

            // Add a canvas for the radar chart
            const radarContainer = document.createElement('div');
            radarContainer.classList.add("radar")
            const canvas = document.createElement('canvas');
            const canvasId = `constructor-radarChart`;
            const existingCanvas = document.getElementById(canvasId);
            if (existingCanvas) {
                existingCanvas.remove(); // Remove existing canvas to prevent conflicts
            }
            canvas.id = canvasId;
            radarContainer.appendChild(canvas);
            box1.appendChild(radarContainer)

            const maxScales = {};
            const labelMapping = {
                'NoOfGamesPlayed': 'Total Races',
                'NoOfWins': 'Wins',
                'points': 'Points',
                'NoOfDrivers': 'Drivers',
                'PolePositions': 'Pole Positions',
            };
            
            Object.keys(constructorDetails).forEach(key => {
                if (typeof constructorDetails[key] === 'number' && labelMapping[key]) {
                    const maxVal = Math.max(...data.map(constructor => constructor[key] || 0));
                    maxScales[labelMapping[key]] = maxVal;
                }
            });

            // Generate radar chart data
            updateRadarChart2(constructorsData, maxScales, canvasId);
        })
        .catch(error => console.error('Error:', error));
    }

    function addImage(driverName, container) {
        const image = document.createElement('img');
        image.src = `/static/images/${driverName}.svg`;
        image.alt = driverName;
        image.width = 100;
        image.height = 50;
        container.appendChild(image);
    }

    const constructors = ['Ferrari', 'McLaren', 'Renault', 'Toro Rosso', 'Sauber', 
                      'Red Bull', 'Williams', 'Alpine F1 Team', 'Aston Martin', 
                      'Alfa Romeo', 'Lotus F1', 'Mercedes', 'Force India', 
                      'Haas F1 Team', 'Racing Point'];

    if (selectedNodes.length === 0) {
        ['Mercedes'].forEach((node) => {
            const container = document.createElement('div');
            box1.appendChild(container);
            addImage(node, container);
            fetchAndDisplayConstructorDetails(node, container);
        });
        
    } else {
        // For one or two selections
    const player_box = document.createElement('div');
    player_box.classList.add('stats-info');
        selectedNodes.forEach(async (node) => {
            const container = document.createElement('div');
            container.classList.add('portfolio');
            const image_container = document.createElement('div');
            image_container.classList.add('image-container');
            image_container.id = node;
            await addImage(node, image_container);
            container.appendChild(image_container);
            player_box.appendChild(container);
            
            if (constructors.includes(node)) {
                fetchAndDisplayConstructorDetails(node, container);
            } else {
                fetchAndDisplayDriverDetails(node, container);
            }
        });
        box1.appendChild(player_box)
    }
}

function updateRadarChart(driversDetails, maxScales, canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const colors = ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)'];
    const borderColors = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)'];

    // Normalize data based on max scales
    const datasets = driversDetails.map((driverData, index) => {
        const normalizedData = [
            driverData['No. of Wins'] / maxScales['Wins'],
            driverData['Total Podiums'] / maxScales['Podiums'],
            driverData['Total Points'] / maxScales['Points'],
            driverData['Pole Positions'] / maxScales['Pole Positions'],
            driverData['No. of Fastest Laps'] / maxScales['Fastest Laps']
        ].map(value => value * 100);

        return {
            label: driverData['Name of the Driver'],
            data: normalizedData,
            backgroundColor: colors[index],
            borderColor: borderColors[index],
            pointBackgroundColor: borderColors[index],
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: borderColors[index]
        };
    });

    const chart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Wins', 'Podiums', 'Points', 'Pole Positions', 'Fastest Laps'],
            datasets: datasets
        },
        options: {
            scales: {
                r: {
                    angleLines: {
                        display: false
                    },
                    ticks: {
                        // Since data is normalized, the max is 100%
                        max: 100,
                        min: 0,
                        callback: function(value) {
                            return value + '%'; // Show percentage on scale
                        }
                    }
                }
            },
            maintainAspectRatio: true,
            aspectRatio: 1,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const index = context.dataIndex;
                            const category = context.chart.data.labels[index];
                            const actualValue = driversDetails[context.datasetIndex][{
                                'Wins': 'No. of Wins',
                                'Podiums': 'Total Podiums',
                                'Points': 'Total Points',
                                'Pole Positions': 'Pole Positions',
                                'Fastest Laps': 'No. of Fastest Laps'
                            }[category]];
                            return `${label}: ${actualValue} (${context.raw.toFixed(2)}%)`;
                        }
                    }
                }
            }
        }
    });
    chart.update();
}

function updateRadarChart2(constructorsDetails, maxScales, canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const colors = ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)'];
    const borderColors = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)'];

    // Normalize data based on max scales
    const datasets = constructorsDetails.map((constructorData, index) => {
        const normalizedData = [
            constructorData['NoOfGamesPlayed'] / maxScales['Total Races'],
            constructorData['NoOfWins'] / maxScales['Wins'],
            constructorData['points'] / maxScales['Points'],
            constructorData['NoOfDrivers'] / maxScales['Drivers'],
            constructorData['PolePositions'] / maxScales['Pole Positions']
        ].map(value => value * 100);

        return {
            label: constructorData['name'],
            data: normalizedData,
            backgroundColor: colors[index],
            borderColor: borderColors[index],
            pointBackgroundColor: borderColors[index],
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: borderColors[index]
        };
    });

    const chart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Total Races', 'Wins', 'Points', 'Drivers', 'Pole Positions'],
            datasets: datasets
        },
        options: {
            scales: {
                r: {
                    angleLines: {
                        display: false
                    },
                    ticks: {
                        // Since data is normalized, the max is 100%
                        max: 100,
                        min: 0,
                        callback: function(value) {
                            return value + '%'; // Show percentage on scale
                        }
                    }
                }
            },
            maintainAspectRatio: true,
            aspectRatio: 1,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const index = context.dataIndex;
                            const category = context.chart.data.labels[index];
                            const actualValue = driversDetails[context.datasetIndex][{
                                'NoOfGamesPlayed': 'Total Races',
                                'NoOfWins': 'Wins',
                                'points': 'Points',
                                'NoOfDrivers': 'Drivers',
                                'PolePositions': 'Pole Positions'
                            }[category]];
                            return `${label}: ${actualValue} (${context.raw.toFixed(2)}%)`;
                        }
                    }
                }
            }
        }
    });
    chart.update();
}

async function PCPplot() {
    let data;
    try {
        const response = await fetch('/PCPdata');
        if (!response.ok) {
            throw new Error('HTTP error! Status: ' + response.status);
        }
        data = await response.json();
        console.log("Data loaded:", data);
    } catch (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (data.length === 0) {
        console.log("No data to display.");
        return;
    }

    const margin = {top: 30, right: 0, bottom: 10, left: 0},
          width = 600 - margin.left - margin.right,
          height = 250 - margin.top - margin.bottom;

    const svg = d3.select("#pcpPlot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const dimensions = Object.keys(data[0]).filter(d => {
        return !["Circuit name", "Matches"].includes(d) && !isNaN(data[0][d]);
    });

    const y = {};
    dimensions.forEach(dim => {
        y[dim] = d3.scaleLinear()
            .domain(d3.extent(data, d => +d[dim]))
            .range([height, 0])
            .nice();
    });

    const x = d3.scalePoint()
        .range([0, width])
        .padding(1)
        .domain(dimensions);

    const line = svg.selectAll("path")
        .data(data)
        .enter().append("path")
        .attr("d", d => d3.line()(dimensions.map(p => [x(p), y[p](d[p])])))
        .attr("class", "line")
        .style("fill", "none")
        .style("stroke", "#69b3a2")
        .style("opacity", 0.8);

    const brush = d3.brushY()
        .extent([[-8, 0], [8, height]])
        .on("brush end", brushended);

    const activeBrushing = {};

    function brushended(event, dimension) {
        if (event.selection) {
            activeBrushing[dimension] = event.selection.map(y[dimension].invert, y[dimension]);
        } else {
            delete activeBrushing[dimension];
        }
        updateLines();
    }

    function updateLines() {
        line.style("display", d => {
            return dimensions.every(dim => {
                if (!activeBrushing[dim]) return true; // No active brush on this dimension.
                const range = activeBrushing[dim];
                return d[dim] >= Math.min(...range) && d[dim] <= Math.max(...range);
            }) ? null : "none";
        });
    }

    const axis = svg.selectAll(".axis")
        .data(dimensions).enter()
        .append("g")
        .attr("class", "axis")
        .attr("transform", d => `translate(${x(d)})`)
        .each(function(d) { d3.select(this).call(d3.axisLeft(y[d])); })
        .append("g")
        .attr("class", "brush")
        .each(function(d) { d3.select(this).call(brush.on("brush end", event => brushended(event, d))); });

    axis.append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d)
        .style("fill", "black");
}

document.addEventListener('DOMContentLoaded', PCPplot);


displayImages(selectedNodes);


async function fetchMapProjections(name, node) {
    const response = await fetch('/fetchMapProjections', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'name': name,
            'node': node
        })
    });
    const data = await response.json();
    return data;
}

async function projectMapPoints(selectedNodes) {
    let selectedNodesPoints = []
    if (selectedNodes.length) {
        for(var i=0; i<selectedNodes.length;i++) {
            let result;
            if(!selectedNodes[i]['targetLinks'].length){
                result = await fetchMapProjections(selectedNodes[i].name, 0);
                selectedNodesPoints.push(result);
               
            }
            else {
                result = await fetchMapProjections(selectedNodes[i].name, 1);
                selectedNodesPoints.push(result);
            }
            
        }
        
    }
    return selectedNodesPoints
}

function loadAndDisplayLineChart(para='default') {
    // List of constructors to check against
    const constructors = ['Ferrari', 'McLaren', 'Renault', 'Toro Rosso', 'Sauber', 
                          'Red Bull', 'Williams', 'Alpine F1 Team', 'Aston Martin', 
                          'Alfa Romeo', 'Lotus F1', 'Mercedes', 'Force India', 
                          'Haas F1 Team', 'Racing Point'];

    // Determine which endpoint to fetch from
    names = selectedNodes.map(node => node.name);
    const hasSelectedConstructors = names.some(node => constructors.includes(node));
    let endpoint = hasSelectedConstructors ? '/data-con-line' : '/data-line';
    if (para === 'default') {
        endpoint = '/data-con-line';
    }

    fetch(endpoint)
    .then(response => response.json())
    .then(data => {
        createLineChart(data);
    })
    .catch(error => console.error('Error fetching data for line chart:', error));
}

let myChart = null;

function createLineChart(data) {
    const ctx = document.getElementById('driverPointsChart').getContext('2d');
    if (myChart) {
        myChart.destroy();
    }
    const datasets = data.map(driver => ({
        label: driver.driver,
        data: driver.data.map(item => ({
            x: item.year,
            y: item.points
        })),
        fill: false,
        borderColor: randomColor(), // This function needs to be defined to generate random colors
        borderWidth: 2,
        pointRadius: 0, // Remove dots by setting radius to 0
        hoverBorderWidth: 3,
        tension: 0.1
    }));

    const config = {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems, data) {
                            return 'Year: ' + tooltipItems[0].label.replace(",", '');
                        },
                        label: function(tooltipItem) {
                            return `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue} points`;
                        }
                    }
                },
                legend: {
                    display: false // Hide the legend
                },
                title: {
                    display: true,
                    text: 'Years vs Points', // Chart title
                    padding: {
                        top: 10,
                        bottom: 20
                    },
                    font: {
                        size: 18
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Year'
                    },
                    ticks: {
                        // Custom formatting for X-axis labels to remove commas
                        callback: function(value) {
                            return value.toString(); // Convert to string to display without commas
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Points'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x'
            }
        }
    };

    myChart = new Chart(ctx, config);
}

function randomColor() {
    // Function to generate a random hex color
    return '#' + Math.floor(Math.random()*16777215).toString(16);
}

// Call the function to load data and display the chart
loadAndDisplayLineChart();


async function GeoMap(mapData, selectedNodesPoints) {

    const statusContainer = d3.select("body").append("div")
        .attr("class", "status-container")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid black")
        .style("padding", "5px")
        .style("display", "none");

    function zoomFunction(e) {
        // Get current transform
        const { x, y, k } = e.transform;

        // Get container dimensions
        const containerWidth = svgContainer.node().clientWidth;
        const containerHeight = svgContainer.node().clientHeight;

        // Calculate the maximum allowed translation to keep the map within the container
        const maxX = containerWidth * (1 - k);
        const maxY = containerHeight * (1 - k);

        // Limit translation to keep map within container
        const tx = Math.min(0, Math.max(maxX, x));
        const ty = Math.min(0, Math.max(maxY, y));

        // Apply the transformed translation
        d3.select("#geomap").selectAll("path")
            .attr("transform", `translate(${tx},${ty}) scale(${k})`);

        d3.select("#geomap").selectAll("circle")
            .attr("transform", `translate(${tx},${ty}) scale(${k})`);   
    }

    var zoom = d3.zoom()
        .scaleExtent([1.2, 10])
        .on("zoom", zoomFunction);

    const svgContainer = d3.select("#geomap");

    const width = svgContainer.node().clientWidth;
    const height = svgContainer.node().clientHeight;

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .style("margin", 0)
        .style("padding", 0)
        .call(zoom);


    const scale = Math.min(width / 2, height) / 2;

    const projection = d3.geoMercator()
        .fitSize([width, height], mapData);

    const path = d3.geoPath().projection(projection);

    svg.selectAll("path")
        .data(mapData.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", "#949494")
        .attr("stroke", "lightgray");

    let point_color = ['red', 'yellow'];

    for (let i = 0; i < selectedNodesPoints.length; i++) {
        selectedNodesPoints[i].forEach(point => {
            const [x, y] = projection([point.lng, point.lat]);
            const circle = svg.append("circle")
                .attr("class", "point")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", Math.cbrt(point.total_points))
                .attr("fill", point_color[i])
                .style("fill-opacity", 0.4)
                .style("stroke", "black")
                .style("stroke-width", 2)
                .on("mouseover", function(event) {
                    const mouseX = event.pageX;
                    const mouseY = event.pageY;
                    statusContainer.style("display", "block")
                        .style("left", (mouseX + 10) + "px")
                        .style("top", (mouseY - 20) + "px")
                        .html(`Circuit: ${point.name_circuit}<br>
                        location: ${point.location}<br>
                        Total Points: ${point.total_points}<br>
                        `);
                })
                .on("mouseout", function() {

                    statusContainer.style("display", "none");
                });

            // Add data attribute to circle for reference
            circle.node().__data__ = point;
        });
    }

    return svg.node();
}

function refreshPage() {
    window.location.reload(); // Reloads the current page
}
