from flask import Flask, jsonify, render_template, request
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.manifold import MDS
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
import numpy as np
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)

# Load and prepare data as a function to ensure it's fresh on each call
def prepare_data(options=[float, int]):
    df = pd.read_csv('kidney_disease_dataset.csv')
    numerical_features = df.select_dtypes(include=options)
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(numerical_features)
    return scaled_features, numerical_features

def remove_outliers(scaled_features):
    # Calculating IQR for each feature
    Q1 = np.percentile(scaled_features, 25, axis=0)
    Q3 = np.percentile(scaled_features, 75, axis=0)
    IQR = Q3 - Q1

    # Defining outliers as points outside of Q1 - 1.5*IQR and Q3 + 1.5*IQR
    outlier_mask = (scaled_features < (Q1 - 1.5 * IQR)) | (scaled_features > (Q3 + 1.5 * IQR))
    # Mask for rows that contain outliers
    rows_with_outliers = outlier_mask.any(axis=1)
    # Filter out the outliers
    return scaled_features[~rows_with_outliers], ~rows_with_outliers

def calculate_elbow_point(distortions):
    # This is a placeholder for an elbow point calculation.
    # It's a simple example; you may need a more robust method.
    if len(distortions) < 3:
        return 1  # Not enough points to calculate an elbow
    deltas = [distortions[i-1] - distortions[i] for i in range(1, len(distortions))]
    delta_deltas = [deltas[i-1] - deltas[i] for i in range(1, len(deltas))]
    elbow_point = delta_deltas.index(max(delta_deltas)) + 2  # +1 for index to k, +1 for next k
    return elbow_point

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/cluster/<int:k>')
def cluster_data(k):
    scaled_features, numerical_features = prepare_data()
    kmeans = KMeans(n_clusters=k, random_state=0).fit(scaled_features)
    # Add cluster IDs to original data
    result = numerical_features.copy()
    result['cluster'] = kmeans.labels_
    return jsonify(result.to_dict(orient='records'))

@app.route('/elbow')
def elbow_method():
    distortions = []
    K = range(1, 10)
    scaled_features, _ = prepare_data()
    for k in K:
        kmeanModel = KMeans(n_clusters=k, random_state=0).fit(scaled_features)
        distortions.append(kmeanModel.inertia_)
    elbow_point = calculate_elbow_point(distortions)
    return jsonify({'K': list(K), 'Distortions': distortions, 'ElbowPoint': elbow_point})

@app.route('/data_mds')
def data_mds():

    num_clusters = request.args.get('clusters', default=2, type=int)
    
    scaled_features, numerical_features = prepare_data()
    # Remove outliers from scaled_features
    scaled_features_filtered, rows_mask = remove_outliers(scaled_features)
    numerical_features_filtered = numerical_features[rows_mask]

    # Proceed with KMeans and MDS on filtered data
    kmeans = KMeans(n_clusters=num_clusters, random_state=0).fit(scaled_features_filtered)
    numerical_features_filtered['cluster'] = kmeans.labels_
    mds = MDS(n_components=2, dissimilarity='euclidean', random_state=0)
    data_mds = mds.fit_transform(scaled_features_filtered)

    response = [{'x': float(x), 'y': float(y), 'cluster': int(cluster)} for (x, y), cluster in zip(data_mds, kmeans.labels_)]
    return jsonify(response)

@app.route('/vars_mds')
def vars_mds():
    scaled_features, numerical_features = prepare_data()
    corr_matrix = numerical_features.corr().abs()
    distance_matrix = 1 - corr_matrix
    mds_vars = MDS(n_components=2, dissimilarity='precomputed', random_state=0)
    vars_mds = mds_vars.fit_transform(distance_matrix)
    variables = numerical_features.columns[:-1]  # Exclude cluster column
    response = [{'x': float(x), 'y': float(y), 'variable': var} for (x, y), var in zip(vars_mds, variables)]
    return jsonify(response)


@app.route('/pcp_data')
def pcp_data():

    num_clusters = request.args.get('clusters', default=2, type=int)

    df = pd.read_csv('kidney_disease_dataset_with_cat.v1.csv')
    
    # Handle missing values for numerical features. Here, we fill them with the median.
    numerical_features = df.select_dtypes(include=[np.number])
    numerical_features = numerical_features.fillna(numerical_features.median())
    
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(numerical_features)
    
    kmeans = KMeans(n_clusters=num_clusters, random_state=0).fit(scaled_features)
    df.loc[:, numerical_features.columns] = scaled_features
    df['cluster'] = kmeans.labels_

    # Convert the dataframe to a format suitable for PCP in D3.js
    records = df.to_dict(orient='records')
    return jsonify(records)

@app.route('/pcp_data_num')
def pcp_data_num():

    num_clusters = request.args.get('clusters', default=2, type=int)

    df = pd.read_csv('kidney_disease.csv')
    
    # Handle missing values for numerical features. Here, we fill them with the median.
    numerical_features = df.select_dtypes(include=[np.number])
    numerical_features = numerical_features.fillna(numerical_features.median())
    
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(numerical_features)
    
    kmeans = KMeans(n_clusters=num_clusters, random_state=0).fit(scaled_features)
    df.loc[:, numerical_features.columns] = scaled_features
    df['cluster'] = kmeans.labels_

    # Determine an "ideal" order for axes based on variance of the features
    variances = numerical_features.var().sort_values(ascending=False)
    ordered_features = variances.index.tolist()
    
    # Reorder the DataFrame columns based on the determined order
    ordered_df = df[ordered_features + ['cluster']]

    # Convert the dataframe to a format suitable for PCP in D3.js
    records = ordered_df.to_dict(orient='records')
    return jsonify(records)


if __name__ == '__main__':
    app.run(debug=True)