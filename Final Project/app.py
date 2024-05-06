from flask import Flask, render_template, jsonify
import pandas as pd

app = Flask(__name__)

# Load data
results = pd.read_csv('datasets/results.csv')
races = pd.read_csv('datasets/races.csv')
drivers = pd.read_csv('datasets/drivers.csv')
constructors = pd.read_csv('datasets/constructors.csv')

# Merge datasets to get required data
# data_merged = results.merge(races, on='raceId').merge(drivers, on='driverId').merge(constructors, on='constructorId')
data_merged = results.merge(races[['raceId', 'year']], on='raceId', suffixes=('', '_race'))
data_merged = data_merged.merge(drivers[['driverId', 'forename', 'surname']], on='driverId', suffixes=('', '_driver'))
data_merged = data_merged.merge(constructors[['constructorId', 'name']], on='constructorId', suffixes=('', '_constructor'))

# Filter data for years 2010 onwards
data_merged = data_merged[data_merged['year'] >= 2011]

# Aggregate points by driver across all years and select top 10 drivers
top_drivers = data_merged.groupby(['driverId', 'forename', 'surname'])['points'].sum().nlargest(10).reset_index()['driverId']

# Filter the merged data to include only top 10 drivers
data_merged = data_merged[data_merged['driverId'].isin(top_drivers)]

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

if __name__ == '__main__':
    app.run(debug=True)
