const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Define the paths to the input CSV files and the output CSV file
const matchesFilePath = './WorldCupMatches.csv';
const refereesFilePath = './FIFAReferee.csv';
const outputFilePath = './WorldCupDataset.csv';

// Read the datasets into memory
const readCSV = async (filePath) => {
    const data = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => data.push(row))
            .on('end', () => resolve(data))
            .on('error', reject);
    });
};

// Merge the datasets
const mergeDataSets = (matches, referees) => {
    const merged = matches.map(match => {
        const refereeDetails = referees.find(referee => match.RoundID === referee.RoundID && match.MatchID === referee.MatchID);
        return { ...match, ...refereeDetails };
    });
    return merged;
};

// Write the merged dataset to a new CSV file
const writeCSV = async (data, filePath) => {
    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: Object.keys(data[0]).map(key => ({ id: key, title: key })),
        append: false,
    });

    await csvWriter.writeRecords(data);
};

// Main function to orchestrate the merging and writing process
const main = async () => {
    try {
        const matches = await readCSV(matchesFilePath);
        const referees = await readCSV(refereesFilePath);
        const mergedData = mergeDataSets(matches, referees);
        await writeCSV(mergedData, outputFilePath);
        console.log('Merging completed. Output saved to ' + outputFilePath);
    } catch (error) {
        console.error('Error during merging process:', error);
    }
};

main();