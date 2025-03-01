// Meteor/Particles Animation Script
document.addEventListener('DOMContentLoaded', () => {
    // Create particles container
    const particlesContainer = document.createElement('div');
    particlesContainer.id = 'particles-container';
    document.body.appendChild(particlesContainer);
    
    // Meteor particles class
    class Meteor {
        constructor() {
            this.x = Math.random() * window.innerWidth;
            this.y = Math.random() * -window.innerHeight;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 5;
            this.speedY = Math.random() * 7 + 3;
            this.color = this.getColor();
            this.element = this.createMeteorElement();
            this.trail = this.createTrailElement();
            
            particlesContainer.appendChild(this.trail);
            particlesContainer.appendChild(this.element);
        }
        
        getColor() {
            const colors = [
                'rgba(78, 204, 163, 0.7)',   // Primary (green)
                'rgba(43, 135, 255, 0.7)',   // Secondary (blue)
                'rgba(162, 57, 202, 0.6)',   // Accent (purple)
                'rgba(255, 255, 255, 0.5)'   // White
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        createMeteorElement() {
            const element = document.createElement('div');
            element.style.position = 'absolute';
            element.style.width = `${this.size}px`;
            element.style.height = `${this.size}px`;
            element.style.backgroundColor = this.color;
            element.style.borderRadius = '50%';
            element.style.boxShadow = `0 0 ${this.size * 2}px ${this.color.replace(')', ', 1)')}`;
            element.style.zIndex = '-1';
            element.style.opacity = Math.random() * 0.5 + 0.5;
            element.style.transition = 'opacity 0.2s ease';
            element.style.left = `${this.x}px`;
            element.style.top = `${this.y}px`;
            return element;
        }
        
        createTrailElement() {
            const trail = document.createElement('div');
            trail.style.position = 'absolute';
            trail.style.left = `${this.x}px`;
            trail.style.top = `${this.y}px`;
            trail.style.width = `${this.size * 0.5}px`;
            trail.style.height = '0';
            trail.style.backgroundColor = this.color;
            trail.style.zIndex = '-1';
            trail.style.transformOrigin = 'top';
            trail.style.opacity = '0.3';
            return trail;
        }
        
        update() {
            this.y += this.speedY;
            this.x += this.speedX;
            
            // Update particle position
            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
            
            // Update trail position and style
            this.trail.style.left = `${this.x + this.size/2}px`;
            this.trail.style.top = `${this.y}px`;
            this.trail.style.height = `${this.speedY * 5}px`;
            this.trail.style.transform = `rotate(${Math.atan2(this.speedX, this.speedY) * (180/Math.PI)}deg)`;
            
            // Remove if out of screen
            if (this.y > window.innerHeight || this.x < 0 || this.x > window.innerWidth) {
                this.element.remove();
                this.trail.remove();
                return true;
            }
            return false;
        }
    }
    
    // Initialize and manage meteors
    const meteors = [];
    const maxMeteors = 15;
    
    function createMeteor() {
        if (meteors.length < maxMeteors) {
            meteors.push(new Meteor());
        }
    }
    
    function updateMeteors() {
        for (let i = meteors.length - 1; i >= 0; i--) {
            if (meteors[i].update()) {
                meteors.splice(i, 1);
            }
        }
        
        // Create new meteor occasionally
        if (Math.random() < 0.05) {
            createMeteor();
        }
        
        requestAnimationFrame(updateMeteors);
    }
    
    // Start with a few meteors
    for (let i = 0; i < 5; i++) {
        createMeteor();
    }
    
    // Begin animation
    updateMeteors();
}); 