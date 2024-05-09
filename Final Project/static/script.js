document.addEventListener('DOMContentLoaded', function() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            console.log("Data fetched:", data);
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
    fetch('/loadmapdata')
        .then(response => response.json())
        .then(mapData => {
            console.log('mapData:',mapData);
            GeoMap(mapData).then(mappic => {
                document.getElementById('geomap').appendChild(mappic);
            })
            .catch(error => {
                console.error('Error fetching or processing data:', error);
            });
        })
    });
});

let selectedNodes = [];

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
        .on("click", function(d, i) {
            if (selectedNodes.includes(i)) {
                selectedNodes = selectedNodes.filter(index => index !== i);
                d3.select(this).select("rect").attr("fill", (d, i) => (config.nodeColor === 'custom' ? config.colors[i % config.colors.length] : config.colors)); // Revert node color
            } else {
                if (selectedNodes.length < 2) {
                    selectedNodes.push(i);
                    d3.select(this).select("rect").attr("fill", "yellow"); // Highlight selected node
                } else {
                    selectedNodes = [i]; // Select only the clicked node if already 2 nodes selected
                    d3.selectAll("rect").attr("fill", (n, j) => (selectedNodes.includes(j) ? "yellow" : (config.nodeColor === 'custom' ? config.colors[j % config.colors.length] : config.colors)));
                }
            }
            console.log("Selected nodes:", selectedNodes.map(node => node.name));
            displayImages(selectedNodes.map(node => node.name));
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
        image.width = 200;
        container.appendChild(image);
    }

    const constructors = ['Ferrari', 'McLaren', 'Renault', 'Toro Rosso', 'Sauber', 
                      'Red Bull', 'Williams', 'Alpine F1 Team', 'Aston Martin', 
                      'Alfa Romeo', 'Lotus F1', 'Mercedes', 'Force India', 
                      'Haas F1 Team', 'Racing Point'];

    if (selectedNodes.length === 0) {
        ['Mercedes', 'Red Bull'].forEach((node) => {
            const container = document.createElement('div');
            box1.appendChild(container);
            addImage(node, container);
            fetchAndDisplayConstructorDetails(node, container);
        });
        
    } else {
        // For one or two selections
        selectedNodes.forEach((node) => {
            const container = document.createElement('div');
            box1.appendChild(container);
            addImage(node, container);

            if (constructors.includes(node)) {
                fetchAndDisplayConstructorDetails(node, container);
            } else {
                fetchAndDisplayDriverDetails(node, container);
            }
        });
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

async function fetchData() {
    try {
        const response = await fetch('/PCPdata');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Data received from server:', data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

fetchData();

displayImages(selectedNodes);

async function GeoMap(mapData) {
    
    let isDragging = false;
    let prevX;
    let prevY;
    
    function startDragging(e) {
        isDragging = true;
        prevX = e.x;
        prevY = e.y;
    }
    
    function handleDragging(e) {
        if (isDragging) {
            const dx = e.x - prevX;
            const dy = e.y - prevY;
            
            const transform = d3.zoomTransform(d3.select("#geomap").node());
            const scale = transform.k;
            const newX = transform.x + dx / scale;
            const newY = transform.y + dy / scale;
            
            d3.select("#geomap").selectAll("path")
                .attr("transform", `translate(${newX},${newY}) scale(${scale})`);
            
            prevX = e.x;
            prevY = e.y;
        }
    }
    
    function stopDragging() {
        isDragging = false;
    }
    
    function zoomFunction(e) {
        d3.select("#geomap").selectAll("path")
            .attr("transform", e.transform);
    }
    
    var zoom = d3.zoom()
        .scaleExtent([0.6, 10])
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

    const drag = d3.drag()
        .on("start", startDragging)
        .on("drag", handleDragging)
        .on("end", stopDragging);
    
    svg.call(drag);

    const scale = Math.min(width / 2, height) / 2;

    const projection = d3.geoMercator()
        .scale(scale)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    svg.selectAll("path")
        .data(mapData.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", "#949494")
        .attr("stroke", "lightgray");

    return svg.node();
}

function refreshPage() {
    window.location.reload(); // Reloads the current page
}
