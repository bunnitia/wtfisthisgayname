class ChatApp {
    constructor() {
        // Initialize properties
        this.username = '';
        this.userColor = '#ff6b6b';
        this.userWebsite = '';
        this.socket = null;
        this.currentUserId = null;
        this.isTyping = false;
        this.typingTimeouts = new Map();
        this.cursors = new Map();
        this.cursorThrottle = null;
        this.messageElements = new Map();
        this.unreadCount = 0;
        this.isDocumentHidden = false;
        this.messageTimestamps = [];
        this.isMuted = false;
        this.muteEndTime = null;
        
        // Track last rendered date (YYYY-MM-DD) for inserting date separators
        this.lastRenderedDateKey = null;
        
        // Auto-reconnection properties
        this.isConnected = false;
        this.wasConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000; // Initial delay in ms
        this.maxReconnectDelay = 30000; // Max delay in ms (30 seconds)
        this.reconnectTimer = null;
        
        // Preview mode for pre-join screen
        this.isPreviewMode = false;
        
        this.currentSettings = {
            appearance: {
                gradientColor1: '#525284',
                gradientColor2: '#AAAAEE',
                autoAdjustColors: true
            },
            safety: {
                censorSwears: false,
                spoilerImages: false
            },
            notifications: {
                pingSound: true
            }
        };
        
        // Unread message tracking
        this.isWindowFocused = true;
        this.faviconCanvas = null;
        this.faviconContext = null;
        this.originalFavicon = null;
        
        // Spam protection
        this.isMuted = false;
        this.muteTimer = null;
        
        // User websites storage for clickable usernames
        this.userWebsites = new Map();
        
        // DM functionality
        this.currentDMUser = null; // Currently open DM conversation
        this.dmConversations = new Map(); // Store DM history by conversation pair key
        
        // Generate conversation key for DM storage (similar to server)
        this.getDMConversationKey = (username1, username2) => {
            return [username1, username2].sort().join('_');
        };
        
        // User Action Dropdown
        this.userActionDropdown = null; // Will be initialized after DOM is ready
        
        // Global chat inline attachments (image tags shown above input)
        this.pendingAttachmentIds = new Set();
        
        // Dyslexia effect properties
        this.dyslexiaTargetUser = null;
        this.dyslexiaActive = false;
        this.dyslexiaTimer = null;
        
        // Emoji mapping for :emoji_name: format
        this.emojiMap = {
            // Smileys & People
            ':smile:': '😀',
            ':grin:': '😁',
            ':joy:': '😂',
            ':rofl:': '🤣',
            ':relaxed:': '😌',
            ':blush:': '😊',
            ':innocent:': '😇',
            ':wink:': '😉',
            ':heart_eyes:': '😍',
            ':kissing_heart:': '😘',
            ':thinking:': '🤔',
            ':neutral_face:': '😐',
            ':expressionless:': '😑',
            ':confused:': '😕',
            ':worried:': '😟',
            ':cry:': '😢',
            ':sob:': '😭',
            ':angry:': '😠',
            ':rage:': '😡',
            ':triumph:': '😤',
            ':sleepy:': '😪',
            ':dizzy_face:': '😵',
            ':mask:': '😷',
            ':sunglasses:': '😎',
            ':smirk:': '😏',
            ':stuck_out_tongue:': '😛',
            ':stuck_out_tongue_winking_eye:': '😜',
            ':stuck_out_tongue_closed_eyes:': '😝',
            ':unamused:': '😒',
            ':sweat_smile:': '😅',
            ':sweat:': '😓',
            ':disappointed_relieved:': '😥',
            ':weary:': '😩',
            ':pensive:': '😔',
            ':disappointed:': '😞',
            ':confounded:': '😖',
            ':fearful:': '😨',
            ':cold_sweat:': '😰',
            ':persevere:': '😣',
            ':frowning:': '☹️',
            ':anguished:': '😧',
            ':grimacing:': '😬',
            ':open_mouth:': '😮',
            ':hushed:': '😯',
            ':astonished:': '😲',
            ':flushed:': '😳',
            ':scream:': '😱',
            ':heart:': '❤️',
            ':broken_heart:': '💔',
            ':two_hearts:': '💕',
            ':sparkling_heart:': '💖',
            ':heartpulse:': '💗',
            ':blue_heart:': '💙',
            ':green_heart:': '💚',
            ':yellow_heart:': '💛',
            ':purple_heart:': '💜',
            ':black_heart:': '🖤',
            ':white_heart:': '🤍',
            ':brown_heart:': '🤎',
            ':orange_heart:': '🧡',
            
            // Gestures & Body Parts
            ':thumbsup:': '👍',
            ':thumbsdown:': '👎',
            ':clap:': '👏',
            ':raised_hands:': '🙌',
            ':pray:': '🙏',
            ':muscle:': '💪',
            ':point_up:': '☝️',
            ':point_down:': '👇',
            ':point_left:': '👈',
            ':point_right:': '👉',
            ':ok_hand:': '👌',
            ':v:': '✌️',
            ':crossed_fingers:': '🤞',
            ':wave:': '👋',
            ':call_me_hand:': '🤙',
            ':raised_hand:': '✋',
            ':fist:': '✊',
            ':punch:': '👊',
            
            // Animals & Nature
            ':dog:': '🐶',
            ':cat:': '🐱',
            ':mouse:': '🐭',
            ':hamster:': '🐹',
            ':rabbit:': '🐰',
            ':fox:': '🦊',
            ':bear:': '🐻',
            ':panda:': '🐼',
            ':koala:': '🐨',
            ':tiger:': '🐯',
            ':lion:': '🦁',
            ':cow:': '🐮',
            ':pig:': '🐷',
            ':frog:': '🐸',
            ':monkey:': '🐵',
            ':chicken:': '🐔',
            ':penguin:': '🐧',
            ':bird:': '🐦',
            ':baby_chick:': '🐤',
            ':bee:': '🐝',
            ':bug:': '🐛',
            ':butterfly:': '🦋',
            ':snail:': '🐌',
            ':snake:': '🐍',
            ':dragon:': '🐉',
            ':cactus:': '🌵',
            ':christmas_tree:': '🎄',
            ':evergreen_tree:': '🌲',
            ':deciduous_tree:': '🌳',
            ':palm_tree:': '🌴',
            ':seedling:': '🌱',
            ':herb:': '🌿',
            ':shamrock:': '☘️',
            ':four_leaf_clover:': '🍀',
            ':bamboo:': '🎋',
            ':tulip:': '🌷',
            ':cherry_blossom:': '🌸',
            ':blossom:': '🌼',
            ':hibiscus:': '🌺',
            ':sunflower:': '🌻',
            ':rose:': '🌹',
            ':wilted_flower:': '🥀',
            ':skull:': '💀',
            ':bouquet:': '💐',
            
            // Food & Drink
            ':apple:': '🍎',
            ':orange:': '🍊',
            ':lemon:': '🍋',
            ':banana:': '🍌',
            ':watermelon:': '🍉',
            ':grapes:': '🍇',
            ':strawberry:': '🍓',
            ':melon:': '🍈',
            ':cherries:': '🍒',
            ':peach:': '🍑',
            ':pineapple:': '🍍',
            ':coconut:': '🥥',
            ':kiwi:': '🥝',
            ':avocado:': '🥑',
            ':tomato:': '🍅',
            ':eggplant:': '🍆',
            ':cucumber:': '🥒',
            ':carrot:': '🥕',
            ':corn:': '🌽',
            ':hot_pepper:': '🌶️',
            ':potato:': '🥔',
            ':sweet_potato:': '🍠',
            ':mushroom:': '🍄',
            ':peanuts:': '🥜',
            ':chestnut:': '🌰',
            ':bread:': '🍞',
            ':croissant:': '🥐',
            ':bagel:': '🥯',
            ':pretzel:': '🥨',
            ':cheese:': '🧀',
            ':egg:': '🥚',
            ':hamburger:': '🍔',
            ':fries:': '🍟',
            ':hotdog:': '🌭',
            ':pizza:': '🍕',
            ':sandwich:': '🥪',
            ':taco:': '🌮',
            ':burrito:': '🌯',
            ':cookie:': '🍪',
            ':cake:': '🍰',
            ':birthday:': '🎂',
            ':cupcake:': '🧁',
            ':pie:': '🥧',
            ':chocolate_bar:': '🍫',
            ':candy:': '🍬',
            ':lollipop:': '🍭',
            ':honey_pot:': '🍯',
            ':coffee:': '☕',
            ':tea:': '🍵',
            ':beer:': '🍺',
            ':wine_glass:': '🍷',
            ':cocktail:': '🍸',
            ':tropical_drink:': '🍹',
            ':champagne:': '🍾',
            ':milk_glass:': '🥛',
            
            // Activities & Objects
            ':soccer:': '⚽',
            ':basketball:': '🏀',
            ':football:': '🏈',
            ':baseball:': '⚾',
            ':tennis:': '🎾',
            ':volleyball:': '🏐',
            ':rugby_football:': '🏉',
            ':8ball:': '🎱',
            ':golf:': '⛳',
            ':ski:': '🎿',
            ':snowboard:': '🏂',
            ':trophy:': '🏆',
            ':medal:': '🏅',
            ':1st_place_medal:': '🥇',
            ':2nd_place_medal:': '🥈',
            ':3rd_place_medal:': '🥉',
            ':dart:': '🎯',
            ':bow_and_arrow:': '🏹',
            ':fishing_pole_and_fish:': '🎣',
            ':boxing_glove:': '🥊',
            ':martial_arts_uniform:': '🥋',
            ':guitar:': '🎸',
            ':musical_keyboard:': '🎹',
            ':trumpet:': '🎺',
            ':violin:': '🎻',
            ':drum:': '🥁',
            ':microphone:': '🎤',
            ':headphones:': '🎧',
            ':radio:': '📻',
            ':saxophone:': '🎷',
            ':art:': '🎨',
            ':clapper:': '🎬',
            ':video_camera:': '📹',
            ':camera:': '📷',
            ':camera_flash:': '📸',
            ':space_invader:': '👾',
            ':video_game:': '🎮',
            ':game_die:': '🎲',
            ':jigsaw:': '🧩',
            ':teddy_bear:': '🧸',
            
            // Symbols & Objects
            ':fire:': '🔥',
            ':star:': '⭐',
            ':star2:': '🌟',
            ':sparkles:': '✨',
            ':zap:': '⚡',
            ':boom:': '💥',
            ':collision:': '💢',
            ':dizzy:': '💫',
            ':sweat_drops:': '💦',
            ':droplet:': '💧',
            ':zzz:': '💤',
            ':dash:': '💨',
            ':bomb:': '💣',
            ':speech_balloon:': '💬',
            ':thought_balloon:': '💭',
            ':100:': '💯',
            ':moneybag:': '💰',
            ':gem:': '💎',
            ':dollar:': '💲',
            ':credit_card:': '💳',
            ':envelope:': '✉️',
            ':email:': '📧',
            ':inbox_tray:': '📥',
            ':outbox_tray:': '📤',
            ':package:': '📦',
            ':mailbox:': '📪',
            ':mailbox_with_mail:': '📬',
            ':postbox:': '📮',
            ':newspaper:': '📰',
            ':book:': '📖',
            ':books:': '📚',
            ':notebook:': '📓',
            ':ledger:': '📒',
            ':page_with_curl:': '📃',
            ':scroll:': '📜',
            ':page_facing_up:': '📄',
            ':bookmark:': '🔖',
            ':label:': '🏷️',
            ':pencil2:': '✏️',
            ':black_nib:': '✒️',
            ':fountain_pen:': '🖋️',
            ':ballpoint_pen:': '🖊️',
            ':paintbrush:': '🖌️',
            ':crayon:': '🖍️',
            ':memo:': '📝',
            ':briefcase:': '💼',
            ':file_folder:': '📁',
            ':open_file_folder:': '📂',
            ':card_index_dividers:': '🗂️',
            ':calendar:': '📅',
            ':date:': '📆',
            ':spiral_notepad:': '🗒️',
            ':spiral_calendar:': '🗓️',
            ':card_index:': '📇',
            ':chart_with_upwards_trend:': '📈',
            ':chart_with_downwards_trend:': '📉',
            ':bar_chart:': '📊',
            ':clipboard:': '📋',
            ':pushpin:': '📌',
            ':round_pushpin:': '📍',
            ':paperclip:': '📎',
            ':paperclips:': '🖇️',
            ':straight_ruler:': '📏',
            ':triangular_ruler:': '📐',
            ':scissors:': '✂️',
            ':card_file_box:': '🗃️',
            ':file_cabinet:': '🗄️',
            ':wastebasket:': '🗑️',
            ':lock:': '🔒',
            ':unlock:': '🔓',
            ':lock_with_ink_pen:': '🔏',
            ':closed_lock_with_key:': '🔐',
            ':key:': '🔑',
            ':old_key:': '🗝️',
            ':hammer:': '🔨',
            ':pick:': '⛏️',
            ':hammer_and_pick:': '⚒️',
            ':hammer_and_wrench:': '🛠️',
            ':dagger:': '🗡️',
            ':crossed_swords:': '⚔️',
            ':gun:': '🔫',
            ':shield:': '🛡️',
            ':wrench:': '🔧',
            ':nut_and_bolt:': '🔩',
            ':gear:': '⚙️',
            ':clamp:': '🗜️',
            ':balance_scale:': '⚖️',
            ':link:': '🔗',
            ':chains:': '⛓️',
            ':syringe:': '💉',
            ':pill:': '💊',
            ':smoking:': '🚬',
            ':coffin:': '⚰️',
            ':funeral_urn:': '⚱️',
            ':amphora:': '🏺',
            ':crystal_ball:': '🔮',
            ':prayer_beads:': '📿',
            ':barber:': '💈',
            ':alembic:': '⚗️',
            ':telescope:': '🔭',
            ':microscope:': '🔬',
            ':hole:': '🕳️',
            ':pill:': '💊',
            ':thermometer:': '🌡️',
            ':broom:': '🧹',
            ':basket:': '🧺',
            ':toilet_paper:': '🧻',
            ':soap:': '🧼',
            ':sponge:': '🧽',
            ':fire_extinguisher:': '🧯',
            ':shopping_cart:': '🛒',
            
            // Travel & Places
            ':car:': '🚗',
            ':taxi:': '🚕',
            ':blue_car:': '🚙',
            ':bus:': '🚌',
            ':trolleybus:': '🚎',
            ':racing_car:': '🏎️',
            ':police_car:': '🚓',
            ':ambulance:': '🚑',
            ':fire_engine:': '🚒',
            ':minibus:': '🚐',
            ':truck:': '🚚',
            ':articulated_lorry:': '🚛',
            ':tractor:': '🚜',
            ':kick_scooter:': '🛴',
            ':bike:': '🚲',
            ':motor_scooter:': '🛵',
            ':motorcycle:': '🏍️',
            ':rotating_light:': '🚨',
            ':oncoming_police_car:': '🚔',
            ':oncoming_bus:': '🚍',
            ':oncoming_automobile:': '🚘',
            ':oncoming_taxi:': '🚖',
            ':aerial_tramway:': '🚡',
            ':mountain_cableway:': '🚠',
            ':suspension_railway:': '🚟',
            ':railway_car:': '🚃',
            ':train:': '🚋',
            ':monorail:': '🚝',
            ':bullettrain_side:': '🚄',
            ':bullettrain_front:': '🚅',
            ':light_rail:': '🚈',
            ':mountain_railway:': '🚞',
            ':steam_locomotive:': '🚂',
            ':train2:': '🚆',
            ':metro:': '🚇',
            ':tram:': '🚊',
            ':station:': '🚉',
            ':airplane:': '✈️',
            ':small_airplane:': '🛩️',
            ':airplane_departure:': '🛫',
            ':airplane_arrival:': '🛬',
            ':rocket:': '🚀',
            ':artificial_satellite:': '🛰️',
            ':seat:': '💺',
            ':helicopter:': '🚁',
            ':canoe:': '🛶',
            ':speedboat:': '🚤',
            ':motorboat:': '🛥️',
            ':cruise_ship:': '🛳️',
            ':passenger_ship:': '🛳️',
            ':ferry:': '⛴️',
            ':sailboat:': '⛵',
            ':rowboat:': '🚣',
            ':anchor:': '⚓',
            ':construction:': '🚧',
            ':fuelpump:': '⛽',
            ':busstop:': '🚏',
            ':vertical_traffic_light:': '🚦',
            ':traffic_light:': '🚥',
            ':checkered_flag:': '🏁',
            ':ship:': '🚢',
            ':ferris_wheel:': '🎡',
            ':roller_coaster:': '🎢',
            ':carousel_horse:': '🎠',
            ':building_construction:': '🏗️',
            ':foggy:': '🌁',
            ':tokyo_tower:': '🗼',
            ':factory:': '🏭',
            ':fountain:': '⛲',
            ':rice_scene:': '🎑',
            ':mountain:': '⛰️',
            ':mountain_snow:': '🏔️',
            ':mount_fuji:': '🗻',
            ':volcano:': '🌋',
            ':desert:': '🏜️',
            ':beach_umbrella:': '🏖️',
            ':desert_island:': '🏝️',
            ':sunrise_over_mountains:': '🌄',
            ':sunrise:': '🌅',
            ':city_sunset:': '🌇',
            ':city_sunrise:': '🌆',
            ':night_with_stars:': '🌃',
            ':bridge_at_night:': '🌉',
            ':milky_way:': '🌌',
            ':stars:': '🌠',
            ':sparkler:': '🎇',
            ':fireworks:': '🎆',
            ':rainbow:': '🌈',
            ':house:': '🏠',
            ':house_with_garden:': '🏡',
            ':derelict_house:': '🏚️',
            ':office:': '🏢',
            ':department_store:': '🏬',
            ':post_office:': '🏣',
            ':european_post_office:': '🏤',
            ':hospital:': '🏥',
            ':bank:': '🏦',
            ':hotel:': '🏨',
            ':convenience_store:': '🏪',
            ':school:': '🏫',
            ':love_hotel:': '🏩',
            ':wedding:': '💒',
            ':classical_building:': '🏛️',
            ':church:': '⛪',
            ':mosque:': '🕌',
            ':synagogue:': '🕍',
            ':kaaba:': '🕋',
            ':shinto_shrine:': '⛩️',
            
            // Weather & Sky
            ':sunny:': '☀️',
            ':partly_sunny:': '⛅',
            ':cloud:': '☁️',
            ':mostly_sunny:': '🌤️',
            ':barely_sunny:': '🌥️',
            ':partly_sunny_rain:': '🌦️',
            ':rain_cloud:': '🌧️',
            ':snow_cloud:': '🌨️',
            ':lightning:': '🌩️',
            ':tornado:': '🌪️',
            ':fog:': '🌫️',
            ':wind_face:': '🌬️',
            ':cyclone:': '🌀',
            ':rainbow:': '🌈',
            ':closed_umbrella:': '🌂',
            ':open_umbrella:': '☂️',
            ':umbrella:': '☔',
            ':parasol_on_ground:': '⛱️',
            ':zap:': '⚡',
            ':snowflake:': '❄️',
            ':snowman:': '☃️',
            ':snowman_with_snow:': '⛄',
            ':comet:': '☄️',
            ':droplet:': '💧',
            ':ocean:': '🌊',
            
            // Common expressions and reactions
            ':ok:': '👌',
            ':cool:': '😎',
            ':awesome:': '🤩',
            ':party:': '🎉',
            ':celebrate:': '🎊',
            ':tada:': '🎉',
            ':confetti_ball:': '🎊',
            ':balloon:': '🎈',
            ':gift:': '🎁',
            ':ribbon:': '🎀',
            ':crown:': '👑',
            ':gem:': '💎',
            ':ring:': '💍',
            ':lipstick:': '💄',
            ':kiss:': '💋',
            ':love_letter:': '💌',
            ':cupid:': '💘',
            ':gift_heart:': '💝',
            ':revolving_hearts:': '💞',
            ':heartbeat:': '💓',
            ':growing_heart:': '💗',
            ':two_hearts:': '💕',
            ':sparkling_heart:': '💖',
            ':heart_decoration:': '💟',
            ':peace_symbol:': '☮️',
            ':yin_yang:': '☯️',
            ':wheel_of_dharma:': '☸️',
            ':om:': '🕉️',
            ':six_pointed_star:': '✡️',
            ':menorah:': '🕎',
            ':atom_symbol:': '⚛️',
            ':warning:': '⚠️',
            ':radioactive:': '☢️',
            ':biohazard:': '☣️',
            ':mobile_phone_off:': '📴',
            ':vibration_mode:': '📳',
            ':u6709:': '🈶',
            ':u7121:': '🈚',
            ':u7533:': '🈸',
            ':u55b6:': '🈺',
            ':u6708:': '🈷️',
            ':eight_pointed_black_star:': '✴️',
            ':vs:': '🆚',
            ':accept:': '🉑',
            ':white_flower:': '💮',
            ':ideograph_advantage:': '🉐',
            ':secret:': '㊙️',
            ':congratulations:': '㊗️',
            ':u5408:': '🈴',
            ':u6e80:': '🈵',
            ':u5272:': '🈹',
            ':u7981:': '🈲',
            ':a:': '🅰️',
            ':b:': '🅱️',
            ':ab:': '🆎',
            ':cl:': '🆑',
            ':o2:': '🅾️',
            ':sos:': '🆘',
            ':no_entry:': '⛔',
            ':name_badge:': '📛',
            ':no_entry_sign:': '🚫',
            ':x:': '❌',
            ':o:': '⭕',
            ':stop_sign:': '🛑',
            ':anger:': '💢',
            ':hotsprings:': '♨️',
            ':no_pedestrians:': '🚷',
            ':do_not_litter:': '🚯',
            ':no_bicycles:': '🚳',
            ':non-potable_water:': '🚱',
            ':underage:': '🔞',
            ':no_mobile_phones:': '📵',
            ':exclamation:': '❗',
            ':grey_exclamation:': '❕',
            ':question:': '❓',
            ':grey_question:': '❔',
            ':bangbang:': '‼️',
            ':interrobang:': '⁉️',
            ':low_brightness:': '🔅',
            ':high_brightness:': '🔆',
            ':trident:': '🔱',
            ':fleur_de_lis:': '⚜️',
            ':part_alternation_mark:': '〽️',
            ':copyright:': '©️',
            ':registered:': '®️',
            ':tm:': '™️'
        };
        
        // Enhanced cursor tracking
        this.currentMouseX = 0;
        this.currentMouseY = 0;
        this.cursorInterpolationFrame = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeFaviconManager();
        this.loadSavedSettings();
        this.loadSavedAccount();
        
        // Initialize auto-scroll state; default on until user scrolls up
        this.autoScrollEnabled = true;
        
        // Global click handler for modal management
        document.addEventListener('click', (e) => {
            // Close modal if clicking outside of it
            if (e.target.closest('.message-menu-modal') && !e.target.closest('.message-menu-content')) {
                this.closeMessageModal();
            }
        });
        
        // Initialize User Action Dropdown
        this.userActionDropdown = new UserActionDropdown(this);
    }
    
    initializeElements() {
        // Login elements
        this.loginScreen = document.getElementById('loginScreen');
        this.preJoinScreen = document.getElementById('preJoinScreen');
        this.chatScreen = document.getElementById('chatScreen');
        this.usernameInput = document.getElementById('username');
        this.colorPicker = document.getElementById('colorPicker');
        this.joinButton = document.getElementById('joinButton');
        
        // Pre-join elements
        this.preJoinUsername = document.getElementById('preJoinUsername');
        this.joinChatButton = document.getElementById('joinChatButton');
        this.readChatButton = document.getElementById('readChatButton');
        this.onlineUsersPreview = document.querySelector('.online-users-preview');
        this.panelTabs = document.querySelectorAll('.panel-tab');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Chat elements
        this.chatHistory = document.getElementById('chatHistory');
        this.chatInput = document.getElementById('chatInput');
        this.userList = document.getElementById('userContainer');
        // History pagination state
        this.historyMoreAvailable = false;
        this.historyOldestTimestamp = null;
        this.isLoadingOlder = false;
        // historyLoaderEl removed - using fixed cap of 312 messages
        this.onlineCount = document.getElementById('onlineCount');
        
        // Connection status indicator
        this.connectionStatusIndicator = document.getElementById('connectionStatus');
        
        // File upload elements
        this.fileInput = document.getElementById('fileInput');
        this.attachButton = document.getElementById('attachButton');
        this.attachmentPreview = document.getElementById('attachmentPreview');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.chatInputContainer = document.querySelector('.chat-input-container');
        
        // Settings elements
        this.settingsIcon = document.getElementById('settingsIcon');
        this.scrollToBottomBtn = document.getElementById('scrollToBottom');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.settingsBackdrop = document.querySelector('.settings-backdrop');
        
        // Settings form elements
        this.settingsUsername = document.getElementById('settingsUsername');
        this.settingsColor = document.getElementById('settingsColor');
        this.settingsWebsite = document.getElementById('settingsWebsite'); // Add website field
        this.logoutButton = document.getElementById('logoutButton');
        this.updateAccountButton = document.getElementById('updateAccountButton');
        this.gradientColor1 = document.getElementById('gradientColor1');
        this.gradientColor2 = document.getElementById('gradientColor2');
        this.autoAdjustColors = document.getElementById('autoAdjustColors');
        this.resetAppearance = document.getElementById('resetAppearance');
        this.censorSwears = document.getElementById('censorSwears');
        this.spoilerImages = document.getElementById('spoilerImages');
        
        // Notification settings
        this.pingSound = document.getElementById('pingSound');
        
        // Emoji picker elements (removed)
        
        // Mention dropdown elements
        this.mentionDropdown = document.getElementById('mentionDropdown');
        this.mentionList = document.getElementById('mentionList');
        this.mentionUsers = [];
        this.selectedMentionIndex = -1;
        this.mentionStartPos = -1;
        this.mentionQuery = '';
        
        // Reference to user container for mention system
        this.userContainer = this.userList;
        
        // Sidebar elements
        this.sidebarItems = document.querySelectorAll('.sidebar-item');
        this.settingSections = document.querySelectorAll('.settings-section');
        
        // Click Me elements
        this.clickMeButton = document.getElementById('clickMeButton');
        this.clickMeModal = document.getElementById('clickMeModal');
        this.closeClickMe = document.getElementById('closeClickMe');
        this.clickMeBackdrop = document.querySelector('.click-me-backdrop');
        
        // Reply elements (will be created dynamically)
        this.replyContainer = null;
        
        // File upload state
        // this.pendingFiles = []; // removed - no longer needed
        this.isUploading = false;
    }
    
    initializeFaviconManager() {
        // Create canvas dynamically for favicon generation
        this.faviconCanvas = document.createElement('canvas');
        this.faviconCanvas.width = 32;
        this.faviconCanvas.height = 32;
        this.faviconCanvas.style.display = 'none';
        document.body.appendChild(this.faviconCanvas);
        this.faviconContext = this.faviconCanvas.getContext('2d');
        
        // Create favicon link if it doesn't exist
        let faviconLink = document.getElementById('favicon');
        if (!faviconLink) {
            faviconLink = document.createElement('link');
            faviconLink.id = 'favicon';
            faviconLink.rel = 'icon';
            faviconLink.type = 'image/x-icon';
            document.head.appendChild(faviconLink);
        }
        
        // Store original favicon or create a default one
        this.originalFavicon = faviconLink.href || this.generateDefaultFavicon();
        faviconLink.href = this.originalFavicon;
        
        // Track window focus
        window.addEventListener('focus', () => {
            this.isWindowFocused = true;
            this.clearUnreadCount();
            this.sendTabbedStatus(false);
        });
        
        window.addEventListener('blur', () => {
            this.isWindowFocused = false;
            this.sendTabbedStatus(true);
        });
        
        // Track tab visibility
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.isWindowFocused = true;
                this.clearUnreadCount();
                this.sendTabbedStatus(false);
            } else {
                this.isWindowFocused = false;
                this.sendTabbedStatus(true);
            }
        });
    }
    
    generateDefaultFavicon() {
        const canvas = this.faviconCanvas;
        const ctx = this.faviconContext;
        
        // Clear canvas
        ctx.clearRect(0, 0, 32, 32);
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 32, 32);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        
        // Draw main circle
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw chat icon (simplified)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💬', 16, 16);
        
        return canvas.toDataURL('image/png');
    }
    
    generateFaviconWithBadge(count) {
        const canvas = this.faviconCanvas;
        const ctx = this.faviconContext;
        
        // Clear canvas
        ctx.clearRect(0, 0, 32, 32);
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 32, 32);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        
        // Draw main circle
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw chat icon (simplified)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💬', 16, 16);
        
        // Draw notification badge if count > 0
        if (count > 0) {
            const badgeSize = Math.min(count > 9 ? 14 : 12, 14);
            const badgeX = 24;
            const badgeY = 8;
            
            // Badge background
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeSize / 2, 0, 2 * Math.PI);
            ctx.fill();
            
            // Badge border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Badge text
            ctx.fillStyle = 'white';
            ctx.font = `bold ${badgeSize - 4}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const displayCount = count > 99 ? '99+' : count.toString();
            ctx.fillText(displayCount, badgeX, badgeY);
        }
        
        return canvas.toDataURL('image/png');
    }
    
    updateFavicon() {
        const faviconLink = document.getElementById('favicon');
        
        if (this.unreadCount > 0 && !this.isWindowFocused) {
            // Generate favicon with badge
            const faviconData = this.generateFaviconWithBadge(this.unreadCount);
            faviconLink.href = faviconData;
            
            // Update title with unread count
            const baseTitle = 'Chat';
            document.title = `(${this.unreadCount}) ${baseTitle}`;
        } else {
            // Reset to original favicon
            faviconLink.href = this.originalFavicon;
            document.title = 'Chat';
        }
    }
    
    addUnreadMessage() {
        if (!this.isWindowFocused) {
            this.unreadCount++;
            this.updateFavicon();
            
            // Show browser notification if permitted
            this.showBrowserNotification();
        }
    }
    
    clearUnreadCount() {
        this.unreadCount = 0;
        this.updateFavicon();
    }
    
    attachEventListeners() {
        // Login events
        this.joinButton.addEventListener('click', () => this.showPreJoinScreen());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.showPreJoinScreen();
        });
        
        // Pre-join events
        this.joinChatButton.addEventListener('click', () => this.joinFromPreJoin());
        this.readChatButton.addEventListener('click', () => {
            // Disabled for now
        });
        
        // Tab switching events
        this.panelTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        
        // Chat events
        this.chatInput.addEventListener('keydown', (e) => {
            this.handleChatInputKeydown(e);
        });
        
        this.chatInput.addEventListener('input', (e) => {
            this.handleChatInputChange(e);
            this.handleTyping();
        });
        
        this.chatInput.addEventListener('keyup', () => {
            this.handleTypingStop();
        });
        
        // File upload events
        this.attachButton.addEventListener('click', () => {
            if (!this.isUploading) {
                // Reset input so selecting the same file again triggers change
                this.fileInput.value = '';
                this.fileInput.click();
            }
        });
        
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
            // Clear value so choosing same file again in the future fires 'change'
            this.fileInput.value = '';
        });
        
        // Paste event for files
        this.chatInput.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });
        
        // Drag and drop events
        this.chatInputContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.chatInputContainer.classList.add('drag-over');
        });
        
        this.chatInputContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.chatInputContainer.classList.remove('drag-over');
        });
        
        this.chatInputContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            this.chatInputContainer.classList.remove('drag-over');
            this.handleFileSelection(e.dataTransfer.files);
        });
        
        // Save account info when color changes
        this.colorPicker.addEventListener('change', () => {
            this.saveAccount();
        });
        
        this.usernameInput.addEventListener('input', () => {
            this.saveAccount();
        });
        
        // Logout button
        this.logoutButton.addEventListener('click', () => {
            this.logout();
        });
        
        // Update account button
        this.updateAccountButton.addEventListener('click', () => {
            this.updateAccount();
        });
        
        // Settings modal events
        this.settingsIcon.addEventListener('click', () => {
            this.openSettings();
        });
        
        // Scroll to bottom button
        this.scrollToBottomBtn.addEventListener('click', () => {
            this.enableAutoScroll();
            this.scrollToBottom(true);
        });

        // Track scroll position to auto-enable/disable auto-scroll
        this.chatHistory.addEventListener('scroll', () => {
            this.handleChatScroll();
        });
        
        this.closeSettings.addEventListener('click', () => {
            this.closeSettingsModal();
        });
        
        this.settingsBackdrop.addEventListener('click', () => {
            this.closeSettingsModal();
        });
        
        // Sidebar navigation
        this.sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const category = item.dataset.category;
                this.switchSettingsCategory(category);
            });
        });
        
        // Appearance settings
        this.gradientColor1.addEventListener('input', () => {
            this.updateAppearanceRealTime();
        });
        
        this.gradientColor2.addEventListener('input', () => {
            this.updateAppearanceRealTime();
        });
        
        this.resetAppearance.addEventListener('click', () => {
            this.resetAppearanceSettings();
        });
        
        // Safety settings (save to localStorage even though disabled)
        this.censorSwears.addEventListener('change', () => {
            this.updateSafetySettings();
        });
        
        this.spoilerImages.addEventListener('change', () => {
            this.updateSafetySettings();
        });
        
        // Notification settings
        this.pingSound.addEventListener('change', () => {
            this.updateNotificationSettings();
        });
        
        // Auto-adjust colors setting
        this.autoAdjustColors.addEventListener('change', () => {
            this.toggleAutoAdjustColors();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.mentionDropdown.classList.contains('hidden')) {
                    this.closeMentionDropdown();
                } else if (!this.emojiPickerModal.classList.contains('hidden')) {
                    this.closeEmojiPickerModal();
                } else if (!this.settingsModal.classList.contains('hidden')) {
                    this.closeSettingsModal();
                } else if (!this.clickMeModal.classList.contains('hidden')) {
                    this.closeClickMeModal();
                } else if (this.replyingTo) {
                    this.clearReply();
                }
            }
            
            // Auto-focus chat input when typing starts
            if (this.shouldAutoFocusInput(e)) {
                this.autoFocusChatInput(e);
            }
        });
        
        // Global Shift key detection for quick delete
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                this.handleShiftKeyDown();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.handleShiftKeyUp();
            }
        });
        
        // Mouse tracking for live cursors
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        // Window resize handler for cursor position updates
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
        
        // Emoji picker events (removed)
        
        // Mention dropdown events
        this.mentionList.addEventListener('click', (e) => {
            const mentionItem = e.target.closest('.mention-item');
            if (mentionItem) {
                const username = mentionItem.dataset.username;
                this.selectMention(username);
            }
        });
        
        // Close mention dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.mentionDropdown.contains(e.target) && !this.chatInput.contains(e.target)) {
                this.closeMentionDropdown();
            }
        });

        // Click Me button functionality
        this.clickMeButton.addEventListener('click', () => {
            this.openClickMeModal();
        });

        this.closeClickMe.addEventListener('click', () => {
            this.closeClickMeModal();
        });

        this.clickMeBackdrop.addEventListener('click', () => {
            this.closeClickMeModal();
        });
    }
    
    loadSavedAccount() {
        const savedAccount = localStorage.getItem('chatAccount');
        if (savedAccount) {
            try {
                const account = JSON.parse(savedAccount);
                this.usernameInput.value = account.username || '';
                this.colorPicker.value = account.color || '#ff6b6b';
                this.userWebsite = account.website || ''; // Load website
                
                // Auto-show pre-join for returning users
                if (account.username && account.username.trim()) {
                    setTimeout(() => {
                        this.showPreJoinScreen();
                    }, 100);
                }
            } catch (error) {
                console.error('Error loading saved account:', error);
            }
        }
    }
    
    saveAccount() {
        const account = {
            username: this.usernameInput.value.trim(),
            color: this.colorPicker.value,
            website: this.userWebsite || '' // Save website
        };
        localStorage.setItem('chatAccount', JSON.stringify(account));
    }
    
    showPreJoinScreen() {
        const username = this.usernameInput.value.trim();
        if (!username || username.length > 24) {
            alert('Please enter a username (1-24 characters)');
            return;
        }
        
        this.username = username;
        this.userColor = this.colorPicker.value;
        
        // Save account for next time
        this.saveAccount();
        
        // Request notification permission
        this.requestNotificationPermission();
        
        // Show pre-join screen
        this.loginScreen.classList.add('hidden');
        this.preJoinScreen.classList.remove('hidden');
        this.preJoinUsername.textContent = this.username;
        
        // Connect to get preview data but don't join yet
        this.connectForPreview();
    }
    
    joinFromPreJoin() {
        // Add joining animation
        this.preJoinScreen.classList.add('joining');
        
        // After animation, hide pre-join and show chat with fade in
        setTimeout(() => {
            this.preJoinScreen.classList.add('hidden');
            this.preJoinScreen.classList.remove('joining');
            this.showChatScreenWithAnimation();
            
            // Actually join the chat
            this.joinChat();
        }, 800);
    }
    
    joinChat() {
        // Exit preview mode
        this.isPreviewMode = false;
        
        // Send join message if socket is connected
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'join',
                username: this.username,
                color: this.userColor,
                website: this.userWebsite || ''
            }));
        } else {
            // If not connected, connect and join
            this.connectWebSocket();
        }
    }
    
    connectForPreview() {
        // Connect to websocket but don't join - just get preview data
        this.isPreviewMode = true;
        
        // If already connected, just request preview data
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.requestPreviewData();
        } else {
            this.connectWebSocket();
        }
    }
    
    showChatScreenWithAnimation() {
        this.chatScreen.classList.remove('hidden');
        this.chatScreen.classList.add('fade-in');
        this.chatInput.focus();
        
        // Show all existing cursors
        this.cursors.forEach(cursor => {
            cursor.style.display = 'block';
        });
        
        // Remove animation class after animation completes
        setTimeout(() => {
            this.chatScreen.classList.remove('fade-in');
        }, 1000);
    }
    
    requestPreviewData() {
        // Request preview data from server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'preview',
                username: this.username
            }));
        }
    }
    
    updatePreviewData(data) {
        // Update online users preview
        if (data.users) {
            this.updateOnlineUsersPreview(data.users);
        }
        
        // Chat summary is intentionally empty as requested
        // Mentions will be empty for now (could be implemented later)
    }
    
    switchTab(tabName) {
        // Update tab buttons
        this.panelTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab content
        this.tabContents.forEach(content => {
            const contentId = tabName + '-tab';
            content.classList.toggle('active', content.id === contentId);
        });
    }
    
    updateOnlineUsersPreview(users) {
        const container = this.onlineUsersPreview;
        if (!container) return;
        
        if (users.length === 0) {
            container.innerHTML = '<div class="loading-users">No users online</div>';
            return;
        }
        
        const usersHtml = users.map(user => {
            const statusClass = user.isTabActive ? 'active' : 'inactive';
            const statusText = user.isTabActive ? 'Active' : 'Inactive';
            return `
                <div class="online-user-item" style="--user-color: ${user.color}">
                    <div class="online-user-name">${this.escapeHtml(user.username)}</div>
                    <div class="online-user-status ${statusClass}">${statusText}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = usersHtml;
    }

    connectWebSocket() {
        // Clear any existing reconnection timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        console.log(`Attempting to connect to ${wsUrl}... (Attempt ${this.reconnectAttempts + 1})`);
        this.updateConnectionStatus('connecting', 'Connecting...');
        
        try {
            this.socket = new WebSocket(wsUrl);
        } catch (error) {
            console.error('WebSocket creation failed:', error);
            this.handleConnectionError();
            return;
        }
        
        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
            if (this.socket.readyState === WebSocket.CONNECTING) {
                console.warn('Connection timeout reached');
                this.socket.close();
                this.handleConnectionError();
            }
        }, 10000); // 10 second timeout
        
        this.socket.onopen = () => {
            clearTimeout(connectionTimeout);
            console.log('Connected to chat server');
            
            // Reset reconnection state
            this.isConnected = true;
            this.wasConnected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000; // Reset delay
            
            this.updateConnectionStatus('connected', 'Connected');
            
            // Hide connection status after successful connection
            setTimeout(() => {
                if (this.isConnected) {
                    this.hideConnectionStatus();
                }
            }, 2000);
            
            // Send join message only if not in preview mode
            if (!this.isPreviewMode) {
                this.socket.send(JSON.stringify({
                    type: 'join',
                    username: this.username,
                    color: this.userColor,
                    website: this.userWebsite || ''
                }));
            } else {
                // In preview mode, request preview data
                this.requestPreviewData();
            }
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };
        
        this.socket.onclose = (event) => {
            clearTimeout(connectionTimeout);
            this.isConnected = false;
            
            console.log(`Disconnected from chat server (Code: ${event.code}, Reason: ${event.reason})`);
            
            // Clean up dyslexia effect on disconnect
            if (this.dyslexiaActive) {
                this.dyslexiaActive = false;
                this.dyslexiaTargetUser = null;
                if (this.dyslexiaTimer) {
                    clearTimeout(this.dyslexiaTimer);
                    this.dyslexiaTimer = null;
                }
                this.restoreAllText();
            }
            
            // Don't attempt reconnection if it was a clean close or logout
            if (event.code === 1000 || !this.wasConnected) {
                this.updateConnectionStatus('disconnected', 'Disconnected');
                return;
            }
            
            this.handleConnectionError();
        };
        
        this.socket.onerror = (error) => {
            clearTimeout(connectionTimeout);
            console.error('WebSocket error:', error);
            this.handleConnectionError();
        };
    }

    handleConnectionError() {
        this.isConnected = false;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.updateConnectionStatus('failed', 'Connection failed - Refresh to retry');
            this.showSystemMessage('Connection failed. Please refresh the page to reconnect.');
            return;
        }
        
        this.reconnectAttempts++;
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
            this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
            this.maxReconnectDelay
        );
        
        const delaySeconds = Math.round(delay / 1000);
        console.log(`Reconnecting in ${delaySeconds} seconds... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        this.updateConnectionStatus('reconnecting', `Reconnecting in ${delaySeconds}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        if (this.wasConnected) {
            this.showSystemMessage(`Connection lost. Reconnecting in ${delaySeconds} seconds...`);
        }
        
        this.reconnectTimer = setTimeout(() => {
            this.connectWebSocket();
        }, delay);
    }

    updateConnectionStatus(status, message) {
        if (!this.connectionStatusIndicator) return;
        
        const statusText = this.connectionStatusIndicator.querySelector('.status-text');
        if (!statusText) return;
        
        // Remove all status classes
        this.connectionStatusIndicator.classList.remove('connecting', 'connected', 'reconnecting', 'failed');
        
        // Add current status class
        this.connectionStatusIndicator.classList.add(status);
        
        // Update text
        statusText.textContent = message;
        
        // Show the indicator
        this.connectionStatusIndicator.classList.remove('hidden');
    }

    hideConnectionStatus() {
        if (this.connectionStatusIndicator) {
            this.connectionStatusIndicator.classList.add('hidden');
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'requestFingerprint':
                // Server is requesting our device fingerprint
                this.sendDeviceFingerprint();
                break;
            case 'history':
                this.loadChatHistory(data.messages, data.moreAvailable);
                break;
            // historyPage case removed - using fixed cap of 312 messages
            case 'preview':
                this.updatePreviewData(data);
                break;
            case 'usernameError':
                this.handleUsernameError(data);
                break;
            case 'message':
                this.displayMessage(data);
                break;
            case 'userList':
                this.updateUserList(data.users, data.count);
                
                // Update preview screen if in preview mode
                if (this.isPreviewMode) {
                    this.updateOnlineUsersPreview(data.users);
                }
                
                // Store user websites for clickable usernames
                data.users.forEach(user => {
                    if (user.website) {
                        this.userWebsites.set(user.username, user.website);
                    } else {
                        this.userWebsites.delete(user.username);
                    }
                });
                // Store current user ID for typing animation - need to find by current user
                if (this.currentUserId) {
                    // Try to find by existing ID first
                    const currentUser = data.users.find(user => user.id === this.currentUserId);
                    if (!currentUser) {
                        // If not found by ID, find by username (in case username changed)
                        const userByName = data.users.find(user => user.username === this.username);
                        if (userByName) {
                            this.currentUserId = userByName.id;
                        }
                    }
                } else {
                    // Initial ID assignment
                    const currentUser = data.users.find(user => user.username === this.username);
                    if (currentUser) {
                        this.currentUserId = currentUser.id;
                    }
                }
                break;
            case 'userJoined':
                this.showSystemMessage(`${data.username} joined the chat`);
                break;
            case 'userLeft':
                this.showSystemMessage(`${data.username} left the chat`);
                // Remove cursor when user leaves
                this.cursors.forEach((cursor, userId) => {
                    const userStillOnline = this.userList.querySelector(`[data-user-id="${userId}"]`);
                    if (!userStillOnline) {
                        this.removeCursor(userId);
                    }
                });
                break;
            case 'typing':
                this.handleUserTyping(data);
                break;
            case 'userUpdated':
                this.showSystemMessage(`${data.username} updated their profile`);
                break;
            case 'userUpdateOk':
                // Server confirmed our update; sync local state if needed
                if (typeof data.username === 'string') this.username = data.username;
                if (typeof data.color === 'string') this.userColor = data.color;
                if (typeof data.website === 'string') this.userWebsite = data.website;
                // Persist to localStorage and reflect in login form
                this.usernameInput.value = this.username;
                this.colorPicker.value = this.userColor;
                this.saveAccount();
                break;
            case 'cursor':
                // Don't handle cursor updates in preview mode
                if (!this.isPreviewMode) {
                    this.updateCursor(data);
                }
                break;
            case 'messageEdited':
                this.handleMessageEdited(data);
                break;
            case 'messageDeleted':
                this.handleMessageDeleted(data);
                break;
            case 'systemMessage':
                this.showSystemMessage(data.message);
                break;
                
            case 'dyslexiaEffect':
                this.handleDyslexiaEffect(data);
                break;
                
            case 'dmMessage':
                this.handleDMMessage(data);
                break;
                
            case 'dmHistory':
                this.handleDMHistory(data);
                break;
                
            case 'dmError':
                this.showDMError(data.message);
                break;
                
            case 'spoilerRevealed':
                this.handleSpoilerRevealed(data);
                break;
                
            case 'clearChat':
                // clear the chat history for everyone
                const chatHistory = document.getElementById('chatHistory');
                if (chatHistory) {
                    chatHistory.innerHTML = '';
                }
                
                // show "cleared chat" system message
                this.showSystemMessage('Cleared chat');
                break;
                
            case 'unspoilerImages':
                // turn off spoiler images setting for everyone
                const spoilerImagesCheckbox = document.getElementById('spoilerImages');
                if (spoilerImagesCheckbox) {
                    spoilerImagesCheckbox.checked = false;
                }
                
                // save the setting and apply it
                this.saveSafetySettings();
                this.applySafetySettings();
                
                // show system message
                this.showSystemMessage('Spoiler images setting has been turned off for everyone');
                break;
            case '/clearchat':
                this.handleClearChatCommand();
                break;
            case '/unspoilerimagesforeveryone':
                this.handleUnspoilerImagesCommand();
                break;
        }
    }

    handleUsernameError(data) {
        const reason = data && data.reason;
        const attempted = data && data.attempted;
        const msg = (data && data.message) || 'Username error';
        alert(msg);
        
        if (data && data.context === 'join') {
            // Return to login; keep the attempted name in the input for convenience
            if (typeof attempted === 'string') {
                this.usernameInput.value = attempted;
            }
            // Show login screen again
            this.chatScreen.classList.add('hidden');
            this.loginScreen.classList.remove('hidden');
            try { this.socket && this.socket.close(1000, 'username taken'); } catch {}
            this.usernameInput.focus();
            return;
        }
        
        if (data && data.context === 'update') {
            // Revert UI inputs to the last known good username
            this.settingsUsername.value = this.username;
        }
    }
    
    async sendMessage() {
        const content = this.chatInput.value.trim();
        
        // Check if user is muted
        if (this.isMuted) {
            this.showMuteModal();
            return;
        }
        
        // Don't block on upload; allow empty content if attachments exist
        const hasPendingAttachments = this.pendingAttachmentIds && this.pendingAttachmentIds.size > 0;
        if (!content && !hasPendingAttachments) return;

        // Process commands before sending
        if (content.startsWith('/')) {
            this.processCommand(content);
            this.chatInput.value = '';
            return;
        }

        // Check for spam before sending
        if (this.checkSpam()) {
            return;
        }

        // Check if message contains attachment IDs and resolve them
        const attachments = [];
        let cleanContent = content;
        // Resolve from pendingAttachmentIds (no visible $id$ in input)
        if (this.pendingAttachmentIds && this.pendingAttachmentIds.size > 0) {
            const registry = window.attachmentRegistry || new Map();
            this.pendingAttachmentIds.forEach(id => {
                const attachment = registry.get(id);
                if (attachment) {
                    attachments.push(attachment);
                    this.removeInlineAttachmentTag(id);
                }
            });
            this.pendingAttachmentIds.clear();
            // Clear inline tag container fully
            if (this.attachmentPreview) {
                this.attachmentPreview.innerHTML = '';
                this.attachmentPreview.classList.add('hidden');
            }
        }
        
        // Filename mention resolution: replace content-only filename tokens with existing attachments
        if (cleanContent) {
            const foundNames = new Set();
            const quotedMatches = [...cleanContent.matchAll(/\"([^\"\n]+\.[a-zA-Z0-9]{1,8})\"/g)];
            quotedMatches.forEach(m => foundNames.add(m[1]));
            const bareMatches = [...cleanContent.matchAll(/(?<!\S)([^\s]+\.[a-zA-Z0-9]{1,8})(?!\S)/g)];
            bareMatches.forEach(m => foundNames.add(m[1]));
            const names = Array.from(foundNames);
            if (names.length > 0) {
                const registry = window.attachmentRegistry || new Map();
                const attachedNames = [];
                names.forEach(n => {
                    for (const [, att] of registry.entries()) {
                        if (att && (att.originalName === n || att.filename === n)) {
                            if (!attachments.find(a => a.url === att.url)) {
                                attachments.push(att);
                                attachedNames.push(n);
                            }
                            break;
                        }
                    }
                });
                // Fallback to server exists for names not found in registry
                const unresolved = names.filter(n => !attachedNames.includes(n));
                if (unresolved.length > 0) {
                    // Note: sequential to avoid burst; can optimize to Promise.all if needed
                    for (const n of unresolved) {
                        try {
                            const resp = await fetch(`/files/exists?name=${encodeURIComponent(n)}`);
                            if (resp.ok) {
                                const data = await resp.json();
                                if (data.exists && data.file) {
                                    const att = {
                                        originalName: data.file.originalName,
                                        filename: data.file.filename,
                                        size: data.file.size,
                                        type: data.file.type || this.inferMimeFromName(data.file.filename || data.file.originalName),
                                        url: data.file.url
                                    };
                                    if (!attachments.find(a => a.url === att.url)) {
                                        attachments.push(att);
                                        attachedNames.push(n);
                                    }
                                }
                            }
                        } catch (_) { /* ignore */ }
                    }
                }
                if (attachedNames.length > 0) {
                    attachedNames.forEach(n => {
                        const quotedRe = new RegExp(`\\"${n.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\"`, 'g');
                        cleanContent = cleanContent.replace(quotedRe, ' ').trim();
                        const bareRe = new RegExp(`(^|\\s)${n.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}(?=\\s|$)`, 'g');
                        cleanContent = cleanContent.replace(bareRe, ' ').trim();
                    });
                }
            }
        }

        console.log('🔍 Original content:', content);
        console.log('🔍 Clean content:', cleanContent);
        console.log('🔍 Found attachments:', attachments);

        const messageData = {
            type: 'message',
            content: cleanContent || '',
            attachments: attachments // Include resolved attachments
        };

        // Add reply data if replying to a message
        if (this.replyingTo) {
            console.log('Sending reply to:', this.replyingTo.username);
            messageData.replyTo = {
                id: this.replyingTo.id,
                username: this.replyingTo.username,
                content: this.replyingTo.content
            };
        } else {
            console.log('Sending regular message');
        }

        console.log('Message data being sent:', messageData);
        this.socket.send(JSON.stringify(messageData));
        
        // Record message timestamp for spam detection
        this.recordMessageTimestamp();
        
        // Clear reply and input
        this.clearReply();
        this.chatInput.value = '';
        
        // Reset textarea height after clearing content
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = '40px'; // Reset to min-height
        this.chatInput.style.overflowY = 'hidden';
    }
    
    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.send(JSON.stringify({
                type: 'typing',
                isTyping: true
            }));
            
            // Make current user bounce immediately
            if (this.currentUserId) {
                const currentUserElement = document.querySelector(`[data-user-id="${this.currentUserId}"]`);
                if (currentUserElement) {
                    currentUserElement.classList.add('bouncing');
                }
            }
        }
        
        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Set new timeout
        this.typingTimeout = setTimeout(() => {
            this.handleTypingStop();
        }, 1000);
    }
    
    handleTypingStop() {
        if (this.isTyping) {
            this.isTyping = false;
            this.socket.send(JSON.stringify({
                type: 'typing',
                isTyping: false
            }));
            
            // Stop current user bounce
            if (this.currentUserId) {
                const currentUserElement = document.querySelector(`[data-user-id="${this.currentUserId}"]`);
                if (currentUserElement) {
                    currentUserElement.classList.remove('bouncing');
                }
            }
        }
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }
    
    handleUserTyping(data) {
        const userElement = document.querySelector(`[data-user-id="${data.userId}"]`);
        if (userElement) {
            if (data.isTyping) {
                userElement.classList.add('bouncing');
            } else {
                userElement.classList.remove('bouncing');
            }
        }
    }
    
    displayMessage(data) {
        console.log('🔍 displayMessage called with data:', data);
        console.log('🔍 Message has replyTo?', !!data.replyTo);
        if (data.replyTo) {
            console.log('🔍 Reply data structure:', JSON.stringify(data.replyTo, null, 2));
        }
        
        // Check for mentions and play sound if current user is mentioned
        this.checkForUserMention(data.content, data.username);
        
        // Track unread messages if user is not focused and it's not their own message
        if (data.username !== this.username) {
            this.addUnreadMessage();
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.setAttribute('data-message-id', data.id);
        
        // Store the complete message data with the element for easy access
        messageElement.messageData = data;
        
        // Store the message element for reply lookups
        this.messageElements.set(data.id, messageElement);
        
        // Handle DM notification messages differently
        if (data.type === 'dmNotification') {
            this.createDMNotificationMessage(messageElement, data);
        } else {
            this.createRegularMessage(messageElement, data);
        }
        // Insert a date separator if day changed (based on user's local time)
        if (typeof data.timestamp === 'number') {
            this.addDateSeparatorIfNeeded(data.timestamp);
        }

        this.chatHistory.appendChild(messageElement);
        this.scrollToBottom();

        // Apply dyslexia scrambling to the newly added message if active
        if (this.dyslexiaActive) {
            this.scrambleNewMessage(messageElement);
        }

        // Prune DOM to only keep messages from the last 7 days
        this.pruneChatHistoryByTime();
    }
    
    createDMNotificationMessage(messageElement, data) {
        messageElement.classList.add('dm-notification-message');
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-main dm-notification-main';
        
        // Create the REPLY PRIVATELY button
        const replyButton = document.createElement('button');
        replyButton.className = 'dm-notification-reply-btn';
        replyButton.textContent = '[REPLY PRIVATELY]';
        replyButton.addEventListener('click', () => {
            this.openDMModal({ username: data.dmSender, color: data.dmSenderColor });
        });
        
        // Create the "(DM) from <name>:" part
        const dmFromSpan = document.createElement('span');
        dmFromSpan.className = 'dm-notification-from';
        dmFromSpan.textContent = `(DM) from ${data.dmSender}:`;
        
        // Create the message content
        const contentSpan = document.createElement('span');
        contentSpan.className = 'dm-notification-content';
        // Process emojis, censor swear words, and process mentions
        const processedContent = this.processEmojis(data.content);
        const censoredContent = this.censorSwearWords(processedContent);
        const mentionedContent = this.processMentions(censoredContent);
        contentSpan.innerHTML = mentionedContent;
        // Use darker version of sender's color
        const darkerColor = this.getDarkerColor(data.dmSenderColor);
        contentSpan.style.color = darkerColor;
        
        contentDiv.appendChild(replyButton);
        contentDiv.appendChild(document.createTextNode(' '));
        contentDiv.appendChild(dmFromSpan);
        contentDiv.appendChild(document.createTextNode(' '));
        contentDiv.appendChild(contentSpan);
        
        messageElement.appendChild(contentDiv);
        
        // Add special hover effects for DM notifications
        this.addDMNotificationHoverEffects(messageElement, data);
    }
    
    createRegularMessage(messageElement, data) {
        // Check if this is a reply and display reply indicator
        if (data.replyTo) {
            console.log('🔧 Creating reply indicator...');
            const replyIndicator = document.createElement('div');
            replyIndicator.className = 'reply-indicator';
            
            const replyLine = document.createElement('div');
            replyLine.className = 'reply-line';
            
            const replyContent = document.createElement('div');
            replyContent.className = 'reply-content';
            // Tag with target message ID so we can live-update previews on edits
            replyContent.setAttribute('data-reply-to-id', data.replyTo.id);
            
            const originalMessage = this.messageElements.get(data.replyTo.id);
            console.log('🔍 Original message exists in map?', !!originalMessage);
            console.log('🔍 messageElements map has keys:', Array.from(this.messageElements.keys()));
            
            if (originalMessage) {
                console.log('✅ Found original message, creating clickable reply');
                const replyUsername = document.createElement('span');
                replyUsername.className = 'reply-username';
                replyUsername.textContent = data.replyTo.username;
                
                const replyText = document.createElement('span');
                replyText.className = 'reply-text';
                // Prefer latest content from the original message element if available
                const replySourceContent = (originalMessage && originalMessage.messageData && typeof originalMessage.messageData.content === 'string')
                    ? originalMessage.messageData.content
                    : data.replyTo.content;
                // Process emojis first, then censor swear words
                const processedReplyContent = this.processEmojis(replySourceContent);
                const censoredContent = this.censorSwearWords(processedReplyContent);
                // Check plain text length for truncation
                const plainTextLength = censoredContent.replace(/<[^>]*>/g, '').length;
                const truncatedText = plainTextLength > 50 
                    ? censoredContent.substring(0, 50) + '...' 
                    : censoredContent;
                const mentionedContent = this.processMentions(truncatedText);
                replyText.innerHTML = mentionedContent;
                
                replyContent.appendChild(replyUsername);
                replyContent.appendChild(replyText);
                
                replyContent.addEventListener('click', () => {
                    this.jumpToMessage(data.replyTo.id);
                });
            } else {
                console.log('❌ Original message not found, showing truncated');
                replyContent.className += ' truncated';
                replyContent.textContent = 'Original message not available';
            }
            
            replyIndicator.appendChild(replyLine);
            replyIndicator.appendChild(replyContent);
            messageElement.appendChild(replyIndicator);
            console.log('✅ Reply indicator added to message');
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-main';
        
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.textContent = data.username;
        usernameSpan.style.color = 'white';
        
        // Make username clickable if user has a website
        if (this.userWebsites.has(data.username)) {
            usernameSpan.classList.add('clickable');
            usernameSpan.addEventListener('click', () => {
                this.showWebsiteWarning(data.username, this.userWebsites.get(data.username));
            });
        }
        
        const contentSpan = document.createElement('span');
        contentSpan.className = 'message-content';
        
        if (data.deleted) {
            // Handle gibberish deletion - show the gibberish content with blur
            messageElement.classList.add('message-gibberish-deleted');
            
            // Process the gibberish content (it's already gibberish from server)
            const lineBreakContent = data.content.replace(/\n/g, '<br>');
            const processedContent = this.processEmojis(lineBreakContent);
            const markdownContent = this.processMarkdown(processedContent);
            const censoredContent = this.censorSwearWords(markdownContent);
            const mentionedContent = this.processMentions(censoredContent);
            
            contentSpan.innerHTML = mentionedContent;
            contentSpan.style.color = 'rgba(128, 128, 128, 0.8)';
            contentSpan.style.fontStyle = 'italic';
            
            // Add animation class for smooth blur transition
            setTimeout(() => {
                messageElement.classList.add('animate');
            }, 10);
        } else {
            // Check if message contains line breaks for visual separator
            const hasLineBreaks = data.content.includes('\n');
            if (hasLineBreaks) {
                contentDiv.classList.add('has-line-breaks');
            }
            
            // Process emojis, markdown, censor swear words, and process mentions
            // First replace line breaks with <br> tags for proper display
            const lineBreakContent = data.content.replace(/\n/g, '<br>');
            const processedContent = this.processEmojis(lineBreakContent);
            const markdownContent = this.processMarkdown(processedContent);
            const censoredContent = this.censorSwearWords(markdownContent);
            const mentionedContent = this.processMentions(censoredContent);
            // Use innerHTML to render emojis, markdown, mentions, and line breaks properly
            contentSpan.innerHTML = mentionedContent;
            contentSpan.style.color = data.color;
            
            // Store original color for auto-adjust feature
            contentSpan.dataset.originalColor = data.color;
            
            // Apply auto-adjust colors if enabled
            if (this.currentSettings.appearance.autoAdjustColors) {
                const backgroundColor = this.getBackgroundColorAtPosition(contentSpan);
                const readableColor = this.getReadableTextColor(backgroundColor, data.color);
                contentSpan.style.color = readableColor;
            }
            
            if (data.edited) {
                const editedIndicator = document.createElement('span');
                editedIndicator.className = 'message-edited-indicator';
                editedIndicator.textContent = ' (edited)';
                contentSpan.appendChild(editedIndicator);
            }
        }
        
        // Add click handlers for links
        const links = contentSpan.querySelectorAll('.message-link');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleLinkClick(e, link.dataset.url);
            });
        });
        
        contentDiv.appendChild(usernameSpan);
        // Add a colon and space after username
        const separator = document.createElement('span');
        separator.textContent = ' ';
        separator.style.color = 'rgba(255, 255, 255, 0.8)';
        contentDiv.appendChild(separator);
        contentDiv.appendChild(contentSpan);
        
        messageElement.appendChild(contentDiv);
        
        // Add attachments if any (but hide/replace if message is deleted)
        if (data.attachments && data.attachments.length > 0) {
            if (data.deleted) {
                const placeholder = document.createElement('div');
                placeholder.className = 'message-attachment file-deleted-placeholder';
                placeholder.innerHTML = '<em class="message-deleted">file deleted by user</em>';
                messageElement.appendChild(placeholder);
            } else {
                const attachmentsDiv = document.createElement('div');
                attachmentsDiv.className = 'message-attachments';
                
                data.attachments.forEach(attachment => {
                    let attachmentElement;
                    if (attachment.type && attachment.type.startsWith('image/') && attachment.type !== 'image/gif') {
                        // Keep DMs simple: regular image render (no tiled progressive)
                        attachmentElement = this.createImageAttachment(attachment);
                    } else {
                        attachmentElement = this.createAttachmentElement(attachment);
                    }
                    attachmentsDiv.appendChild(attachmentElement);
                });
                
                messageElement.appendChild(attachmentsDiv);
            }
        }
        
        // Add hover functionality
        this.addMessageHoverEffects(messageElement, data);
    }
    
    getDarkerColor(hexColor) {
        // Remove # if present
        const color = hexColor.replace('#', '');
        
        // Parse RGB values
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        // Make it darker (reduce by 40%)
        const newR = Math.floor(r * 0.6);
        const newG = Math.floor(g * 0.6);
        const newB = Math.floor(b * 0.6);
        
        // Convert back to hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    
    addDMNotificationHoverEffects(messageDiv, data) {
        const showHover = () => {
            let hoverControls = messageDiv.querySelector('.message-hover-controls');
            if (!hoverControls) {
                hoverControls = document.createElement('div');
                hoverControls.className = 'message-hover-controls dm-notification-controls';
                
                // Create reply button that opens DM modal
                const replyBtn = document.createElement('button');
                replyBtn.className = 'reply-btn dm-notification-reply-hover';
                replyBtn.innerHTML = '↩';
                replyBtn.title = 'Open DM with ' + data.dmSender;
                replyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openDMModal({ username: data.dmSender, color: data.dmSenderColor });
                });
                
                hoverControls.appendChild(replyBtn);
                messageDiv.appendChild(hoverControls);
            }
            hoverControls.style.opacity = '1';
        };
        
        const hideHover = () => {
            const hoverControls = messageDiv.querySelector('.message-hover-controls');
            if (hoverControls) {
                hoverControls.style.opacity = '0';
            }
        };
        
        messageDiv.addEventListener('mouseenter', showHover);
        messageDiv.addEventListener('mouseleave', hideHover);
    }
    
    loadChatHistory(messages, moreAvailable = false) {
        this.chatHistory.innerHTML = '';
        this.lastRenderedDateKey = null;
        // Don't track unread messages for initial history load
        const wasTrackingUnread = this.isWindowFocused;
        this.isWindowFocused = true; // Temporarily disable unread tracking
        
        messages.forEach(message => {
            this.displayMessage(message);
        });
        
        // Track oldest timestamp among loaded messages
        if (Array.isArray(messages) && messages.length > 0) {
            this.historyOldestTimestamp = messages[0].timestamp || this.historyOldestTimestamp;
        } else {
            this.historyOldestTimestamp = null;
        }
        this.historyMoreAvailable = false; // Fixed cap of 312 messages, no more available
        
        // Ensure we're scrolled to bottom initially
        this.scrollToBottom(true);
        
        // Restore original focus state
        this.isWindowFocused = wasTrackingUnread;
    }

    // History loader functions removed - using fixed cap of 312 messages

    async maybeLoadOlderHistory() {
        // Disabled - using fixed cap of 312 messages
        return;
    }

    // requestOlderHistory function removed - using fixed cap of 312 messages

    // prependOlderHistory function removed - using fixed cap of 312 messages

    // createMessageElementForPrepend function removed - using fixed cap of 312 messages

    // === Date separator helpers ===
    getLocalDateKeyFromTimestamp(timestamp) {
        try {
            const d = new Date(timestamp);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        } catch {
            return null;
        }
    }

    formatDateLabelFromTimestamp(timestamp) {
        try {
            const d = new Date(timestamp);
            return d.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return '';
        }
    }

    addDateSeparatorIfNeeded(timestamp) {
        const dateKey = this.getLocalDateKeyFromTimestamp(timestamp);
        if (!dateKey) return;
        if (this.lastRenderedDateKey === null) {
            // First message after a reset; set but do not insert a separator at the top
            this.lastRenderedDateKey = dateKey;
            return;
        }
        if (this.lastRenderedDateKey !== dateKey) {
            const separator = document.createElement('div');
            separator.className = 'date-separator';
            const label = document.createElement('span');
            label.className = 'date-separator-label';
            label.textContent = this.formatDateLabelFromTimestamp(timestamp);
            separator.appendChild(label);
            this.chatHistory.appendChild(separator);
            this.lastRenderedDateKey = dateKey;
        }
    }

    pruneChatHistoryByTime() {
        const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - RETENTION_MS;
        let changed = false;
        // Remove old messages and dangling separators from the top
        while (this.chatHistory.firstChild) {
            const node = this.chatHistory.firstChild;
            if (node.classList && node.classList.contains('chat-message')) {
                const ts = node.messageData && typeof node.messageData.timestamp === 'number' ? node.messageData.timestamp : null;
                if (ts !== null && ts < cutoff) {
                    const removedId = node.dataset && node.dataset.messageId;
                    if (removedId) this.messageElements.delete(removedId);
                    node.remove();
                    changed = true;
                    continue;
                }
                break; // First message is within retention
            }
            if (node.classList && node.classList.contains('date-separator')) {
                // Drop leading separators
                node.remove();
                changed = true;
                continue;
            }
            // Stop if it's another type (system message etc.)
            break;
        }
        if (changed) {
            this.recomputeLastRenderedDateKey();
        }
    }

    recomputeLastRenderedDateKey() {
        // Find the last chat message and set the date key to its day
        let node = this.chatHistory.lastElementChild;
        while (node) {
            if (node.classList && node.classList.contains('chat-message')) {
                const ts = node.messageData && typeof node.messageData.timestamp === 'number' ? node.messageData.timestamp : null;
                if (ts !== null) {
                    this.lastRenderedDateKey = this.getLocalDateKeyFromTimestamp(ts);
                }
                return;
            }
            node = node.previousElementSibling;
        }
        this.lastRenderedDateKey = null;
    }
    
    updateUserList(users, count) {
        this.onlineCount.textContent = `${count} online:`;
        
        // Get current online user IDs
        const onlineUserIds = new Set(users.map(user => user.id));
        
        // Clean up cursors for users who are no longer online
        this.cursors.forEach((cursor, userId) => {
            if (!onlineUserIds.has(userId)) {
                this.removeCursor(userId);
            }
        });

        // Get existing user tags
        const existingTags = Array.from(this.userList.querySelectorAll('.user-tag'));
        const existingUserIds = new Set(existingTags.map(tag => tag.getAttribute('data-user-id')));

        // Remove tags for users who are no longer online
        existingTags.forEach(tag => {
            const userId = tag.getAttribute('data-user-id');
            if (!onlineUserIds.has(userId)) {
                tag.remove();
            }
        });

        users.forEach(user => {
            let userTag = this.userList.querySelector(`[data-user-id="${user.id}"]`);
            
            if (!userTag) {
                // Create new user tag
                userTag = document.createElement('button');
                userTag.className = 'user-tag clickable-username';
                userTag.setAttribute('data-user-id', user.id);
                userTag.setAttribute('data-username', user.username);
                
                // Add click handler
                userTag.addEventListener('click', (event) => {
                    this.handleUsernameClick(user, event);
                });
                
                this.userList.appendChild(userTag);
            }

            // Update user tag properties
            userTag.textContent = user.username;
            userTag.style.borderColor = user.color;
            userTag.style.color = user.color;
            userTag.setAttribute('data-username', user.username);

            // Handle tabbed-out state with smooth animation
            const wasTabbed = userTag.classList.contains('tabbed-out');
            const isTabbed = user.isTabbed;

            if (isTabbed && !wasTabbed) {
                // User just tabbed out - add class with animation
                requestAnimationFrame(() => {
                    userTag.classList.add('tabbed-out');
                });
            } else if (!isTabbed && wasTabbed) {
                // User just tabbed back in - remove class with animation
                userTag.classList.remove('tabbed-out');
            }
        });
    }
    
    showSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = message;
        
        this.chatHistory.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    scrollToBottom(force = false) {
        if (force || this.autoScrollEnabled) {
            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        }
    }

    handleChatScroll() {
        const nearBottom = this.isNearBottom();
        if (nearBottom) {
            this.enableAutoScroll();
        } else {
            this.disableAutoScroll();
        }
        this.updateScrollToBottomButton(!nearBottom);
    }

    isNearBottom() {
        const threshold = 40; // px
        const { scrollTop, scrollHeight, clientHeight } = this.chatHistory;
        return scrollTop + clientHeight >= scrollHeight - threshold;
    }

    enableAutoScroll() {
        if (!this.autoScrollEnabled) {
            this.autoScrollEnabled = true;
        }
    }

    disableAutoScroll() {
        if (this.autoScrollEnabled) {
            this.autoScrollEnabled = false;
        }
    }

    updateScrollToBottomButton(show) {
        if (!this.scrollToBottomBtn) return;
        if (show) {
            this.scrollToBottomBtn.classList.remove('hidden');
        } else {
            this.scrollToBottomBtn.classList.add('hidden');
        }
    }
    
    showChatScreen() {
        this.loginScreen.classList.add('hidden');
        this.chatScreen.classList.remove('hidden');
        this.chatInput.focus();
        
        // Show all existing cursors
        this.cursors.forEach(cursor => {
            cursor.style.display = 'block';
        });
    }
    
    logout() {
        // Clear reconnection state
        this.isConnected = false;
        this.wasConnected = false;
        this.reconnectAttempts = 0;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        this.hideConnectionStatus();
        
        // Continue with existing logout logic...
        // Clear saved account
        localStorage.removeItem('chatAccount');
        
        // Close settings modal if open
        this.closeSettingsModal();
        
        // Clear unread count
        this.clearUnreadCount();
        
        // Clear spam protection state
        this.unmuteUser();
        this.messageTimestamps = [];
        
        // Clean up all cursors
        this.cursors.forEach((cursor, userId) => {
            this.removeCursor(userId);
        });
        this.cursors.clear();
        
        // Clear cursor throttle
        if (this.cursorThrottle) {
            cancelAnimationFrame(this.cursorThrottle);
            this.cursorThrottle = null;
        }
        
        // Clean up all typing timeouts
        this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
        this.typingTimeouts.clear();
        
        // Clear reply state
        this.clearReply();
        this.messageElements.clear();
        
        // Disconnect socket cleanly
        if (this.socket) {
            this.socket.close(1000, 'User logout'); // Clean close
            this.socket = null;
        }
        
        // Clear form and reset state
        this.usernameInput.value = '';
        this.colorPicker.value = '#ff6b6b';
        this.username = '';
        this.userColor = '#ff6b6b';
        this.currentUserId = null;
        this.isTyping = false;
        
        // Clear chat history display
        this.chatHistory.innerHTML = '';
        this.userList.innerHTML = '';
        this.onlineCount.textContent = '0 online:';
        
        // Show login screen
        this.chatScreen.classList.add('hidden');
        this.loginScreen.classList.remove('hidden');
        this.usernameInput.focus();
    }
    
    loadSavedSettings() {
        // Load appearance settings
        const savedAppearance = localStorage.getItem('chatAppearance');
        if (savedAppearance) {
            try {
                this.currentSettings.appearance = JSON.parse(savedAppearance);
                this.applyAppearanceSettings();
            } catch (error) {
                console.error('Error loading appearance settings:', error);
            }
        }
        
        // Load safety settings
        const savedSafety = localStorage.getItem('chatSafety');
        if (savedSafety) {
            try {
                const safetySettings = JSON.parse(savedSafety);
                // Merge with defaults to ensure all properties exist
                this.currentSettings.safety = {
                    censorSwears: safetySettings.censorSwears ?? false,
                    spoilerImages: safetySettings.spoilerImages ?? true
                };
                this.applySafetySettings();
            } catch (error) {
                console.error('Error loading safety settings:', error);
            }
        }
        
        // Auto-scroll setting now driven by scroll position; default enabled
        this.autoScrollEnabled = true;
        
        // Load notification settings
        const savedNotifications = localStorage.getItem('chatNotifications');
        if (savedNotifications) {
            try {
                const notificationSettings = JSON.parse(savedNotifications);
                this.currentSettings.notifications = {
                    pingSound: notificationSettings.pingSound ?? true
                };
                this.applyNotificationSettings();
            } catch (error) {
                console.error('Error loading notification settings:', error);
            }
        }
        
        // Initialize auto-adjust colors if enabled
        if (this.currentSettings.appearance.autoAdjustColors) {
            this.initializeAutoAdjustColors();
        }
    }
    
    openSettings() {
        // Sync settings form with current values
        this.settingsUsername.value = this.username;
        this.settingsColor.value = this.userColor;
        this.settingsWebsite.value = this.userWebsite; // Add website field
        this.gradientColor1.value = this.currentSettings.appearance.gradientColor1;
        this.gradientColor2.value = this.currentSettings.appearance.gradientColor2;
        this.autoAdjustColors.checked = this.currentSettings.appearance.autoAdjustColors;
        this.censorSwears.checked = this.currentSettings.safety.censorSwears;
        this.spoilerImages.checked = this.currentSettings.safety.spoilerImages;
        this.pingSound.checked = this.currentSettings.notifications.pingSound;
        
        // Show the modal
        this.settingsModal.classList.remove('hidden');
        
        // Focus the username input for better UX
        setTimeout(() => {
            this.settingsUsername.focus();
        }, 100);
    }
    
    closeSettingsModal() {
        this.settingsModal.classList.add('hidden');
    }
    
    switchSettingsCategory(category) {
        // Update sidebar
        this.sidebarItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.category === category) {
                item.classList.add('active');
            }
        });
        
        // Update sections
        this.settingSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === `${category}-section`) {
                section.classList.add('active');
            }
        });
    }
    
    updateUsernameRealTime() {
        const newUsername = this.settingsUsername.value.trim();
        
        if (!newUsername) {
            // Auto logout if username is completely removed
            this.logout();
            return;
        }
        
        if (newUsername.length > 24) {
            this.settingsUsername.value = newUsername.substring(0, 24);
            return;
        }
        // Do not commit locally until server confirms; just request update
        // Send update to server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'updateUser',
                username: newUsername,
                color: this.userColor
            }));
        }
    }
    
    updateColorRealTime() {
        const newColor = this.settingsColor.value;
        
        // Update color in real-time
        this.userColor = newColor;
        this.colorPicker.value = newColor;
        this.saveAccount();
        
        // Send update to server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'updateUser',
                username: this.username,
                color: newColor
            }));
        }
    }
    
    updateAppearanceRealTime() {
        this.currentSettings.appearance.gradientColor1 = this.gradientColor1.value;
        this.currentSettings.appearance.gradientColor2 = this.gradientColor2.value;
        
        this.applyAppearanceSettings();
        this.saveAppearanceSettings();
        
        // Re-adjust message colors if auto-adjust is enabled
        if (this.currentSettings.appearance.autoAdjustColors) {
            this.adjustMessageColors();
        }
    }
    
    applyAppearanceSettings() {
        const { gradientColor1, gradientColor2, autoAdjustColors } = this.currentSettings.appearance;
        
        // Update CSS custom properties for gradient
        document.body.style.background = `linear-gradient(135deg, ${gradientColor1} 0%, ${gradientColor2} 100%)`;
        
        // Update form values
        this.gradientColor1.value = gradientColor1;
        this.gradientColor2.value = gradientColor2;
        
        // Handle auto-adjust colors
        if (this.autoAdjustColors) {
            this.autoAdjustColors.checked = autoAdjustColors;
            
            if (autoAdjustColors) {
                this.initializeAutoAdjustColors();
            } else {
                // Reset message colors to original
                const messages = document.querySelectorAll('.chat-message .message-content');
                messages.forEach(messageElement => {
                    messageElement.style.color = '';
                });
            }
        }
    }
    
    saveAppearanceSettings() {
        localStorage.setItem('chatAppearance', JSON.stringify(this.currentSettings.appearance));
    }
    
    resetAppearanceSettings() {
        this.currentSettings.appearance = {
            gradientColor1: '#1a1a2e',
            gradientColor2: '#0f3460',
            autoAdjustColors: true
        };
        
        this.applyAppearanceSettings();
        this.saveAppearanceSettings();
        
        // Update the checkbox
        this.autoAdjustColors.checked = true;
        
        // Re-initialize auto-adjust colors
        this.initializeAutoAdjustColors();
    }
    
    updateSafetySettings() {
        this.currentSettings.safety.censorSwears = this.censorSwears.checked;
        this.currentSettings.safety.spoilerImages = this.spoilerImages.checked;
        
        // Save to localStorage immediately
        this.saveSafetySettings();
        
        console.log('Safety settings updated:', this.currentSettings.safety);
    }
    
    applySafetySettings() {
        this.censorSwears.checked = this.currentSettings.safety.censorSwears;
        this.spoilerImages.checked = this.currentSettings.safety.spoilerImages;
    }
    
    saveSafetySettings() {
        localStorage.setItem('chatSafety', JSON.stringify(this.currentSettings.safety));
    }
    
    updateNotificationSettings() {
        this.currentSettings.notifications.pingSound = this.pingSound.checked;
        
        // Save to localStorage immediately
        this.saveNotificationSettings();
        
        console.log('Notification settings updated:', this.currentSettings.notifications);
    }
    
    applyNotificationSettings() {
        this.pingSound.checked = this.currentSettings.notifications.pingSound;
    }
    
    saveNotificationSettings() {
        localStorage.setItem('chatNotifications', JSON.stringify(this.currentSettings.notifications));
    }
    
    updateAccount() {
        const newUsername = this.settingsUsername.value.trim();
        const newColor = this.settingsColor.value;
        const newWebsite = this.settingsWebsite.value.trim();
        
        if (!newUsername) {
            alert('Please enter a valid username');
            return;
        }
        
        // Validate website URL if provided
        if (newWebsite && !this.isValidUrl(newWebsite)) {
            alert('Please enter a valid website URL (e.g., https://example.com)');
            return;
        }
        // Commit color and website locally; defer username until server confirms
        this.userColor = newColor;
        this.userWebsite = newWebsite;
        this.colorPicker.value = newColor;
        
        // Send update to server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'updateUser',
                username: newUsername,
                color: newColor,
                website: newWebsite
            }));
        }
    }

    handleMouseMove(e) {
        // Only track cursor when in chat and connected (not in preview mode)
        if (this.loginScreen.classList.contains('hidden') && 
            !this.isPreviewMode &&
            this.socket && 
            this.socket.readyState === WebSocket.OPEN) {
            
            // Store current mouse position for interpolation
            this.currentMouseX = e.clientX;
            this.currentMouseY = e.clientY;
            
            // Use requestAnimationFrame for consistent timing across all devices
            if (this.cursorThrottle) {
                return; // Skip if already scheduled
            }
            
            this.cursorThrottle = requestAnimationFrame(() => {
                // Reset throttle flag
                this.cursorThrottle = null;
                
                // Get the main content area (chatScreen) bounds
                const chatScreen = this.chatScreen;
                const rect = chatScreen.getBoundingClientRect();
                
                // Calculate relative position within the content area as percentages
                const relativeX = ((this.currentMouseX - rect.left) / rect.width) * 100;
                const relativeY = ((this.currentMouseY - rect.top) / rect.height) * 100;
                
                // Calculate velocity for prediction (if we have previous position)
                let velocityX = 0;
                let velocityY = 0;
                const now = Date.now();
                
                if (this.lastCursorTime && this.lastCursorX !== undefined) {
                    const timeDelta = now - this.lastCursorTime;
                    if (timeDelta > 0) {
                        velocityX = (relativeX - this.lastCursorX) / timeDelta * 16; // Normalize to 16ms
                        velocityY = (relativeY - this.lastCursorY) / timeDelta * 16;
                    }
                }
                
                // Store for next calculation
                this.lastCursorX = relativeX;
                this.lastCursorY = relativeY;
                this.lastCursorTime = now;
                
                // Only send if cursor is within the content area bounds
                if (relativeX >= 0 && relativeX <= 100 && relativeY >= 0 && relativeY <= 100) {
                    this.socket.send(JSON.stringify({
                        type: 'cursor',
                        x: relativeX,
                        y: relativeY,
                        velocityX: velocityX,
                        velocityY: velocityY,
                        timestamp: now,
                        highFrequency: true // Flag for ultra-smooth mode
                    }));
                }
            });
        }
    }

    updateCursor(data) {
        const cursorId = `cursor-${data.userId}`;
        let cursor = document.getElementById(cursorId);
        
        // Convert relative percentages to absolute positions within the content area
        const chatScreen = this.chatScreen;
        const rect = chatScreen.getBoundingClientRect();
        const absoluteX = rect.left + (data.x / 100) * rect.width;
        const absoluteY = rect.top + (data.y / 100) * rect.height;
        
        if (!cursor) {
            // Create new cursor with enhanced structure
            cursor = document.createElement('div');
            cursor.id = cursorId;
            cursor.className = 'user-cursor';
            
            const cursorDot = document.createElement('div');
            cursorDot.className = 'cursor-dot';
            cursorDot.style.backgroundColor = data.color;
            
            const cursorLabel = document.createElement('div');
            cursorLabel.className = 'cursor-label';
            cursorLabel.textContent = data.username;
            cursorLabel.style.backgroundColor = data.color;
            
            cursor.appendChild(cursorDot);
            cursor.appendChild(cursorLabel);
            document.body.appendChild(cursor);
            
            // Initially hide cursor if on login screen
            if (!this.loginScreen.classList.contains('hidden')) {
                cursor.style.display = 'none';
            }
            
            // Initialize cursor data with enhanced tracking
            cursor.dataset.currentX = absoluteX;
            cursor.dataset.currentY = absoluteY;
            cursor.dataset.targetX = absoluteX;
            cursor.dataset.targetY = absoluteY;
            cursor.dataset.velocityX = 0;
            cursor.dataset.velocityY = 0;
            cursor.dataset.relativeX = data.x;
            cursor.dataset.relativeY = data.y;
            cursor.dataset.lastUpdate = Date.now();
            
            // Start ultra-smooth interpolation loop
            this.startCursorInterpolation(cursor, data.userId);
            
            this.cursors.set(data.userId, cursor);
        }
        
        // Store the relative coordinates for resize handling
        cursor.dataset.relativeX = data.x;
        cursor.dataset.relativeY = data.y;
        
        // Get current interpolated position
        const currentX = parseFloat(cursor.dataset.currentX) || absoluteX;
        const currentY = parseFloat(cursor.dataset.currentY) || absoluteY;
        const lastUpdate = parseInt(cursor.dataset.lastUpdate) || Date.now();
        const timeDelta = Date.now() - lastUpdate;
        
        // Apply prediction based on velocity for ultra-responsiveness
        let predictedX = absoluteX;
        let predictedY = absoluteY;
        
        if (data.velocityX !== undefined && data.velocityY !== undefined && timeDelta > 0) {
            // Predict where the cursor will be based on network latency and velocity
            const latencyCompensation = Math.min(timeDelta, 100); // Cap at 100ms
            predictedX = absoluteX + (data.velocityX * latencyCompensation * 0.5);
            predictedY = absoluteY + (data.velocityY * latencyCompensation * 0.5);
        }
        
        // Update target position with prediction
        cursor.dataset.targetX = predictedX;
        cursor.dataset.targetY = predictedY;
        cursor.dataset.velocityX = data.velocityX || 0;
        cursor.dataset.velocityY = data.velocityY || 0;
        cursor.dataset.lastUpdate = Date.now();
        
        // Calculate movement characteristics for enhanced effects
        const deltaX = Math.abs(predictedX - currentX);
        const deltaY = Math.abs(predictedY - currentY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const speed = timeDelta > 0 ? distance / timeDelta : 0;
        
        // Enhanced motion blur with ultra-smooth thresholds
        if (speed > 0.3) {
            cursor.classList.add('moving');
            
            // Ultra-smooth blur with velocity-based intensity
            const blurIntensity = Math.min(speed * 0.3, 1.5);
            cursor.style.filter = `blur(${blurIntensity}px)`;
            
            // Clear previous timeout and set new one
            clearTimeout(cursor.blurTimeout);
            cursor.blurTimeout = setTimeout(() => {
                cursor.classList.remove('moving');
                cursor.style.filter = '';
            }, 80);
        }
        
        // Enhanced typing indicator
        if (data.isTyping) {
            const existingTimeout = this.typingTimeouts.get(data.userId);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }
            
            cursor.classList.add('typing');
            
            const timeout = setTimeout(() => {
                cursor.classList.remove('typing');
                this.typingTimeouts.delete(data.userId);
            }, 1200);
            
            this.typingTimeouts.set(data.userId, timeout);
        } else {
            const existingTimeout = this.typingTimeouts.get(data.userId);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
                this.typingTimeouts.delete(data.userId);
            }
            cursor.classList.remove('typing'); // nig
        }
        
        // Update cursor info with enhanced smooth transitions
        const label = cursor.querySelector('.cursor-label');
        const dot = cursor.querySelector('.cursor-dot');
        
        if (label.textContent !== data.username) {
            label.style.transition = 'all 0.2s cubic-bezier(0.23, 1, 0.32, 1)';
            label.textContent = data.username;
        }
        
        if (dot.style.backgroundColor !== data.color) {
            dot.style.transition = 'background-color 0.2s cubic-bezier(0.23, 1, 0.32, 1)';
            label.style.transition = 'background-color 0.2s cubic-bezier(0.23, 1, 0.32, 1)';
            dot.style.backgroundColor = data.color;
            label.style.backgroundColor = data.color;
        }
        
        // Enhanced fade system with smoother timing
        cursor.classList.remove('fading');
        clearTimeout(cursor.fadeTimeout);
        cursor.fadeTimeout = setTimeout(() => {
            cursor.classList.add('fading');
        }, 2000);
    }

    removeCursor(userId) {
        const cursor = this.cursors.get(userId);
        if (cursor) {
            cursor.remove();
            this.cursors.delete(userId);
        }
        
        // Clean up typing timeout
        const typingTimeout = this.typingTimeouts.get(userId);
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            this.typingTimeouts.delete(userId);
        }
    }

    addMessageHoverEffects(messageDiv, data) {
        let hoverElements = null;
        let hoverTimeout = null;
        let isHovering = false;
        
        // Store the message data directly on the element for easy access
        messageDiv.messageData = data;
        
        const showHover = () => {
            if (hoverElements) return; // Already showing
            
            // Don't show hover effects for deleted messages (both old and new gibberish system)
            if (messageDiv.classList.contains('message-deleted') || messageDiv.classList.contains('message-gibberish-deleted')) {
                return;
            }
            
            hoverElements = document.createElement('div');
            hoverElements.className = 'message-hover-controls';
            
            const timestamp = new Date(data.timestamp).toLocaleTimeString();
            const isOwnMessage = data.username === this.username;
            
            if (isOwnMessage) {
                // Show three-dot menu for own messages
                hoverElements.innerHTML = `
                    <button class="menu-btn" title="Message options">⋮</button>
                    <span class="message-timestamp">${timestamp}</span>
                `;
                
                const menuBtn = hoverElements.querySelector('.menu-btn');
                
                menuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    this.showMessageModal(data, messageDiv);
                });
            } else {
                // Show reply button for other messages
                hoverElements.innerHTML = `
                    <button class="reply-btn" title="Reply to this message">↺</button>
                    <span class="message-timestamp">${timestamp}</span>
                `;
                
                const replyBtn = hoverElements.querySelector('.reply-btn');
                
                replyBtn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.startReply(data);
                });
                
                replyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.startReply(data);
                });
            }
            
            messageDiv.appendChild(hoverElements);
        };
        
        const showQuickDelete = () => {
            if (hoverElements) {
                hoverElements.remove();
                hoverElements = null;
            }
            
            // Don't show quick delete for deleted messages
            if (messageDiv.classList.contains('message-deleted') || messageDiv.classList.contains('message-gibberish-deleted')) {
                return;
            }
            
            const isOwnMessage = data.username === this.username;
            if (!isOwnMessage) return; // Only show for own messages
            
            hoverElements = document.createElement('div');
            hoverElements.className = 'message-hover-controls quick-delete';
            
            hoverElements.innerHTML = `
                <button class="quick-delete-btn" title="Quick delete (Shift + hover)">🗑️</button>
                <span class="message-timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span>
            `;
            
            const deleteBtn = hoverElements.querySelector('.quick-delete-btn');
            
                    deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Quick delete without confirmation
            this.quickDeleteMessage(data, messageDiv);
        });
            
            messageDiv.appendChild(hoverElements);
        };
        
        const hideHover = () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
            hoverTimeout = setTimeout(() => {
                if (hoverElements) {
                    hoverElements.remove();
                    hoverElements = null;
                }
            }, 100); // Small delay to prevent flickering
        };
        
        messageDiv.addEventListener('mouseenter', (e) => {
            isHovering = true;
            // Check if Shift is held
            if (e.shiftKey) {
                showQuickDelete();
            } else {
                showHover();
            }
        });
        
        messageDiv.addEventListener('mouseleave', () => {
            isHovering = false;
            hideHover();
        });
        
        // Keep hover when mouse is over the controls
        messageDiv.addEventListener('mouseover', (e) => {
            if (e.target.closest('.message-hover-controls')) {
                if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                }
            }
        });
    }

    showMessageModal(data, messageDiv) {
        // Don't show modal for deleted messages (both old and new gibberish system)
        if (messageDiv.classList.contains('message-deleted') || messageDiv.classList.contains('message-gibberish-deleted')) {
            return;
        }
        
        // Remove any existing modal
        this.closeMessageModal();
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'message-menu-modal';
        modal.id = 'messageMenuModal';
        
        modal.innerHTML = `
            <div class="message-menu-content">
                <div class="message-menu-header">
                    <h3 class="message-menu-title">Message Options</h3>
                    <p class="message-menu-subtitle">Sent by ${data.username}</p>
                </div>
                <div class="message-menu-actions">
                    <button class="menu-modal-item reply" data-action="reply">
                        <span class="menu-modal-item-icon">↺</span>
                        <span class="menu-modal-item-text">Reply</span>
                    </button>
                    <button class="menu-modal-item edit" data-action="edit">
                        <span class="menu-modal-item-icon">✏️</span>
                        <span class="menu-modal-item-text">Edit</span>
                    </button>
                    <button class="menu-modal-item delete" data-action="delete">
                        <span class="menu-modal-item-icon">🗑️</span>
                        <span class="menu-modal-item-text">Delete</span>
                    </button>
                </div>
                <div class="message-menu-cancel">
                    <button class="cancel-modal-btn">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                this.handleMessageAction(action, data, messageDiv);
                this.closeMessageModal();
            } else if (e.target.closest('.cancel-modal-btn') || e.target === modal) {
                this.closeMessageModal();
            }
        });
        
        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeMessageModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    closeMessageModal() {
        const modal = document.getElementById('messageMenuModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    closeAllDropdowns() {
        // This method is no longer needed for dropdowns, but we'll keep it for compatibility
        // and use it to close the modal instead
        this.closeMessageModal();
        
        // Close user action dropdown if it's open
        if (this.userActionDropdown && this.userActionDropdown.isOpen()) {
            this.userActionDropdown.hide();
        }
    }

    startReply(messageData) {
        console.log('Starting reply to:', messageData.username);
        if (!messageData || !messageData.id) {
            console.error('Invalid message data for reply');
            return;
        }
        // Refresh with latest message data from DOM map to avoid stale content after edits
        const latestElement = this.messageElements.get(messageData.id);
        if (latestElement && latestElement.messageData) {
            messageData = latestElement.messageData;
        }
        this.replyingTo = messageData;
        this.showReplyUI();
        this.chatInput.focus();
    }

    showReplyUI() {
        if (!this.replyingTo) {
            console.error('No message to reply to');
            return;
        }
        
        // Store the reply data locally before any operations
        const replyData = this.replyingTo;
        
        // Remove existing reply container if any
        this.clearReply();
        
        // Restore the reply data after clearing
        this.replyingTo = replyData;
        
        this.replyContainer = document.createElement('div');
        this.replyContainer.className = 'reply-container';
        
        this.replyContainer.innerHTML = `
            <div class="reply-preview">
                <div class="reply-header">
                    <span class="reply-to-text">Replying to <strong>${replyData.username}</strong></span>
                    <button class="cancel-reply-btn" title="Cancel reply">×</button>
                </div>
                <div class="reply-message-preview" data-jump-id="${replyData.id}">
                    ${this.censorSwearWords(replyData.content)}
                </div>
            </div>
        `;
        
        // Append to body instead of inserting before chat input
        document.body.appendChild(this.replyContainer);
        
        // Add event listeners
        const cancelBtn = this.replyContainer.querySelector('.cancel-reply-btn');
        const previewDiv = this.replyContainer.querySelector('.reply-message-preview');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.clearReply();
            });
        }
        
        if (previewDiv) {
            previewDiv.addEventListener('click', () => {
                this.jumpToMessage(replyData.id);
            });
        }
    }

    clearReply() {
        this.replyingTo = null;
        if (this.replyContainer) {
            this.replyContainer.remove();
            this.replyContainer = null;
        }
    }

    jumpToMessage(messageId) {
        const messageElement = this.messageElements.get(messageId);
        if (messageElement) {
            messageElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Add highlight effect
            messageElement.classList.add('jumped-to');
            setTimeout(() => {
                messageElement.classList.remove('jumped-to');
            }, 2000);
        }
    }

    handleMessageAction(action, data, messageDiv) {
        console.log('🔧 handleMessageAction called:', { action, data, messageDiv });
        console.log('🔧 Message ID:', data.id);
        console.log('🔧 Username:', data.username);
        console.log('🔧 Current user:', this.username);
        
        // Prevent actions on deleted messages (both old and new gibberish system)
        if (messageDiv.classList.contains('message-deleted') || messageDiv.classList.contains('message-gibberish-deleted')) {
            console.log('🔧 Attempted action on deleted message, ignoring');
            return;
        }
        
        switch (action) {
            case 'reply':
                this.startReply(data);
                break;
            case 'edit':
                this.startEditMessage(data, messageDiv);
                break;
            case 'delete':
                this.deleteMessage(data, messageDiv);
                break;
        }
    }
    
    startEditMessage(data, messageDiv) {
        console.log('🔧 startEditMessage called:', { data, messageDiv });
        
        // Don't allow editing if already in edit mode
        if (messageDiv.querySelector('.message-edit-container')) {
            return;
        }
        
        const contentSpan = messageDiv.querySelector('.message-content');
        const originalContent = data.content;
        
        console.log('🔧 Original content:', originalContent);
        
        // Create edit container
        const editContainer = document.createElement('div');
        editContainer.className = 'message-edit-container';
        
        editContainer.innerHTML = `
            <textarea class="message-edit-input" placeholder="Edit your message...">${originalContent}</textarea>
            <div class="message-edit-buttons">
                <button class="edit-cancel-btn">Cancel</button>
                <button class="edit-update-btn">Update</button>
            </div>
        `;
        
        // Insert edit container after the main message content
        const messageMain = messageDiv.querySelector('.message-main');
        messageMain.appendChild(editContainer);
        
        // Focus the textarea and select all text
        const textarea = editContainer.querySelector('.message-edit-input');
        textarea.focus();
        textarea.select();
        
        // Handle button clicks
        const cancelBtn = editContainer.querySelector('.edit-cancel-btn');
        const updateBtn = editContainer.querySelector('.edit-update-btn');
        
        cancelBtn.addEventListener('click', () => {
            editContainer.remove();
        });
        
        updateBtn.addEventListener('click', () => {
            const newContent = textarea.value.trim();
            console.log('🔧 Update clicked, new content:', newContent);
            console.log('🔧 Original content:', originalContent);
            console.log('🔧 Message ID for update:', data.id);
            
            if (newContent && newContent !== originalContent) {
                this.updateMessage(data.id, newContent, messageDiv);
            } else {
                console.log('🔧 No changes to update');
            }
            editContainer.remove();
        });
        
        // Handle Enter key to update, Escape to cancel
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                updateBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelBtn.click();
            }
        });
    }
    
    updateMessage(messageId, newContent, messageDiv) {
        console.log('🔧 updateMessage called:', { messageId, newContent });
        console.log('🔧 Socket state:', this.socket?.readyState);
        console.log('🔧 WebSocket.OPEN:', WebSocket.OPEN);
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = {
                type: 'editMessage',
                messageId: messageId,
                newContent: newContent
            };
            console.log('🔧 Sending edit message:', message);
            this.socket.send(JSON.stringify(message));
        } else {
            console.error('🔧 Socket not ready or not connected');
        }
    }
    
    deleteMessage(data, messageDiv) {
        console.log('🔧 deleteMessage called:', { data, messageDiv });
        console.log('🔧 Message ID for delete:', data.id);
        
        if (confirm('Are you sure you want to delete this message?')) {
            console.log('🔧 User confirmed deletion');
            console.log('🔧 Socket state:', this.socket?.readyState);
            
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'deleteMessage',
                    messageId: data.id
                };
                console.log('🔧 Sending delete message:', message);
                this.socket.send(JSON.stringify(message));
            } else {
                console.error('🔧 Socket not ready or not connected');
            }
        } else {
            console.log('🔧 User cancelled deletion');
        }
    }

    quickDeleteMessage(data, messageDiv) {
        console.log('🔧 quickDeleteMessage called:', { data, messageDiv });
        console.log('🔧 Message ID for quick delete:', data.id);
        
        // Quick delete without confirmation
        console.log('🔧 Quick deleting message');
        console.log('🔧 Socket state:', this.socket?.readyState);
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = {
                type: 'deleteMessage',
                messageId: data.id
            };
            console.log('🔧 Sending quick delete message:', message);
            this.socket.send(JSON.stringify(message));
        } else {
            console.error('🔧 Socket not ready or not connected');
        }
    }

    handleMessageEdited(data) {
        console.log('🔧 handleMessageEdited called:', data);
        // Find the message element by its ID
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        console.log('🔧 Found message element:', messageElement);
        if (messageElement) {
            const contentSpan = messageElement.querySelector('.message-content');
            console.log('🔧 Found content span:', contentSpan);
            if (contentSpan) {
                // Process emojis first, then censor swear words
                const processedContent = this.processEmojis(data.newContent);
                const censoredContent = this.censorSwearWords(processedContent);
                // Use innerHTML to render emojis properly, but escape HTML first for security
                contentSpan.innerHTML = this.escapeHtml(censoredContent);
                
                // Apply auto-adjust colors if enabled
                if (this.currentSettings.appearance.autoAdjustColors) {
                    const backgroundColor = this.getBackgroundColorAtPosition(contentSpan);
                    const readableColor = this.getReadableTextColor(backgroundColor, messageElement.messageData?.color);
                    contentSpan.style.color = readableColor;
                }
                
                // Add edited indicator if not already present
                if (!messageElement.querySelector('.message-edited-indicator')) {
                    const editedIndicator = document.createElement('span');
                    editedIndicator.className = 'message-edited-indicator';
                    editedIndicator.textContent = ' (edited)';
                    contentSpan.appendChild(editedIndicator);
                    console.log('🔧 Added edited indicator');
                }
                
                // Keep the element's bound data in sync so replies use latest content
                if (!messageElement.messageData) {
                    messageElement.messageData = {};
                }
                messageElement.messageData.content = data.newContent;
                messageElement.messageData.edited = true;
                messageElement.messageData.editedAt = Date.now();
                
                // If the currently open reply is targeting this message, update the preview
                if (this.replyingTo && this.replyingTo.id === data.messageId && this.replyContainer) {
                    const preview = this.replyContainer.querySelector('.reply-message-preview');
                    if (preview) {
                        preview.innerHTML = this.censorSwearWords(data.newContent);
                    }
                    // Also update the stored reply data reference
                    this.replyingTo = messageElement.messageData;
                }
                
                // Update any inline reply previews that reference this message
                const inlineReplyPreviews = document.querySelectorAll(`.reply-content[data-reply-to-id="${data.messageId}"] .reply-text`);
                inlineReplyPreviews.forEach(span => {
                    const processed = this.processEmojis(data.newContent);
                    const censored = this.censorSwearWords(processed);
                    const plainLength = censored.replace(/<[^>]*>/g, '').length;
                    const truncated = plainLength > 50 ? censored.substring(0, 50) + '...' : censored;
                    const mentioned = this.processMentions(truncated);
                    span.innerHTML = mentioned;
                });
                console.log('🔧 Message content updated to:', censoredContent);
            }
        }
    }

    handleMessageDeleted(data) {
        console.log('🔧 handleMessageDeleted called:', data);
        // Find the message element by its ID
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        console.log('🔧 Found message element:', messageElement);
        if (messageElement) {
            const contentSpan = messageElement.querySelector('.message-content');
            console.log('🔧 Found content span:', contentSpan);
            if (contentSpan) {
                // The server now sends the gibberish content directly
                // Process the gibberish content for display
                const lineBreakContent = data.content.replace(/\n/g, '<br>');
                const processedContent = this.processEmojis(lineBreakContent);
                const markdownContent = this.processMarkdown(processedContent);
                const censoredContent = this.censorSwearWords(markdownContent);
                const mentionedContent = this.processMentions(censoredContent);
                
                contentSpan.innerHTML = mentionedContent;
                contentSpan.style.color = 'rgba(128, 128, 128, 0.8)';
                contentSpan.style.fontStyle = 'italic';
                
                // Mark the entire message as gibberish deleted
                messageElement.classList.add('message-gibberish-deleted');
                
                // Add animation class for smooth blur transition
                setTimeout(() => {
                    messageElement.classList.add('animate');
                }, 10);
                
                // Remove attachments if present and show a placeholder to indicate removal
                const attachmentsDiv = messageElement.querySelector('.message-attachments');
                if (attachmentsDiv) {
                    attachmentsDiv.remove();
                    const placeholder = document.createElement('div');
                    placeholder.className = 'message-attachment file-deleted-placeholder';
                    placeholder.innerHTML = '<em class="message-deleted">file deleted by user</em>';
                    messageElement.appendChild(placeholder);
                }
                
                // Remove any existing hover controls
                const hoverControls = messageElement.querySelector('.message-hover-controls');
                if (hoverControls) {
                    hoverControls.remove();
                    console.log('🔧 Removed hover controls');
                }
                
                // Remove any existing edit containers
                const editContainer = messageElement.querySelector('.message-edit-container');
                if (editContainer) {
                    editContainer.remove();
                    console.log('🔧 Removed edit container');
                }
                
                // Sync element data so future actions treat it as deleted
                if (!messageElement.messageData) {
                    messageElement.messageData = {};
                }
                messageElement.messageData.deleted = true;
                messageElement.messageData.content = data.content; // Store the gibberish content
                
                // Close any open modals for this message
                this.closeMessageModal();
                
                console.log('🔧 Message marked as gibberish deleted');
            }
        }
    }

    // File Upload Methods
    handleFileSelection(files) {
        if (files.length === 0) return;
        
        const filesArray = Array.from(files);
        
        // immediately upload each file and generate IDs
        filesArray.forEach(file => {
            this.uploadAndGenerateID(file);
        });
        
        // Also clear file input value here (for drop/paste safety not needed, but harmless)
        if (this.fileInput) this.fileInput.value = '';
    }

    async uploadAndGenerateID(file) {
        // Per-file inline progress + cancel support
        // Create a tag immediately with progress + X
        const tempId = Math.random().toString(36).substr(2, 8);
        const container = this.attachmentPreview;
        if (container) container.classList.remove('hidden');
        const tag = document.createElement('div');
        tag.className = 'inline-attachment-tag';
        tag.setAttribute('data-attachment-id', tempId);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = this.truncateFilename(file.name, 24);
        const progressWrap = document.createElement('div');
        progressWrap.className = 'file-progress';
        const progressBar = document.createElement('div');
        progressBar.className = 'bar';
        progressWrap.appendChild(progressBar);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.title = 'Remove';
        removeBtn.textContent = '✕';
        tag.appendChild(nameSpan);
        tag.appendChild(progressWrap);
        tag.appendChild(removeBtn);
        if (container) container.appendChild(tag);

        // Allow cancel by aborting the XHR
        const xhr = new XMLHttpRequest();
        const onRemove = () => {
            try { xhr.abort(); } catch {}
            tag.remove();
            // Clean pending set for this tempId if any
            if (this.pendingAttachmentIds) this.pendingAttachmentIds.delete(tempId);
            if (container && container.children.length === 0) container.classList.add('hidden');
        };
        removeBtn.addEventListener('click', onRemove);

        try {
            const formData = new FormData();
            formData.append('files', file);
            
            // Check duplicate by filename and prompt user
            try {
                const dupResp = await fetch(`/files/exists?name=${encodeURIComponent(file.name)}`);
                if (dupResp.ok) {
                    const dup = await dupResp.json();
                    if (dup.exists && dup.file && dup.file.url) {
                        const choice = await this.showDuplicateFileModal(dup.file, file);
                        if (choice === 'existing') {
                            const fileID = Math.random().toString(36).substr(2, 8);
                            window.attachmentRegistry = window.attachmentRegistry || new Map();
                            window.attachmentRegistry.set(fileID, {
                                originalName: dup.file.originalName,
                                filename: dup.file.filename,
                                size: dup.file.size,
                                type: dup.file.type || this.inferMimeFromName(dup.file.filename || dup.file.originalName),
                                url: dup.file.url
                            });
                            // Convert temp tag to final tag without uploading
                            tag.setAttribute('data-attachment-id', fileID);
                            nameSpan.textContent = this.truncateFilename(dup.file.originalName, 24);
                            progressWrap.remove();
                            // Update remove button to remove the final id from pending set
                            removeBtn.removeEventListener('click', onRemove);
                            removeBtn.addEventListener('click', () => {
                                this.pendingAttachmentIds.delete(fileID);
                                tag.remove();
                                if (container && container.children.length === 0) container.classList.add('hidden');
                            }, { once: true });
                            this.pendingAttachmentIds.add(fileID);
                            // focus input and return without uploading
                            const chatInput = document.getElementById('chatInput');
                            chatInput.focus();
                            return;
                        }
                        // else continue with upload (server will suffix to avoid collision)
                    }
                }
            } catch (e) {
                console.warn('duplicate check failed', e);
            }
            
            const uploadedFile = await new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const pct = Math.max(0, Math.min(1, e.loaded / Math.max(1, e.total)));
                        progressBar.style.width = (pct * 100) + '%';
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response.files[0]); // get first file from response
        } catch (error) {
                            reject(new Error('Invalid server response'));
                        }
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                });
                
                xhr.addEventListener('error', () => reject(new Error('Upload failed')));
                xhr.addEventListener('timeout', () => reject(new Error('Upload timeout')));
                
                xhr.timeout = 30000;
                xhr.open('POST', '/upload');
                xhr.send(formData);
            });
            
            // generate unique ID and store file
            const fileID = Math.random().toString(36).substr(2, 8);
            
            // initialize global registry if it doesn't exist
            if (!window.attachmentRegistry) {
                window.attachmentRegistry = new Map();
            }
            
            // store the uploaded file data with the ID
            window.attachmentRegistry.set(fileID, uploadedFile);
            
            // convert the temp tag into a final tag: reset progress, keep X
            tag.setAttribute('data-attachment-id', fileID);
            nameSpan.textContent = this.truncateFilename(uploadedFile.originalName || uploadedFile.filename || file.name, 24);
            progressBar.style.width = '100%';
            // After brief delay, hide progress bar but keep the tag
            setTimeout(() => {
                if (progressWrap && progressWrap.parentElement) {
                    progressWrap.remove();
                }
            }, 400);
            // Update remove button to remove the final id from pending set
            removeBtn.removeEventListener('click', onRemove);
            removeBtn.addEventListener('click', () => {
                this.pendingAttachmentIds.delete(fileID);
                tag.remove();
                if (container && container.children.length === 0) container.classList.add('hidden');
            }, { once: true });
            // Add to pending attachments so it gets sent with the next message
            this.pendingAttachmentIds.add(fileID);

            // keep UX snappy: focus input, don't inject raw $id$ tokens
            const chatInput = document.getElementById('chatInput');
            chatInput.focus();
            
        } catch (error) {
            console.error('Upload failed:', error);
            // On failure, mark bar red and leave X to remove
            progressBar.style.background = 'linear-gradient(90deg, #ff4d4d, #ff7777)';
        }
    }

    handlePaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;

        const files = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
            }
        }

        if (files.length > 0) {
            this.handleFileSelection(files);
        }
    }

    updateAttachmentPreview() {
        // no longer needed - files are uploaded immediately
            return;
    }

    createAttachmentList() {
        // no longer needed - files are uploaded immediately
        return;
    }

    clearAttachments() {
        // no longer needed - files are uploaded immediately
        return;
    }

    removeAttachment(index) {
        // no longer needed - files are uploaded immediately
        return;
    }

    getFileIconByType(type) {
        if (!type) return '?';
        
        const lowerType = type.toLowerCase();
        
        // Images
        if (lowerType.startsWith('image/')) {
            if (lowerType === 'image/gif') return '🎬'; // Special icon for GIFs
            return '🖼️';
        }
        
        // Videos
        if (lowerType.startsWith('video/')) return '🎥';
        
        // Audio
        if (lowerType.startsWith('audio/')) return '🎵';
        
        // Documents
        if (lowerType.includes('pdf')) return '📄';
        if (lowerType.includes('word') || lowerType.includes('doc')) return '📝';
        if (lowerType.includes('excel') || lowerType.includes('sheet')) return '📊';
        if (lowerType.includes('powerpoint') || lowerType.includes('presentation')) return '📈';
        
        // Text files
        if (lowerType.includes('text') || lowerType.includes('txt')) return '📝';
        if (lowerType.includes('rtf')) return '📝';
        
        // Code files
        if (lowerType.includes('javascript') || lowerType.includes('json')) return '⚡';
        if (lowerType.includes('html') || lowerType.includes('xml')) return '🌐';
        if (lowerType.includes('css')) return '🎨';
        if (lowerType.includes('python')) return '🐍';
        if (lowerType.includes('java')) return '☕';
        
        // Archives
        if (lowerType.includes('zip') || lowerType.includes('rar') || 
            lowerType.includes('7z') || lowerType.includes('tar') || 
            lowerType.includes('gz')) return '📦';
        
        // Executables
        if (lowerType.includes('exe') || lowerType.includes('msi') || 
            lowerType.includes('dmg') || lowerType.includes('app')) return '⚙️';
        
        // Fonts
        if (lowerType.includes('font') || lowerType.includes('ttf') || 
            lowerType.includes('otf') || lowerType.includes('woff')) return '🔤';
        
        // Unknown/unrecognized file type
        return '?';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    async uploadFiles() {
        // no longer needed - files are uploaded individually
        return [];
    }

    showUploadProgress() {
        this.uploadProgress.classList.remove('hidden');
    }

    hideUploadProgress() {
        this.uploadProgress.classList.add('hidden');
    }

    updateUploadProgress(percentage, text) {
        const progressFill = this.uploadProgress.querySelector('.progress-fill');
        const progressText = this.uploadProgress.querySelector('.progress-text');
        
        progressFill.style.width = (percentage * 100) + '%';
        progressText.textContent = text;
    }

    // Inline attachment tags (for global chat input UI)
    showInlineAttachmentTag(id, originalName) {
        const container = this.attachmentPreview;
        if (!container) return;
        container.classList.remove('hidden');
        const tag = document.createElement('div');
        tag.className = 'inline-attachment-tag';
        tag.setAttribute('data-attachment-id', id);
        tag.textContent = this.truncateFilename(originalName, 24);
        // Make tag clickable to insert by filename reference in input
        tag.style.cursor = 'pointer';
        tag.title = 'Click to insert filename';
        tag.addEventListener('click', () => {
            const input = this.chatInput;
            if (!input) return;
            const toInsert = originalName;
            const current = input.value;
            input.value = current ? current + ' ' + toInsert : toInsert;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        });
        container.appendChild(tag);
    }

    removeInlineAttachmentTag(id) {
        const container = this.attachmentPreview;
        if (!container) return;
        const tag = container.querySelector(`[data-attachment-id="${id}"]`);
        if (tag) tag.remove();
        if (container.children.length === 0) {
            container.classList.add('hidden');
        }
    }

    truncateFilename(name, maxLen = 24) {
        if (!name) return '';
        if (name.length <= maxLen) return name;
        const dotIndex = name.lastIndexOf('.');
        const ext = dotIndex > 0 ? name.slice(dotIndex) : '';
        const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
        const keep = Math.max(4, maxLen - ext.length - 3);
        return base.slice(0, keep) + '…' + ext;
    }

    async showDuplicateFileModal(existingFile, incomingFile) {
        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.className = 'file-viewer-modal show';
            modal.innerHTML = `
                <div class="file-viewer-content">
                    <div class="file-viewer-header">
                        <div class="file-viewer-title">
                            <h3>File already exists</h3>
                            <div class="file-viewer-size">${this.escapeHtml(existingFile.originalName)} · ${this.formatFileSize(existingFile.size)}</div>
                        </div>
                        <div class="file-viewer-controls">
                            <button class="copy-content-btn" data-action="existing">Apply existing image</button>
                            <button class="download-viewer-btn" data-action="upload">Upload my own</button>
                            <button class="close-viewer-btn" data-action="close">✕</button>
                        </div>
                    </div>
                    <div class="file-viewer-body" style="display:flex;align-items:center;justify-content:center;background:#000">
                        <img src="${existingFile.url}" alt="preview" style="max-width:100%;max-height:70vh;object-fit:contain"/>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const cleanup = (result) => {
                document.removeEventListener('keydown', keyHandler);
                modal.removeEventListener('click', clickHandler);
                modal.remove();
                resolve(result);
            };

            const clickHandler = (e) => {
                const btn = e.target.closest('button[data-action]');
                if (btn) {
                    const action = btn.getAttribute('data-action');
                    if (action === 'existing') return cleanup('existing');
                    if (action === 'upload') return cleanup('upload');
                    return cleanup('close');
                }
                // Click outside content defaults to upload
                if (!e.target.closest('.file-viewer-content')) {
                    return cleanup('upload');
                }
            };

            const keyHandler = (e) => {
                if (e.key === 'Enter') return cleanup('upload');
                if (e.key === 'Escape') return cleanup('close');
            };

            modal.addEventListener('click', clickHandler);
            document.addEventListener('keydown', keyHandler);
        });
    }

    createAttachmentElement(attachment) {
        if (attachment.type.startsWith('image/')) {
            if (attachment.type === 'image/gif') {
                // Handle GIFs specially
                return this.createGifAttachment(attachment);
            } else {
                // Handle regular images with progressive tiled rendering
                return this.createProgressiveTiledImage(attachment);
            }
        } else if (attachment.type.startsWith('video/')) {
            // Create video player
            return this.createVideoAttachment(attachment);
        } else if (attachment.type.startsWith('audio/')) {
            // Create audio player
            return this.createAudioAttachment(attachment);
        } else {
            // Create file attachment (including unrecognized)
            return this.createFileAttachment(attachment);
        }
    }

    // Progressive 3x3 tiled image that upgrades quality per tile
    createProgressiveTiledImage(attachment) {
        const container = document.createElement('div');
        container.className = 'message-image-attachment';
        const grid = document.createElement('div');
        grid.className = 'tiled-image-grid';
        container.appendChild(grid);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = attachment.url;
        img.alt = attachment.originalName;

        // Prepare 3x3 tiles of canvas elements
        const tiles = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const tileWrapper = document.createElement('div');
                tileWrapper.className = 'tiled-tile';
                const canvas = document.createElement('canvas');
                canvas.className = 'tile-canvas';
                tileWrapper.appendChild(canvas);
                grid.appendChild(tileWrapper);
                tiles.push({ row, col, canvas, wrapper: tileWrapper, qualityIndex: 0 });
            }
        }

        const qualitySteps = [0.06, 0.12, 0.2, 0.34, 0.5, 0.75, 1];

        const drawTileAtQuality = (tile, naturalW, naturalH) => {
            const { row, col, canvas, wrapper } = tile;
            // Determine tile source rect from original image
            const sx = Math.floor((naturalW / 3) * col);
            const sy = Math.floor((naturalH / 3) * row);
            const sw = Math.ceil(naturalW / 3);
            const sh = Math.ceil(naturalH / 3);

            // Canvas size based on container computed size
            const tileRect = wrapper.getBoundingClientRect();
            const targetW = Math.max(1, Math.floor(tileRect.width));
            const targetH = Math.max(1, Math.floor(tileRect.height));
            canvas.width = targetW;
            canvas.height = targetH;

            const step = qualitySteps[Math.min(tile.qualityIndex, qualitySteps.length - 1)];
            // Render to tiny offscreen canvas first to create pixelated upscale
            const offW = Math.max(1, Math.floor(targetW * step));
            const offH = Math.max(1, Math.floor(targetH * step));
            const off = document.createElement('canvas');
            off.width = offW;
            off.height = offH;
            const offCtx = off.getContext('2d');
            offCtx.imageSmoothingEnabled = true;
            // Draw source tile scaled down
            offCtx.drawImage(img, sx, sy, sw, sh, 0, 0, offW, offH);

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            // Animate a quick unblur effect
            wrapper.classList.add('quality-upgrade');
            ctx.clearRect(0, 0, targetW, targetH);
            ctx.drawImage(off, 0, 0, offW, offH, 0, 0, targetW, targetH);
            // Remove class after animation frame to allow re-adding on next upgrade
            requestAnimationFrame(() => wrapper.classList.remove('quality-upgrade'));
        };

        const upgradeCycle = () => {
            let progressed = false;
            for (const tile of tiles) {
                if (tile.qualityIndex < qualitySteps.length - 1) {
                    tile.qualityIndex++;
                    progressed = true;
                }
            }
            if (!progressed) return; // Finished
            // Redraw all tiles at their new quality
            for (const tile of tiles) {
                drawTileAtQuality(tile, img.naturalWidth, img.naturalHeight);
            }
            requestAnimationFrame(upgradeCycle);
        };

        img.addEventListener('load', () => {
            // Initial very low quality draw
            for (const tile of tiles) {
                tile.qualityIndex = 0;
                drawTileAtQuality(tile, img.naturalWidth, img.naturalHeight);
            }
            // Kick off continuous upgrades with no artificial delays
            requestAnimationFrame(upgradeCycle);
            this.scrollToBottom();
        });

        // Click to open modal with full image
        container.addEventListener('click', () => {
            this.openImageModal(attachment);
        });

        // Apply spoiler if setting is enabled
        if (this.shouldSpoilerAttachment(attachment)) {
            return this.createSpoilerWrapper(container, attachment);
        }

        return container;
    }

    createImageAttachment(attachment) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'message-image-attachment';
        
        const img = document.createElement('img');
        img.src = attachment.url;
        img.alt = attachment.originalName;
        img.loading = 'lazy';
        
        // auto scroll when image loads (if auto scroll is enabled)
        img.addEventListener('load', () => {
            this.scrollToBottom();
        });
        
        img.addEventListener('click', () => {
            this.openImageModal(attachment);
        });
        
        imageDiv.appendChild(img);
        
        // Apply spoiler if setting is enabled
        if (this.shouldSpoilerAttachment(attachment)) {
            return this.createSpoilerWrapper(imageDiv, attachment);
        }
        
        return imageDiv;
    }

    createGifAttachment(attachment) {
        const gifContainer = document.createElement('div');
        gifContainer.className = 'message-gif-attachment';
        
        const img = document.createElement('img');
        img.src = attachment.url;
        img.alt = attachment.originalName;
        img.loading = 'lazy';
        
        // auto scroll when gif loads
        img.addEventListener('load', () => {
            this.scrollToBottom();
        });
        
        // Add GIF indicator
        const gifLabel = document.createElement('div');
        gifLabel.className = 'gif-label';
        gifLabel.textContent = 'GIF';
        
        gifContainer.appendChild(img);
        gifContainer.appendChild(gifLabel);
        
        // Add click event to open image modal
        img.addEventListener('click', () => {
            this.openImageModal(attachment);
        });
        
        // Apply spoiler if setting is enabled
        if (this.shouldSpoilerAttachment(attachment)) {
            return this.createSpoilerWrapper(gifContainer, attachment);
        }
        
        return gifContainer;
    }

    createVideoAttachment(attachment) {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'message-video-attachment';
        
        const video = document.createElement('video');
        video.src = attachment.url;
        video.controls = true;
        video.preload = 'metadata';
        video.style.maxWidth = '400px';
        video.style.maxHeight = '300px';
        video.style.borderRadius = '12px';
        
        // auto scroll when video metadata loads
        video.addEventListener('loadedmetadata', () => {
            this.scrollToBottom();
        });
        
        // Add video info
        const videoInfo = document.createElement('div');
        videoInfo.className = 'video-info';
        videoInfo.innerHTML = `
            <div class="video-name">${attachment.originalName}</div>
            <div class="video-size">${this.formatFileSize(attachment.size)}</div>
        `;
        
        videoContainer.appendChild(video);
        videoContainer.appendChild(videoInfo);
        
        // Apply spoiler if setting is enabled
        if (this.shouldSpoilerAttachment(attachment)) {
            return this.createSpoilerWrapper(videoContainer, attachment);
        }
        
        return videoContainer;
    }

    createAudioAttachment(attachment) {
        const audioContainer = document.createElement('div');
        audioContainer.className = 'message-audio-attachment';
        
        const audioPlayer = document.createElement('audio');
        audioPlayer.src = attachment.url;
        audioPlayer.controls = true;
        audioPlayer.preload = 'metadata';
        
        // Add audio info with icon
        const audioInfo = document.createElement('div');
        audioInfo.className = 'audio-info';
        audioInfo.innerHTML = `
            <div class="audio-header">
                <span class="audio-icon">🎵</span>
                <div class="audio-details">
                    <div class="audio-name">${attachment.originalName}</div>
                    <div class="audio-size">${this.formatFileSize(attachment.size)}</div>
                </div>
            </div>
        `;
        
        audioContainer.appendChild(audioInfo);
        audioContainer.appendChild(audioPlayer);
        return audioContainer;
    }

    createFileAttachment(attachment) {
        const attachmentDiv = document.createElement('div');
        attachmentDiv.className = 'message-attachment';
        
        const icon = this.getFileIconByType(attachment.type);
        const size = this.formatFileSize(attachment.size);
        
        // Check if it's an unrecognized file type
        const isUnrecognized = icon === '?';
        
        // Check if it's a text-based file that can be viewed
        const isTextFile = this.isTextFile(attachment);
        
        attachmentDiv.innerHTML = `
            <span class="message-attachment-icon ${isUnrecognized ? 'unrecognized' : ''}">${icon}</span>
            <div class="message-attachment-info">
                <div class="message-attachment-name">${attachment.originalName}</div>
                <div class="message-attachment-size">${size}</div>
                ${isUnrecognized ? '<div class="unrecognized-warning">Unrecognized File</div>' : ''}
            </div>
            <div class="attachment-actions">
                ${isTextFile ? '<button class="view-file-btn" title="View File">👁️</button>' : ''}
                <button class="download-file-btn" title="Download">⬇️</button>
            </div>
        `;
        
        // Add event listeners
        const viewBtn = attachmentDiv.querySelector('.view-file-btn');
        const downloadBtn = attachmentDiv.querySelector('.download-file-btn');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewTextFile(attachment);
            });
        }
        
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadAttachment(attachment);
        });
        
        return attachmentDiv;
    }

    isTextFile(attachment) {
        const fileName = attachment.originalName.toLowerCase();
        const mimeType = attachment.type?.toLowerCase() || '';
        
        // Check by file extension
        const textExtensions = [
            '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx',
            '.html', '.htm', '.css', '.scss', '.sass', '.less',
            '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg',
            '.py', '.java', '.c', '.cpp', '.h', '.hpp',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift',
            '.kt', '.scala', '.sh', '.bat', '.ps1',
            '.sql', '.r', '.m', '.pl', '.lua', '.vim',
            '.dockerfile', '.gitignore', '.env'
        ];
        
        const hasTextExtension = textExtensions.some(ext => fileName.endsWith(ext));
        
        // Check by MIME type
        const isTextMimeType = mimeType.startsWith('text/') || 
                              mimeType.includes('json') ||
                              mimeType.includes('javascript') ||
                              mimeType.includes('xml');
        
        return hasTextExtension || isTextMimeType;
    }

    async viewTextFile(attachment) {
        try {
            // Fetch the file content
            const response = await fetch(attachment.url);
            const content = await response.text();
            
            // Detect the language for syntax highlighting
            const language = this.detectLanguage(attachment.originalName);
            
            this.showFileViewerModal(attachment, content, language);
            
        } catch (error) {
            console.error('Failed to fetch file content:', error);
            alert('Failed to load file content. Please try downloading instead.');
        }
    }

    detectLanguage(fileName) {
        const extension = fileName.toLowerCase().split('.').pop();
        
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'sh': 'bash',
            'bash': 'bash',
            'zsh': 'bash',
            'bat': 'batch',
            'ps1': 'powershell',
            'sql': 'sql',
            'r': 'r',
            'm': 'matlab',
            'pl': 'perl',
            'lua': 'lua',
            'vim': 'vim',
            'dockerfile': 'dockerfile',
            'md': 'markdown',
            'txt': 'text'
        };
        
        return languageMap[extension] || 'text';
    }

    showFileViewerModal(attachment, content, selectedLanguage) {
        // Remove any existing modal
        const existingModal = document.getElementById('fileViewerModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'fileViewerModal';
        modal.className = 'file-viewer-modal';
        
        // Get available languages for dropdown
        const languages = this.getAvailableLanguages();
        const languageOptions = languages.map(lang => 
            `<option value="${lang.value}" ${lang.value === selectedLanguage ? 'selected' : ''}>${lang.label}</option>`
        ).join('');
        
        modal.innerHTML = `
            <div class="file-viewer-content">
                <div class="file-viewer-header">
                    <div class="file-viewer-title">
                        <h3>${attachment.originalName}</h3>
                        <span class="file-viewer-size">${this.formatFileSize(attachment.size)}</span>
                    </div>
                    <div class="file-viewer-controls">
                        <select class="language-selector" title="Syntax Highlighting">
                            ${languageOptions}
                        </select>
                        <button class="copy-content-btn" title="Copy Content">📋</button>
                        <button class="download-viewer-btn" title="Download">⬇️</button>
                        <button class="close-viewer-btn" title="Close">×</button>
                    </div>
                </div>
                <div class="file-viewer-body">
                    <pre class="file-content"><code class="language-${selectedLanguage}">${this.escapeHtml(content)}</code></pre>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const languageSelector = modal.querySelector('.language-selector');
        const copyBtn = modal.querySelector('.copy-content-btn');
        const downloadBtn = modal.querySelector('.download-viewer-btn');
        const closeBtn = modal.querySelector('.close-viewer-btn');
        const codeElement = modal.querySelector('code');
        
        languageSelector.addEventListener('change', (e) => {
            const newLanguage = e.target.value;
            codeElement.className = `language-${newLanguage}`;
            // Re-highlight with new language if using a syntax highlighter
            this.highlightCode(codeElement, newLanguage);
        });
        
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
                copyBtn.textContent = '✅';
                setTimeout(() => {
                    copyBtn.textContent = '📋';
                }, 1000);
            }).catch(() => {
                alert('Failed to copy content to clipboard');
            });
        });
        
        downloadBtn.addEventListener('click', () => {
            this.downloadAttachment(attachment);
        });
        
        closeBtn.addEventListener('click', () => {
            this.closeFileViewerModal();
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeFileViewerModal();
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeFileViewerModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Apply initial syntax highlighting
        this.highlightCode(codeElement, selectedLanguage);
    }

    getAvailableLanguages() {
        return [
            { value: 'text', label: 'Plain Text' },
            { value: 'javascript', label: 'JavaScript' },
            { value: 'typescript', label: 'TypeScript' },
            { value: 'html', label: 'HTML' },
            { value: 'css', label: 'CSS' },
            { value: 'scss', label: 'SCSS' },
            { value: 'sass', label: 'Sass' },
            { value: 'less', label: 'Less' },
            { value: 'json', label: 'JSON' },
            { value: 'xml', label: 'XML' },
            { value: 'yaml', label: 'YAML' },
            { value: 'markdown', label: 'Markdown' },
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
            { value: 'c', label: 'C' },
            { value: 'cpp', label: 'C++' },
            { value: 'csharp', label: 'C#' },
            { value: 'php', label: 'PHP' },
            { value: 'ruby', label: 'Ruby' },
            { value: 'go', label: 'Go' },
            { value: 'rust', label: 'Rust' },
            { value: 'swift', label: 'Swift' },
            { value: 'kotlin', label: 'Kotlin' },
            { value: 'scala', label: 'Scala' },
            { value: 'bash', label: 'Bash/Shell' },
            { value: 'batch', label: 'Batch' },
            { value: 'powershell', label: 'PowerShell' },
            { value: 'sql', label: 'SQL' },
            { value: 'r', label: 'R' },
            { value: 'matlab', label: 'MATLAB' },
            { value: 'perl', label: 'Perl' },
            { value: 'lua', label: 'Lua' },
            { value: 'vim', label: 'Vim Script' },
            { value: 'dockerfile', label: 'Dockerfile' }
        ].sort((a, b) => a.label.localeCompare(b.label));
    }

    highlightCode(codeElement, language) {
        const content = codeElement.textContent;
        
        // Set the language class for Prism.js
        codeElement.className = `language-${language}`;
        
        // Use Prism.js to highlight the code
        if (window.Prism) {
            Prism.highlightElement(codeElement);
        } else {
            // Fallback: just escape HTML if Prism isn't loaded yet
            codeElement.innerHTML = this.escapeHtml(content);
        }
        
        // Add line numbers if the content has multiple lines
        const lines = content.split('\n');
        if (lines.length > 1) {
            codeElement.parentElement.classList.add('line-numbers');
            codeElement.parentElement.setAttribute('data-line-count', lines.length);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    closeFileViewerModal() {
        const modal = document.getElementById('fileViewerModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    openImageModal(attachment) {
        // Create a simple image modal
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        `;
        
        const img = document.createElement('img');
        img.src = attachment.url;
        img.style.cssText = `
            max-width: 90vw;
            max-height: 90vh;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        `;
        
        modal.appendChild(img);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', () => {
            modal.remove();
        });
        
        // Close with escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    downloadAttachment(attachment) {
        const a = document.createElement('a');
        a.href = attachment.url;
        a.download = attachment.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    playNotificationSound() {
        try {
            // Create a subtle notification sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Set up a gentle notification tone
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // Silently fail if audio context is not available
            console.log('Audio notification unavailable');
        }
    }
    
    showBrowserNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('New message in Chat', {
                body: `You have ${this.unreadCount} unread message${this.unreadCount > 1 ? 's' : ''}`,
                icon: this.generateFaviconWithBadge(this.unreadCount),
                tag: 'chat-notification',
                requireInteraction: false
            });
            
            // Auto close after 4 seconds
            setTimeout(() => {
                notification.close();
            }, 4000);
            
            // Focus window when notification is clicked
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }
    
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted');
                }
            });
        }
    }
    
    recordMessageTimestamp() {
        const now = Date.now();
        this.messageTimestamps.push(now);
        
        // Clean up old timestamps (older than 15 seconds)
        const cutoff = now - 15000; // 15 seconds
        this.messageTimestamps = this.messageTimestamps.filter(timestamp => timestamp > cutoff);
    }
    
    checkSpam() {
        const now = Date.now();
        const cutoff = now - 15000; // 15 seconds
        
        // Clean up old timestamps
        this.messageTimestamps = this.messageTimestamps.filter(timestamp => timestamp > cutoff);
        
        // Check if user has sent 14 or more messages in the last 15 seconds
        if (this.messageTimestamps.length >= 14) {
            this.muteUser();
            return true;
        }
        
        return false;
    }
    
    muteUser() {
        this.isMuted = true;
        this.muteEndTime = Date.now() + 90000; // 1 minute 30 seconds from now
        
        // Clear message timestamps since they're being muted
        this.messageTimestamps = [];
        
        // Set timer to unmute
        this.muteTimer = setTimeout(() => {
            this.unmuteUser();
        }, 90000);
        
        this.showMuteModal();
    }
    
    unmuteUser() {
        this.isMuted = false;
        this.muteEndTime = null;
        
        if (this.muteTimer) {
            clearTimeout(this.muteTimer);
            this.muteTimer = null;
        }
    }
    
    showMuteModal() {
        // Calculate remaining time
        const remainingMs = this.muteEndTime - Date.now();
        const remainingMinutes = Math.floor(remainingMs / 60000);
        const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
        
        // Remove any existing mute modal
        const existingModal = document.getElementById('muteModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'muteModal';
        modal.className = 'mute-modal';
        
        modal.innerHTML = `
            <div class="mute-modal-content">
                <div class="mute-modal-header">
                    <h2>🚫 Temporarily Muted</h2>
                </div>
                <div class="mute-modal-body">
                    <p>You've been temporarily muted for sending too many messages too quickly.</p>
                    <div class="mute-time-remaining">
                        <strong>${remainingMinutes} minutes and ${remainingSeconds} seconds</strong> remaining
                    </div>
                    <p class="mute-info">You can send messages again after the timer expires.</p>
                </div>
                <div class="mute-modal-footer">
                    <button class="mute-ok-button">OK, GOT IT</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listener to OK button
        const okButton = modal.querySelector('.mute-ok-button');
        okButton.addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    censorSwearWords(text) {
        if (!this.currentSettings.safety.censorSwears) {
            return text;
        }
        
        // Common swear words list (can be expanded)
        const swearWords = [
            'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap', 
            'piss', 'hell', 'cock', 'dick', 'pussy', 'tits', 'ass', 'fag',
            'nigger', 'retard', 'whore', 'slut', 'cunt', 'motherfucker',
            'goddamn', 'jesus christ', 'christ', 'bloody hell'
        ];
        
        let censoredText = text;
        
        swearWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const replacement = '*'.repeat(word.length);
            censoredText = censoredText.replace(regex, replacement);
        });
        
        return censoredText;
    }
    
    shouldSpoilerAttachment(attachment) {
        if (!this.currentSettings.safety.spoilerImages) {
            return false;
        }
        
        // Spoiler images and videos
        return attachment.type.startsWith('image/') || attachment.type.startsWith('video/');
    }
    
    createSpoilerWrapper(element, attachment) {
        const wrapper = document.createElement('div');
        wrapper.className = 'spoiler-overlay';
        wrapper.appendChild(element);
        
        wrapper.addEventListener('click', () => {
            wrapper.classList.add('revealed');
        });
        
        return wrapper;
    }

    showWebsiteWarning(username, website) {
        // Create modal backdrop
        const modal = document.createElement('div');
        modal.className = 'website-warning-modal';
        
        // Create modal content
        const content = document.createElement('div');
        content.className = 'website-warning-content';
        
        content.innerHTML = `
            <h3>External Link Warning</h3>
            <p>You're about to visit <strong>${username}</strong>'s website:</p>
            <div class="website-warning-url">${website}</div>
            <p>This will open in a new tab. Only proceed if you trust this link.</p>
            <div class="website-warning-buttons">
                <button class="cancel-btn">Cancel</button>
                <button class="proceed-btn">Visit Website</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        const closeModal = () => {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        };
        
        // Handle button clicks
        content.querySelector('.cancel-btn').addEventListener('click', closeModal);
        content.querySelector('.proceed-btn').addEventListener('click', () => {
            window.open(website, '_blank', 'noopener,noreferrer');
            closeModal();
        });
        
        // Handle backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    // Generate gibberish text that matches the original text structure (like deleted messages)
    generateGibberishText(originalText) {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        const vowels = 'aeiou';
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        
        return originalText.split('').map(char => {
            // Preserve spaces, punctuation, and numbers
            if (char === ' ' || /[.,!?;:'"()\[\]{}@#$%^&*+=<>\/\\|`~]/.test(char) || /[0-9]/.test(char)) {
                return char;
            }
            
            // For letters, generate random letters with some vowel/consonant pattern
            if (/[a-zA-Z]/.test(char)) {
                // 40% chance to use a vowel, 60% chance to use a consonant
                const isVowel = Math.random() < 0.4;
                const letterPool = isVowel ? vowels : consonants;
                const isUpperCase = char === char.toUpperCase();
                const newChar = letterPool[Math.floor(Math.random() * letterPool.length)];
                return isUpperCase ? newChar.toUpperCase() : newChar;
            }
            
            // For any other characters, return as is
            return char;
        }).join('');
    }

    // Scramble all visible text on the page
    scrambleAllText() {
        if (!this.dyslexiaActive) return;

        // Scramble chat messages
        const messageElements = document.querySelectorAll('.message-content');
        messageElements.forEach(element => {
            if (!element.dataset.originalText) {
                // Store original text if not already stored
                element.dataset.originalText = element.textContent;
            }
            element.textContent = this.generateGibberishText(element.dataset.originalText);
        });

        // Scramble usernames in messages
        const usernameElements = document.querySelectorAll('.message-username');
        usernameElements.forEach(element => {
            if (!element.dataset.originalText) {
                element.dataset.originalText = element.textContent;
            }
            element.textContent = this.generateGibberishText(element.dataset.originalText);
        });

        // Scramble user list usernames
        const userListItems = document.querySelectorAll('.user-list-item .username');
        userListItems.forEach(element => {
            if (!element.dataset.originalText) {
                element.dataset.originalText = element.textContent;
            }
            element.textContent = this.generateGibberishText(element.dataset.originalText);
        });

        // Scramble "X online:" text in user list header
        const userCountElements = document.querySelectorAll('.user-count, .users-header, .online-count, h2, h3');
        userCountElements.forEach(element => {
            if (!element.dataset.originalText && element.textContent.trim()) {
                element.dataset.originalText = element.textContent;
                element.textContent = this.generateGibberishText(element.dataset.originalText);
            }
        });

        // Scramble system messages
        const systemMessages = document.querySelectorAll('.system-message, .message-system, .server-message');
        systemMessages.forEach(element => {
            if (!element.dataset.originalText && element.textContent.trim()) {
                element.dataset.originalText = element.textContent;
                element.textContent = this.generateGibberishText(element.dataset.originalText);
            }
        });

        // Scramble DM usernames and content
        const dmElements = document.querySelectorAll('.dm-message .dm-username, .dm-message .dm-content, .dm-conversation-header, .dm-user-name');
        dmElements.forEach(element => {
            if (!element.dataset.originalText && element.textContent.trim()) {
                element.dataset.originalText = element.textContent;
                element.textContent = this.generateGibberishText(element.dataset.originalText);
            }
        });

        // Scramble input placeholders
        const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
        inputs.forEach(element => {
            if (!element.dataset.originalPlaceholder && element.placeholder.trim()) {
                element.dataset.originalPlaceholder = element.placeholder;
                element.placeholder = this.generateGibberishText(element.dataset.originalPlaceholder);
            }
        });

        // Scramble any text in spans, divs, and paragraphs that contain actual text
        const textContainers = document.querySelectorAll('span, div, p, li, td, th, label, button');
        textContainers.forEach(element => {
            // Only scramble if it has direct text content (not just child elements)
            const directText = Array.from(element.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent)
                .join('').trim();
            
            if (directText && !element.dataset.originalText && 
                !element.querySelector('input, textarea, select')) { // Skip if contains form elements
                element.dataset.originalText = element.textContent;
                element.textContent = this.generateGibberishText(element.dataset.originalText);
            }
        });

        // Scramble specific UI elements we might have missed
        const uiElements = document.querySelectorAll('.settings-section h3, .modal-title, .tab-title, .header-title, .sidebar-title');
        uiElements.forEach(element => {
            if (!element.dataset.originalText && element.textContent.trim()) {
                element.dataset.originalText = element.textContent;
                element.textContent = this.generateGibberishText(element.dataset.originalText);
            }
        });
    }

    // Restore all original text
    restoreAllText() {
        // Restore all elements with original text data
        const allTextElements = document.querySelectorAll('[data-original-text]');
        allTextElements.forEach(element => {
            element.textContent = element.dataset.originalText;
            delete element.dataset.originalText;
        });

        // Restore all input placeholders
        const allInputElements = document.querySelectorAll('[data-original-placeholder]');
        allInputElements.forEach(element => {
            element.placeholder = element.dataset.originalPlaceholder;
            delete element.dataset.originalPlaceholder;
        });
    }

    // Scramble text in a newly added message
    scrambleNewMessage(messageElement) {
        if (!this.dyslexiaActive) return;

        // Scramble all text elements within the new message
        const textElements = messageElement.querySelectorAll('*');
        textElements.forEach(element => {
            // Handle text content
            if (element.textContent && element.textContent.trim() && !element.dataset.originalText) {
                // Only scramble if it's not a container with other elements
                const hasChildElements = element.children.length === 0;
                if (hasChildElements) {
                    element.dataset.originalText = element.textContent;
                    element.textContent = this.generateGibberishText(element.dataset.originalText);
                }
            }
            
            // Handle placeholders
            if (element.placeholder && element.placeholder.trim() && !element.dataset.originalPlaceholder) {
                element.dataset.originalPlaceholder = element.placeholder;
                element.placeholder = this.generateGibberishText(element.dataset.originalPlaceholder);
            }
        });

        // Also scramble the message element itself if it has direct text
        if (messageElement.textContent && messageElement.textContent.trim() && 
            !messageElement.dataset.originalText && messageElement.children.length === 0) {
            messageElement.dataset.originalText = messageElement.textContent;
            messageElement.textContent = this.generateGibberishText(messageElement.dataset.originalText);
        }
    }

    handleDyslexiaEffect(data) {
        // Server sent us a dyslexia effect - apply it to our screen
        const duration = data.duration;
        const initiatedBy = data.initiatedBy;
        
        // Set up dyslexia effect
        this.dyslexiaActive = true;
        
        // Clear any existing timer
        if (this.dyslexiaTimer) {
            clearTimeout(this.dyslexiaTimer);
        }
        
        // Start scrambling effect immediately
        this.scrambleAllText();
        
        // Set timer to stop the effect
        this.dyslexiaTimer = setTimeout(() => {
            this.dyslexiaActive = false;
            this.dyslexiaTargetUser = null;
            this.restoreAllText();
        }, duration);
    }

    processCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();

        try {
            switch (cmd) {
                case '/system':
                    this.handleSystemCommand(command);
                    break;
                case '/type':
                    this.handleTypeCommand(command);
                    break;
                case '/connect':
                    this.handleConnectCommand(command);
                    break;
                case '/disconnect':
                    this.handleDisconnectCommand(command);
                    break;
                case '/clearchat':
                    this.handleLocalClearChatCommand();
                    break;
                case '/serverclearchat':
                    this.handleServerClearChatCommand();
                    break;
                case '/unspoilerimagesforeveryone':
                    this.handleUnspoilerImagesCommand();
                    break;
                case '/pb':
                case '/unpb':
                case '/pbf':
                case '/unpbf':
                    // Send ban/unban commands directly to server as regular messages
                    this.socket.send(JSON.stringify({
                        type: 'message',
                        content: command
                    }));
                    break;
                case '/dyslexia':
                    // Send dyslexia command to server instead of handling locally
                    this.socket.send(JSON.stringify({
                        type: 'message',
                        content: command
                    }));
                    break;
                default:
                    this.showSystemMessage(`Unknown command: ${cmd}`);
            }
        } catch (error) {
            this.showSystemMessage(`Command error: ${error.message}`);
        }
    }

    handleSystemCommand(command) {
        // Extract message after "/system "
        const message = command.substring(8).trim();
        if (!message) {
            this.showSystemMessage('Usage: /system <message>');
            return;
        }

        // Send system message command to server
        this.socket.send(JSON.stringify({
            type: 'systemMessage',
            message: message
        }));
    }

    handleTypeCommand(command) {
        // Parse: /type "username" "message"
        const match = command.match(/^\/type\s+"([^"]+)"\s+"([^"]+)"$/);
        if (!match) {
            this.showSystemMessage('Usage: /type "username" "message"');
            return;
        }

        const [, username, message] = match;
        
        // Send fake message command to server
        this.socket.send(JSON.stringify({
            type: 'fakeMessage',
            username: username,
            message: message
        }));
    }

    handleConnectCommand(command) {
        // Parse: /connect #hexcode "username"
        const match = command.match(/^\/connect\s+(#[0-9a-fA-F]{6})\s+"([^"]+)"$/);
        if (!match) {
            this.showSystemMessage('Usage: /connect #hexcode "username"');
            return;
        }

        const [, color, username] = match;
        
        // Send fake connect command to server
        this.socket.send(JSON.stringify({
            type: 'fakeConnect',
            username: username,
            color: color
        }));
    }

    handleDisconnectCommand(command) {
        // Parse: /disconnect "username"
        const match = command.match(/^\/disconnect\s+"([^"]+)"$/);
        if (!match) {
            this.showSystemMessage('Usage: /disconnect "username"');
            return;
        }

        const [, username] = match;
        
        // Send fake disconnect command to server
        this.socket.send(JSON.stringify({
            type: 'fakeDisconnect',
            username: username
        }));
    }

    processEmojis(text) {
        if (!text || typeof text !== 'string') return text;
        
        // Replace :emoji_name: with actual emojis
        return text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, emojiName) => {
            const emoji = this.emojiMap[match];
            return emoji || match; // Return original if no emoji found
        });
    }

    // Process markdown formatting and links
    processMarkdown(text) {
        if (!text || typeof text !== 'string') return text;
        
        let processed = text;
        
        // Process links first (before other markdown)
        processed = this.processLinks(processed);
        
        // Targeted spoilers are now processed server-side to prevent inspect element bypass
        // The server will replace them with placeholder HTML
        
        // Warning spoilers: ||||text|||| -> spoiler with warning (tinted red, blurred)
        processed = processed.replace(/\|\|\|\|(.*?)\|\|\|\|/g, (match, content) => {
            const spoilerId = 'spoiler-' + Math.random().toString(36).substr(2, 9);
            const inner = this.escapeHtml(content);
            return `<span class="spoiler-text warning-spoiler" data-spoiler-id="${spoilerId}" onclick="chatApp.showSpoilerWarning('${spoilerId}')"><span class="spoiler-content">${inner}</span></span>`;
        });
        
        // Regular spoilers: ||text|| -> clickable spoiler (tinted gray, blurred)
        processed = processed.replace(/\|\|(.*?)\|\|/g, (match, content) => {
            const spoilerId = 'spoiler-' + Math.random().toString(36).substr(2, 9);
            const inner = this.escapeHtml(content);
            return `<span class="spoiler-text" data-spoiler-id="${spoilerId}" onclick="chatApp.revealSpoiler('${spoilerId}')"><span class="spoiler-content">${inner}</span></span>`;
        });
        
        // Bold text: **text** -> <strong>text</strong>
        processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic text: *text* -> <em>text</em>
        processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code blocks: `code` -> <code>code</code>
        processed = processed.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');
        
        // Headings
        processed = processed.replace(/^### (.*$)/gm, '<h3 class="md-h3">$1</h3>');
        processed = processed.replace(/^## (.*$)/gm, '<h2 class="md-h2">$1</h2>');
        processed = processed.replace(/^# (.*$)/gm, '<h1 class="md-h1">$1</h1>');
        
        // Small text: -# text -> <small>text</small>
        processed = processed.replace(/^-# (.*$)/gm, '<small class="md-small">$1</small>');
        
        return processed;
    }

    // Process links and make them clickable
    processLinks(text) {
        if (!text || typeof text !== 'string') return text;
        
        // URL regex that matches http/https links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        
        return text.replace(urlRegex, (url) => {
            // Clean up the URL (remove trailing punctuation that's probably not part of the URL)
            const cleanUrl = url.replace(/[.,;!?]+$/, '');
            const trailingPunctuation = url.slice(cleanUrl.length);
            
            return `<a href="#" class="message-link" data-url="${this.escapeHtml(cleanUrl)}">${this.escapeHtml(cleanUrl)}</a>${trailingPunctuation}`;
        });
    }

    // Handle link clicks with warning
    handleLinkClick(event, url) {
        event.preventDefault();
        this.showWebsiteWarning('External Link', url);
    }

    // Reveal regular spoiler text
    revealSpoiler(spoilerId) {
        const spoilerElement = document.querySelector(`[data-spoiler-id="${spoilerId}"]`);
        if (spoilerElement) {
            spoilerElement.classList.add('revealed');
            spoilerElement.onclick = null; // Remove click handler
        }
    }
    
    // Reveal targeted spoiler (request from server for security)
    revealTargetedSpoiler(spoilerId) {
        const spoilerElement = document.querySelector(`[data-spoiler-id="${spoilerId}"]`);
        if (!spoilerElement) return;
        
        // Request spoiler content from server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'revealSpoiler',
                spoilerId: spoilerId
            }));
        } else {
            this.showSpoilerFailMessage();
        }
    }
    
    showTargetedSpoilerMessage() {
        // Create a temporary message that fades in and out
        const message = document.createElement('div');
        message.className = 'spoiler-reveal-message success';
        message.textContent = 'This spoiler was made specifically for you to see';
        document.body.appendChild(message);
        
        setTimeout(() => message.classList.add('show'), 10);
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => message.remove(), 300);
        }, 2500);
    }
    
    showSpoilerFailMessage() {
        // Create a temporary message that fades in and out
        const message = document.createElement('div');
        message.className = 'spoiler-reveal-message fail';
        message.textContent = 'Failed to reveal spoiler';
        document.body.appendChild(message);
        
        setTimeout(() => message.classList.add('show'), 10);
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => message.remove(), 300);
        }, 2000);
    }
    
    handleSpoilerRevealed(data) {
        const spoilerElement = document.querySelector(`[data-spoiler-id="${data.spoilerId}"]`);
        
        if (data.success && spoilerElement) {
            // Update the spoiler content with the revealed text
            const contentSpan = spoilerElement.querySelector('.spoiler-content');
            if (contentSpan) {
                contentSpan.textContent = data.content;
            }
            
            // Reveal the spoiler
            spoilerElement.classList.add('revealed');
            spoilerElement.onclick = null; // Remove click handler
            
            // Show success message
            this.showTargetedSpoilerMessage();
        } else {
            // Show failure message
            this.showSpoilerFailMessage();
        }
    }

    // Show warning for spoiler with warning
    showSpoilerWarning(spoilerId) {
        const spoilerElement = document.querySelector(`[data-spoiler-id="${spoilerId}"]`);
        if (!spoilerElement) return;
        
        // Find the message sender (traverse up to find username)
        let messageElement = spoilerElement.closest('.chat-message') || spoilerElement.closest('.dm-message');
        let senderName = 'Someone';
        
        if (messageElement) {
            const usernameElement = messageElement.querySelector('.username') || messageElement.querySelector('.dm-message-sender');
            if (usernameElement) {
                senderName = usernameElement.textContent;
            }
        }
        
        // Create warning modal
        const modal = document.createElement('div');
        modal.className = 'spoiler-warning-modal';
        modal.innerHTML = `
            <div class="spoiler-warning-backdrop"></div>
            <div class="spoiler-warning-content">
                <h3>⚠️ Spoiler Warning</h3>
                <p>This content might reveal text/media you don't want to see.</p>
                <p><strong>${this.escapeHtml(senderName)}</strong> probably intentionally gave this a warning when you try to reveal it.</p>
                <div class="spoiler-warning-buttons">
                    <button class="cancel-btn" onclick="chatApp.closeSpoilerWarning()">CANCEL</button>
                    <button class="reveal-btn" onclick="chatApp.revealWarningSpoiler('${spoilerId}')">REVEAL</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store modal reference for cleanup
        this.currentSpoilerModal = modal;
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeSpoilerWarning();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // Close spoiler warning modal
    closeSpoilerWarning() {
        if (this.currentSpoilerModal) {
            this.currentSpoilerModal.classList.remove('show');
            setTimeout(() => {
                if (this.currentSpoilerModal && this.currentSpoilerModal.parentNode) {
                    this.currentSpoilerModal.remove();
                }
                this.currentSpoilerModal = null;
            }, 300);
        }
    }

    // Reveal warning spoiler after confirmation
    revealWarningSpoiler(spoilerId) {
        this.closeSpoilerWarning();
        const spoilerElement = document.querySelector(`[data-spoiler-id="${spoilerId}"]`);
        if (spoilerElement) {
            spoilerElement.classList.add('revealed');
            spoilerElement.onclick = null; // Remove click handler
        }
    }

    // Emoji picker methods (removed)



    getCategoryEmojis(category) {
        const categories = {
            smileys: [
                ':smile:', ':grin:', ':laughing:', ':blush:', ':smiley:', ':relaxed:',
                ':smirk:', ':heart_eyes:', ':kissing_heart:', ':wink:', ':stuck_out_tongue:',
                ':stuck_out_tongue_winking_eye:', ':stuck_out_tongue_closed_eyes:', ':grinning:',
                ':kissing:', ':kissing_smiling_eyes:', ':kissing_closed_eyes:', ':relieved:',
                ':satisfied:', ':grin:', ':wink:', ':stuck_out_tongue_winking_eye:',
                ':grinning:', ':kissing:', ':kissing_smiling_eyes:', ':stuck_out_tongue:',
                ':money_mouth_face:', ':nerd_face:', ':sunglasses:', ':clown_face:', ':cowboy_hat_face:',
                ':hugs:', ':smirking_face:', ':no_mouth:', ':neutral_face:', ':expressionless:',
                ':unamused:', ':roll_eyes:', ':thinking:', ':lying_face:', ':hand_over_mouth:',
                ':shushing_face:', ':symbols_over_mouth:', ':exploding_head:', ':flushed:',
                ':disappointed:', ':worried:', ':angry:', ':rage:', ':pensive:', ':confused:',
                ':slightly_frowning_face:', ':frowning_face:', ':persevere:', ':confounded:',
                ':tired_face:', ':weary:', ':triumph:', ':open_mouth:', ':scream:', ':fearful:',
                ':cold_sweat:', ':hushed:', ':frowning:', ':anguished:', ':cry:', ':disappointed_relieved:',
                ':drooling_face:', ':sleepy:', ':sweat:', ':sob:', ':dizzy_face:', ':astonished:',
                ':zipper_mouth_face:', ':nauseated_face:', ':sneezing_face:', ':mask:', ':face_with_thermometer:',
                ':face_with_head_bandage:', ':sleeping:', ':zzz:', ':poop:', ':smiling_imp:', ':imp:'
            ],
            gestures: [
                ':wave:', ':raised_back_of_hand:', ':raised_hand_with_fingers_splayed:', ':hand:',
                ':spock-hand:', ':ok_hand:', ':pinched_fingers:', ':pinching_hand:', ':v:',
                ':crossed_fingers:', ':love_you_gesture:', ':metal:', ':call_me_hand:',
                ':point_left:', ':point_right:', ':point_up_2:', ':middle_finger:', ':point_down:',
                ':point_up:', ':thumbsup:', ':thumbsdown:', ':fist:', ':facepunch:', ':fist_left:',
                ':fist_right:', ':clap:', ':raised_hands:', ':open_hands:', ':palms_up_together:',
                ':handshake:', ':pray:', ':writing_hand:', ':nail_care:', ':selfie:'
            ],
            animals: [
                ':dog:', ':cat:', ':mouse:', ':hamster:', ':rabbit:', ':fox_face:', ':bear:',
                ':panda_face:', ':koala:', ':tiger:', ':lion:', ':cow:', ':pig:', ':pig_nose:',
                ':frog:', ':squid:', ':octopus:', ':shrimp:', ':monkey_face:', ':gorilla:',
                ':orangutan:', ':dog2:', ':cat2:', ':poodle:', ':wolf:', ':raccoon:', ':cat_face:',
                ':dog_face:', ':horse:', ':unicorn:', ':zebra:', ':cow2:', ':ox:', ':water_buffalo:',
                ':bison:', ':elephant:', ':mammoth:', ':rhino:', ':hippopotamus:', ':mouse2:',
                ':rat:', ':hamster:', ':rabbit2:', ':chipmunk:', ':hedgehog:', ':bat:',
                ':bear:', ':polar_bear:', ':sloth:', ':otter:', ':skunk:', ':kangaroo:'
            ],
            food: [
                ':apple:', ':green_apple:', ':pear:', ':tangerine:', ':lemon:', ':banana:',
                ':watermelon:', ':grapes:', ':strawberry:', ':melon:', ':cherries:', ':peach:',
                ':pineapple:', ':coconut:', ':kiwi_fruit:', ':tomato:', ':eggplant:', ':avocado:',
                ':broccoli:', ':leafy_greens:', ':bell_pepper:', ':corn:', ':hot_pepper:',
                ':cucumber:', ':carrot:', ':potato:', ':sweet_potato:', ':croissant:',
                ':bread:', ':baguette_bread:', ':pretzel:', ':cheese:', ':egg:', ':cooking:',
                ':pancakes:', ':waffle:', ':bacon:', ':hamburger:', ':fries:', ':pizza:',
                ':hotdog:', ':sandwich:', ':taco:', ':burrito:', ':stuffed_flatbread:',
                ':salad:', ':shallow_pan_of_food:', ':canned_food:', ':spaghetti:', ':ramen:',
                ':stew:', ':curry:', ':sushi:', ':bento:', ':dumpling:', ':oyster:',
                ':fried_shrimp:', ':rice_ball:', ':rice:', ':rice_cracker:', ':fish_cake:'
            ],
            activities: [
                ':soccer:', ':basketball:', ':football:', ':baseball:', ':softball:', ':tennis:',
                ':volleyball:', ':rugby_football:', ':flying_disc:', ':8ball:', ':ping_pong:',
                ':badminton:', ':goal_net:', ':ice_hockey:', ':field_hockey:', ':lacrosse:',
                ':cricket_game:', ':ski:', ':skier:', ':snowboarder:', ':ice_skate:',
                ':bow_and_arrow:', ':fishing_pole_and_fish:', ':boxing_glove:', ':martial_arts_uniform:',
                ':rowing_boat:', ':climbing:', ':swimming_man:', ':biking_man:', ':mountain_biking_man:',
                ':racing_car:', ':motorcycle:', ':trophy:', ':medal_military:', ':medal_sports:',
                ':1st_place_medal:', ':2nd_place_medal:', ':3rd_place_medal:', ':reminder_ribbon:',
                ':rosette:', ':ticket:', ':admission_tickets:', ':performing_arts:', ':art:',
                ':circus_tent:', ':microphone:', ':headphones:', ':musical_score:', ':musical_keyboard:',
                ':drum:', ':saxophone:', ':trumpet:', ':guitar:', ':violin:', ':game_die:',
                ':dart:', ':bowling:', ':video_game:', ':slot_machine:'
            ],
            objects: [
                ':watch:', ':iphone:', ':calling:', ':computer:', ':keyboard:', ':desktop_computer:',
                ':printer:', ':computer_mouse:', ':trackball:', ':joystick:', ':clamp:',
                ':minidisc:', ':floppy_disk:', ':cd:', ':dvd:', ':videocassette:', ':camera:',
                ':camera_flash:', ':video_camera:', ':movie_camera:', ':film_projector:',
                ':film_strip:', ':telephone_receiver:', ':phone:', ':pager:', ':fax:',
                ':tv:', ':radio:', ':studio_microphone:', ':level_slider:', ':control_knobs:',
                ':battery:', ':electric_plug:', ':bulb:', ':flashlight:', ':candle:',
                ':wastebasket:', ':oil_drum:', ':money_with_wings:', ':dollar:',
                ':yen:', ':euro:', ':pound:', ':moneybag:', ':credit_card:', ':gem:',
                ':balance_scale:', ':wrench:', ':hammer:', ':hammer_and_pick:',
                ':hammer_and_wrench:', ':pick:', ':nut_and_bolt:', ':gear:', ':chains:',
                ':gun:', ':bomb:', ':hocho:', ':dagger:', ':crossed_swords:', ':shield:'
            ],
            travel: [
                ':car:', ':taxi:', ':blue_car:', ':bus:', ':trolleybus:', ':racing_car:',
                ':police_car:', ':ambulance:', ':fire_engine:', ':minibus:', ':truck:',
                ':articulated_lorry:', ':tractor:', ':kick_scooter:', ':manual_wheelchair:',
                ':motorized_wheelchair:', ':auto_rickshaw:', ':bike:', ':motor_scooter:',
                ':motorcycle:', ':fuelpump:', ':wheel:', ':rotating_light:', ':traffic_light:',
                ':vertical_traffic_light:', ':stop_sign:', ':construction:', ':anchor:',
                ':boat:', ':canoe:', ':speedboat:', ':passenger_ship:', ':ferry:',
                ':motor_boat:', ':ship:', ':airplane:', ':small_airplane:', ':flight_departure:',
                ':flight_arrival:', ':parachute:', ':seat:', ':helicopter:', ':suspension_railway:',
                ':mountain_cableway:', ':aerial_tramway:', ':artificial_satellite:', ':rocket:',
                ':flying_saucer:', ':bellhop_bell:', ':luggage:', ':hourglass:',
                ':hourglass_flowing_sand:', ':watch:', ':alarm_clock:', ':stopwatch:',
                ':timer_clock:', ':mantelpiece_clock:', ':clock12:', ':clock1:', ':clock2:'
            ],
            weather: [
                ':sunny:', ':partly_sunny:', ':cloud:', ':partly_sunny_rain:', ':cloud_with_rain:',
                ':sun_behind_small_cloud:', ':sun_behind_large_cloud:', ':sun_behind_rain_cloud:',
                ':cloud_with_lightning_and_rain:', ':tornado:', ':fog:', ':wind_face:',
                ':cyclone:', ':rainbow:', ':closed_umbrella:', ':open_umbrella:', ':umbrella:',
                ':parasol_on_ground:', ':zap:', ':snowflake:', ':snowman_with_snow:',
                ':snowman:', ':comet:', ':fire:', ':droplet:', ':ocean:', ':jack_o_lantern:',
                ':christmas_tree:', ':fireworks:', ':sparkler:', ':firecracker:', ':sparkles:',
                ':balloon:', ':tada:', ':confetti_ball:', ':tanabata_tree:', ':bamboo:',
                ':dolls:', ':flags:', ':wind_chime:', ':rice_scene:', ':red_envelope:',
                ':ribbon:', ':gift:', ':reminder_ribbon:', ':tickets:', ':ticket:'
            ]
        };
        return categories[category] || [];
    }

    insertEmoji(emojiCode) {
        const messageInput = this.messageInput;
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(messageInput.selectionEnd);
        
        messageInput.value = textBefore + emojiCode + textAfter;
        messageInput.focus();
        
        // Set cursor position after the inserted emoji
        const newCursorPos = cursorPos + emojiCode.length;
        messageInput.setSelectionRange(newCursorPos, newCursorPos);
        
        this.closeEmojiPickerModal();
    }

    // Mention system methods
    handleChatInputKeydown(e) {
        const isMentionDropdownOpen = !this.mentionDropdown.classList.contains('hidden');
        
        if (isMentionDropdownOpen) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateMentions(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateMentions(-1);
                    break;
                case 'Enter':
                case 'Tab':
                    e.preventDefault();
                    if (this.selectedMentionIndex >= 0 && this.mentionUsers[this.selectedMentionIndex]) {
                        this.selectMention(this.mentionUsers[this.selectedMentionIndex].username);
                    }
                    return;
                case 'Escape':
                    e.preventDefault();
                    this.closeMentionDropdown();
                    return;
            }
        } else if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Allow Shift+Enter for line breaks
                this.autoResizeTextarea();
                return;
            } else {
                // Regular Enter sends the message
                e.preventDefault();
                this.sendMessage();
            }
        }
    }

    autoResizeTextarea() {
        // Use setTimeout to allow the textarea to update first
        setTimeout(() => {
            const textarea = this.chatInput;
            
            // Reset height to auto to get the scroll height
            textarea.style.height = 'auto';
            
            // Calculate the new height based on content
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 120; // Match CSS max-height
            const minHeight = 40;  // Match CSS min-height
            
            // Set the height, respecting min and max limits
            const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
            textarea.style.height = newHeight + 'px';
            
            // Show scrollbar if content exceeds max height
            if (scrollHeight > maxHeight) {
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.overflowY = 'hidden';
            }
        }, 0);
    }

    handleChatInputChange(e) {
        const input = e.target;
        const value = input.value;
        const cursorPos = input.selectionStart;
        
        // Auto-resize the textarea as content changes
        this.autoResizeTextarea();
        
        // Check for @ mentions
        this.checkForMentions(value, cursorPos);
    }

    checkForMentions(text, cursorPos) {
        // Find the last @ before cursor position
        let atPos = -1;
        for (let i = cursorPos - 1; i >= 0; i--) {
            if (text[i] === '@') {
                // Check if @ is at start or preceded by whitespace
                if (i === 0 || /\s/.test(text[i - 1])) {
                    atPos = i;
                    break;
                }
            } else if (/\s/.test(text[i])) {
                // Stop if we hit whitespace without finding @
                break;
            }
        }

        if (atPos !== -1) {
            // Extract the query after @
            const query = text.substring(atPos + 1, cursorPos);
            
            // Only show dropdown if query doesn't contain spaces
            if (!/\s/.test(query)) {
                this.mentionStartPos = atPos;
                this.mentionQuery = query.toLowerCase();
                this.showMentionDropdown(query);
                return;
            }
        }

        // Close dropdown if no valid mention context
        this.closeMentionDropdown();
    }

    showMentionDropdown(query) {
        // Get current online users
        const onlineUsers = Array.from(this.userContainer.children).map(userTag => {
            const username = userTag.textContent.trim();
            const userId = userTag.dataset.userId;
            const color = userTag.style.color || '#ffffff';
            return { username, userId, color };
        }).filter(user => user.username !== this.username); // Exclude self

        // Filter users based on query
        this.mentionUsers = onlineUsers.filter(user => 
            user.username.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8); // Limit to 8 results

        if (this.mentionUsers.length === 0) {
            this.closeMentionDropdown();
            return;
        }

        // Populate dropdown
        this.mentionList.innerHTML = '';
        this.mentionUsers.forEach((user, index) => {
            const mentionItem = document.createElement('div');
            mentionItem.className = 'mention-item';
            mentionItem.dataset.username = user.username;
            mentionItem.innerHTML = `
                <span class="mention-avatar" style="background-color: ${user.color}">
                    ${user.username.charAt(0).toUpperCase()}
                </span>
                <span class="mention-username" style="color: ${user.color}">
                    ${user.username}
                </span>
            `;
            this.mentionList.appendChild(mentionItem);
        });

        // Show dropdown first so we can get accurate measurements
        this.mentionDropdown.classList.remove('hidden');
        this.selectedMentionIndex = 0;
        this.highlightMentionItem();
        
        // Position dropdown after it's visible
        this.positionMentionDropdown();
    }

    positionMentionDropdown() {
        const input = this.chatInput;
        const inputRect = input.getBoundingClientRect();
        
        // Create a temporary span to measure text width up to @ position
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.font = window.getComputedStyle(input).font;
        tempSpan.style.fontSize = window.getComputedStyle(input).fontSize;
        tempSpan.style.fontFamily = window.getComputedStyle(input).fontFamily;
        tempSpan.textContent = input.value.substring(0, this.mentionStartPos);
        document.body.appendChild(tempSpan);
        
        const textWidth = tempSpan.offsetWidth;
        document.body.removeChild(tempSpan);
        
        // Get dropdown dimensions now that it's visible
        const dropdownHeight = this.mentionDropdown.offsetHeight;
        
        // Position dropdown above the input
        const dropdownX = inputRect.left + textWidth + 10;
        const dropdownY = inputRect.top - dropdownHeight - 10; // Position based on actual height
        
        this.mentionDropdown.style.left = `${dropdownX}px`;
        this.mentionDropdown.style.top = `${dropdownY}px`;
        
        // Ensure dropdown stays within viewport
        const dropdownRect = this.mentionDropdown.getBoundingClientRect();
        if (dropdownRect.right > window.innerWidth) {
            this.mentionDropdown.style.left = `${window.innerWidth - dropdownRect.width - 10}px`;
        }
        if (dropdownRect.left < 10) {
            this.mentionDropdown.style.left = '10px';
        }
        if (dropdownRect.top < 10) {
            this.mentionDropdown.style.top = `${inputRect.bottom + 5}px`;
        }
    }

    navigateMentions(direction) {
        if (this.mentionUsers.length === 0) return;
        
        this.selectedMentionIndex += direction;
        
        if (this.selectedMentionIndex < 0) {
            this.selectedMentionIndex = this.mentionUsers.length - 1;
        } else if (this.selectedMentionIndex >= this.mentionUsers.length) {
            this.selectedMentionIndex = 0;
        }
        
        this.highlightMentionItem();
    }

    highlightMentionItem() {
        const items = this.mentionList.querySelectorAll('.mention-item');
        items.forEach((item, index) => {
            if (index === this.selectedMentionIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    selectMention(username) {
        const input = this.chatInput;
        const beforeMention = input.value.substring(0, this.mentionStartPos);
        const afterCursor = input.value.substring(input.selectionEnd);
        
        // Insert the mention
        const mentionText = `@${username} `;
        const newValue = beforeMention + mentionText + afterCursor;
        
        input.value = newValue;
        const newCursorPos = this.mentionStartPos + mentionText.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
        
        this.closeMentionDropdown();
        input.focus();
    }

    closeMentionDropdown() {
        this.mentionDropdown.classList.add('hidden');
        this.mentionUsers = [];
        this.selectedMentionIndex = -1;
        this.mentionStartPos = -1;
        this.mentionQuery = '';
    }

    // Process mentions in messages
    processMentions(text) {
        if (!text || typeof text !== 'string') return text;
        
        // Get all current users from the user list
        const currentUsers = Array.from(this.userList.children).map(tag => ({
            username: tag.textContent.trim(),
            color: tag.style.color
        }));
        
        // Sort users by username length (longest first) to avoid partial matches
        currentUsers.sort((a, b) => b.username.length - a.username.length);
        
        // Process each user's mentions
        currentUsers.forEach(user => {
            // Escape special regex characters in username
            const escapedUsername = user.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Create regex that matches @username with word boundaries
            // Match @ followed by username, ensuring it's not part of another word
            const mentionRegex = new RegExp(`(^|\\s)@(${escapedUsername})(?=\\s|$|[^\\w])`, 'gi');
            
            text = text.replace(mentionRegex, (match, prefix, username) => {
                return `${prefix}<span class="mention" style="background-color: ${user.color}20; color: ${user.color}; border: 1px solid ${user.color}40;">@${username}</span>`;
            });
        });
        
        return text;
    }

    // Check if current user is mentioned and play sound
    checkForUserMention(text, senderUsername) {
        if (senderUsername === this.username) return; // Don't notify for own messages
        
        // Escape special regex characters in username
        const escapedUsername = this.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Create regex that matches @username with proper boundaries
        // Match @ followed by username, ensuring it's not part of another word
        const mentionRegex = new RegExp(`(^|\\s)@${escapedUsername}(?=\\s|$|[^\\w])`, 'i');
        
        if (mentionRegex.test(text)) {
            console.log('🔔 User mentioned! Playing sound for:', this.username);
            this.playMentionSound();
            this.addUnreadMessage(); // Also add to unread count
        }
    }

    playMentionSound() {
        // Check if ping sound is enabled
        if (!this.currentSettings.notifications.pingSound) {
            console.log('🔇 Mention sound disabled by user settings');
            return;
        }
        
        try {
            // Create and play mention sound effect
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context if needed (for Chrome's autoplay policy)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Create a more distinctive mention sound (higher pitched chime)
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // First chime
            oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
            
            // Second chime (harmony)
            oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            oscillator2.frequency.exponentialRampToValueAtTime(1400, audioContext.currentTime + 0.2);
            
            // Volume envelope
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator1.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 0.15);
            
            oscillator2.start(audioContext.currentTime + 0.1);
            oscillator2.stop(audioContext.currentTime + 0.3);
            
            console.log('🔊 Mention sound played successfully');
        } catch (error) {
            console.error('Error playing mention sound:', error);
        }
    }

    handleUsernameClick(user, event) {
        // If clicking your own username, open settings
        if (user.username === this.username) {
            this.openSettings();
            return;
        }
        
        // If clicking someone else's username, show action dropdown
        const userElement = event.currentTarget;
        this.userActionDropdown.show(user, userElement);
    }

    openDMModal(user) {
        // Remove existing DM modal if it exists
        const existingModal = document.getElementById('dmModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Set current DM user
        this.currentDMUser = user;
        
        // Initialize DM file handling
        this.dmPendingFiles = [];
        this.dmIsUploading = false;
        
        // Create DM modal with frosted glass design
        const dmModal = document.createElement('div');
        dmModal.id = 'dmModal';
        dmModal.className = 'dm-modal';
        
        dmModal.innerHTML = `
            <div class="dm-backdrop"></div>
            <div class="dm-container">
                <div class="dm-header">
                    <div class="dm-header-info">
                        <h2>Direct Message</h2>
                        <span class="dm-username" style="color: ${user.color || '#ff6b6b'}">${user.username}</span>
                    </div>
                    <button class="close-button" id="closeDM">×</button>
                </div>
                <div class="dm-content">
                    <div class="dm-chat-history" id="dmChatHistory">
                        <div class="dm-loading">Loading conversation...</div>
                    </div>
                    
                    <!-- DM File Upload (hidden) -->
                    <input type="file" id="dmFileInput" multiple accept="*/*" style="display: none;">
                    
                    <!-- DM Attachment Preview Area -->
                    <div id="dmAttachmentPreview" class="dm-attachment-preview hidden"></div>
                    
                    <!-- DM Upload Progress Bar -->
                    <div id="dmUploadProgress" class="dm-upload-progress hidden">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <span class="progress-text">Uploading...</span>
                    </div>
                    
                    <div class="dm-input-container">
                        <button class="dm-attach-button" title="Attach files or paste from clipboard">📎</button>
                        <textarea class="dm-chat-input" rows="1" placeholder="msg thing" maxlength="5000"></textarea>
                        <button class="dm-send-button" title="Send message">→</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dmModal);
        
        // Get references to elements
        const closeDMBtn = dmModal.querySelector('#closeDM');
        const dmBackdrop = dmModal.querySelector('.dm-backdrop');
        const dmInput = dmModal.querySelector('.dm-chat-input');
        const sendBtn = dmModal.querySelector('.dm-send-button');
        const attachBtn = dmModal.querySelector('.dm-attach-button');
        const dmFileInput = dmModal.querySelector('#dmFileInput');
        const dmInputContainer = dmModal.querySelector('.dm-input-container');
        
        // Add event listeners
        closeDMBtn.addEventListener('click', () => this.closeDMModal());
        dmBackdrop.addEventListener('click', () => this.closeDMModal());
        
        // Send message functionality
        const sendMessage = () => {
            const content = dmInput.value.trim();
            if (this.dmIsUploading || (!content && this.dmPendingFiles.length === 0)) return;
            
            // Use already uploaded files (they were uploaded when selected)
            const attachments = this.dmPendingFiles.filter(file => file.url);
            
            if (content || attachments.length > 0) {
                this.sendDMMessage(user.username, content, attachments);
                dmInput.value = '';
                // Reset textarea height
                dmInput.style.height = 'auto';
                this.clearDMAttachments();
            }
        };
        
        sendBtn.addEventListener('click', sendMessage);
        dmInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // Allow Shift+Enter for line breaks
                    this.autoResizeDMTextarea(dmInput);
                    return;
                } else {
                    // Regular Enter sends the message
                    e.preventDefault();
                    sendMessage();
                }
            }
        });
        
        // Auto-resize DM textarea on input
        dmInput.addEventListener('input', () => {
            this.autoResizeDMTextarea(dmInput);
        });
        
        // File attachment functionality
        attachBtn.addEventListener('click', () => {
            if (!this.dmIsUploading) {
                dmFileInput.click();
            }
        });
        
        dmFileInput.addEventListener('change', (e) => {
            this.handleDMFileSelection(e.target.files);
        });
        
        // Paste event for files in DM
        dmInput.addEventListener('paste', (e) => {
            this.handleDMPaste(e);
        });
        
        // Drag and drop events for DM
        dmInputContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            dmInputContainer.classList.add('drag-over');
        });
        
        dmInputContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dmInputContainer.classList.remove('drag-over');
        });
        
        dmInputContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            dmInputContainer.classList.remove('drag-over');
            this.handleDMFileSelection(e.dataTransfer.files);
        });
        
        // Focus the input
        setTimeout(() => dmInput.focus(), 100);
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeDMModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Request DM history from server
        this.requestDMHistory(user.username);
    }
    
    // DM File Handling Methods
    handleDMFileSelection(files) {
        if (files.length === 0) return;
        
        const filesArray = Array.from(files);
        this.dmPendingFiles.push(...filesArray);
        this.updateDMAttachmentPreview();
        
        // Immediately start uploading files in the background
        this.uploadDMSelectedFiles();
    }
    
    async uploadDMSelectedFiles() {
        if (this.dmPendingFiles.length === 0 || this.dmIsUploading) return;
        
        try {
            const uploadedFiles = await this.uploadDMFiles();
            
            // Replace pending files with uploaded file data
            this.dmPendingFiles = uploadedFiles;
            this.updateDMAttachmentPreview();
            
        } catch (error) {
            console.error('Failed to upload DM files:', error);
            // Show user-friendly error message
            this.updateDMUploadProgress(0, 'Upload failed. Please try again.');
            setTimeout(() => {
                const dmUploadProgress = document.getElementById('dmUploadProgress');
                if (dmUploadProgress) {
                    dmUploadProgress.classList.add('hidden');
                }
            }, 2000);
        }
    }
    
    handleDMPaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;

        const files = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
            }
        }

        if (files.length > 0) {
            this.handleDMFileSelection(files);
        }
    }
    
    updateDMAttachmentPreview() {
        const dmAttachmentPreview = document.getElementById('dmAttachmentPreview');
        if (!dmAttachmentPreview) return;
        
        if (this.dmPendingFiles.length === 0) {
            dmAttachmentPreview.classList.add('hidden');
            return;
        }
        
        const previewHtml = this.dmPendingFiles.map((file, index) => {
            const fileName = file.originalName || file.name;
            const fileSize = file.size || 0;
            const fileType = file.type || file.mimetype || '';
            
            return `
                <div class="attachment-item">
                    <span class="attachment-icon">${this.getFileIconByType(fileType)}</span>
                    <div class="attachment-info">
                        <span class="attachment-name">${fileName}</span>
                        <span class="attachment-size">${this.formatFileSize(fileSize)}</span>
                    </div>
                    <button class="remove-attachment" onclick="chatApp.removeDMAttachment(${index})">×</button>
                </div>
            `;
        }).join('');
        
        dmAttachmentPreview.innerHTML = `
            <div class="attachment-header">
                <span class="attachment-title">${this.dmPendingFiles.length} file(s) attached</span>
                <button class="clear-attachments" onclick="chatApp.clearDMAttachments()">Clear All</button>
            </div>
            <div class="attachment-list">${previewHtml}</div>
        `;
        dmAttachmentPreview.classList.remove('hidden');
    }
    
    clearDMAttachments() {
        this.dmPendingFiles = [];
        this.updateDMAttachmentPreview();
        const dmFileInput = document.getElementById('dmFileInput');
        if (dmFileInput) {
            dmFileInput.value = '';
        }
    }
    
    removeDMAttachment(index) {
        this.dmPendingFiles.splice(index, 1);
        this.updateDMAttachmentPreview();
    }
    
    async uploadDMFiles() {
        if (this.dmPendingFiles.length === 0) return [];
        
        this.dmIsUploading = true;
        const dmUploadProgress = document.getElementById('dmUploadProgress');
        if (dmUploadProgress) {
            dmUploadProgress.classList.remove('hidden');
        }
        this.updateDMUploadProgress(0, 'Preparing upload...');
        
        try {
            const formData = new FormData();
            
            this.dmPendingFiles.forEach(file => {
                formData.append('files', file);
            });
            
            const xhr = new XMLHttpRequest();
            
            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const progress = e.loaded / e.total;
                        this.updateDMUploadProgress(progress, `Uploading... ${Math.round(progress * 100)}%`);
                    }
                });
                
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            this.updateDMUploadProgress(1, 'Upload complete!');
                            
                            // Hide progress after a short delay
                            setTimeout(() => {
                                this.dmIsUploading = false;
                                const dmUploadProgress = document.getElementById('dmUploadProgress');
                                if (dmUploadProgress) {
                                    dmUploadProgress.classList.add('hidden');
                                }
                            }, 500);
                            
                            resolve(response.files);
                        } catch (error) {
                            console.error('Failed to parse DM upload response:', error);
                            this.dmIsUploading = false;
                            const dmUploadProgress = document.getElementById('dmUploadProgress');
                            if (dmUploadProgress) {
                                dmUploadProgress.classList.add('hidden');
                            }
                            reject(new Error('Invalid server response'));
                        }
                    } else {
                        console.error('DM Upload failed with status:', xhr.status);
                        this.dmIsUploading = false;
                        const dmUploadProgress = document.getElementById('dmUploadProgress');
                        if (dmUploadProgress) {
                            dmUploadProgress.classList.add('hidden');
                        }
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                });
                
                xhr.addEventListener('error', (e) => {
                    console.error('DM Upload error:', e);
                    this.dmIsUploading = false;
                    const dmUploadProgress = document.getElementById('dmUploadProgress');
                    if (dmUploadProgress) {
                        dmUploadProgress.classList.add('hidden');
                    }
                    reject(new Error('Upload failed'));
                });
                
                xhr.addEventListener('timeout', () => {
                    console.error('DM Upload timeout');
                    this.dmIsUploading = false;
                    const dmUploadProgress = document.getElementById('dmUploadProgress');
                    if (dmUploadProgress) {
                        dmUploadProgress.classList.add('hidden');
                    }
                    reject(new Error('Upload timeout'));
                });
                
                xhr.timeout = 30000; // 30 second timeout
                xhr.open('POST', '/upload');
                xhr.send(formData);
            });
            
        } catch (error) {
            console.error('DM Upload error:', error);
            this.dmIsUploading = false;
            const dmUploadProgress = document.getElementById('dmUploadProgress');
            if (dmUploadProgress) {
                dmUploadProgress.classList.add('hidden');
            }
            throw error;
        }
    }
    
    updateDMUploadProgress(percentage, text) {
        const dmUploadProgress = document.getElementById('dmUploadProgress');
        if (!dmUploadProgress) return;
        
        const progressFill = dmUploadProgress.querySelector('.progress-fill');
        const progressText = dmUploadProgress.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage * 100}%`;
        }
        if (progressText) {
            progressText.textContent = text;
        }
    }
    
    closeDMModal() {
        const dmModal = document.getElementById('dmModal');
        if (dmModal) {
            dmModal.remove();
        }
        this.currentDMUser = null;
    }
    
    sendDMMessage(targetUsername, content, attachments = []) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'dmMessage',
                targetUsername: targetUsername,
                content: content,
                attachments: attachments
            }));
        }
    }
    
    requestDMHistory(targetUsername) {
        console.log('Requesting DM history for:', targetUsername);
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('WebSocket is open, sending getDMHistory request');
            this.socket.send(JSON.stringify({
                type: 'getDMHistory',
                targetUsername: targetUsername
            }));
            
            // Set a timeout to handle cases where the server doesn't respond
            setTimeout(() => {
                const dmChatHistory = document.getElementById('dmChatHistory');
                if (dmChatHistory && dmChatHistory.innerHTML.includes('Loading conversation...')) {
                    console.log('DM history request timed out, showing empty conversation');
                    dmChatHistory.innerHTML = '<div class="dm-empty">Start a conversation! 💬</div>';
                }
            }, 5000); // 5 second timeout
        } else {
            console.log('WebSocket not ready, clearing loading state');
            const dmChatHistory = document.getElementById('dmChatHistory');
            if (dmChatHistory) {
                dmChatHistory.innerHTML = '<div class="dm-empty">Start a conversation! 💬</div>';
            }
        }
    }
    
    handleDMMessage(data) {
        // Determine the other participant in the conversation
        const otherUser = data.senderUsername === this.username ? data.targetUsername : data.senderUsername;
        
        // Generate conversation key for this DM
        const conversationKey = this.getDMConversationKey(this.username, otherUser);
        
        // Store the message in the conversation history
        if (!this.dmConversations.has(conversationKey)) {
            this.dmConversations.set(conversationKey, []);
        }
        
        const conversation = this.dmConversations.get(conversationKey);
        
        // Only add if it's not already there (prevent duplicates)
        if (!conversation.find(msg => msg.id === data.id)) {
            conversation.push(data);
        }
        
        // Check if this is for the current user and if DM modal is open
        const isForCurrentUser = data.targetUsername === this.username || data.senderUsername === this.username;
        const isDMModalOpen = this.currentDMUser && 
            (this.currentDMUser.username === data.senderUsername || this.currentDMUser.username === data.targetUsername);
        
        if (isForCurrentUser) {
            if (isDMModalOpen) {
                // If DM modal is open for this conversation, display in modal
                const currentConversationKey = this.getDMConversationKey(this.username, this.currentDMUser.username);
                if (conversationKey === currentConversationKey) {
                    this.displayDMMessage(data);
                }
            } else if (data.senderUsername !== this.username) {
                // Check if user is in a DM modal with someone else
                if (this.currentDMUser && this.currentDMUser.username !== data.senderUsername) {
                    // Show toast notification above DM modal
                    this.showDMToastNotification(data);
                } else {
                    // If DM modal is NOT open and this is an incoming message, show notification in global chat
                    this.showDMNotificationInGlobalChat(data);
                }
            }
        }
        
        // Play notification sound for incoming DMs (not from self)
        if (data.senderUsername !== this.username) {
            this.playNotificationSound();
        }
    }
    
    showDMToastNotification(dmData) {
        // Remove any existing toast notifications
        const existingToast = document.querySelector('.dm-toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast notification element
        const toast = document.createElement('div');
        toast.className = 'dm-toast-notification';
        
        // Create toast content
        const toastContent = document.createElement('div');
        toastContent.className = 'dm-toast-content';
        
        // Create sender info
        const senderInfo = document.createElement('div');
        senderInfo.className = 'dm-toast-sender';
        senderInfo.textContent = `DM from ${dmData.senderUsername}`;
        senderInfo.style.color = dmData.senderColor;
        
        // Create message preview (truncate if too long)
        const messagePreview = document.createElement('div');
        messagePreview.className = 'dm-toast-message';
        const plainContent = dmData.content.replace(/<[^>]*>/g, ''); // Remove HTML tags
        const truncatedContent = plainContent.length > 50 ? plainContent.substring(0, 50) + '...' : plainContent;
        messagePreview.textContent = truncatedContent;
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'dm-toast-close';
        closeButton.textContent = '×';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toast.remove();
        });
        
        // Add click handler to open DM with sender
        toast.addEventListener('click', () => {
            // Close current DM and open new one
            this.openDMModal({ username: dmData.senderUsername, color: dmData.senderColor });
            toast.remove();
        });
        
        // Assemble toast
        toastContent.appendChild(senderInfo);
        toastContent.appendChild(messagePreview);
        toast.appendChild(toastContent);
        toast.appendChild(closeButton);
        
        // Add to DOM
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300); // Wait for fade-out animation
            }
        }, 5000);
    }
    
    showDMNotificationInGlobalChat(dmData) {
        // Create a special notification message that looks like a chat message but is a DM notification
        const notificationData = {
            type: 'dmNotification', // Special type for DM notifications
            id: `dm-notif-${dmData.id}`, // Unique ID for the notification
            username: 'DM System', // System username
            color: '#888', // Gray color for system
            content: dmData.content,
            timestamp: dmData.timestamp,
            dmSender: dmData.senderUsername,
            dmSenderColor: dmData.senderColor,
            originalDMData: dmData // Store original DM data for opening modal
        };
        
        // Display the notification in global chat
        this.displayMessage(notificationData);
    }
    
    handleDMHistory(data) {
        console.log('Received DM history:', data);
        
        // Validate the data structure
        if (!data || !data.targetUsername || !Array.isArray(data.messages)) {
            console.error('Invalid DM history data received:', data);
            this.showDMError('Invalid conversation data received');
            return;
        }
        
        // Generate conversation key for this DM history
        const conversationKey = this.getDMConversationKey(this.username, data.targetUsername);
        
        // Store the conversation history using the conversation key
        this.dmConversations.set(conversationKey, data.messages);
        
        // If the DM modal is open for this user, display the history
        if (this.currentDMUser && this.currentDMUser.username === data.targetUsername) {
            this.displayDMHistory(data.messages);
        } else {
            console.log('DM modal not open for this user, just storing history');
        }
    }
    
    displayDMHistory(messages) {
        console.log('Displaying DM history:', messages);
        const dmChatHistory = document.getElementById('dmChatHistory');
        if (!dmChatHistory) {
            console.error('DM chat history element not found');
            return;
        }
        
        // Clear the loading state
        dmChatHistory.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            console.log('No messages to display, showing empty state');
            dmChatHistory.innerHTML = '<div class="dm-empty">Start a conversation! 💬</div>';
            return;
        }
        
        console.log(`Displaying ${messages.length} DM messages`);
        messages.forEach((message, index) => {
            try {
                this.displayDMMessage(message, false); // false = don't scroll yet
            } catch (error) {
                console.error(`Error displaying message ${index}:`, error, message);
            }
        });
        
        // Scroll to bottom after loading all messages
        this.scrollDMToBottom();
    }
    
    displayDMMessage(data, shouldScroll = true) {
        const dmChatHistory = document.getElementById('dmChatHistory');
        if (!dmChatHistory) return;
        
        // Check if this message is already displayed (prevent duplicates)
        const existingMessage = dmChatHistory.querySelector(`[data-message-id="${data.id}"]`);
        if (existingMessage) {
            return; // Message already displayed
        }
        
        // Remove loading message if it exists
        const loadingDiv = dmChatHistory.querySelector('.dm-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        
        // Remove empty message if it exists
        const emptyDiv = dmChatHistory.querySelector('.dm-empty');
        if (emptyDiv) {
            emptyDiv.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'dm-message';
        messageDiv.setAttribute('data-message-id', data.id); // Add unique identifier
        
        // Check if this message is from the current user
        const isOwnMessage = data.senderUsername === this.username;
        if (isOwnMessage) {
            messageDiv.classList.add('dm-message-own');
        }
        
        const timestamp = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Create message header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'dm-message-header';
        headerDiv.innerHTML = `
            <span class="dm-message-sender" style="color: ${data.senderColor}">${data.senderUsername}</span>
            <span class="dm-message-time">${timestamp}</span>
        `;
        messageDiv.appendChild(headerDiv);
        
        // Add text content if it exists
        if (data.content && data.content.trim()) {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'dm-message-content';
            
            // Check for line breaks and add class
            if (data.content.includes('\n')) {
                contentDiv.classList.add('has-line-breaks');
            }
            
            // Process content with markdown, emojis, and mentions
            const processedContent = this.processEmojis(data.content);
            const markdownContent = this.processMarkdown(processedContent);
            const censoredContent = this.censorSwearWords(markdownContent);
            const mentionedContent = this.processMentions(censoredContent);
            
            contentDiv.innerHTML = mentionedContent;
            
            // Add click handlers for links in DM
            const links = contentDiv.querySelectorAll('.message-link');
            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    this.handleLinkClick(e, link.dataset.url);
                });
            });
            
            messageDiv.appendChild(contentDiv);
        }
        
        // Add attachments if they exist
        if (data.attachments && data.attachments.length > 0) {
            const attachmentsDiv = document.createElement('div');
            attachmentsDiv.className = 'dm-message-attachments';
            
            data.attachments.forEach(attachment => {
                const attachmentElement = this.createAttachmentElement(attachment);
                attachmentsDiv.appendChild(attachmentElement);
            });
            
            messageDiv.appendChild(attachmentsDiv);
        }
        
        dmChatHistory.appendChild(messageDiv);
        
        if (shouldScroll) {
            this.scrollDMToBottom();
        }
    }
    
    scrollDMToBottom() {
        const dmChatHistory = document.getElementById('dmChatHistory');
        if (dmChatHistory) {
            dmChatHistory.scrollTop = dmChatHistory.scrollHeight;
        }
    }
    
    showDMError(message) {
        console.log('DM Error:', message);
        // Show error in the DM modal if it's open
        const dmChatHistory = document.getElementById('dmChatHistory');
        if (dmChatHistory) {
            // Clear any loading state first
            dmChatHistory.innerHTML = '';
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'dm-error';
            errorDiv.textContent = `Error: ${message}`;
            dmChatHistory.appendChild(errorDiv);
            this.scrollDMToBottom();
        } else {
            // Show as system message if DM modal is not open
            this.showSystemMessage(`DM Error: ${message}`);
        }
    }

    openClickMeModal() {
        this.clickMeModal.classList.remove('hidden');
        
        // Process markdown in changelog content
        this.processChangelogMarkdown();
        
        // Add event listeners for tabs and changelog categories
        this.setupClickMeModalListeners();
    }

    closeClickMeModal() {
        this.clickMeModal.classList.add('hidden');
        
        // Clean up event listeners
        this.cleanupClickMeModalListeners();
    }
    
    setupClickMeModalListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.click-me-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchClickMeTab(targetTab);
            });
        });
        
        // Changelog category switching
        const categoryBtns = document.querySelectorAll('.changelog-category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetCategory = e.target.dataset.category;
                this.switchChangelogCategory(targetCategory);
            });
        });
    }
    
    cleanupClickMeModalListeners() {
        // Remove event listeners to prevent memory leaks
        const tabs = document.querySelectorAll('.click-me-tab');
        tabs.forEach(tab => {
            tab.replaceWith(tab.cloneNode(true));
        });
        
        const categoryBtns = document.querySelectorAll('.changelog-category-btn');
        categoryBtns.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
    }
    
    switchClickMeTab(targetTab) {
        // Update tab buttons
        document.querySelectorAll('.click-me-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.click-me-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${targetTab}-tab`).classList.add('active');
    }
    
    switchChangelogCategory(targetCategory) {
        // Update category buttons
        document.querySelectorAll('.changelog-category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${targetCategory}"]`).classList.add('active');
        
        // Update category content
        document.querySelectorAll('.changelog-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${targetCategory}-changelog`).classList.add('active');
    }

    // Auto-focus helper methods
    shouldAutoFocusInput(e) {
        // Don't auto-focus if any input/textarea is already focused
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return false;
        }
        
        // Don't auto-focus if any modal is open
        if (!this.settingsModal.classList.contains('hidden') ||
            !this.emojiPickerModal.classList.contains('hidden') ||
            !this.clickMeModal.classList.contains('hidden') ||
            !this.mentionDropdown.classList.contains('hidden')) {
            return false;
        }
        
        // Don't auto-focus for special keys
        const specialKeys = ['Escape', 'Tab', 'Enter', 'Shift', 'Control', 'Alt', 'Meta', 
                           'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 
                           'PageUp', 'PageDown', 'Delete', 'Backspace', 'F1', 'F2', 'F3', 
                           'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
        
        if (specialKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
            return false;
        }
        
        // Check if it's a printable character
        return e.key.length === 1;
    }
    
    autoFocusChatInput(e) {
        // Check if DM modal is open
        const dmModal = document.querySelector('.dm-modal');
        if (dmModal && !dmModal.classList.contains('hidden')) {
            const dmInput = dmModal.querySelector('.dm-chat-input');
            if (dmInput && !dmInput.disabled) {
                dmInput.focus();
                // Place cursor at end and insert the typed character
                dmInput.setSelectionRange(dmInput.value.length, dmInput.value.length);
                dmInput.value += e.key;
                e.preventDefault();
                return;
            }
        }
        
        // Otherwise focus the main chat input
        if (this.chatInput && !this.chatInput.disabled && !this.loginScreen.classList.contains('hidden') === false) {
            this.chatInput.focus();
            // Place cursor at end and insert the typed character
            this.chatInput.setSelectionRange(this.chatInput.value.length, this.chatInput.value.length);
            this.chatInput.value += e.key;
            e.preventDefault();
        }
    }

    processChangelogMarkdown() {
        // process markdown in changelog sections without losing line breaks
        const changelogSections = document.querySelectorAll('.changelog-section:not([data-processed])');
        changelogSections.forEach(section => {
            // process each text node individually to preserve HTML structure
            this.processTextNodesRecursively(section);
            section.setAttribute('data-processed', 'true');
        });
    }

    processTextNodesRecursively(element) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        textNodes.forEach(textNode => {
            const originalText = textNode.textContent;
            const processedText = this.processMarkdown(originalText);
            
            if (originalText !== processedText) {
                // create a temporary container to parse the HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = processedText;
                
                // replace the text node with the processed content
                const parent = textNode.parentNode;
                while (tempDiv.firstChild) {
                    parent.insertBefore(tempDiv.firstChild, textNode);
                }
                parent.removeChild(textNode);
            }
        });
    }

    handleClearChatCommand() {
        // Clear chat locally only (for this user)
        const chatHistory = document.getElementById('chatHistory');
        if (chatHistory) {
            chatHistory.innerHTML = '';
        }
        
        // Show local system message
        this.showSystemMessage('Chat cleared locally (only for you)');
    }

    handleUnspoilerImagesCommand() {
        this.currentSettings.safety.spoilerImages = false;
        this.saveSafetySettings();
        this.applySafetySettings();
    }
    
    // Attachment ID handling methods
    addAttachmentIDsToInput() {
        // Generate unique IDs for all pending files and add them to chat input
        if (this.pendingFiles.length === 0) return;
        
        const attachmentIDs = [];
        this.pendingFiles.forEach(file => {
            const id = Math.random().toString(36).substr(2, 8);
            // Store in global registry for later retrieval
            window.attachmentRegistry = window.attachmentRegistry || new Map();
            window.attachmentRegistry.set(id, file);
            attachmentIDs.push(`$${id}$`);
        });
        
        // Append IDs to input
        const currentValue = this.chatInput.value;
        this.chatInput.value = currentValue + (currentValue ? ' ' : '') + attachmentIDs.join(' ');
    }
    
    addAttachmentIDsToDMInput(dmInputElement) {
        // Generate unique IDs for all pending DM files and add them to DM input
        if (this.pendingDMFiles.length === 0) return;
        
        const attachmentIDs = [];
        this.pendingDMFiles.forEach(file => {
            const id = Math.random().toString(36).substr(2, 8);
            // Store in global registry for later retrieval
            window.attachmentRegistry = window.attachmentRegistry || new Map();
            window.attachmentRegistry.set(id, file);
            attachmentIDs.push(`$${id}$`);
        });
        
        // Append IDs to input
        const currentValue = dmInputElement.value;
        dmInputElement.value = currentValue + (currentValue ? ' ' : '') + attachmentIDs.join(' ');
    }
    
    processAttachmentIDs(content) {
        // Replace attachment ID references with their actual HTML elements
        if (!content || typeof content !== 'string') return content;
        
        return content.replace(/\$([a-zA-Z0-9]+)\$/g, (match, id) => {
            // Get attachment from global registry
            const registry = window.attachmentRegistry || new Map();
            const attachment = registry.get(id);
            
            if (attachment) {
                // Prioritize originalName over name for consistency
                const displayName = attachment.originalName || attachment.name || 'Unknown File';
                return `<span class="attachment-reference" data-attachment-id="${id}" title="${displayName}">📎 ${displayName}</span>`;
            }
            
            // If attachment not found, return the original ID
            return match;
        });
    }

    autoResizeDMTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    handleLocalClearChatCommand() {
        // Clear chat locally only (for this user)
        const chatHistory = document.getElementById('chatHistory');
        if (chatHistory) {
            chatHistory.innerHTML = '';
        }
        
        // Show local system message
        this.showSystemMessage('Chat cleared locally (only for you)');
    }

    handleServerClearChatCommand() {
        // Send server clear chat command to server
        this.socket.send(JSON.stringify({
            type: 'serverClearChat'
        }));
    }

    // Device fingerprinting for ban evasion detection
    async generateDeviceFingerprint() {
        const fingerprint = [];
        
        try {
            // Screen information
            fingerprint.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
            fingerprint.push(`avail:${screen.availWidth}x${screen.availHeight}`);
            
            // Timezone
            fingerprint.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
            fingerprint.push(`tzOffset:${new Date().getTimezoneOffset()}`);
            
            // Language and locale
            fingerprint.push(`lang:${navigator.language}`);
            fingerprint.push(`langs:${navigator.languages ? navigator.languages.join(',') : 'none'}`);
            
            // User agent (simplified)
            const ua = navigator.userAgent;
            fingerprint.push(`ua:${btoa(ua).slice(0, 20)}`); // Base64 encoded and truncated for privacy
            
            // Platform
            fingerprint.push(`platform:${navigator.platform}`);
            
            // Hardware concurrency (CPU cores)
            if (navigator.hardwareConcurrency) {
                fingerprint.push(`cores:${navigator.hardwareConcurrency}`);
            }
            
            // Memory (if available)
            if (navigator.deviceMemory) {
                fingerprint.push(`memory:${navigator.deviceMemory}`);
            }
            
            // WebGL vendor and renderer (for GPU fingerprinting)
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                        fingerprint.push(`gpu:${btoa(vendor + renderer).slice(0, 15)}`);
                    }
                }
            } catch (e) {
                fingerprint.push('gpu:unavailable');
            }
            
            // Canvas fingerprinting (reduced for privacy)
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillText('🌐🔒', 2, 2);
                const canvasData = canvas.toDataURL();
                const hash = this.simpleHash(canvasData);
                fingerprint.push(`canvas:${hash}`);
            } catch (e) {
                fingerprint.push('canvas:unavailable');
            }
            
            // Audio context fingerprinting (basic)
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const analyser = audioContext.createAnalyser();
                const gain = audioContext.createGain();
                
                oscillator.connect(analyser);
                analyser.connect(gain);
                gain.connect(audioContext.destination);
                
                oscillator.frequency.value = 1000;
                const audioHash = this.simpleHash(audioContext.sampleRate + ':' + audioContext.baseLatency + ':' + analyser.fftSize);
                fingerprint.push(`audio:${audioHash}`);
                
                audioContext.close();
            } catch (e) {
                fingerprint.push('audio:unavailable');
            }
            
            // Local storage test (for storage fingerprinting)
            try {
                const testKey = 'fp_test_' + Date.now();
                localStorage.setItem(testKey, 'test');
                const canStore = localStorage.getItem(testKey) === 'test';
                localStorage.removeItem(testKey);
                fingerprint.push(`storage:${canStore}`);
            } catch (e) {
                fingerprint.push('storage:false');
            }
            
        } catch (error) {
            console.error('Error generating fingerprint:', error);
            fingerprint.push('error:' + error.message.slice(0, 10));
        }
        
        // Combine all fingerprint components and hash
        const combined = fingerprint.join('|');
        const finalHash = this.simpleHash(combined);
        
        console.log('🔍 Device fingerprint generated:', finalHash);
        return finalHash;
    }
    
    // Simple hash function for fingerprinting
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString(36);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    
    // Send device fingerprint to server
    async sendDeviceFingerprint() {
        try {
            const fingerprint = await this.generateDeviceFingerprint();
            
            this.socket.send(JSON.stringify({
                type: 'fingerprint',
                fingerprint: fingerprint
            }));
            
            console.log('🔒 Device fingerprint sent to server');
        } catch (error) {
            console.error('Failed to send fingerprint:', error);
            // Send a fallback fingerprint if generation fails
            this.socket.send(JSON.stringify({
                type: 'fingerprint',
                fingerprint: 'fallback_' + Date.now()
            }));
        }
    }

    handleWindowResize() {
        // Throttle resize updates to avoid performance issues
        if (this.resizeThrottle) {
            clearTimeout(this.resizeThrottle);
        }
        
        this.resizeThrottle = setTimeout(() => {
            // Update all existing cursors to their new absolute positions
            this.cursors.forEach((cursor, userId) => {
                // Get stored relative coordinates if available
                const relativeX = parseFloat(cursor.dataset.relativeX) || 50; // Default to center
                const relativeY = parseFloat(cursor.dataset.relativeY) || 50;
                
                // Convert to new absolute positions
                const chatScreen = this.chatScreen;
                const rect = chatScreen.getBoundingClientRect();
                const absoluteX = rect.left + (relativeX / 100) * rect.width;
                const absoluteY = rect.top + (relativeY / 100) * rect.height;
                
                // Update cursor position
                cursor.style.transform = `translate3d(${absoluteX}px, ${absoluteY}px, 0)`;
                
                // Update stored absolute positions
                cursor.dataset.prevX = absoluteX;
                cursor.dataset.prevY = absoluteY;
                cursor.dataset.targetX = absoluteX;
                cursor.dataset.targetY = absoluteY;
            });
        }, 100); // Throttle to 100ms for performance
    }

    startCursorInterpolation(cursor, userId) {
        // Ultra-smooth interpolation at 144fps using requestAnimationFrame
        const interpolate = () => {
            if (!this.cursors.has(userId)) {
                return; // Stop if cursor was removed
            }
            
            const currentX = parseFloat(cursor.dataset.currentX);
            const currentY = parseFloat(cursor.dataset.currentY);
            const targetX = parseFloat(cursor.dataset.targetX);
            const targetY = parseFloat(cursor.dataset.targetY);
            
            // Ultra-smooth easing with adaptive smoothing
            const deltaX = targetX - currentX;
            const deltaY = targetY - currentY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Adaptive smoothing - faster for larger movements, ultra-smooth for small ones
            let smoothingFactor;
            if (distance > 100) {
                smoothingFactor = 0.35; // Fast for large jumps
            } else if (distance > 50) {
                smoothingFactor = 0.25; // Medium for moderate movements
            } else if (distance > 10) {
                smoothingFactor = 0.15; // Smooth for small movements
            } else if (distance > 2) {
                smoothingFactor = 0.08; // Ultra-smooth for tiny movements
            } else {
                smoothingFactor = 0.05; // Extremely smooth for micro-movements
            }
            
            // Apply smoothing with sub-pixel precision
            const newX = currentX + deltaX * smoothingFactor;
            const newY = currentY + deltaY * smoothingFactor;
            
            // Update position with high precision
            cursor.dataset.currentX = newX;
            cursor.dataset.currentY = newY;
            
            // Apply transform with hardware acceleration and sub-pixel rendering
            cursor.style.transform = `translate3d(${newX.toFixed(3)}px, ${newY.toFixed(3)}px, 0)`;
            cursor.style.willChange = 'transform';
            
            // Continue interpolation loop
            requestAnimationFrame(interpolate);
        };
        
        // Start the ultra-smooth interpolation loop
        requestAnimationFrame(interpolate);
    }

    sendTabbedStatus(isTabbed) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'tabbedStatus',
                isTabbed: isTabbed
            }));
        }
    }

    rgbToHex(r, g, b) {
        const h = (n) => n.toString(16).padStart(2, '0');
        return `#${h(r)}${h(g)}${h(b)}`;
    }

    relativeLuminance(hex) {
        // Convert hex to RGB
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        // Calculate relative luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        return luminance;
    }

    // Infer a basic mime type from a filename (client-side fallback)
    inferMimeFromName(name) {
        if (!name) return '';
        const ext = name.toLowerCase().split('.').pop();
        switch (ext) {
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'gif': return 'image/gif';
            case 'webp': return 'image/webp';
            case 'mp4': return 'video/mp4';
            case 'webm': return 'video/webm';
            case 'mov': return 'video/quicktime';
            case 'mp3': return 'audio/mpeg';
            case 'wav': return 'audio/wav';
            case 'ogg': return 'audio/ogg';
            case 'pdf': return 'application/pdf';
            case 'txt': return 'text/plain';
            case 'json': return 'application/json';
            case 'md': return 'text/markdown';
            case 'zip': return 'application/zip';
            default: return '';
        }
    }

    // Auto-adjust colors functionality
    initializeAutoAdjustColors() {
        if (!this.currentSettings.appearance.autoAdjustColors) return;
        
        // Create a canvas for color sampling
        this.colorCanvas = document.createElement('canvas');
        this.colorCanvas.width = 1;
        this.colorCanvas.height = 1;
        this.colorCanvas.style.display = 'none';
        document.body.appendChild(this.colorCanvas);
        this.colorContext = this.colorCanvas.getContext('2d');
        
        // Set up scroll listener for dynamic color adjustment
        this.chatHistory.addEventListener('scroll', () => {
            if (this.currentSettings.appearance.autoAdjustColors) {
                this.adjustMessageColors();
            }
        });
        
        // Initial adjustment
        this.adjustMessageColors();
    }

    getBackgroundColorAtPosition(element) {
        // Get the element's position relative to the viewport
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        // Get the background gradient colors
        const color1 = this.currentSettings.appearance.gradientColor1;
        const color2 = this.currentSettings.appearance.gradientColor2;
        
        // Calculate the gradient position based on Y coordinate
        const viewportHeight = window.innerHeight;
        const gradientProgress = Math.max(0, Math.min(1, y / viewportHeight));
        
        // Interpolate between the two gradient colors
        return this.interpolateColors(color1, color2, gradientProgress);
    }

    interpolateColors(color1, color2, progress) {
        // Convert hex colors to RGB
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        // Interpolate each component
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * progress);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * progress);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * progress);
        
        return this.rgbToHex(r, g, b);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return { h: h * 360, s: s, l: l };
    }

    hslToHex(h, s, l) {
        h /= 360;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h * 12) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    getReadableTextColor(backgroundColor, originalColor = null) {
        const luminance = this.relativeLuminance(backgroundColor);
        
        // If background is light, use dark text; if dark, use light text
        if (luminance > 0.5) {
            // Light background - use dark text
            if (originalColor) {
                // Try to preserve some of the original color's hue while making it dark
                const rgb = this.hexToRgb(originalColor);
                const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
                // Keep the hue, set low lightness for dark text
                return this.hslToHex(hsl.h, hsl.s, 0.2);
            }
            return '#000000';
        } else {
            // Dark background - use light text
            if (originalColor) {
                // Try to preserve some of the original color's hue while making it light
                const rgb = this.hexToRgb(originalColor);
                const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
                // Keep the hue, set high lightness for light text
                return this.hslToHex(hsl.h, hsl.s, 0.9);
            }
            return '#ffffff';
        }
    }

    adjustMessageColors() {
        if (!this.currentSettings.appearance.autoAdjustColors) return;
        
        const messages = document.querySelectorAll('.chat-message .message-content');
        
        messages.forEach(messageElement => {
            const backgroundColor = this.getBackgroundColorAtPosition(messageElement);
            // Get the original color from the message data or use a default
            const originalColor = messageElement.dataset.originalColor || '#ffffff';
            const readableColor = this.getReadableTextColor(backgroundColor, originalColor);
            
            // Apply the readable color
            messageElement.style.color = readableColor;
        });
    }

    toggleAutoAdjustColors() {
        this.currentSettings.appearance.autoAdjustColors = this.autoAdjustColors.checked;
        
        if (this.currentSettings.appearance.autoAdjustColors) {
            this.initializeAutoAdjustColors();
        } else {
            // Reset all message colors to their original colors
            const messages = document.querySelectorAll('.chat-message .message-content');
            messages.forEach(messageElement => {
                messageElement.style.color = '';
            });
        }
        
        // Save settings
        this.saveAppearanceSettings();
    }

    // Quick delete Shift key handlers
    handleShiftKeyDown() {
        // Find the currently hovered message
        const hoveredMessage = document.querySelector('.chat-message:hover');
        if (hoveredMessage) {
            const hoverControls = hoveredMessage.querySelector('.message-hover-controls');
            if (hoverControls && !hoverControls.classList.contains('quick-delete')) {
                // Remove current hover controls and show quick delete
                hoverControls.remove();
                
                // Trigger quick delete for this message
                const messageData = hoveredMessage.messageData;
                if (messageData && messageData.username === this.username) {
                    this.showQuickDeleteForMessage(hoveredMessage, messageData);
                }
            }
        }
    }

    handleShiftKeyUp() {
        // Find the currently hovered message
        const hoveredMessage = document.querySelector('.chat-message:hover');
        if (hoveredMessage) {
            const hoverControls = hoveredMessage.querySelector('.message-hover-controls');
            if (hoverControls && hoverControls.classList.contains('quick-delete')) {
                // Remove quick delete controls and show normal hover
                hoverControls.remove();
                
                // Trigger normal hover for this message
                const messageData = hoveredMessage.messageData;
                if (messageData) {
                    this.showNormalHoverForMessage(hoveredMessage, messageData);
                }
            }
        }
    }

    showQuickDeleteForMessage(messageDiv, data) {
        const hoverElements = document.createElement('div');
        hoverElements.className = 'message-hover-controls quick-delete';
        
        hoverElements.innerHTML = `
            <button class="quick-delete-btn" title="Quick delete (Shift + hover)">🗑️</button>
            <span class="message-timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span>
        `;
        
        const deleteBtn = hoverElements.querySelector('.quick-delete-btn');
        
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Quick delete without confirmation
            this.quickDeleteMessage(data, messageDiv);
        });
        
        messageDiv.appendChild(hoverElements);
    }

    showNormalHoverForMessage(messageDiv, data) {
        const hoverElements = document.createElement('div');
        hoverElements.className = 'message-hover-controls';
        
        const timestamp = new Date(data.timestamp).toLocaleTimeString();
        const isOwnMessage = data.username === this.username;
        
        if (isOwnMessage) {
            // Show three-dot menu for own messages
            hoverElements.innerHTML = `
                <button class="menu-btn" title="Message options">⋮</button>
                <span class="message-timestamp">${timestamp}</span>
            `;
            
            const menuBtn = hoverElements.querySelector('.menu-btn');
            
            menuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                this.showMessageModal(data, messageDiv);
            });
        } else {
            // Show reply button for other messages
            hoverElements.innerHTML = `
                <button class="reply-btn" title="Reply to this message">↺</button>
                <span class="message-timestamp">${timestamp}</span>
            `;
            
            const replyBtn = hoverElements.querySelector('.reply-btn');
            
            replyBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startReply(data);
            });
            
            replyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startReply(data);
            });
        }
        
        messageDiv.appendChild(hoverElements);
    }
}

// Initialize the chat app when the page loads and expose globally
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
}); 