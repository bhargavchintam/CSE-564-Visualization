// document.addEventListener('DOMContentLoaded', function() {
//     fetch('/data')
//         .then(response => response.json())
//         .then(data => {
//             console.log("Data fetched:", data);  // Log to see the fetched data
//             const { nodes, links } = data;
//             SankeyChart({ nodes, links }, {
//                 nodeId: d => d.name,
//                 nodeWidth: 15,
//                 nodePadding: 10,
//                 align: 'justify',
//                 width: 500,
//                 height: 650,
//                 linkColor: 'source-target',
//                 colors: d3.schemeCategory10
//             }).then(chart => {
//                 document.getElementById('sankey').appendChild(chart);
//             });
//         });
// });

// async function SankeyChart({ nodes, links }, config) {

//     const sankey = d3.sankey()
//         .nodeWidth(config.nodeWidth)
//         .nodePadding(config.nodePadding)
//         .extent([[1, 1], [config.width - 1, config.height - 5]]);

//     const sankeyData = sankey({
//         nodes: nodes.map(d => ({ ...d })),
//         links: links.map(d => ({ ...d, value: +d.value })),
//     });

//     const svg = d3.create("svg")
//         .attr("width", config.width)
//         .attr("height", config.height)
//         .attr("viewBox", `0 0 ${config.width} ${config.height}`);

//     const link = svg.append("g")
//         .selectAll("path")
//         .data(sankeyData.links)
//         .join("path")
//         .attr("d", d3.sankeyLinkHorizontal())
//         .attr("stroke-width", d => Math.max(1, d.width))
//         .attr("fill", "none")
//         .attr("stroke", "grey")
//         .attr("opacity", 0.5)
//         .append("title")
//         .text(d => `Points: ${d.value}, Year: ${d.year}`);

//     const node = svg.append("g")
//         .selectAll("rect")
//         .data(sankeyData.nodes)
//         .join("rect")
//         .attr("x", d => d.x0)
//         .attr("y", d => d.y0)
//         .attr("height", d => d.y1 - d.y0)
//         .attr("width", d => d.x1 - d.x0)
//         .attr("fill", "none")
//         .attr("stroke", "black");
    
//     // Add text labels inside nodes
//     node.append("text")
//         .attr("x", d => (d.x1 - d.x0) / 2)
//         .attr("y", d => (d.y1 - d.y0) / 2)
//         .attr("dy", "0.35em")
//         .attr("text-anchor", "middle")
//         .text(d => d.name)
//         .style("fill", "white"); // Make text white for better visibility

//     // Add labels for nodes
//     node.append("text")
//         .attr("x", d => (d.x1 - d.x0) / 2)
//         .attr("y", d => d.y1 - d.y0 + 14) // Position below the node
//         .attr("dy", "0.35em")
//         .attr("text-anchor", "middle")
//         .style("font-size", "10px")
//         .text(d => d.name)
//         .style("fill", "black"); // Make text black for better visibility

//     // node.append("title")
//     //     .text(d => `${d.name}\n${d.value}`);

//     return svg.node();
// }
document.addEventListener('DOMContentLoaded', function() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            console.log("Data fetched:", data);
            const { nodes, links } = data;
            SankeyChart({ nodes, links }, {
                nodeId: d => d.name,
                nodeWidth: 15,
                nodePadding: 10,
                align: 'justify',
                width: 500,
                height: 650,
                linkColor: 'source-target',
                nodeColor: 'custom',
                colors: d3.schemeCategory10
            }).then(chart => {
                document.getElementById('sankey').appendChild(chart);
            });
        });
});

let selectedNodes = [];

async function SankeyChart({ nodes, links }, config) {

    const sankey = d3.sankey()
        .nodeWidth(config.nodeWidth)
        .nodePadding(config.nodePadding)
        .extent([[1, 1], [config.width - 1, config.height - 5]]);

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
            d3.select(this).select("rect").attr("opacity", 0.8); // Increase opacity on hover
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
            console.log("Selected nodes:", selectedNodes);
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
                return 20; // Position on the left for source nodes
            } else {
                return d.x1 - d.x0 - 20; // Position on the right for target nodes
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

    return svg.node();
}
