// Import AudioPlayer component
import AudioPlayer from './components/AudioPlayer.js';
import UserActionDropdown from './components/UserActionDropdown.js';

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
        
        // Auto-reconnection properties
        this.isConnected = false;
        this.wasConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000; // Initial delay in ms
        this.maxReconnectDelay = 30000; // Max delay in ms (30 seconds)
        this.reconnectTimer = null;
        
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
        
        // Emoji mapping for :emoji_name: format
        this.emojiMap = {
            // Smileys & People
            ':smile:': 'ðŸ˜€',
            ':grin:': 'ðŸ˜',
            ':joy:': 'ðŸ˜‚',
            ':rofl:': 'ðŸ¤£',
            ':relaxed:': 'ðŸ˜Œ',
            ':blush:': 'ðŸ˜Š',
            ':innocent:': 'ðŸ˜‡',
            ':wink:': 'ðŸ˜‰',
            ':heart_eyes:': 'ðŸ˜',
            ':kissing_heart:': 'ðŸ˜˜',
            ':thinking:': 'ðŸ¤”',
            ':neutral_face:': 'ðŸ˜',
            ':expressionless:': 'ðŸ˜‘',
            ':confused:': 'ðŸ˜•',
            ':worried:': 'ðŸ˜Ÿ',
            ':cry:': 'ðŸ˜¢',
            ':sob:': 'ðŸ˜­',
            ':angry:': 'ðŸ˜ ',
            ':rage:': 'ðŸ˜¡',
            ':triumph:': 'ðŸ˜¤',
            ':sleepy:': 'ðŸ˜ª',
            ':dizzy_face:': 'ðŸ˜µ',
            ':mask:': 'ðŸ˜·',
            ':sunglasses:': 'ðŸ˜Ž',
            ':smirk:': 'ðŸ˜',
            ':stuck_out_tongue:': 'ðŸ˜›',
            ':stuck_out_tongue_winking_eye:': 'ðŸ˜œ',
            ':stuck_out_tongue_closed_eyes:': 'ðŸ˜',
            ':unamused:': 'ðŸ˜’',
            ':sweat_smile:': 'ðŸ˜…',
            ':sweat:': 'ðŸ˜“',
            ':disappointed_relieved:': 'ðŸ˜¥',
            ':weary:': 'ðŸ˜©',
            ':pensive:': 'ðŸ˜”',
            ':disappointed:': 'ðŸ˜ž',
            ':confounded:': 'ðŸ˜–',
            ':fearful:': 'ðŸ˜¨',
            ':cold_sweat:': 'ðŸ˜°',
            ':persevere:': 'ðŸ˜£',
            ':frowning:': 'â˜¹ï¸',
            ':anguished:': 'ðŸ˜§',
            ':grimacing:': 'ðŸ˜¬',
            ':open_mouth:': 'ðŸ˜®',
            ':hushed:': 'ðŸ˜¯',
            ':astonished:': 'ðŸ˜²',
            ':flushed:': 'ðŸ˜³',
            ':scream:': 'ðŸ˜±',
            ':heart:': 'â¤ï¸',
            ':broken_heart:': 'ðŸ’”',
            ':two_hearts:': 'ðŸ’•',
            ':sparkling_heart:': 'ðŸ’–',
            ':heartpulse:': 'ðŸ’—',
            ':blue_heart:': 'ðŸ’™',
            ':green_heart:': 'ðŸ’š',
            ':yellow_heart:': 'ðŸ’›',
            ':purple_heart:': 'ðŸ’œ',
            ':black_heart:': 'ðŸ–¤',
            ':white_heart:': 'ðŸ¤',
            ':brown_heart:': 'ðŸ¤Ž',
            ':orange_heart:': 'ðŸ§¡',
            
            // Gestures & Body Parts
            ':thumbsup:': 'ðŸ‘',
            ':thumbsdown:': 'ðŸ‘Ž',
            ':clap:': 'ðŸ‘',
            ':raised_hands:': 'ðŸ™Œ',
            ':pray:': 'ðŸ™',
            ':muscle:': 'ðŸ’ª',
            ':point_up:': 'â˜ï¸',
            ':point_down:': 'ðŸ‘‡',
            ':point_left:': 'ðŸ‘ˆ',
            ':point_right:': 'ðŸ‘‰',
            ':ok_hand:': 'ðŸ‘Œ',
            ':v:': 'âœŒï¸',
            ':crossed_fingers:': 'ðŸ¤ž',
            ':wave:': 'ðŸ‘‹',
            ':call_me_hand:': 'ðŸ¤™',
            ':raised_hand:': 'âœ‹',
            ':fist:': 'âœŠ',
            ':punch:': 'ðŸ‘Š',
            
            // Animals & Nature
            ':dog:': 'ðŸ¶',
            ':cat:': 'ðŸ±',
            ':mouse:': 'ðŸ­',
            ':hamster:': 'ðŸ¹',
            ':rabbit:': 'ðŸ°',
            ':fox:': 'ðŸ¦Š',
            ':bear:': 'ðŸ»',
            ':panda:': 'ðŸ¼',
            ':koala:': 'ðŸ¨',
            ':tiger:': 'ðŸ¯',
            ':lion:': 'ðŸ¦',
            ':cow:': 'ðŸ®',
            ':pig:': 'ðŸ·',
            ':frog:': 'ðŸ¸',
            ':monkey:': 'ðŸµ',
            ':chicken:': 'ðŸ”',
            ':penguin:': 'ðŸ§',
            ':bird:': 'ðŸ¦',
            ':baby_chick:': 'ðŸ¤',
            ':bee:': 'ðŸ',
            ':bug:': 'ðŸ›',
            ':butterfly:': 'ðŸ¦‹',
            ':snail:': 'ðŸŒ',
            ':snake:': 'ðŸ',
            ':dragon:': 'ðŸ‰',
            ':cactus:': 'ðŸŒµ',
            ':christmas_tree:': 'ðŸŽ„',
            ':evergreen_tree:': 'ðŸŒ²',
            ':deciduous_tree:': 'ðŸŒ³',
            ':palm_tree:': 'ðŸŒ´',
            ':seedling:': 'ðŸŒ±',
            ':herb:': 'ðŸŒ¿',
            ':shamrock:': 'â˜˜ï¸',
            ':four_leaf_clover:': 'ðŸ€',
            ':bamboo:': 'ðŸŽ‹',
            ':tulip:': 'ðŸŒ·',
            ':cherry_blossom:': 'ðŸŒ¸',
            ':blossom:': 'ðŸŒ¼',
            ':hibiscus:': 'ðŸŒº',
            ':sunflower:': 'ðŸŒ»',
            ':rose:': 'ðŸŒ¹',
            ':wilted_flower:': 'ðŸ¥€',
            ':bouquet:': 'ðŸ’',
            
            // Food & Drink
            ':apple:': 'ðŸŽ',
            ':orange:': 'ðŸŠ',
            ':lemon:': 'ðŸ‹',
            ':banana:': 'ðŸŒ',
            ':watermelon:': 'ðŸ‰',
            ':grapes:': 'ðŸ‡',
            ':strawberry:': 'ðŸ“',
            ':melon:': 'ðŸˆ',
            ':cherries:': 'ðŸ’',
            ':peach:': 'ðŸ‘',
            ':pineapple:': 'ðŸ',
            ':coconut:': 'ðŸ¥¥',
            ':kiwi:': 'ðŸ¥',
            ':avocado:': 'ðŸ¥‘',
            ':tomato:': 'ðŸ…',
            ':eggplant:': 'ðŸ†',
            ':cucumber:': 'ðŸ¥’',
            ':carrot:': 'ðŸ¥•',
            ':corn:': 'ðŸŒ½',
            ':hot_pepper:': 'ðŸŒ¶ï¸',
            ':potato:': 'ðŸ¥”',
            ':sweet_potato:': 'ðŸ ',
            ':mushroom:': 'ðŸ„',
            ':peanuts:': 'ðŸ¥œ',
            ':chestnut:': 'ðŸŒ°',
            ':bread:': 'ðŸž',
            ':croissant:': 'ðŸ¥',
            ':bagel:': 'ðŸ¥¯',
            ':pretzel:': 'ðŸ¥¨',
            ':cheese:': 'ðŸ§€',
            ':egg:': 'ðŸ¥š',
            ':hamburger:': 'ðŸ”',
            ':fries:': 'ðŸŸ',
            ':hotdog:': 'ðŸŒ­',
            ':pizza:': 'ðŸ•',
            ':sandwich:': 'ðŸ¥ª',
            ':taco:': 'ðŸŒ®',
            ':burrito:': 'ðŸŒ¯',
            ':cookie:': 'ðŸª',
            ':cake:': 'ðŸ°',
            ':birthday:': 'ðŸŽ‚',
            ':cupcake:': 'ðŸ§',
            ':pie:': 'ðŸ¥§',
            ':chocolate_bar:': 'ðŸ«',
            ':candy:': 'ðŸ¬',
            ':lollipop:': 'ðŸ­',
            ':honey_pot:': 'ðŸ¯',
            ':coffee:': 'â˜•',
            ':tea:': 'ðŸµ',
            ':beer:': 'ðŸº',
            ':wine_glass:': 'ðŸ·',
            ':cocktail:': 'ðŸ¸',
            ':tropical_drink:': 'ðŸ¹',
            ':champagne:': 'ðŸ¾',
            ':milk_glass:': 'ðŸ¥›',
            
            // Activities & Objects
            ':soccer:': 'âš½',
            ':basketball:': 'ðŸ€',
            ':football:': 'ðŸˆ',
            ':baseball:': 'âš¾',
            ':tennis:': 'ðŸŽ¾',
            ':volleyball:': 'ðŸ',
            ':rugby_football:': 'ðŸ‰',
            ':8ball:': 'ðŸŽ±',
            ':golf:': 'â›³',
            ':ski:': 'ðŸŽ¿',
            ':snowboard:': 'ðŸ‚',
            ':trophy:': 'ðŸ†',
            ':medal:': 'ðŸ…',
            ':1st_place_medal:': 'ðŸ¥‡',
            ':2nd_place_medal:': 'ðŸ¥ˆ',
            ':3rd_place_medal:': 'ðŸ¥‰',
            ':dart:': 'ðŸŽ¯',
            ':bow_and_arrow:': 'ðŸ¹',
            ':fishing_pole_and_fish:': 'ðŸŽ£',
            ':boxing_glove:': 'ðŸ¥Š',
            ':martial_arts_uniform:': 'ðŸ¥‹',
            ':guitar:': 'ðŸŽ¸',
            ':musical_keyboard:': 'ðŸŽ¹',
            ':trumpet:': 'ðŸŽº',
            ':violin:': 'ðŸŽ»',
            ':drum:': 'ðŸ¥',
            ':microphone:': 'ðŸŽ¤',
            ':headphones:': 'ðŸŽ§',
            ':radio:': 'ðŸ“»',
            ':saxophone:': 'ðŸŽ·',
            ':art:': 'ðŸŽ¨',
            ':clapper:': 'ðŸŽ¬',
            ':video_camera:': 'ðŸ“¹',
            ':camera:': 'ðŸ“·',
            ':camera_flash:': 'ðŸ“¸',
            ':space_invader:': 'ðŸ‘¾',
            ':video_game:': 'ðŸŽ®',
            ':game_die:': 'ðŸŽ²',
            ':jigsaw:': 'ðŸ§©',
            ':teddy_bear:': 'ðŸ§¸',
            
            // Symbols & Objects
            ':fire:': 'ðŸ”¥',
            ':star:': 'â­',
            ':star2:': 'ðŸŒŸ',
            ':sparkles:': 'âœ¨',
            ':zap:': 'âš¡',
            ':boom:': 'ðŸ’¥',
            ':collision:': 'ðŸ’¢',
            ':dizzy:': 'ðŸ’«',
            ':sweat_drops:': 'ðŸ’¦',
            ':droplet:': 'ðŸ’§',
            ':zzz:': 'ðŸ’¤',
            ':dash:': 'ðŸ’¨',
            ':bomb:': 'ðŸ’£',
            ':speech_balloon:': 'ðŸ’¬',
            ':thought_balloon:': 'ðŸ’­',
            ':100:': 'ðŸ’¯',
            ':moneybag:': 'ðŸ’°',
            ':gem:': 'ðŸ’Ž',
            ':dollar:': 'ðŸ’²',
            ':credit_card:': 'ðŸ’³',
            ':envelope:': 'âœ‰ï¸',
            ':email:': 'ðŸ“§',
            ':inbox_tray:': 'ðŸ“¥',
            ':outbox_tray:': 'ðŸ“¤',
            ':package:': 'ðŸ“¦',
            ':mailbox:': 'ðŸ“ª',
            ':mailbox_with_mail:': 'ðŸ“¬',
            ':postbox:': 'ðŸ“®',
            ':newspaper:': 'ðŸ“°',
            ':book:': 'ðŸ“–',
            ':books:': 'ðŸ“š',
            ':notebook:': 'ðŸ““',
            ':ledger:': 'ðŸ“’',
            ':page_with_curl:': 'ðŸ“ƒ',
            ':scroll:': 'ðŸ“œ',
            ':page_facing_up:': 'ðŸ“„',
            ':bookmark:': 'ðŸ”–',
            ':label:': 'ðŸ·ï¸',
            ':pencil2:': 'âœï¸',
            ':black_nib:': 'âœ’ï¸',
            ':fountain_pen:': 'ðŸ–‹ï¸',
            ':ballpoint_pen:': 'ðŸ–Šï¸',
            ':paintbrush:': 'ðŸ–Œï¸',
            ':crayon:': 'ðŸ–ï¸',
            ':memo:': 'ðŸ“',
            ':briefcase:': 'ðŸ’¼',
            ':file_folder:': 'ðŸ“',
            ':open_file_folder:': 'ðŸ“‚',
            ':card_index_dividers:': 'ðŸ—‚ï¸',
            ':calendar:': 'ðŸ“…',
            ':date:': 'ðŸ“†',
            ':spiral_notepad:': 'ðŸ—’ï¸',
            ':spiral_calendar:': 'ðŸ—“ï¸',
            ':card_index:': 'ðŸ“‡',
            ':chart_with_upwards_trend:': 'ðŸ“ˆ',
            ':chart_with_downwards_trend:': 'ðŸ“‰',
            ':bar_chart:': 'ðŸ“Š',
            ':clipboard:': 'ðŸ“‹',
            ':pushpin:': 'ðŸ“Œ',
            ':round_pushpin:': 'ðŸ“',
            ':paperclip:': 'ðŸ“Ž',
            ':paperclips:': 'ðŸ–‡ï¸',
            ':straight_ruler:': 'ðŸ“',
            ':triangular_ruler:': 'ðŸ“',
            ':scissors:': 'âœ‚ï¸',
            ':card_file_box:': 'ðŸ—ƒï¸',
            ':file_cabinet:': 'ðŸ—„ï¸',
            ':wastebasket:': 'ðŸ—‘ï¸',
            ':lock:': 'ðŸ”’',
            ':unlock:': 'ðŸ”“',
            ':lock_with_ink_pen:': 'ðŸ”',
            ':closed_lock_with_key:': 'ðŸ”',
            ':key:': 'ðŸ”‘',
            ':old_key:': 'ðŸ—ï¸',
            ':hammer:': 'ðŸ”¨',
            ':pick:': 'â›ï¸',
            ':hammer_and_pick:': 'âš’ï¸',
            ':hammer_and_wrench:': 'ðŸ› ï¸',
            ':dagger:': 'ðŸ—¡ï¸',
            ':crossed_swords:': 'âš”ï¸',
            ':gun:': 'ðŸ”«',
            ':shield:': 'ðŸ›¡ï¸',
            ':wrench:': 'ðŸ”§',
            ':nut_and_bolt:': 'ðŸ”©',
            ':gear:': 'âš™ï¸',
            ':clamp:': 'ðŸ—œï¸',
            ':balance_scale:': 'âš–ï¸',
            ':link:': 'ðŸ”—',
            ':chains:': 'â›“ï¸',
            ':syringe:': 'ðŸ’‰',
            ':pill:': 'ðŸ’Š',
            ':smoking:': 'ðŸš¬',
            ':coffin:': 'âš°ï¸',
            ':funeral_urn:': 'âš±ï¸',
            ':amphora:': 'ðŸº',
            ':crystal_ball:': 'ðŸ”®',
            ':prayer_beads:': 'ðŸ“¿',
            ':barber:': 'ðŸ’ˆ',
            ':alembic:': 'âš—ï¸',
            ':telescope:': 'ðŸ”­',
            ':microscope:': 'ðŸ”¬',
            ':hole:': 'ðŸ•³ï¸',
            ':pill:': 'ðŸ’Š',
            ':thermometer:': 'ðŸŒ¡ï¸',
            ':broom:': 'ðŸ§¹',
            ':basket:': 'ðŸ§º',
            ':toilet_paper:': 'ðŸ§»',
            ':soap:': 'ðŸ§¼',
            ':sponge:': 'ðŸ§½',
            ':fire_extinguisher:': 'ðŸ§¯',
            ':shopping_cart:': 'ðŸ›’',
            
            // Travel & Places
            ':car:': 'ðŸš—',
            ':taxi:': 'ðŸš•',
            ':blue_car:': 'ðŸš™',
            ':bus:': 'ðŸšŒ',
            ':trolleybus:': 'ðŸšŽ',
            ':racing_car:': 'ðŸŽï¸',
            ':police_car:': 'ðŸš“',
            ':ambulance:': 'ðŸš‘',
            ':fire_engine:': 'ðŸš’',
            ':minibus:': 'ðŸš',
            ':truck:': 'ðŸšš',
            ':articulated_lorry:': 'ðŸš›',
            ':tractor:': 'ðŸšœ',
            ':kick_scooter:': 'ðŸ›´',
            ':bike:': 'ðŸš²',
            ':motor_scooter:': 'ðŸ›µ',
            ':motorcycle:': 'ðŸï¸',
            ':rotating_light:': 'ðŸš¨',
            ':oncoming_police_car:': 'ðŸš”',
            ':oncoming_bus:': 'ðŸš',
            ':oncoming_automobile:': 'ðŸš˜',
            ':oncoming_taxi:': 'ðŸš–',
            ':aerial_tramway:': 'ðŸš¡',
            ':mountain_cableway:': 'ðŸš ',
            ':suspension_railway:': 'ðŸšŸ',
            ':railway_car:': 'ðŸšƒ',
            ':train:': 'ðŸš‹',
            ':monorail:': 'ðŸš',
            ':bullettrain_side:': 'ðŸš„',
            ':bullettrain_front:': 'ðŸš…',
            ':light_rail:': 'ðŸšˆ',
            ':mountain_railway:': 'ðŸšž',
            ':steam_locomotive:': 'ðŸš‚',
            ':train2:': 'ðŸš†',
            ':metro:': 'ðŸš‡',
            ':tram:': 'ðŸšŠ',
            ':station:': 'ðŸš‰',
            ':airplane:': 'âœˆï¸',
            ':small_airplane:': 'ðŸ›©ï¸',
            ':airplane_departure:': 'ðŸ›«',
            ':airplane_arrival:': 'ðŸ›¬',
            ':rocket:': 'ðŸš€',
            ':artificial_satellite:': 'ðŸ›°ï¸',
            ':seat:': 'ðŸ’º',
            ':helicopter:': 'ðŸš',
            ':canoe:': 'ðŸ›¶',
            ':speedboat:': 'ðŸš¤',
            ':motorboat:': 'ðŸ›¥ï¸',
            ':cruise_ship:': 'ðŸ›³ï¸',
            ':passenger_ship:': 'ðŸ›³ï¸',
            ':ferry:': 'â›´ï¸',
            ':sailboat:': 'â›µ',
            ':rowboat:': 'ðŸš£',
            ':anchor:': 'âš“',
            ':construction:': 'ðŸš§',
            ':fuelpump:': 'â›½',
            ':busstop:': 'ðŸš',
            ':vertical_traffic_light:': 'ðŸš¦',
            ':traffic_light:': 'ðŸš¥',
            ':checkered_flag:': 'ðŸ',
            ':ship:': 'ðŸš¢',
            ':ferris_wheel:': 'ðŸŽ¡',
            ':roller_coaster:': 'ðŸŽ¢',
            ':carousel_horse:': 'ðŸŽ ',
            ':building_construction:': 'ðŸ—ï¸',
            ':foggy:': 'ðŸŒ',
            ':tokyo_tower:': 'ðŸ—¼',
            ':factory:': 'ðŸ­',
            ':fountain:': 'â›²',
            ':rice_scene:': 'ðŸŽ‘',
            ':mountain:': 'â›°ï¸',
            ':mountain_snow:': 'ðŸ”ï¸',
            ':mount_fuji:': 'ðŸ—»',
            ':volcano:': 'ðŸŒ‹',
            ':desert:': 'ðŸœï¸',
            ':beach_umbrella:': 'ðŸ–ï¸',
            ':desert_island:': 'ðŸï¸',
            ':sunrise_over_mountains:': 'ðŸŒ„',
            ':sunrise:': 'ðŸŒ…',
            ':city_sunset:': 'ðŸŒ‡',
            ':city_sunrise:': 'ðŸŒ†',
            ':night_with_stars:': 'ðŸŒƒ',
            ':bridge_at_night:': 'ðŸŒ‰',
            ':milky_way:': 'ðŸŒŒ',
            ':stars:': 'ðŸŒ ',
            ':sparkler:': 'ðŸŽ‡',
            ':fireworks:': 'ðŸŽ†',
            ':rainbow:': 'ðŸŒˆ',
            ':house:': 'ðŸ ',
            ':house_with_garden:': 'ðŸ¡',
            ':derelict_house:': 'ðŸšï¸',
            ':office:': 'ðŸ¢',
            ':department_store:': 'ðŸ¬',
            ':post_office:': 'ðŸ£',
            ':european_post_office:': 'ðŸ¤',
            ':hospital:': 'ðŸ¥',
            ':bank:': 'ðŸ¦',
            ':hotel:': 'ðŸ¨',
            ':convenience_store:': 'ðŸª',
            ':school:': 'ðŸ«',
            ':love_hotel:': 'ðŸ©',
            ':wedding:': 'ðŸ’’',
            ':classical_building:': 'ðŸ›ï¸',
            ':church:': 'â›ª',
            ':mosque:': 'ðŸ•Œ',
            ':synagogue:': 'ðŸ•',
            ':kaaba:': 'ðŸ•‹',
            ':shinto_shrine:': 'â›©ï¸',
            
            // Weather & Sky
            ':sunny:': 'â˜€ï¸',
            ':partly_sunny:': 'â›…',
            ':cloud:': 'â˜ï¸',
            ':mostly_sunny:': 'ðŸŒ¤ï¸',
            ':barely_sunny:': 'ðŸŒ¥ï¸',
            ':partly_sunny_rain:': 'ðŸŒ¦ï¸',
            ':rain_cloud:': 'ðŸŒ§ï¸',
            ':snow_cloud:': 'ðŸŒ¨ï¸',
            ':lightning:': 'ðŸŒ©ï¸',
            ':tornado:': 'ðŸŒªï¸',
            ':fog:': 'ðŸŒ«ï¸',
            ':wind_face:': 'ðŸŒ¬ï¸',
            ':cyclone:': 'ðŸŒ€',
            ':rainbow:': 'ðŸŒˆ',
            ':closed_umbrella:': 'ðŸŒ‚',
            ':open_umbrella:': 'â˜‚ï¸',
            ':umbrella:': 'â˜”',
            ':parasol_on_ground:': 'â›±ï¸',
            ':zap:': 'âš¡',
            ':snowflake:': 'â„ï¸',
            ':snowman:': 'â˜ƒï¸',
            ':snowman_with_snow:': 'â›„',
            ':comet:': 'â˜„ï¸',
            ':droplet:': 'ðŸ’§',
            ':ocean:': 'ðŸŒŠ',
            
            // Common expressions and reactions
            ':ok:': 'ðŸ‘Œ',
            ':cool:': 'ðŸ˜Ž',
            ':awesome:': 'ðŸ¤©',
            ':party:': 'ðŸŽ‰',
            ':celebrate:': 'ðŸŽŠ',
            ':tada:': 'ðŸŽ‰',
            ':confetti_ball:': 'ðŸŽŠ',
            ':balloon:': 'ðŸŽˆ',
            ':gift:': 'ðŸŽ',
            ':ribbon:': 'ðŸŽ€',
            ':crown:': 'ðŸ‘‘',
            ':gem:': 'ðŸ’Ž',
            ':ring:': 'ðŸ’',
            ':lipstick:': 'ðŸ’„',
            ':kiss:': 'ðŸ’‹',
            ':love_letter:': 'ðŸ’Œ',
            ':cupid:': 'ðŸ’˜',
            ':gift_heart:': 'ðŸ’',
            ':revolving_hearts:': 'ðŸ’ž',
            ':heartbeat:': 'ðŸ’“',
            ':growing_heart:': 'ðŸ’—',
            ':two_hearts:': 'ðŸ’•',
            ':sparkling_heart:': 'ðŸ’–',
            ':heart_decoration:': 'ðŸ’Ÿ',
            ':peace_symbol:': 'â˜®ï¸',
            ':yin_yang:': 'â˜¯ï¸',
            ':wheel_of_dharma:': 'â˜¸ï¸',
            ':om:': 'ðŸ•‰ï¸',
            ':six_pointed_star:': 'âœ¡ï¸',
            ':menorah:': 'ðŸ•Ž',
            ':atom_symbol:': 'âš›ï¸',
            ':warning:': 'âš ï¸',
            ':radioactive:': 'â˜¢ï¸',
            ':biohazard:': 'â˜£ï¸',
            ':mobile_phone_off:': 'ðŸ“´',
            ':vibration_mode:': 'ðŸ“³',
            ':u6709:': 'ðŸˆ¶',
            ':u7121:': 'ðŸˆš',
            ':u7533:': 'ðŸˆ¸',
            ':u55b6:': 'ðŸˆº',
            ':u6708:': 'ðŸˆ·ï¸',
            ':eight_pointed_black_star:': 'âœ´ï¸',
            ':vs:': 'ðŸ†š',
            ':accept:': 'ðŸ‰‘',
            ':white_flower:': 'ðŸ’®',
            ':ideograph_advantage:': 'ðŸ‰',
            ':secret:': 'ãŠ™ï¸',
            ':congratulations:': 'ãŠ—ï¸',
            ':u5408:': 'ðŸˆ´',
            ':u6e80:': 'ðŸˆµ',
            ':u5272:': 'ðŸˆ¹',
            ':u7981:': 'ðŸˆ²',
            ':a:': 'ðŸ…°ï¸',
            ':b:': 'ðŸ…±ï¸',
            ':ab:': 'ðŸ†Ž',
            ':cl:': 'ðŸ†‘',
            ':o2:': 'ðŸ…¾ï¸',
            ':sos:': 'ðŸ†˜',
            ':no_entry:': 'â›”',
            ':name_badge:': 'ðŸ“›',
            ':no_entry_sign:': 'ðŸš«',
            ':x:': 'âŒ',
            ':o:': 'â­•',
            ':stop_sign:': 'ðŸ›‘',
            ':anger:': 'ðŸ’¢',
            ':hotsprings:': 'â™¨ï¸',
            ':no_pedestrians:': 'ðŸš·',
            ':do_not_litter:': 'ðŸš¯',
            ':no_bicycles:': 'ðŸš³',
            ':non-potable_water:': 'ðŸš±',
            ':underage:': 'ðŸ”ž',
            ':no_mobile_phones:': 'ðŸ“µ',
            ':exclamation:': 'â—',
            ':grey_exclamation:': 'â•',
            ':question:': 'â“',
            ':grey_question:': 'â”',
            ':bangbang:': 'â€¼ï¸',
            ':interrobang:': 'â‰ï¸',
            ':low_brightness:': 'ðŸ”…',
            ':high_brightness:': 'ðŸ”†',
            ':trident:': 'ðŸ”±',
            ':fleur_de_lis:': 'âšœï¸',
            ':part_alternation_mark:': 'ã€½ï¸',
            ':copyright:': 'Â©ï¸',
            ':registered:': 'Â®ï¸',
            ':tm:': 'â„¢ï¸'
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
        
        // Initialize User Action Dropdown
        this.userActionDropdown = new UserActionDropdown(this);
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
        ctx.fillText('ðŸ’¬', 16, 16);
        
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
        ctx.fillText('ðŸ’¬', 16, 16);
        
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
            
            // Auto-focus chat input when typing starts
            if (this.shouldAutoFocusInput(e)) {
                this.autoFocusChatInput(e);
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
            
            // Send join message
            this.socket.send(JSON.stringify({
                type: 'join',
                username: this.username,
                color: this.userColor,
                website: this.userWebsite || ''
            }));
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
    
    async sendMessage() {
        const content = this.chatInput.value.trim();
        
        // Check if user is muted
        if (this.isMuted) {
            this.showMuteModal();
            return;
        }
        
        // Don't send if uploading or if no content
        if (this.isUploading || !content) return;

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
        const attachmentIdMatches = content.match(/\$([a-zA-Z0-9]+)\$/g);
        const attachments = [];
        let cleanContent = content;
        
        if (attachmentIdMatches) {
            const registry = window.attachmentRegistry || new Map();
            attachmentIdMatches.forEach(match => {
                const id = match.slice(1, -1); // remove $ symbols
                const attachment = registry.get(id);
                if (attachment) {
                    attachments.push(attachment);
                    // remove the ID from content since we're sending the actual attachment
                    cleanContent = cleanContent.replace(match, '').trim();
                }
            });
        }
        
        console.log('ðŸ” Original content:', content);
        console.log('ðŸ” Clean content:', cleanContent);
        console.log('ðŸ” Found attachments:', attachments);

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
        console.log('ðŸ” displayMessage called with data:', data);
        console.log('ðŸ” Message has replyTo?', !!data.replyTo);
        if (data.replyTo) {
            console.log('ðŸ” Reply data structure:', JSON.stringify(data.replyTo, null, 2));
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
        if (messages.length > 5128) {
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
            console.log('ðŸ”§ Creating reply indicator...');
            const replyIndicator = document.createElement('div');
            replyIndicator.className = 'reply-indicator';
            
            const replyLine = document.createElement('div');
            replyLine.className = 'reply-line';
            
            const replyContent = document.createElement('div');
            replyContent.className = 'reply-content';
            
            const originalMessage = this.messageElements.get(data.replyTo.id);
            console.log('ðŸ” Original message exists in map?', !!originalMessage);
            console.log('ðŸ” messageElements map has keys:', Array.from(this.messageElements.keys()));
            
            if (originalMessage) {
                console.log('âœ… Found original message, creating clickable reply');
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
                console.log('âŒ Original message not found, showing truncated');
                replyContent.className += ' truncated';
                replyContent.textContent = 'Original message not available';
            }
            
            replyIndicator.appendChild(replyLine);
            replyIndicator.appendChild(replyContent);
            messageElement.appendChild(replyIndicator);
            console.log('âœ… Reply indicator added to message');
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
        
        // Check if message contains line breaks for visual separator
        const hasLineBreaks = data.content.includes('\n');
        if (hasLineBreaks) {
            contentSpan.classList.add('has-line-breaks');
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
                replyBtn.innerHTML = 'â†©';
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
            cursor.classList.remove('typing');
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
                    <button class="menu-btn" title="Message options">â‹®</button>
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
                    <button class="reply-btn" title="Reply to this message">â†º</button>
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
                        <span class="menu-modal-item-icon">â†º</span>
                        <span class="menu-modal-item-text">Reply</span>
                    </button>
                    <button class="menu-modal-item edit" data-action="edit">
                        <span class="menu-modal-item-icon">âœï¸</span>
                        <span class="menu-modal-item-text">Edit</span>
                    </button>
                    <button class="menu-modal-item delete" data-action="delete">
                        <span class="menu-modal-item-icon">ðŸ—‘ï¸</span>
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
                    <button class="cancel-reply-btn" title="Cancel reply">Ã—</button>
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
        console.log('ðŸ”§ handleMessageAction called:', { action, data, messageDiv });
        console.log('ðŸ”§ Message ID:', data.id);
        console.log('ðŸ”§ Username:', data.username);
        console.log('ðŸ”§ Current user:', this.username);
        
        // Prevent actions on deleted messages
        if (messageDiv.classList.contains('message-deleted')) {
            console.log('ðŸ”§ Attempted action on deleted message, ignoring');
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
        console.log('ðŸ”§ startEditMessage called:', { data, messageDiv });
        
        // Don't allow editing if already in edit mode
        if (messageDiv.querySelector('.message-edit-container')) {
            return;
        }
        
        const contentSpan = messageDiv.querySelector('.message-content');
        const originalContent = data.content;
        
        console.log('ðŸ”§ Original content:', originalContent);
        
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
            console.log('ðŸ”§ Update clicked, new content:', newContent);
            console.log('ðŸ”§ Original content:', originalContent);
            console.log('ðŸ”§ Message ID for update:', data.id);
            
            if (newContent && newContent !== originalContent) {
                this.updateMessage(data.id, newContent, messageDiv);
            } else {
                console.log('ðŸ”§ No changes to update');
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
        console.log('ðŸ”§ updateMessage called:', { messageId, newContent });
        console.log('ðŸ”§ Socket state:', this.socket?.readyState);
        console.log('ðŸ”§ WebSocket.OPEN:', WebSocket.OPEN);
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = {
                type: 'editMessage',
                messageId: messageId,
                newContent: newContent
            };
            console.log('ðŸ”§ Sending edit message:', message);
            this.socket.send(JSON.stringify(message));
        } else {
            console.error('ðŸ”§ Socket not ready or not connected');
        }
    }
    
    deleteMessage(data, messageDiv) {
        console.log('ðŸ”§ deleteMessage called:', { data, messageDiv });
        console.log('ðŸ”§ Message ID for delete:', data.id);
        
        if (confirm('Are you sure you want to delete this message?')) {
            console.log('ðŸ”§ User confirmed deletion');
            console.log('ðŸ”§ Socket state:', this.socket?.readyState);
            
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'deleteMessage',
                    messageId: data.id
                };
                console.log('ðŸ”§ Sending delete message:', message);
                this.socket.send(JSON.stringify(message));
            } else {
                console.error('ðŸ”§ Socket not ready or not connected');
            }
        } else {
            console.log('ðŸ”§ User cancelled deletion');
        }
    }

    handleMessageEdited(data) {
        console.log('ðŸ”§ handleMessageEdited called:', data);
        // Find the message element by its ID
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        console.log('ðŸ”§ Found message element:', messageElement);
        if (messageElement) {
            const contentSpan = messageElement.querySelector('.message-content');
            console.log('ðŸ”§ Found content span:', contentSpan);
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
                    console.log('ðŸ”§ Added edited indicator');
                }
                console.log('ðŸ”§ Message content updated to:', censoredContent);
            }
        }
    }

    handleMessageDeleted(data) {
        console.log('ðŸ”§ handleMessageDeleted called:', data);
        // Find the message element by its ID
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        console.log('ðŸ”§ Found message element:', messageElement);
        if (messageElement) {
            const contentSpan = messageElement.querySelector('.message-content');
            console.log('ðŸ”§ Found content span:', contentSpan);
            if (contentSpan) {
                contentSpan.innerHTML = '<em class="message-deleted">message deleted by user</em>';
                
                // Mark the entire message as deleted
                messageElement.classList.add('message-deleted');
                
                // Remove any existing hover controls
                const hoverControls = messageElement.querySelector('.message-hover-controls');
                if (hoverControls) {
                    hoverControls.remove();
                    console.log('ðŸ”§ Removed hover controls');
                }
                
                // Remove any existing edit containers
                const editContainer = messageElement.querySelector('.message-edit-container');
                if (editContainer) {
                    editContainer.remove();
                    console.log('ðŸ”§ Removed edit container');
                }
                
                // Close any open modals for this message
                this.closeMessageModal();
                
                console.log('ðŸ”§ Message marked as deleted');
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
    }

    async uploadAndGenerateID(file) {
        // show simple progress bar
        this.showUploadProgress();
        this.updateUploadProgress(0, 'Uploading...');
        
        try {
            const formData = new FormData();
            formData.append('files', file);
            
            const xhr = new XMLHttpRequest();
            
            const uploadedFile = await new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const progress = e.loaded / e.total;
                        this.updateUploadProgress(progress, 'Uploading...');
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
            
            // hide progress bar
            this.hideUploadProgress();
            
            // add ID to chat input
            const chatInput = document.getElementById('chatInput');
            const currentText = chatInput.value;
            const newText = currentText + (currentText ? ' ' : '') + `$${fileID}$`;
            chatInput.value = newText;
            
            // focus the input and move cursor to end
            chatInput.focus();
            chatInput.setSelectionRange(newText.length, newText.length);
            
        } catch (error) {
            console.error('Upload failed:', error);
            this.updateUploadProgress(0, 'Upload failed');
            setTimeout(() => {
                this.hideUploadProgress();
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
            if (lowerType === 'image/gif') return 'ðŸŽ¬'; // Special icon for GIFs
            return 'ðŸ–¼ï¸';
        }
        
        // Videos
        if (lowerType.startsWith('video/')) return 'ðŸŽ¥';
        
        // Audio
        if (lowerType.startsWith('audio/')) return 'ðŸŽµ';
        
        // Documents
        if (lowerType.includes('pdf')) return 'ðŸ“„';
        if (lowerType.includes('word') || lowerType.includes('doc')) return 'ðŸ“';
        if (lowerType.includes('excel') || lowerType.includes('sheet')) return 'ðŸ“Š';
        if (lowerType.includes('powerpoint') || lowerType.includes('presentation')) return 'ðŸ“ˆ';
        
        // Text files
        if (lowerType.includes('text') || lowerType.includes('txt')) return 'ðŸ“';
        if (lowerType.includes('rtf')) return 'ðŸ“';
        
        // Code files
        if (lowerType.includes('javascript') || lowerType.includes('json')) return 'âš¡';
        if (lowerType.includes('html') || lowerType.includes('xml')) return 'ðŸŒ';
        if (lowerType.includes('css')) return 'ðŸŽ¨';
        if (lowerType.includes('python')) return 'ðŸ';
        if (lowerType.includes('java')) return 'â˜•';
        
        // Archives
        if (lowerType.includes('zip') || lowerType.includes('rar') || 
            lowerType.includes('7z') || lowerType.includes('tar') || 
            lowerType.includes('gz')) return 'ðŸ“¦';
        
        // Executables
        if (lowerType.includes('exe') || lowerType.includes('msi') || 
            lowerType.includes('dmg') || lowerType.includes('app')) return 'âš™ï¸';
        
        // Fonts
        if (lowerType.includes('font') || lowerType.includes('ttf') || 
            lowerType.includes('otf') || lowerType.includes('woff')) return 'ðŸ”¤';
        
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
        
        // Create custom audio player with correct parameters
        const audioPlayer = new AudioPlayer(attachment.url, {
            name: attachment.originalName,
            size: attachment.size
        });
        
        // Get the audio player element and append it
        const audioPlayerElement = audioPlayer.getElement();
        audioContainer.appendChild(audioPlayerElement);
        
        return audioContainer;
    }

    createFileAttachment(attachment) {
        const fileContainer = document.createElement('div');
        fileContainer.className = 'message-file-attachment';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'file-icon';
        fileIcon.textContent = this.getFileIcon(attachment.type);
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <div class="file-name">${attachment.originalName}</div>
            <div class="file-size">${this.formatFileSize(attachment.size)}</div>
        `;
        
        const downloadLink = document.createElement('a');
        downloadLink.href = attachment.url;
        downloadLink.download = attachment.originalName;
        downloadLink.className = 'download-link';
        downloadLink.textContent = 'Download';
        
        fileContainer.appendChild(fileIcon);
        fileContainer.appendChild(fileInfo);
        fileContainer.appendChild(downloadLink);
        
        return fileContainer;
    }

    createSpoilerWrapper(element, attachment) {
        const spoilerWrapper = document.createElement('div');
        spoilerWrapper.className = 'spoiler-wrapper';
        
        const spoilerButton = document.createElement('button');
        spoilerButton.className = 'spoiler-button';
        spoilerButton.textContent = 'Show Spoiler';
        
        spoilerButton.addEventListener('click', () => {
            spoilerWrapper.classList.add('spoiler-revealed');
        });
        
        spoilerWrapper.appendChild(spoilerButton);
        spoilerWrapper.appendChild(element);
        
        return spoilerWrapper;
    }

    shouldSpoilerAttachment(attachment) {
        return this.currentSettings.safety.spoilerImages && attachment.type.startsWith('image/');
    }

    openImageModal(attachment) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        
        const img = document.createElement('img');
        img.src = attachment.url;
        img.alt = attachment.originalName;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.textContent = 'Close';
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.appendChild(img);
        modal.appendChild(closeButton);
        
        document.body.appendChild(modal);
    }

    scrollToBottom() {
        if (this.isAutoScrollEnabled()) {
            this.chatScreen.scrollTop = this.chatScreen.scrollHeight;
        }
    }

}