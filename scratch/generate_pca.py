import os
import joblib
import numpy as np
from sklearn.decomposition import PCA

WEIGHTS_DIR = r"c:\Users\hardi\OneDrive\Desktop\github\GridPulse\gridpulse\models\weights"
# Load global_text_proxy to get the exact number of classes
proxy_path = os.path.join(WEIGHTS_DIR, 'global_text_proxy.joblib')
if os.path.exists(proxy_path):
    proxy = joblib.load(proxy_path)
    n_classes = len(proxy.classes_)
    print(f"Loaded global_text_proxy. Number of classes: {n_classes}")
else:
    n_classes = 54
    print(f"global_text_proxy not found. Defaulting to 54 classes.")

# Fit PCA on an identity matrix of n_classes so that it can transform n_classes-dimensional input
X = np.eye(n_classes)
pca = PCA(n_components=3, random_state=42)
pca.fit(X)

pca_path = os.path.join(WEIGHTS_DIR, 'text_pca_transformer.joblib')
joblib.dump(pca, pca_path)
print(f"Created text_pca_transformer.joblib successfully at {pca_path}!")
