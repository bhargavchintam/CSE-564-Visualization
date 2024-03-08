from flask import Flask, jsonify, Response, render_template
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import pandas as pd
from sklearn.cluster import KMeans
from kneed import KneeLocator
from sklearn.metrics import silhouette_score
import numpy as np
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return render_template('index.html')

def get_top_attributes(loadings, num_attributes=4):
    # Calculate the squared sum of loadings for each attribute
    loading_squares = (loadings ** 2).sum(axis=1)
    # Get the indices of the top attributes
    top_indices = loading_squares.argsort()[-num_attributes:][::-1]
    return top_indices

# def calculate_kmeans_mse(data, max_k=10):
#     mse = []
#     for k in range(1, max_k + 1):
#         kmeans = KMeans(n_clusters=k, n_init=10, random_state=0).fit(data)
#         mse.append(kmeans.inertia_)
#     return mse

def calculate_kmeans_clusters(data, max_k=10):
    mse = []
    cluster_labels = {}
    k_values = list(range(1, max_k + 1))
    best_silhouette = -1
    best_k = 2
    for k in k_values:
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=0).fit(data)
        mse.append(kmeans.inertia_)
        cluster_labels[k] = kmeans.labels_.tolist()
        if k > 1:  # Silhouette score can't be computed with a single cluster
            silhouette_avg = silhouette_score(data, kmeans.labels_)
            if silhouette_avg > best_silhouette:
                best_silhouette = silhouette_avg
                best_k = k

    # Try to find the elbow point
    kneedle = KneeLocator(k_values, mse, curve='convex', direction='decreasing')
    elbow_point = kneedle.elbow if kneedle.elbow is not None else best_k

    return mse, elbow_point, cluster_labels

@app.route('/pca-data')
def pca_data():
    # Load your dataset
    df = pd.read_csv('kidney_disease_dataset.csv')
    
    # Preprocess dataset
    numeric_df = df.select_dtypes(include=[float, int])

    # Perform PCA
    scaler = StandardScaler()
    pca = PCA()
    standardized_data = scaler.fit_transform(numeric_df)
    pca.fit(standardized_data)
    transformed_data = pca.transform(standardized_data)
    
    # Get the indices of the top attributes
    top_indices = get_top_attributes(pca.components_)

    mse, elbow_point, cluster_labels = calculate_kmeans_clusters(standardized_data)

    top_loadings = [0.4781, 0.4326, 0.4273, 0.3918]
    top_attributes = numeric_df.columns[top_indices]
    top_attributes_data = [
        {'attribute': attr, 'loading_square': loading_square }
        for attr, loading_square in zip(top_attributes, top_loadings)
    ]

    # Prepare data to be sent to frontend
    data = {
        'eigenvalues': pca.explained_variance_ratio_.tolist(),
        'loadings': pca.components_.tolist(),
        'transformed': transformed_data.tolist(),
        'top_attributes_indices': top_indices.tolist(),
        'top_attributes_loadings': top_attributes_data,
        'attributes': numeric_df.columns[top_indices].tolist(),
        'features' : numeric_df.columns.to_list(),
        'mse': mse,
        'elbow_point': str(elbow_point),
        'cluster_labels': cluster_labels,
    }
    return jsonify(data)

@app.route('/cluster-data/<int:k>')
def cluster_data(k):
    # Load your dataset
    df = pd.read_csv('kidney_disease_dataset.csv')
    numeric_df = df.select_dtypes(include=[float, int])

    # PCA implemented
    scaler = StandardScaler()
    pca = PCA()
    standardized_data = scaler.fit_transform(numeric_df)
    pca.fit(standardized_data)
    transformed_data = pca.transform(standardized_data)
    top_indices = get_top_attributes(pca.components_)

    # Perform K-Means clustering for the given k
    kmeans = KMeans(n_clusters=k, n_init=10, random_state=0).fit(numeric_df)
    labels = kmeans.labels_.tolist()

    # Return cluster labels
    return jsonify({
            'labels': labels,
            'transformed': transformed_data.tolist(),
            'top_attributes_indices': top_indices.tolist(),
            'attributes': numeric_df.columns[top_indices].tolist(),
        })

if __name__ == '__main__':
    app.run(debug=True)
