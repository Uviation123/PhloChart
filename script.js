// PhloChart - Interactive Flowchart Creator
class PhloChart {
    constructor() {
        this.canvas = document.getElementById('flowchart-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.states = [];
        this.connections = [];
        this.selectedElement = null;
        this.currentTool = 'select';
        this.isDragging = false;
        this.isPanning = false;
        this.dragStart = { x: 0, y: 0 };
        this.panStart = { x: 0, y: 0 };
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.connectionStart = null;
        this.tempConnection = null;
        this.stateCounter = 1;
        this.connectionCounter = 1;
        
        this.initializeCanvas();
        this.bindEvents();
        this.setupTools();
        this.setupPropertyPanel();
        this.setupExportHandlers();
        this.draw();
    }

    initializeCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.draw();
    }

    bindEvents() {
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Context menu
        document.addEventListener('click', () => this.hideContextMenu());
    }

    setupTools() {
        const tools = ['select-tool', 'state-tool', 'connection-tool', 'delete-tool', 'grab-tool'];
        tools.forEach(toolId => {
            document.getElementById(toolId).addEventListener('click', () => {
                this.setTool(toolId.replace('-tool', ''));
            });
        });

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('fit-screen').addEventListener('click', () => this.fitToScreen());
    }

    setupPropertyPanel() {
        // Close panel button
        document.getElementById('close-panel').addEventListener('click', () => {
            this.hidePropertyPanel();
        });

        // Property form handlers
        document.getElementById('state-title').addEventListener('input', (e) => {
            if (this.selectedElement && this.selectedElement.type === 'state') {
                this.selectedElement.title = e.target.value;
                this.draw();
            }
        });

        document.getElementById('state-description').addEventListener('input', (e) => {
            if (this.selectedElement && this.selectedElement.type === 'state') {
                this.selectedElement.description = e.target.value;
                this.draw();
            }
        });

        document.getElementById('state-color').addEventListener('change', (e) => {
            if (this.selectedElement && this.selectedElement.type === 'state') {
                this.selectedElement.color = e.target.value;
                this.draw();
            }
        });

        document.getElementById('connection-label').addEventListener('input', (e) => {
            if (this.selectedElement && this.selectedElement.type === 'connection') {
                this.selectedElement.label = e.target.value;
                this.draw();
            }
        });

        document.getElementById('connection-style').addEventListener('change', (e) => {
            if (this.selectedElement && this.selectedElement.type === 'connection') {
                this.selectedElement.style = e.target.value;
                this.draw();
            }
        });

        document.getElementById('connection-color').addEventListener('change', (e) => {
            if (this.selectedElement && this.selectedElement.type === 'connection') {
                this.selectedElement.color = e.target.value;
                this.draw();
            }
        });
    }

    setupExportHandlers() {
        document.getElementById('export-markdown').addEventListener('click', () => this.exportMarkdown());
        document.getElementById('export-image').addEventListener('click', () => this.exportImage());
        document.getElementById('save-project').addEventListener('click', () => this.saveProject());
        document.getElementById('load-project-btn').addEventListener('click', () => {
            document.getElementById('load-project').click();
        });
        document.getElementById('load-project').addEventListener('change', (e) => this.loadProject(e));
    }

    setTool(tool) {
        this.currentTool = tool;
        
        // Update tool button states
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tool}-tool`).classList.add('active');
        
        // Update cursor
        if (tool === 'select') {
            this.canvas.style.cursor = 'default';
        } else if (tool === 'delete') {
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'grab') {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.panOffset.x) / this.zoom,
            y: (e.clientY - rect.top - this.panOffset.y) / this.zoom
        };
    }

    startPanning(e) {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
    }

    panCanvas(e) {
        if (!this.isPanning) return;
        
        const deltaX = e.clientX - this.panStart.x;
        const deltaY = e.clientY - this.panStart.y;
        
        this.panOffset.x += deltaX;
        this.panOffset.y += deltaY;
        
        this.panStart = { x: e.clientX, y: e.clientY };
        this.draw();
    }

    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        
        if (e.button === 0) { // Left click
            if (this.currentTool === 'state') {
                this.showStateModal(pos);
            } else if (this.currentTool === 'connection') {
                this.startConnection(pos);
            } else if (this.currentTool === 'select') {
                this.startSelection(pos);
            } else if (this.currentTool === 'delete') {
                this.deleteElementAt(pos);
            } else if (this.currentTool === 'grab') {
                this.startPanning(e);
            }
        }
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        
        if (this.isPanning) {
            this.panCanvas(e);
        } else if (this.isDragging && this.selectedElement) {
            if (this.selectedElement.type === 'state') {
                this.selectedElement.x = pos.x - this.dragStart.x;
                this.selectedElement.y = pos.y - this.dragStart.y;
                this.draw();
            }
        } else if (this.tempConnection) {
            this.tempConnection.end = pos;
            this.draw();
        } else {
            // Update cursor based on hover
            const element = this.getElementAt(pos);
            if (this.currentTool === 'delete' && element) {
                this.canvas.style.cursor = 'crosshair';
            } else if (element && element.type === 'connection' && this.currentTool === 'select') {
                this.canvas.style.cursor = 'pointer';
            } else if (this.currentTool === 'select') {
                this.canvas.style.cursor = 'default';
            } else if (this.currentTool === 'grab') {
                this.canvas.style.cursor = 'grab';
            }
        }
    }

    handleMouseUp(e) {
        const pos = this.getMousePos(e);
        
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
        } else if (this.isDragging) {
            this.isDragging = false;
        } else if (this.tempConnection) {
            this.finishConnection(pos);
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.1, Math.min(3, this.zoom * delta));
        this.draw();
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'v':
            case 'V':
                this.setTool('select');
                break;
            case 's':
            case 'S':
                this.setTool('state');
                break;
            case 'c':
            case 'C':
                this.setTool('connection');
                break;
            case 'g':
            case 'G':
                this.setTool('grab');
                break;
            case 'Delete':
            case 'Backspace':
                this.deleteSelected();
                break;
            case 'Escape':
                this.clearSelection();
                this.cancelConnection();
                break;
        }
    }

    handleContextMenu(e) {
        e.preventDefault();
        const pos = this.getMousePos(e);
        const element = this.getElementAt(pos);
        
        if (element) {
            this.selectElement(element);
            this.showContextMenu(e.clientX, e.clientY);
        }
    }

    handleDoubleClick(e) {
        const pos = this.getMousePos(e);
        const element = this.getElementAt(pos);
        
        if (element && element.type === 'connection') {
            this.selectElement(element);
            this.showPropertyPanel();
            this.updatePropertyPanel();
            // Focus on the label input for quick editing
            setTimeout(() => {
                const labelInput = document.getElementById('connection-label');
                if (labelInput) {
                    labelInput.focus();
                    labelInput.select();
                }
            }, 100);
        }
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('context-menu');
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
        
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleContextMenuAction(action);
            }
            this.hideContextMenu();
        });
    }

    hideContextMenu() {
        document.getElementById('context-menu').style.display = 'none';
    }

    handleContextMenuAction(action) {
        switch (action) {
            case 'edit':
                this.showPropertyPanel();
                break;
            case 'delete':
                this.deleteSelected();
                break;
            case 'duplicate':
                this.duplicateSelected();
                break;
        }
    }

    showStateModal(pos) {
        this.pendingStatePosition = pos;
        document.getElementById('state-modal').style.display = 'flex';
        document.getElementById('new-state-title').focus();
    }

    createState(title, description) {
        const state = {
            id: `state-${this.stateCounter++}`,
            type: 'state',
            title: title || 'New State',
            description: description || '',
            x: this.pendingStatePosition.x,
            y: this.pendingStatePosition.y,
            width: 120,
            height: 80,
            color: '#ffffff'
        };
        
        this.states.push(state);
        this.draw();
        this.hideStateModal();
    }

    hideStateModal() {
        document.getElementById('state-modal').style.display = 'none';
        document.getElementById('new-state-title').value = '';
        document.getElementById('new-state-description').value = '';
    }

    showConnectionModal() {
        document.getElementById('connection-modal').style.display = 'flex';
        document.getElementById('new-connection-label').focus();
    }

    hideConnectionModal() {
        document.getElementById('connection-modal').style.display = 'none';
        document.getElementById('new-connection-label').value = '';
        document.getElementById('new-connection-style').value = 'straight';
        document.getElementById('new-connection-color').value = '#6c757d';
    }

    createConnection(label, style, color) {
        if (this.pendingConnection) {
            this.pendingConnection.label = label || '';
            this.pendingConnection.style = style || 'straight';
            this.pendingConnection.color = color || '#6c757d';
            
            this.connections.push(this.pendingConnection);
            this.pendingConnection = null;
            this.draw();
        }
        this.hideConnectionModal();
    }

    startConnection(pos) {
        const element = this.getElementAt(pos);
        if (element && element.type === 'state') {
            this.connectionStart = element;
            this.tempConnection = {
                start: { x: element.x + element.width / 2, y: element.y + element.height / 2 },
                end: pos
            };
        }
    }

    finishConnection(pos) {
        const element = this.getElementAt(pos);
        if (element && element.type === 'state' && this.connectionStart && element.id !== this.connectionStart.id) {
            this.pendingConnection = {
                id: `connection-${this.connectionCounter++}`,
                type: 'connection',
                from: this.connectionStart.id,
                to: element.id,
                label: '',
                style: 'straight',
                color: '#6c757d'
            };
            
            this.showConnectionModal();
        } else {
            this.cancelConnection();
        }
    }

    cancelConnection() {
        this.connectionStart = null;
        this.tempConnection = null;
        this.draw();
    }

    startSelection(pos) {
        const element = this.getElementAt(pos);
        if (element) {
            this.selectElement(element);
            this.isDragging = true;
            this.dragStart = {
                x: pos.x - element.x,
                y: pos.y - element.y
            };
        } else {
            this.clearSelection();
        }
    }

    selectElement(element) {
        this.selectedElement = element;
        this.showPropertyPanel();
        this.updatePropertyPanel();
    }

    clearSelection() {
        this.selectedElement = null;
        this.hidePropertyPanel();
    }

    getElementAt(pos) {
        // Check states first (they're on top)
        for (let i = this.states.length - 1; i >= 0; i--) {
            const state = this.states[i];
            if (pos.x >= state.x && pos.x <= state.x + state.width &&
                pos.y >= state.y && pos.y <= state.y + state.height) {
                return state;
            }
        }
        
        // Check connections
        for (let i = this.connections.length - 1; i >= 0; i--) {
            const connection = this.connections[i];
            if (this.isPointNearConnection(pos, connection)) {
                return connection;
            }
        }
        
        return null;
    }

    isPointNearConnection(pos, connection) {
        const fromState = this.states.find(s => s.id === connection.from);
        const toState = this.states.find(s => s.id === connection.to);
        
        if (!fromState || !toState) return false;
        
        const from = { x: fromState.x + fromState.width / 2, y: fromState.y + fromState.height / 2 };
        const to = { x: toState.x + toState.width / 2, y: toState.y + toState.height / 2 };
        
        const distance = this.pointToLineDistance(pos, from, to);
        return distance < 10;
    }

    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    showPropertyPanel() {
        document.getElementById('property-panel').style.display = 'flex';
    }

    hidePropertyPanel() {
        document.getElementById('property-panel').style.display = 'none';
    }

    updatePropertyPanel() {
        const noSelection = document.getElementById('no-selection');
        const stateProperties = document.getElementById('state-properties');
        const connectionProperties = document.getElementById('connection-properties');
        
        noSelection.style.display = 'none';
        stateProperties.style.display = 'none';
        connectionProperties.style.display = 'none';
        
        if (!this.selectedElement) {
            noSelection.style.display = 'block';
            return;
        }
        
        if (this.selectedElement.type === 'state') {
            stateProperties.style.display = 'block';
            document.getElementById('state-title').value = this.selectedElement.title;
            document.getElementById('state-description').value = this.selectedElement.description;
            document.getElementById('state-color').value = this.selectedElement.color;
        } else if (this.selectedElement.type === 'connection') {
            connectionProperties.style.display = 'block';
            document.getElementById('connection-label').value = this.selectedElement.label;
            document.getElementById('connection-style').value = this.selectedElement.style;
            document.getElementById('connection-color').value = this.selectedElement.color;
        }
    }

    deleteSelected() {
        if (!this.selectedElement) return;
        
        if (this.selectedElement.type === 'state') {
            const index = this.states.findIndex(s => s.id === this.selectedElement.id);
            if (index > -1) {
                this.states.splice(index, 1);
                // Remove connections to/from this state
                this.connections = this.connections.filter(c => 
                    c.from !== this.selectedElement.id && c.to !== this.selectedElement.id
                );
            }
        } else if (this.selectedElement.type === 'connection') {
            const index = this.connections.findIndex(c => c.id === this.selectedElement.id);
            if (index > -1) {
                this.connections.splice(index, 1);
            }
        }
        
        this.clearSelection();
        this.draw();
    }

    deleteElementAt(pos) {
        const element = this.getElementAt(pos);
        if (element) {
            if (element.type === 'state') {
                const index = this.states.findIndex(s => s.id === element.id);
                if (index > -1) {
                    this.states.splice(index, 1);
                    // Remove connections to/from this state
                    this.connections = this.connections.filter(c => 
                        c.from !== element.id && c.to !== element.id
                    );
                }
            } else if (element.type === 'connection') {
                const index = this.connections.findIndex(c => c.id === element.id);
                if (index > -1) {
                    this.connections.splice(index, 1);
                }
            }
            this.draw();
        }
    }

    duplicateSelected() {
        if (!this.selectedElement || this.selectedElement.type !== 'state') return;
        
        const original = this.selectedElement;
        const duplicate = {
            ...original,
            id: `state-${this.stateCounter++}`,
            x: original.x + 20,
            y: original.y + 20,
            title: `${original.title} (Copy)`
        };
        
        this.states.push(duplicate);
        this.selectElement(duplicate);
        this.draw();
    }

    zoomIn() {
        this.zoom = Math.min(3, this.zoom * 1.2);
        this.draw();
    }

    zoomOut() {
        this.zoom = Math.max(0.1, this.zoom / 1.2);
        this.draw();
    }

    fitToScreen() {
        if (this.states.length === 0) return;
        
        let minX = Math.min(...this.states.map(s => s.x));
        let minY = Math.min(...this.states.map(s => s.y));
        let maxX = Math.max(...this.states.map(s => s.x + s.width));
        let maxY = Math.max(...this.states.map(s => s.y + s.height));
        
        const padding = 50;
        const scaleX = (this.canvas.width - padding * 2) / (maxX - minX);
        const scaleY = (this.canvas.height - padding * 2) / (maxY - minY);
        
        this.zoom = Math.min(scaleX, scaleY, 1);
        this.panOffset.x = (this.canvas.width - (maxX - minX) * this.zoom) / 2 - minX * this.zoom;
        this.panOffset.y = (this.canvas.height - (maxY - minY) * this.zoom) / 2 - minY * this.zoom;
        
        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Draw grid background
        this.drawGrid();
        
        // Draw connections
        this.drawConnections();
        
        // Draw states
        this.drawStates();
        
        this.ctx.restore();
        
        // Draw welcome message if no states exist
        if (this.states.length === 0) {
            this.drawWelcomeMessage();
        }
    }

    drawGrid() {
        const gridSize = 20; // Size of grid cells
        const gridColor = '#617891'; // Slate gray color for grid lines
        const gridAlpha = 0.4; // Transparency for grid lines
        
        this.ctx.strokeStyle = gridColor;
        this.ctx.globalAlpha = gridAlpha;
        this.ctx.lineWidth = 1;
        
        // Calculate the visible area
        const visibleLeft = -this.panOffset.x / this.zoom;
        const visibleTop = -this.panOffset.y / this.zoom;
        const visibleRight = (this.canvas.width - this.panOffset.x) / this.zoom;
        const visibleBottom = (this.canvas.height - this.panOffset.y) / this.zoom;
        
        // Calculate grid boundaries
        const startX = Math.floor(visibleLeft / gridSize) * gridSize;
        const startY = Math.floor(visibleTop / gridSize) * gridSize;
        const endX = Math.ceil(visibleRight / gridSize) * gridSize;
        const endY = Math.ceil(visibleBottom / gridSize) * gridSize;
        
        // Draw vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
        
        // Reset global alpha
        this.ctx.globalAlpha = 1;
    }

    drawWelcomeMessage() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Draw background circle
        this.ctx.fillStyle = 'rgba(213, 184, 147, 0.1)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - 30, 80, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw main title
        this.ctx.fillStyle = '#6C757D';
        this.ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Welcome to PhloChart!', centerX, centerY - 50);
        
        // Draw subtitle
        this.ctx.fillStyle = '#ADB5BD';
        this.ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.fillText('Create your first flowchart', centerX, centerY - 10);
        
        // Draw instructions
        this.ctx.fillStyle = '#6C757D';
        this.ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.fillText('1. Click the "Add State" tool (S)', centerX, centerY + 20);
        this.ctx.fillText('2. Click anywhere on the canvas', centerX, centerY + 40);
        this.ctx.fillText('3. Connect states with the connection tool (C)', centerX, centerY + 60);
        this.ctx.fillText('4. Use the grab tool (G) to pan around', centerX, centerY + 80);
        
        // Draw icon
        this.ctx.fillStyle = '#007BFF';
        this.ctx.font = '48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.fillText('📊', centerX, centerY - 100);
    }

    drawStates() {
        this.states.forEach(state => {
            const isSelected = this.selectedElement && this.selectedElement.id === state.id;
            
            // Draw state rectangle
            this.ctx.fillStyle = state.color;
            this.ctx.strokeStyle = isSelected ? '#632020' : '#253447';
            this.ctx.lineWidth = isSelected ? 3 : 2;
            this.ctx.beginPath();
            this.ctx.roundRect(state.x, state.y, state.width, state.height, 8);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Draw title
            this.ctx.fillStyle = '#253447';
            this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(state.title, state.x + state.width / 2, state.y + state.height / 2 - 10);
            
            // Draw description
            if (state.description) {
                this.ctx.fillStyle = '#617891';
                this.ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                this.ctx.fillText(state.description.substring(0, 20) + (state.description.length > 20 ? '...' : ''), 
                                state.x + state.width / 2, state.y + state.height / 2 + 10);
            }
        });
    }

    drawConnections() {
        this.connections.forEach(connection => {
            const fromState = this.states.find(s => s.id === connection.from);
            const toState = this.states.find(s => s.id === connection.to);
            
            if (!fromState || !toState) return;
            
            const from = { x: fromState.x + fromState.width / 2, y: fromState.y + fromState.height / 2 };
            const to = { x: toState.x + toState.width / 2, y: toState.y + toState.height / 2 };
            
            const isSelected = this.selectedElement && this.selectedElement.id === connection.id;
            
            this.ctx.strokeStyle = isSelected ? '#632020' : connection.color;
            this.ctx.lineWidth = isSelected ? 3 : 2;
            this.ctx.beginPath();
            
            if (connection.style === 'curved') {
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2 + 20;
                this.ctx.moveTo(from.x, from.y);
                this.ctx.quadraticCurveTo(midX, midY, to.x, to.y);
            } else {
                this.ctx.moveTo(from.x, from.y);
                this.ctx.lineTo(to.x, to.y);
            }
            
            this.ctx.stroke();
            
            // Draw arrowhead
            this.drawArrowhead(to, from);
            
            // Draw label
            if (connection.label) {
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                
                // Draw background for better readability
                const textWidth = this.ctx.measureText(connection.label).width;
                const padding = 4;
                
                this.ctx.fillStyle = 'rgba(213, 184, 147, 0.9)';
                this.ctx.fillRect(midX - textWidth/2 - padding, midY - 15 - padding, 
                                textWidth + padding * 2, 20 + padding * 2);
                
                // Draw border
                this.ctx.strokeStyle = connection.color;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(midX - textWidth/2 - padding, midY - 15 - padding, 
                                   textWidth + padding * 2, 20 + padding * 2);
                
                // Draw text
                this.ctx.fillStyle = '#253447';
                this.ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(connection.label, midX, midY - 5);
            }
        });
        
        // Draw temporary connection
        if (this.tempConnection) {
            this.ctx.strokeStyle = '#632020';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.tempConnection.start.x, this.tempConnection.start.y);
            this.ctx.lineTo(this.tempConnection.end.x, this.tempConnection.end.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    drawArrowhead(to, from) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const length = 10;
        
        this.ctx.beginPath();
        this.ctx.moveTo(to.x, to.y);
        this.ctx.lineTo(to.x - length * Math.cos(angle - Math.PI / 6), 
                        to.y - length * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(to.x, to.y);
        this.ctx.lineTo(to.x - length * Math.cos(angle + Math.PI / 6), 
                        to.y - length * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke();
    }

    exportMarkdown() {
        let markdown = '# Flowchart\n\n';
        
        // States
        markdown += '## States\n\n';
        this.states.forEach(state => {
            markdown += `### ${state.title}\n`;
            if (state.description) {
                markdown += `${state.description}\n`;
            }
            markdown += '\n';
        });
        
        // Connections
        markdown += '## Connections\n\n';
        this.connections.forEach(connection => {
            const fromState = this.states.find(s => s.id === connection.from);
            const toState = this.states.find(s => s.id === connection.to);
            
            if (fromState && toState) {
                markdown += `- **${fromState.title}** → **${toState.title}**`;
                if (connection.label) {
                    markdown += `: ${connection.label}`;
                }
                markdown += '\n';
            }
        });
        
        this.downloadFile('flowchart.md', markdown);
    }

    exportImage() {
        const dataURL = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'flowchart.png';
        link.href = dataURL;
        link.click();
    }

    saveProject() {
        const project = {
            states: this.states,
            connections: this.connections
        };
        
        const data = JSON.stringify(project, null, 2);
        this.downloadFile('flowchart.json', data);
    }

    loadProject(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);
                this.states = project.states || [];
                this.connections = project.connections || [];
                this.stateCounter = Math.max(...this.states.map(s => parseInt(s.id.split('-')[1])), 0) + 1;
                this.connectionCounter = Math.max(...this.connections.map(c => parseInt(c.id.split('-')[1])), 0) + 1;
                this.clearSelection();
                this.draw();
            } catch (error) {
                alert('Error loading project file');
            }
        };
        reader.readAsText(file);
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new PhloChart();
    
    // State modal event handlers
    document.getElementById('create-state').addEventListener('click', () => {
        const title = document.getElementById('new-state-title').value;
        const description = document.getElementById('new-state-description').value;
        app.createState(title, description);
    });
    
    document.getElementById('cancel-state').addEventListener('click', () => {
        app.hideStateModal();
    });
    
    document.getElementById('close-state-modal').addEventListener('click', () => {
        app.hideStateModal();
    });
    
    // Connection modal event handlers
    document.getElementById('create-connection').addEventListener('click', () => {
        const label = document.getElementById('new-connection-label').value;
        const style = document.getElementById('new-connection-style').value;
        const color = document.getElementById('new-connection-color').value;
        app.createConnection(label, style, color);
    });
    
    document.getElementById('cancel-connection').addEventListener('click', () => {
        app.hideConnectionModal();
        app.cancelConnection();
    });
    
    document.getElementById('close-connection-modal').addEventListener('click', () => {
        app.hideConnectionModal();
        app.cancelConnection();
    });
    
    // Enter key in modals
    document.getElementById('new-state-title').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('create-state').click();
        }
    });
    
    document.getElementById('new-state-description').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            document.getElementById('create-state').click();
        }
    });
    
    document.getElementById('new-connection-label').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('create-connection').click();
        }
    });
}); 