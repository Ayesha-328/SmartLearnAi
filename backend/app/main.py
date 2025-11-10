# app/__init__.py or app/main.py
from flask import Flask
from flask_cors import CORS
from app.routes.learning_routes import learning_bp

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for React frontend
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5174"],  # React dev server
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"]
        }
    })
    
    # Register blueprints
    app.register_blueprint(learning_bp)
    
    # ... other configurations ...
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)