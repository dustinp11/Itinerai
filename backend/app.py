"""Main Flask application entry point"""
from flask import Flask, jsonify
from config import Config
from extensions import mongo, cors
from routes import user_bp, search_bp


def create_app(config_class=Config):
    """Create and configure the Flask application"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    mongo.init_app(app)
    cors.init_app(app)

    # Register blueprints
    app.register_blueprint(user_bp)
    app.register_blueprint(search_bp)

    # Health check route
    @app.route('/')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'message': 'Itinerai API is running'
        })

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
