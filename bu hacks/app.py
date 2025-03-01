from flask import Flask, render_template, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = Flask(__name__)

# We'll load the model here
MODEL = None

WASTE_CATEGORIES = {
    0: {"category": "Recyclable", "bin": "Blue Bin", "tips": "Clean and dry before recycling"},
    1: {"category": "Organic", "bin": "Green Bin", "tips": "Compostable items go here"},
    2: {"category": "Trash", "bin": "Black Bin", "tips": "Items that can't be recycled or composted"}
}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/classify', methods=['POST'])
def classify_waste():
    try:
        # Get image from request
        file = request.files['image']
        img = Image.open(io.BytesIO(file.read()))
        
        # Preprocess image (placeholder - adjust based on your model)
        img = img.resize((224, 224))
        img_array = tf.keras.preprocessing.image.img_to_array(img)
        img_array = tf.expand_dims(img_array, 0)
        
        # For demo, returning mock response
        # Replace with actual model prediction when you have the model
        mock_prediction = {
            "category": "Recyclable",
            "bin": "Blue Bin",
            "confidence": 0.92,
            "tips": "Clean and dry before recycling"
        }
        
        return jsonify(mock_prediction)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 