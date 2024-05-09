from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
import json
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)

# Load data
circuits = pd.read_csv('datasets/circuits.csv')
constructor_standings = pd.read_csv('datasets/constructor_standings.csv')
constructors = pd.read_csv('datasets/constructors.csv')
driver_standings = pd.read_csv('datasets/driver_standings.csv')
drivers = pd.read_csv('datasets/drivers.csv')
results = pd.read_csv('datasets/results.csv')
races = pd.read_csv('datasets/races.csv')
lap_times = pd.read_csv('datasets/lap_times.csv')
pit_stops = pd.read_csv('datasets/pit_stops.csv')

# Merge datasets to get required data
# data_merged = results.merge(races, on='raceId').merge(drivers, on='driverId').merge(constructors, on='constructorId')
data_merged = results.merge(races[['raceId', 'year']], on='raceId', suffixes=('', '_race'))
data_merged = data_merged.merge(drivers[['driverId', 'forename', 'surname']], on='driverId', suffixes=('', '_driver'))
data_merged = data_merged.merge(constructors[['constructorId', 'name']], on='constructorId', suffixes=('', '_constructor'))

# Filter data for years 2010 onwards
data_merged = data_merged[data_merged['year'] >= 2011]

# Aggregate points by driver across all years and select top 10 drivers
top_drivers = data_merged.groupby(['driverId', 'forename', 'surname'])['points'].sum().nlargest(15).reset_index()['driverId']

# Filter the merged data to include only top 10 drivers
data_merged = data_merged[data_merged['driverId'].isin(top_drivers)]
data_merged = data_merged[data_merged['points'] > 0]

def get_driver_summary():

    # Merge drivers with results
    driver_results = pd.merge(drivers, results, on='driverId')

    # Include constructor information
    driver_results = pd.merge(driver_results, constructors[['constructorId', 'constructorRef', 'name']], on='constructorId')

    # Merge driver_results with races to get the year of the race
    driver_results = pd.merge(driver_results, races[['raceId', 'year']], on='raceId')

    # Group by driver and aggregate necessary metrics, keeping driver names
    driver_aggregates = driver_results.groupby(['driverId', 'forename', 'surname', 'nationality']).agg({
        'raceId': 'nunique',
        'positionOrder': lambda x: (x == 1).sum(),
        'points': 'sum',
        'rank': lambda x: (x == '1').sum()
    }).rename(columns={'raceId': 'No. of Races Played', 'positionOrder': 'No. of Wins', 'points': 'Total Points', 'rank': 'No. of Fastest Laps'}).reset_index()

    # Calculate podium finishes
    podiums = driver_results[driver_results['positionOrder'].isin([1, 2, 3])]
    podium_summary = podiums.pivot_table(index='driverId', columns='positionOrder', aggfunc='size', fill_value=0).rename(columns={1: '1st', 2: '2nd', 3: '3rd'})

    # Calculate pole positions
    pole_positions = driver_results[driver_results['grid'] == 1].groupby('driverId')['raceId'].nunique().rename('Pole Positions')

    # Join all computed series and dataframes into the main summary
    driver_summary = driver_aggregates.set_index('driverId').join(podium_summary, how='left')
    driver_summary = driver_summary.join(pole_positions, how='left')

    # Get the most recent constructor for each driver
    latest_constructor = driver_results.loc[driver_results.groupby('driverId')['raceId'].idxmax(), ['driverId', 'name']]
    latest_constructor.set_index('driverId', inplace=True)

    # Calculate years active
    years_active = driver_results.groupby('driverId')['year'].agg(['min', 'max']).apply(lambda x: f"{x['min']} - {'Current' if x['max'] == pd.Timestamp.now().year else x['max']}", axis=1).rename('Years Active')
    driver_summary = driver_summary.join(years_active, how='left')

    # Join latest constructor information
    driver_summary = driver_summary.join(latest_constructor, how='left').rename(columns={'name': 'Current Team'})

    # Concatenate names to create full name
    driver_summary['Name of the Driver'] = driver_summary['forename'] + ' ' + driver_summary['surname']
    driver_summary.drop(['forename', 'surname'], axis=1, inplace=True)

    # Calculate total podiums
    driver_summary['Total Podiums'] = driver_summary[['1st', '2nd', '3rd']].sum(axis=1)

    # Reorder columns for final output
    driver_summary = driver_summary[['Name of the Driver', 'nationality', 'Current Team', 'Years Active', 'No. of Races Played', 'No. of Wins', '1st', '2nd', '3rd', 'Total Podiums', 'Pole Positions', 'Total Points', 'No. of Fastest Laps']]

    return driver_summary

def get_constructor_details():
    # Calculating games played per constructor (races attended)
    races_per_constructor = results['constructorId'].value_counts().reset_index()
    races_per_constructor.columns = ['constructorId', 'NoOfGamesPlayed']

    # Counting drivers per constructor
    drivers_per_constructor = results[['constructorId', 'driverId']].drop_duplicates()
    drivers_per_constructor_count = drivers_per_constructor.groupby('constructorId').count().reset_index()
    drivers_per_constructor_count.columns = ['constructorId', 'NoOfDrivers']

    # Best driver in history by total wins per constructor
    results_with_drivers = results.merge(drivers, on='driverId')
    driver_wins = results_with_drivers[results_with_drivers['positionOrder'] == 1]
    best_driver_per_constructor = driver_wins.groupby('constructorId').agg({'driverId':'max'}).reset_index()
    best_driver_per_constructor.columns = ['constructorId', 'BestDriverId']
    best_driver_names = drivers[['driverId', 'surname']].rename(columns={'surname': 'BestDriver'})
    best_driver_per_constructor = best_driver_per_constructor.merge(best_driver_names, left_on='BestDriverId', right_on='driverId', how='left')

    # Number of wins per constructor
    constructor_wins = driver_wins.groupby('constructorId').size().reset_index(name='NoOfWins')

    # Podium finishes per constructor
    podium_finishes = results_with_drivers[results_with_drivers['positionOrder'].isin([1, 2, 3])]
    podium_counts = podium_finishes.pivot_table(index='constructorId', columns='positionOrder', aggfunc='size', fill_value=0).reset_index()
    podium_counts.columns = ['constructorId', 'FirstPlace', 'SecondPlace', 'ThirdPlace']

    # Pole positions count (Assuming position 1 in qualifying is pole)
    pole_positions = results_with_drivers[results_with_drivers['grid'] == 1]
    pole_positions_count = pole_positions.groupby('constructorId').size().reset_index(name='PolePositions')

    # Total points per constructor
    total_points = constructor_standings.groupby('constructorId')['points'].sum().reset_index()

    # Combine all data
    constructor_details = constructors[['constructorId', 'name', 'nationality']].merge(races_per_constructor, on='constructorId')
    constructor_details = constructor_details.merge(drivers_per_constructor_count, on='constructorId')
    constructor_details = constructor_details.merge(best_driver_per_constructor[['constructorId', 'BestDriver']], on='constructorId')
    constructor_details = constructor_details.merge(constructor_wins, on='constructorId', how='left')
    constructor_details = constructor_details.merge(podium_counts, on='constructorId', how='left')
    constructor_details = constructor_details.merge(pole_positions_count, on='constructorId', how='left')
    constructor_details = constructor_details.merge(total_points, on='constructorId', how='left')

    # Clean and fill NaNs with zeros for counts and sums
    constructor_details.fillna(0, inplace=True)
    return constructor_details

def get_circuits_data():
    df = results.merge(races[races['year']>=2011], on='raceId')
    df = df.merge(circuits, left_on='circuitId', right_on='circuitId')
    df = df.merge(lap_times, on=['raceId', 'driverId'])
    df = df.merge(pit_stops, on=['raceId', 'driverId', 'lap'], how='left')

    # Convert 'milliseconds_x' and 'milliseconds_y' to numeric, handling non-numeric data
    df['milliseconds_x'] = pd.to_numeric(df['milliseconds_x'], errors='coerce')
    df['milliseconds_y'] = pd.to_numeric(df['milliseconds_y'], errors='coerce')

    # Convert milliseconds to seconds for lap times and pit stop durations
    df['Lap Time (sec)'] = df['milliseconds_x'] / 1000
    df['Pit Duration (sec)'] = df['milliseconds_y'] / 1000

    # Count occurrences of each circuit and filter
    circuit_counts = df['name_x'].value_counts()
    circuits_to_keep = circuit_counts[circuit_counts >= 5000].index
    df = df[df['name_x'].isin(circuits_to_keep)]

    # Create the required dataset with specified columns
    final_dataset = df[['name_x', 'grid', 'fastestLapSpeed', 'positionOrder', 'points', 'Lap Time (sec)', 'Pit Duration (sec)']]
    final_dataset.rename(columns={
        'name_x': 'Circuit name',
        'grid': 'Grid Position',
        'fastestLapSpeed': 'Fastest Lap (mph)',
        'positionOrder': 'Finish Position',
    }, inplace=True)

    # Group by Circuit name to count the number of matches (races)
    final_dataset['Matches'] = final_dataset.groupby('Circuit name')['Circuit name'].transform('count')

    # Count the number of pit stops for each entry
    final_dataset['Pit Stops'] = df.groupby(['raceId', 'driverId'])['stop'].transform('count')

    return final_dataset

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
def data():
    # Aggregate data for Sankey diagram: Driver to Constructor with Points and Year
    data_sankey = data_merged.groupby(['forename', 'surname', 'name', 'year'])['points'].sum().reset_index()
    data_sankey['source'] = data_sankey['forename'] + ' ' + data_sankey['surname']
    data_sankey['target'] = data_sankey['name']
    data_sankey['value'] = data_sankey['points']
    nodes = list(set(data_sankey['source'].tolist() + data_sankey['target'].tolist()))
    links = [
        {"source": nodes.index(row['source']), "target": nodes.index(row['target']), "value": row['value'], "year": row['year']}
        for index, row in data_sankey.iterrows()
    ]
    return jsonify({"nodes": [{"name": node} for node in nodes], "links": links})

@app.route('/get_drivers_details', methods=['GET'])
def get_driver_details():
    driver_name = request.args.get('drivername', default=None, type=str)

    # Call the summary function
    driver_summary = get_driver_summary()

    if driver_name:
        # Find the driver data by full name
        driver_data = driver_summary[driver_summary['Name of the Driver'].str.contains(driver_name, case=False, na=False)]
        if driver_data.empty:
            return jsonify({'error': 'Driver not found'}), 404
        # Convert the found driver data to dictionary and return as JSON
        return jsonify(driver_data.to_dict('records')[0])
    else:
        # If no specific driver name is provided, return all drivers details
        driver_summary.replace({np.nan: None}, inplace=True)
        return jsonify(driver_summary.to_dict('records'))

@app.route('/get_constructors_details', methods=['GET'])
def get_constructors_details():
    constructor_name = request.args.get('constructor', default=None, type=str)

    constructor_summary = get_constructor_details()

    if constructor_name:
        constructor_data = constructor_summary[constructor_summary['Name of the Driver'].str.contains(constructor_name, case=False, na=False)]
        if constructor_data.empty:
            return jsonify({'error': 'Constructor not found'}), 404
        return jsonify(constructor_data.to_dict('records')[0])
    else:
        constructor_summary.replace({np.nan: None}, inplace=True)
        return jsonify(constructor_summary.to_dict('records'))
    
@app.route('/PCPdata')
def PCPdata():
    df = get_circuits_data()
    df = df.dropna(how='any')
    # df.replace({np.nan: None}, inplace=True)
    return jsonify(df.to_dict(orient='records'))

@app.route('/loadmapdata')
def loadmapdata():
    with open('datasets/world.json', 'r') as file:
        world_data = json.load(file)
        return jsonify(world_data)


if __name__ == '__main__':
    app.run(debug=True)
