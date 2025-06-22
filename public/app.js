class ChatApp {
    constructor() {
        this.socket = null;
        this.username = '';
        this.userColor = '#ff6b6b';
        this.userWebsite = ''; // Add website field
        this.currentUserId = null;
        this.isTyping = false;
        this.typingTimeout = null;
        this.cursors = new Map(); // Store other users' cursors
        this.cursorThrottle = null; // For throttling cursor updates
        this.typingTimeouts = new Map(); // Track typing timeouts for cursors
        this.replyingTo = null; // Current message being replied to
        this.messageElements = new Map(); // Store message elements by ID for jumping
        this.autoScrollEnabled = true; // Auto scroll state
        this.currentSettings = {
            appearance: {
                gradientColor1: '#1a1a2e',
                gradientColor2: '#0f3460'
            },
            safety: {
                censorSwears: false,
                spoilerImages: true
            },
            notifications: {
                pingSound: true
            }
        };
        
        // Unread message tracking
        this.unreadCount = 0;
        this.isWindowFocused = true;
        this.faviconCanvas = null;
        this.faviconContext = null;
        this.originalFavicon = null;
        
        // Spam protection
        this.messageTimestamps = [];
        this.isMuted = false;
        this.muteEndTime = null;
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
        
        // Set initial auto scroll button state
        setTimeout(() => {
            this.updateAutoScrollButton();
        }, 100);
        
        // Global click handler for modal management
        document.addEventListener('click', (e) => {
            // Close modal if clicking outside of it
            if (e.target.closest('.message-menu-modal') && !e.target.closest('.message-menu-content')) {
                this.closeMessageModal();
            }
        });
    }
    
    initializeElements() {
        // Login elements
        this.loginScreen = document.getElementById('loginScreen');
        this.chatScreen = document.getElementById('chatScreen');
        this.usernameInput = document.getElementById('username');
        this.colorPicker = document.getElementById('colorPicker');
        this.joinButton = document.getElementById('joinButton');
        
        // Chat elements
        this.chatHistory = document.getElementById('chatHistory');
        this.chatInput = document.getElementById('chatInput');
        this.userList = document.getElementById('userContainer');
        this.onlineCount = document.getElementById('onlineCount');
        
        // File upload elements
        this.fileInput = document.getElementById('fileInput');
        this.attachButton = document.getElementById('attachButton');
        this.attachmentPreview = document.getElementById('attachmentPreview');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.chatInputContainer = document.querySelector('.chat-input-container');
        
        // Settings elements
        this.settingsIcon = document.getElementById('settingsIcon');
        this.autoScrollToggle = document.getElementById('autoScrollToggle');
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
        this.resetAppearance = document.getElementById('resetAppearance');
        this.censorSwears = document.getElementById('censorSwears');
        this.spoilerImages = document.getElementById('spoilerImages');
        
        // Notification settings
        this.pingSound = document.getElementById('pingSound');
        
        // Emoji picker elements
        this.emojiButton = document.getElementById('emojiButton');
        this.emojiPickerModal = document.getElementById('emojiPickerModal');
        this.closeEmojiPicker = document.getElementById('closeEmojiPicker');
        this.emojiPickerBackdrop = document.querySelector('.emoji-picker-backdrop');
        this.emojiGrid = document.getElementById('emojiGrid');
        this.emojiCategories = document.querySelectorAll('.emoji-category');
        
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
        this.pendingFiles = [];
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
        });
        
        window.addEventListener('blur', () => {
            this.isWindowFocused = false;
        });
        
        // Track tab visibility
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.isWindowFocused = true;
                this.clearUnreadCount();
            } else {
                this.isWindowFocused = false;
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
        this.joinButton.addEventListener('click', () => this.joinChat());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinChat();
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
                this.fileInput.click();
            }
        });
        
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
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
        
        // Auto scroll toggle
        this.autoScrollToggle.addEventListener('click', () => {
            this.toggleAutoScroll();
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
        });
        
        // Mouse tracking for live cursors
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        // Emoji picker events
        this.emojiButton.addEventListener('click', () => {
            this.openEmojiPicker();
        });

        this.closeEmojiPicker.addEventListener('click', () => {
            this.closeEmojiPickerModal();
        });

        this.emojiPickerBackdrop.addEventListener('click', () => {
            this.closeEmojiPickerModal();
        });

        // Emoji category navigation
        this.emojiCategories.forEach(category => {
            category.addEventListener('click', () => {
                this.switchEmojiCategory(category.dataset.category);
            });
        });
        
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
                
                // Auto-join if username exists
                if (account.username && account.username.trim()) {
                    setTimeout(() => {
                        this.joinChat();
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
    
    joinChat() {
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
        
        this.connectWebSocket();
        this.showChatScreen();
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('Connected to chat server');
            this.socket.send(JSON.stringify({
                type: 'join',
                username: this.username,
                color: this.userColor,
                website: this.userWebsite || '' // Include website
            }));
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.socket.onclose = () => {
            console.log('Disconnected from chat server');
            this.showSystemMessage('Disconnected from server. Please refresh to reconnect.');
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showSystemMessage('Connection error. Please refresh to try again.');
        };
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'history':
                this.loadChatHistory(data.messages);
                break;
            case 'message':
                this.displayMessage(data);
                break;
            case 'userList':
                this.updateUserList(data.users, data.count);
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
            case 'cursor':
                this.updateCursor(data);
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
                
            case 'dmMessage':
                this.handleDMMessage(data);
                break;
                
            case 'dmHistory':
                this.handleDMHistory(data);
                break;
                
            case 'dmError':
                this.showDMError(data.message);
                break;
                
            case 'muted':
                // Handle IP mute notification from server
                this.handleServerMute(data);
                break;
                
            case 'systemError':
                // Handle system error messages (like invalid commands)
                this.showSystemMessage(`❌ Error: ${data.message}`);
                break;
        }
    }
    
    async sendMessage() {
        const content = this.chatInput.value.trim();
        
        // Check if user is muted
        if (this.isMuted) {
            this.showMuteModal();
            return;
        }
        
        // Don't send if uploading or if no content and no files
        if (this.isUploading || (!content && this.pendingFiles.length === 0)) return;

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

        // Debug: Log what we have in pendingFiles
        console.log('🔍 pendingFiles:', this.pendingFiles);
        console.log('🔍 pendingFiles structure:', this.pendingFiles.map(f => ({
            name: f.name || f.originalName,
            hasUrl: !!f.url,
            type: f.type || f.mimetype,
            keys: Object.keys(f)
        })));

        // Use already uploaded files (they were uploaded when selected)
        const attachments = this.pendingFiles.filter(file => file.url); // Only include uploaded files
        
        console.log('🔍 Filtered attachments:', attachments);
        
        // Don't send if only files and no uploaded files available
        if (!content && attachments.length === 0) return;

        const messageData = {
            type: 'message',
            content: content || '',
            attachments: attachments
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
        
        // Clear reply, input, and attachments
        this.clearReply();
        this.clearAttachments();
        this.chatInput.value = '';
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
        
        this.chatHistory.appendChild(messageElement);
        this.scrollToBottom();
        
        // Maintain max 128 messages
        const messages = this.chatHistory.children;
        if (messages.length > 128) {
            const removedMessage = messages[0];
            const removedId = removedMessage.dataset.messageId;
            if (removedId) {
                this.messageElements.delete(removedId);
            }
            removedMessage.remove();
        }
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
                // Process emojis first, then censor swear words
                const processedReplyContent = this.processEmojis(data.replyTo.content);
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
        // Process emojis, censor swear words, and process mentions
        const processedContent = this.processEmojis(data.content);
        const censoredContent = this.censorSwearWords(processedContent);
        const mentionedContent = this.processMentions(censoredContent);
        // Use innerHTML to render emojis and mentions properly
        contentSpan.innerHTML = mentionedContent;
        contentSpan.style.color = data.color;
        
        contentDiv.appendChild(usernameSpan);
        // Add a colon and space after username
        const separator = document.createElement('span');
        separator.textContent = ': ';
        separator.style.color = 'rgba(255, 255, 255, 0.8)';
        contentDiv.appendChild(separator);
        contentDiv.appendChild(contentSpan);
        
        messageElement.appendChild(contentDiv);
        
        // Add attachments if any
        if (data.attachments && data.attachments.length > 0) {
            const attachmentsDiv = document.createElement('div');
            attachmentsDiv.className = 'message-attachments';
            
            data.attachments.forEach(attachment => {
                const attachmentElement = this.createAttachmentElement(attachment);
                attachmentsDiv.appendChild(attachmentElement);
            });
            
            messageElement.appendChild(attachmentsDiv);
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
    
    loadChatHistory(messages) {
        this.chatHistory.innerHTML = '';
        // Don't track unread messages for initial history load
        const wasTrackingUnread = this.isWindowFocused;
        this.isWindowFocused = true; // Temporarily disable unread tracking
        
        messages.forEach(message => {
            this.displayMessage(message);
        });
        
        // Restore original focus state
        this.isWindowFocused = wasTrackingUnread;
    }
    
    updateUserList(users, count) {
        this.onlineCount.textContent = `${count} online:`;
        this.userList.innerHTML = '';
        
        // Get current online user IDs
        const onlineUserIds = new Set(users.map(user => user.id));
        
        // Clean up cursors for users who are no longer online
        this.cursors.forEach((cursor, userId) => {
            if (!onlineUserIds.has(userId)) {
                this.removeCursor(userId);
            }
        });
        
        users.forEach(user => {
            const userTag = document.createElement('button');
            userTag.className = 'user-tag clickable-username';
            userTag.textContent = user.username;
            userTag.style.borderColor = user.color;
            userTag.style.color = user.color;
            userTag.setAttribute('data-user-id', user.id);
            userTag.setAttribute('data-username', user.username);
            
            // Add click handler
            userTag.addEventListener('click', () => {
                this.handleUsernameClick(user);
            });
            
            this.userList.appendChild(userTag);
        });
    }
    
    showSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = message;
        
        this.chatHistory.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        if (this.autoScrollEnabled) {
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        }
    }
    
    toggleAutoScroll() {
        this.autoScrollEnabled = !this.autoScrollEnabled;
        this.updateAutoScrollButton();
        this.saveAutoScrollSetting();
    }
    
    saveAutoScrollSetting() {
        localStorage.setItem('chatAutoScroll', JSON.stringify(this.autoScrollEnabled));
    }
    
    updateAutoScrollButton() {
        if (this.autoScrollEnabled) {
            this.autoScrollToggle.classList.remove('disabled');
            this.autoScrollToggle.title = 'Auto Scroll: Enabled (Click to disable)';
        } else {
            this.autoScrollToggle.classList.add('disabled');
            this.autoScrollToggle.title = 'Auto Scroll: Disabled (Click to enable)';
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
            clearTimeout(this.cursorThrottle);
            this.cursorThrottle = null;
        }
        
        // Clean up all typing timeouts
        this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
        this.typingTimeouts.clear();
        
        // Clear reply state
        this.clearReply();
        this.messageElements.clear();
        
        // Disconnect socket
        if (this.socket) {
            this.socket.close();
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
        
        // Load auto scroll setting
        const savedAutoScroll = localStorage.getItem('chatAutoScroll');
        if (savedAutoScroll !== null) {
            try {
                this.autoScrollEnabled = JSON.parse(savedAutoScroll);
            } catch (error) {
                console.error('Error loading auto scroll setting:', error);
            }
        }
        
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
    }
    
    openSettings() {
        // Sync settings form with current values
        this.settingsUsername.value = this.username;
        this.settingsColor.value = this.userColor;
        this.settingsWebsite.value = this.userWebsite; // Add website field
        this.gradientColor1.value = this.currentSettings.appearance.gradientColor1;
        this.gradientColor2.value = this.currentSettings.appearance.gradientColor2;
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
        
        // Update username in real-time
        this.username = newUsername;
        this.usernameInput.value = newUsername;
        this.saveAccount();
        
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
    }
    
    applyAppearanceSettings() {
        const { gradientColor1, gradientColor2 } = this.currentSettings.appearance;
        
        // Update CSS custom properties for gradient
        document.body.style.background = `linear-gradient(135deg, ${gradientColor1} 0%, ${gradientColor2} 100%)`;
        
        // Update form values
        this.gradientColor1.value = gradientColor1;
        this.gradientColor2.value = gradientColor2;
    }
    
    saveAppearanceSettings() {
        localStorage.setItem('chatAppearance', JSON.stringify(this.currentSettings.appearance));
    }
    
    resetAppearanceSettings() {
        this.currentSettings.appearance = {
            gradientColor1: '#1a1a2e',
            gradientColor2: '#0f3460'
        };
        
        this.applyAppearanceSettings();
        this.saveAppearanceSettings();
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
        
        // Update current settings
        this.username = newUsername;
        this.userColor = newColor;
        this.userWebsite = newWebsite;
        
        // Also update the login form values
        this.usernameInput.value = newUsername;
        this.colorPicker.value = newColor;
        
        // Update localStorage
        const chatAccount = {
            username: newUsername,
            color: newColor,
            website: newWebsite,
            id: this.currentUserId,
            timestamp: Date.now()
        };
        
        localStorage.setItem('chatAccount', JSON.stringify(chatAccount));
        
        // Send update to server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'updateUser',
                username: newUsername,
                color: newColor,
                website: newWebsite
            }));
        }
        
        // Show success feedback
        const originalText = this.updateAccountButton.textContent;
        this.updateAccountButton.textContent = 'Saved!';
        this.updateAccountButton.style.background = 'rgba(34, 197, 94, 0.4)';
        
        setTimeout(() => {
            this.updateAccountButton.textContent = originalText;
            this.updateAccountButton.style.background = 'rgba(34, 197, 94, 0.2)';
        }, 1500);
    }

    handleMouseMove(e) {
        // Only track cursor when in chat and connected
        if (this.loginScreen.classList.contains('hidden') && 
            this.socket && 
            this.socket.readyState === WebSocket.OPEN) {
            
            // Store current mouse position for interpolation
            this.currentMouseX = e.clientX;
            this.currentMouseY = e.clientY;
            
            // Throttle cursor updates for performance - reduced for smoother experience
            if (this.cursorThrottle) {
                clearTimeout(this.cursorThrottle);
            }
            
            this.cursorThrottle = setTimeout(() => {
                // Add viewport offset compensation for more accurate positioning
                const rect = document.documentElement.getBoundingClientRect();
                const adjustedX = e.clientX - rect.left + window.scrollX;
                const adjustedY = e.clientY - rect.top + window.scrollY;
                
                this.socket.send(JSON.stringify({
                    type: 'cursor',
                    x: adjustedX,
                    y: adjustedY,
                    timestamp: Date.now() // Add timestamp for interpolation
                }));
            }, 16); // ~60fps for ultra-smooth experience
        }
    }

    updateCursor(data) {
        const cursorId = `cursor-${data.userId}`;
        let cursor = document.getElementById(cursorId);
        
        if (!cursor) {
            // Create new cursor
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
            
            // Initialize cursor data
            cursor.dataset.prevX = data.x;
            cursor.dataset.prevY = data.y;
            cursor.dataset.targetX = data.x;
            cursor.dataset.targetY = data.y;
            cursor.dataset.lastUpdate = Date.now();
            
            this.cursors.set(data.userId, cursor);
        }
        
        // Get previous position for smooth interpolation
        const prevX = parseFloat(cursor.dataset.prevX) || data.x;
        const prevY = parseFloat(cursor.dataset.prevY) || data.y;
        const lastUpdate = parseInt(cursor.dataset.lastUpdate) || Date.now();
        
        // Calculate movement delta and speed for enhanced effects
        const deltaX = Math.abs(data.x - prevX);
        const deltaY = Math.abs(data.y - prevY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const timeDelta = Date.now() - lastUpdate;
        const speed = timeDelta > 0 ? distance / timeDelta : 0;
        
        // Store target position for interpolation
        cursor.dataset.targetX = data.x;
        cursor.dataset.targetY = data.y;
        cursor.dataset.lastUpdate = Date.now();
        
        // Enhanced smooth animation with momentum-based easing
        const useMomentum = distance > 5; // Use momentum for larger movements
        const transitionDuration = useMomentum ? '0.15s' : '0.08s';
        const easing = useMomentum ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'cubic-bezier(0.4, 0.0, 0.2, 1)';
        
        cursor.style.transition = `transform ${transitionDuration} ${easing}`;
        cursor.style.transform = `translate3d(${data.x}px, ${data.y}px, 0)`;
        
        // Enhanced motion blur for fast movement with better thresholds
        const speedThreshold = useMomentum ? 0.8 : 1.2;
        if (speed > speedThreshold) {
            cursor.classList.add('moving');
            
            // Dynamic blur intensity based on speed
            const blurIntensity = Math.min(speed * 0.5, 2);
            cursor.style.filter = `blur(${blurIntensity}px)`;
            
            // Clear previous timeout and set new one
            clearTimeout(cursor.blurTimeout);
            cursor.blurTimeout = setTimeout(() => {
                cursor.classList.remove('moving');
                cursor.style.filter = '';
            }, 120);
        } else {
            cursor.classList.remove('moving');
            cursor.style.filter = '';
        }
        
        // Store current position for next comparison
        cursor.dataset.prevX = data.x;
        cursor.dataset.prevY = data.y;
        
        // Enhanced typing indicator with smoother transitions
        if (data.isTyping) {
            // Clear any existing timeout for this user
            const existingTimeout = this.typingTimeouts.get(data.userId);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }
            
            cursor.classList.add('typing');
            
            // Set timeout to remove typing indicator after inactivity
            const timeout = setTimeout(() => {
                cursor.classList.remove('typing');
                this.typingTimeouts.delete(data.userId);
            }, 1500);
            
            this.typingTimeouts.set(data.userId, timeout);
        } else {
            // Clear timeout and remove typing class immediately when user stops typing
            const existingTimeout = this.typingTimeouts.get(data.userId);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
                this.typingTimeouts.delete(data.userId);
            }
            cursor.classList.remove('typing');
        }
        
        // Update cursor info with enhanced smooth transitions
        const label = cursor.querySelector('.cursor-label');
        const dot = cursor.querySelector('.cursor-dot');
        
        if (label.textContent !== data.username) {
            label.style.transition = 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
            label.textContent = data.username;
        }
        
        if (dot.style.backgroundColor !== data.color) {
            dot.style.transition = 'background-color 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
            label.style.transition = 'background-color 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
            dot.style.backgroundColor = data.color;
            label.style.backgroundColor = data.color;
        }
        
        // Enhanced fade system with smoother timing
        cursor.classList.remove('fading');
        clearTimeout(cursor.fadeTimeout);
        cursor.fadeTimeout = setTimeout(() => {
            cursor.classList.add('fading');
        }, 3000); // Increased fade delay for better UX
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
        
        // Store the message data directly on the element for easy access
        messageDiv.messageData = data;
        
        const showHover = () => {
            if (hoverElements) return; // Already showing
            
            // Don't show hover effects for deleted messages
            if (messageDiv.classList.contains('message-deleted')) {
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
        
        messageDiv.addEventListener('mouseenter', showHover);
        messageDiv.addEventListener('mouseleave', hideHover);
        
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
        // Don't show modal for deleted messages
        if (messageDiv.classList.contains('message-deleted')) {
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
    }

    startReply(messageData) {
        console.log('Starting reply to:', messageData.username);
        if (!messageData || !messageData.id) {
            console.error('Invalid message data for reply');
            return;
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
        
        // Prevent actions on deleted messages
        if (messageDiv.classList.contains('message-deleted')) {
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
                
                // Add edited indicator if not already present
                if (!messageElement.querySelector('.message-edited-indicator')) {
                    const editedIndicator = document.createElement('span');
                    editedIndicator.className = 'message-edited-indicator';
                    editedIndicator.textContent = ' (edited)';
                    contentSpan.appendChild(editedIndicator);
                    console.log('🔧 Added edited indicator');
                }
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
                contentSpan.innerHTML = '<em class="message-deleted">message deleted by user</em>';
                
                // Mark the entire message as deleted
                messageElement.classList.add('message-deleted');
                
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
                
                // Close any open modals for this message
                this.closeMessageModal();
                
                console.log('🔧 Message marked as deleted');
            }
        }
    }

    // File Upload Methods
    handleFileSelection(files) {
        if (files.length === 0) return;
        
        const filesArray = Array.from(files);
        this.pendingFiles.push(...filesArray);
        this.updateAttachmentPreview();
        
        // Immediately start uploading files in the background
        this.uploadSelectedFiles();
    }

    async uploadSelectedFiles() {
        if (this.pendingFiles.length === 0 || this.isUploading) return;
        
        try {
            const uploadedFiles = await this.uploadFiles();
            
            // Replace pending files with uploaded file data
            this.pendingFiles = uploadedFiles;
            this.updateAttachmentPreview();
            
        } catch (error) {
            console.error('Failed to upload files:', error);
            // Show user-friendly error message
            this.updateUploadProgress(0, 'Upload failed. Please try again.');
            setTimeout(() => {
                this.uploadProgress.classList.add('hidden');
            }, 2000);
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
        if (this.pendingFiles.length === 0) {
            this.attachmentPreview.classList.add('hidden');
            return;
        }
        
        const previewHtml = this.pendingFiles.map((file, index) => {
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
                    <button class="remove-attachment" onclick="chatApp.removeAttachment(${index})">×</button>
                </div>
            `;
        }).join('');
        
        this.attachmentPreview.innerHTML = previewHtml;
        this.attachmentPreview.classList.remove('hidden');
    }

    createAttachmentList() {
        this.attachmentPreview.innerHTML = `
            <div class="attachment-header">
                <span class="attachment-title">${this.pendingFiles.length} file(s) attached</span>
                <button class="clear-attachments">Clear All</button>
            </div>
            <div class="attachment-list"></div>
        `;

        const clearButton = this.attachmentPreview.querySelector('.clear-attachments');
        clearButton.addEventListener('click', () => {
            this.clearAttachments();
        });

        return this.attachmentPreview.querySelector('.attachment-list');
    }

    clearAttachments() {
        this.pendingFiles = [];
        this.updateAttachmentPreview();
        this.fileInput.value = '';
    }

    removeAttachment(index) {
        this.pendingFiles.splice(index, 1);
        this.updateAttachmentPreview();
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
        if (this.pendingFiles.length === 0) return [];
        
        this.isUploading = true;
        this.uploadProgress.classList.remove('hidden');
        this.updateUploadProgress(0, 'Preparing upload...');
        
        try {
            const formData = new FormData();
            
            this.pendingFiles.forEach(file => {
                formData.append('files', file);
            });
            
            const xhr = new XMLHttpRequest();
            
            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const progress = e.loaded / e.total;
                        this.updateUploadProgress(progress, `Uploading... ${Math.round(progress * 100)}%`);
                    }
                });
                
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            this.updateUploadProgress(1, 'Upload complete!');
                            
                            // Hide progress after a short delay
                            setTimeout(() => {
                                this.isUploading = false;
                                this.uploadProgress.classList.add('hidden');
                            }, 500);
                            
                            resolve(response.files);
                        } catch (error) {
                            console.error('Failed to parse upload response:', error);
                            this.isUploading = false;
                            this.uploadProgress.classList.add('hidden');
                            reject(new Error('Invalid server response'));
                        }
                    } else {
                        console.error('Upload failed with status:', xhr.status);
                        this.isUploading = false;
                        this.uploadProgress.classList.add('hidden');
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                });
                
                xhr.addEventListener('error', (e) => {
                    console.error('Upload error:', e);
                    this.isUploading = false;
                    this.uploadProgress.classList.add('hidden');
                    reject(new Error('Upload failed'));
                });
                
                xhr.addEventListener('timeout', () => {
                    console.error('Upload timeout');
                    this.isUploading = false;
                    this.uploadProgress.classList.add('hidden');
                    reject(new Error('Upload timeout'));
                });
                
                xhr.timeout = 30000; // 30 second timeout
                xhr.open('POST', '/upload');
                xhr.send(formData);
            });
            
        } catch (error) {
            console.error('Upload error:', error);
            this.isUploading = false;
            this.uploadProgress.classList.add('hidden');
            throw error;
        }
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

    createAttachmentElement(attachment) {
        if (attachment.type.startsWith('image/')) {
            if (attachment.type === 'image/gif') {
                // Handle GIFs specially
                return this.createGifAttachment(attachment);
            } else {
                // Handle regular images
                return this.createImageAttachment(attachment);
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

    createImageAttachment(attachment) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'message-image-attachment';
        
        const img = document.createElement('img');
        img.src = attachment.url;
        img.alt = attachment.originalName;
        img.loading = 'lazy';
        
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
        const gifDiv = document.createElement('div');
        gifDiv.className = 'message-gif-attachment';
        
        const img = document.createElement('img');
        img.src = attachment.url;
        img.alt = attachment.originalName;
        img.loading = 'lazy';
        
        // Add GIF indicator
        const gifLabel = document.createElement('div');
        gifLabel.className = 'gif-label';
        gifLabel.textContent = 'GIF';
        
        img.addEventListener('click', () => {
            this.openImageModal(attachment);
        });
        
        gifDiv.appendChild(img);
        gifDiv.appendChild(gifLabel);
        
        // Apply spoiler if setting is enabled
        if (this.shouldSpoilerAttachment(attachment)) {
            return this.createSpoilerWrapper(gifDiv, attachment);
        }
        
        return gifDiv;
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
        
        // Clean up old timestamps (older than 45 seconds)
        const cutoff = now - 45000; // 45 seconds
        this.messageTimestamps = this.messageTimestamps.filter(timestamp => timestamp > cutoff);
    }
    
    checkSpam() {
        const now = Date.now();
        const cutoff = now - 45000; // 45 seconds
        
        // Clean up old timestamps
        this.messageTimestamps = this.messageTimestamps.filter(timestamp => timestamp > cutoff);
        
        // Check if user has sent 64 or more messages in the last 45 seconds
        if (this.messageTimestamps.length >= 64) {
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
                case '/secretmutelol':
                    this.handleSecretMuteCommand(command);
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

    handleSecretMuteCommand(command) {
        // Parse: /secretmutelol <timespan> "username" "reason"
        const match = command.match(/^\/secretmutelol\s+(\S+)\s+"([^"]+)"\s+"([^"]+)"$/);
        if (!match) {
            this.showSystemMessage('Usage: /secretmutelol <timespan> "username" "reason"');
            this.showSystemMessage('Example: /secretmutelol 30m "baduser" "being annoying"');
            this.showSystemMessage('Timespan: 30m (minutes), 2h (hours), 1d (days)');
            return;
        }

        // The server will handle the actual muting logic
        // Just send the command as a regular message and let server process it
        this.socket.send(JSON.stringify({
            type: 'message',
            content: command
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

    // Emoji picker methods
    openEmojiPicker() {
        this.emojiPickerModal.classList.remove('hidden');
        this.loadEmojiCategory('smileys'); // Default to smileys
        this.highlightActiveCategory('smileys');
    }

    closeEmojiPickerModal() {
        this.emojiPickerModal.classList.add('hidden');
    }

    switchEmojiCategory(category) {
        this.loadEmojiCategory(category);
        this.highlightActiveCategory(category);
    }

    highlightActiveCategory(activeCategory) {
        this.emojiCategories.forEach(category => {
            if (category.dataset.category === activeCategory) {
                category.classList.add('active');
            } else {
                category.classList.remove('active');
            }
        });
    }

    loadEmojiCategory(category) {
        const categoryEmojis = this.getCategoryEmojis(category);
        this.emojiGrid.innerHTML = '';

        categoryEmojis.forEach(emojiCode => {
            const emoji = this.emojiMap[emojiCode];
            if (emoji) {
                const emojiButton = document.createElement('button');
                emojiButton.className = 'emoji-item';
                emojiButton.textContent = emoji;
                emojiButton.title = emojiCode;
                emojiButton.addEventListener('click', () => {
                    this.insertEmoji(emojiCode);
                });
                this.emojiGrid.appendChild(emojiButton);
            }
        });
    }

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
            e.preventDefault();
            this.sendMessage();
        }
    }

    handleChatInputChange(e) {
        const input = e.target;
        const value = input.value;
        const cursorPos = input.selectionStart;
        
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
        
        // Find all @username mentions
        return text.replace(/@(\w+)/g, (match, username) => {
            // Find the user's color
            const userTag = Array.from(this.userContainer.children).find(tag => 
                tag.textContent.trim() === username
            );
            const userColor = userTag ? userTag.style.color : '#ffffff';
            
            return `<span class="mention" style="background-color: ${userColor}20; color: ${userColor}; border: 1px solid ${userColor}40;">${match}</span>`;
        });
    }

    // Check if current user is mentioned and play sound
    checkForUserMention(text, senderUsername) {
        if (senderUsername === this.username) return; // Don't notify for own messages
        
        const mentionRegex = new RegExp(`@${this.username}\\b`, 'i');
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

    handleUsernameClick(user) {
        // If clicking your own username, open settings
        if (user.username === this.username) {
            this.openSettings();
            return;
        }
        
        // If clicking someone else's username, open DM modal
        this.openDMModal(user);
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
                        <input type="text" class="dm-chat-input" placeholder="Type a direct message..." maxlength="2000">
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
                this.clearDMAttachments();
            }
        };
        
        sendBtn.addEventListener('click', sendMessage);
        dmInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
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
        console.log('Requesting DM history for:', targetUsername); // Add debugging
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'getDMHistory',
                targetUsername: targetUsername
            }));
        } else {
            console.log('WebSocket not ready, clearing loading state'); // Add debugging
            // If websocket is not ready, clear loading state and show empty conversation
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
        console.log('Received DM history:', data); // Add debugging
        
        // Generate conversation key for this DM history
        const conversationKey = this.getDMConversationKey(this.username, data.targetUsername);
        
        // Store the conversation history using the conversation key
        this.dmConversations.set(conversationKey, data.messages);
        
        // If the DM modal is open for this user, display the history
        if (this.currentDMUser && this.currentDMUser.username === data.targetUsername) {
            this.displayDMHistory(data.messages);
        }
    }
    
    displayDMHistory(messages) {
        console.log('Displaying DM history:', messages); // Add debugging
        const dmChatHistory = document.getElementById('dmChatHistory');
        if (!dmChatHistory) return;
        
        dmChatHistory.innerHTML = '';
        
        if (messages.length === 0) {
            dmChatHistory.innerHTML = '<div class="dm-empty">Start a conversation! 💬</div>';
            return;
        }
        
        messages.forEach(message => {
            this.displayDMMessage(message, false); // false = don't scroll yet
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
        
        // Create message content
        let messageContent = `
            <div class="dm-message-header">
                <span class="dm-message-sender" style="color: ${data.senderColor}">${data.senderUsername}</span>
                <span class="dm-message-time">${timestamp}</span>
            </div>
        `;
        
        // Add text content if it exists
        if (data.content && data.content.trim()) {
            messageContent += `<div class="dm-message-content">${this.escapeHtml(data.content)}</div>`;
        }
        
        // Add attachments if they exist
        if (data.attachments && data.attachments.length > 0) {
            messageContent += '<div class="dm-message-attachments">';
            data.attachments.forEach(attachment => {
                messageContent += this.createAttachmentElement(attachment);
            });
            messageContent += '</div>';
        }
        
        messageDiv.innerHTML = messageContent;
        
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
        // Show error in the DM modal if it's open
        const dmChatHistory = document.getElementById('dmChatHistory');
        if (dmChatHistory) {
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
    }

    closeClickMeModal() {
        this.clickMeModal.classList.add('hidden');
    }

    handleServerMute(data) {
        // Handle IP mute notification from server (including auto-mute for spam)
        console.log('IP mute notification received:', data);
        
        // Set mute state
        this.isMuted = true;
        this.muteEndTime = Date.now() + (data.remainingMinutes * 60 * 1000) + (data.remainingSeconds * 1000);
        
        // Clear message timestamps since they're being muted
        this.messageTimestamps = [];
        
        // Set timer to unmute
        const totalMs = (data.remainingMinutes * 60 * 1000) + (data.remainingSeconds * 1000);
        this.muteTimer = setTimeout(() => {
            this.unmuteUser();
        }, totalMs);
        
        // Show mute modal with server-provided data
        this.showServerMuteModal(data);
    }
    
    showServerMuteModal(data) {
        // Remove any existing mute modal
        const existingModal = document.getElementById('muteModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'muteModal';
        modal.className = 'mute-modal';
        
        const muteByText = data.mutedBy === 'anti-spam system' ? 'by the anti-spam system' : 
                          data.mutedBy === 'moderator' ? 'by a moderator' : 
                          `by ${data.mutedBy}`;
        
        modal.innerHTML = `
            <div class="mute-modal-content">
                <div class="mute-modal-header">
                    <h2>🚫 You Have Been Muted</h2>
                </div>
                <div class="mute-modal-body">
                    <p>You've been muted ${muteByText}.</p>
                    <p><strong>Reason:</strong> ${data.reason}</p>
                    <div class="mute-time-remaining">
                        <strong>${data.remainingMinutes} minutes and ${data.remainingSeconds} seconds</strong> remaining
                    </div>
                    <p class="mute-info">You can send messages again after the timer expires. This is an IP-based mute.</p>
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
}

// Initialize the chat app when the page loads and expose globally
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
}); 