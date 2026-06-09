/**
 * Nexus — Camera Preview
 * @module CameraPreview
 * @description Small webcam preview with hand landmark overlay.
 */

export class CameraPreview {
    /**
     * @param {HTMLVideoElement} video — The webcam video element
     */
    constructor(video) {
        this.video = video;
        this.visible = false;
        this._container = null;
        this._overlayCanvas = null;
        this._overlayCtx = null;
        this._build();
    }

    _build() {
        const container = document.createElement('div');
        container.id = 'camera-preview';
        container.className = 'camera-preview hidden';
        container.innerHTML = `
            <div class="camera-inner">
                <div class="camera-feed" id="camera-feed"></div>
                <canvas class="camera-overlay" id="camera-overlay" width="320" height="240"></canvas>
                <div class="camera-badge" id="camera-badge">Initializing...</div>
                <button class="camera-close" id="btn-camera-close" title="Hide Preview">✕</button>
            </div>
        `;

        document.body.appendChild(container);
        this._container = container;

        // Move video into feed container
        const feed = document.getElementById('camera-feed');
        this.video.style.width = '100%';
        this.video.style.height = '100%';
        this.video.style.objectFit = 'cover';
        this.video.style.transform = 'scaleX(-1)'; // Mirror
        feed.appendChild(this.video);

        // Overlay canvas
        this._overlayCanvas = document.getElementById('camera-overlay');
        this._overlayCtx = this._overlayCanvas.getContext('2d');

        // Close button
        document.getElementById('btn-camera-close').addEventListener('click', () => {
            this.hide();
        });
    }

    /** Show the camera preview. */
    show() {
        this.visible = true;
        this._container.classList.remove('hidden');
    }

    /** Hide the camera preview. */
    hide() {
        this.visible = false;
        this._container.classList.add('hidden');
    }

    /** Update the status badge text. */
    setBadge(text) {
        document.getElementById('camera-badge').textContent = text;
    }

    /**
     * Draw hand landmarks on the overlay canvas.
     * @param {Array} hands — Array of landmark arrays from MediaPipe
     * @param {Array} handPositions — Processed positions with gesture info
     */
    drawLandmarks(hands, handPositions) {
        const ctx = this._overlayCtx;
        const w = this._overlayCanvas.width;
        const h = this._overlayCanvas.height;
        ctx.clearRect(0, 0, w, h);

        if (!hands || hands.length === 0) return;

        const connections = [
            [0,1],[1,2],[2,3],[3,4],      // Thumb
            [0,5],[5,6],[6,7],[7,8],      // Index
            [0,9],[9,10],[10,11],[11,12], // Middle
            [0,13],[13,14],[14,15],[15,16], // Ring
            [0,17],[17,18],[18,19],[19,20], // Pinky
            [5,9],[9,13],[13,17],           // Palm
        ];

        for (let h_idx = 0; h_idx < hands.length; h_idx++) {
            const landmarks = hands[h_idx];
            const color = h_idx === 0 ? '#00f0ff' : '#a855f7';

            // Draw connections
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            for (const [a, b] of connections) {
                const la = landmarks[a];
                const lb = landmarks[b];
                ctx.beginPath();
                ctx.moveTo((1 - la.x) * w, la.y * h); // Mirror X
                ctx.lineTo((1 - lb.x) * w, lb.y * h);
                ctx.stroke();
            }

            // Draw landmarks
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.9;
            for (const lm of landmarks) {
                ctx.beginPath();
                ctx.arc((1 - lm.x) * w, lm.y * h, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
    }
}
