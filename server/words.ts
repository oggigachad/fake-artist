// Word Pair Database - Near Word System
// Real and Fake get similar words from same category

export interface WordPair {
    real: string;
    fake: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

export const wordPairs: WordPair[] = [
    // Animals - Easy
    { real: "Tiger", fake: "Lion", category: "animals", difficulty: "easy" },
    { real: "Cat", fake: "Dog", category: "animals", difficulty: "easy" },
    { real: "Elephant", fake: "Rhino", category: "animals", difficulty: "easy" },
    { real: "Snake", fake: "Lizard", category: "animals", difficulty: "easy" },
    { real: "Penguin", fake: "Duck", category: "animals", difficulty: "easy" },
    { real: "Rabbit", fake: "Hamster", category: "animals", difficulty: "easy" },
    { real: "Cow", fake: "Horse", category: "animals", difficulty: "easy" },
    // Animals - Medium
    { real: "Shark", fake: "Dolphin", category: "animals", difficulty: "medium" },
    { real: "Eagle", fake: "Hawk", category: "animals", difficulty: "medium" },
    { real: "Horse", fake: "Zebra", category: "animals", difficulty: "medium" },
    { real: "Frog", fake: "Toad", category: "animals", difficulty: "medium" },
    { real: "Butterfly", fake: "Moth", category: "animals", difficulty: "medium" },
    { real: "Octopus", fake: "Squid", category: "animals", difficulty: "medium" },
    { real: "Parrot", fake: "Toucan", category: "animals", difficulty: "medium" },
    // Animals - Hard
    { real: "Crocodile", fake: "Alligator", category: "animals", difficulty: "hard" },
    { real: "Leopard", fake: "Cheetah", category: "animals", difficulty: "hard" },
    { real: "Seal", fake: "Sea Lion", category: "animals", difficulty: "hard" },
    { real: "Porcupine", fake: "Hedgehog", category: "animals", difficulty: "hard" },

    // Food - Easy
    { real: "Pizza", fake: "Burger", category: "food", difficulty: "easy" },
    { real: "Apple", fake: "Orange", category: "food", difficulty: "easy" },
    { real: "Ice Cream", fake: "Cake", category: "food", difficulty: "easy" },
    { real: "Hot Dog", fake: "Sausage", category: "food", difficulty: "easy" },
    { real: "Coffee", fake: "Tea", category: "food", difficulty: "easy" },
    { real: "Cookie", fake: "Brownie", category: "food", difficulty: "easy" },
    // Food - Medium
    { real: "Sushi", fake: "Dim Sum", category: "food", difficulty: "medium" },
    { real: "Pasta", fake: "Noodles", category: "food", difficulty: "medium" },
    { real: "Donut", fake: "Bagel", category: "food", difficulty: "medium" },
    { real: "Waffle", fake: "Pancake", category: "food", difficulty: "medium" },
    // Food - Hard
    { real: "Croissant", fake: "Danish", category: "food", difficulty: "hard" },
    { real: "Taco", fake: "Burrito", category: "food", difficulty: "hard" },
    { real: "Ramen", fake: "Pho", category: "food", difficulty: "hard" },

    // Objects - Easy
    { real: "Car", fake: "Bus", category: "objects", difficulty: "easy" },
    { real: "Phone", fake: "Tablet", category: "objects", difficulty: "easy" },
    { real: "Chair", fake: "Stool", category: "objects", difficulty: "easy" },
    { real: "Book", fake: "Magazine", category: "objects", difficulty: "easy" },
    // Objects - Medium
    { real: "Knife", fake: "Sword", category: "objects", difficulty: "medium" },
    { real: "Guitar", fake: "Violin", category: "objects", difficulty: "medium" },
    { real: "Bicycle", fake: "Motorcycle", category: "objects", difficulty: "medium" },
    { real: "Lamp", fake: "Candle", category: "objects", difficulty: "medium" },
    { real: "Watch", fake: "Clock", category: "objects", difficulty: "medium" },
    // Objects - Hard
    { real: "Telescope", fake: "Binoculars", category: "objects", difficulty: "hard" },
    { real: "Sofa", fake: "Armchair", category: "objects", difficulty: "hard" },
    { real: "Typewriter", fake: "Keyboard", category: "objects", difficulty: "hard" },

    // Nature
    { real: "Sun", fake: "Moon", category: "nature", difficulty: "easy" },
    { real: "Tree", fake: "Bush", category: "nature", difficulty: "easy" },
    { real: "Mountain", fake: "Hill", category: "nature", difficulty: "easy" },
    { real: "Flower", fake: "Cactus", category: "nature", difficulty: "easy" },
    { real: "Ocean", fake: "Lake", category: "nature", difficulty: "medium" },
    { real: "Waterfall", fake: "Fountain", category: "nature", difficulty: "medium" },
    { real: "Volcano", fake: "Mountain", category: "nature", difficulty: "hard" },
    { real: "Tornado", fake: "Hurricane", category: "nature", difficulty: "hard" },

    // Sports
    { real: "Soccer Ball", fake: "Basketball", category: "sports", difficulty: "easy" },
    { real: "Swimming", fake: "Diving", category: "sports", difficulty: "easy" },
    { real: "Tennis Racket", fake: "Badminton Racket", category: "sports", difficulty: "medium" },
    { real: "Skateboard", fake: "Surfboard", category: "sports", difficulty: "medium" },
    { real: "Baseball Bat", fake: "Cricket Bat", category: "sports", difficulty: "hard" },
    { real: "Boxing Glove", fake: "Mitt", category: "sports", difficulty: "hard" },

    // Movies - NEW WORD PACK
    { real: "Lightsaber", fake: "Sword", category: "movies", difficulty: "easy" },
    { real: "Spider-Man", fake: "Batman", category: "movies", difficulty: "easy" },
    { real: "Pirate Ship", fake: "Viking Ship", category: "movies", difficulty: "easy" },
    { real: "Dinosaur", fake: "Dragon", category: "movies", difficulty: "easy" },
    { real: "Wizard Hat", fake: "Crown", category: "movies", difficulty: "medium" },
    { real: "Robot", fake: "Alien", category: "movies", difficulty: "medium" },
    { real: "Castle", fake: "Palace", category: "movies", difficulty: "medium" },
    { real: "Spaceship", fake: "Rocket", category: "movies", difficulty: "medium" },
    { real: "Treasure Map", fake: "Scroll", category: "movies", difficulty: "hard" },
    { real: "Time Machine", fake: "Teleporter", category: "movies", difficulty: "hard" },

    // Tech - NEW WORD PACK
    { real: "Laptop", fake: "Tablet", category: "tech", difficulty: "easy" },
    { real: "Headphones", fake: "Earbuds", category: "tech", difficulty: "easy" },
    { real: "Mouse", fake: "Trackpad", category: "tech", difficulty: "easy" },
    { real: "Camera", fake: "Binoculars", category: "tech", difficulty: "easy" },
    { real: "Drone", fake: "Helicopter", category: "tech", difficulty: "medium" },
    { real: "VR Headset", fake: "Goggles", category: "tech", difficulty: "medium" },
    { real: "Smartwatch", fake: "Bracelet", category: "tech", difficulty: "medium" },
    { real: "Printer", fake: "Scanner", category: "tech", difficulty: "medium" },
    { real: "Satellite", fake: "Space Station", category: "tech", difficulty: "hard" },
    { real: "Circuit Board", fake: "Maze", category: "tech", difficulty: "hard" },

    // Music - NEW WORD PACK
    { real: "Piano", fake: "Organ", category: "music", difficulty: "easy" },
    { real: "Drums", fake: "Bongos", category: "music", difficulty: "easy" },
    { real: "Microphone", fake: "Megaphone", category: "music", difficulty: "easy" },
    { real: "Guitar", fake: "Ukulele", category: "music", difficulty: "easy" },
    { real: "Trumpet", fake: "Trombone", category: "music", difficulty: "medium" },
    { real: "Flute", fake: "Clarinet", category: "music", difficulty: "medium" },
    { real: "Harp", fake: "Lyre", category: "music", difficulty: "medium" },
    { real: "Vinyl Record", fake: "CD", category: "music", difficulty: "hard" },
    { real: "Conductor", fake: "Maestro", category: "music", difficulty: "hard" },

    // Places - NEW WORD PACK
    { real: "Beach", fake: "Desert", category: "places", difficulty: "easy" },
    { real: "Castle", fake: "Fort", category: "places", difficulty: "easy" },
    { real: "Hospital", fake: "School", category: "places", difficulty: "easy" },
    { real: "Library", fake: "Museum", category: "places", difficulty: "easy" },
    { real: "Lighthouse", fake: "Tower", category: "places", difficulty: "medium" },
    { real: "Bridge", fake: "Tunnel", category: "places", difficulty: "medium" },
    { real: "Volcano", fake: "Geyser", category: "places", difficulty: "medium" },
    { real: "Igloo", fake: "Tent", category: "places", difficulty: "hard" },
    { real: "Colosseum", fake: "Stadium", category: "places", difficulty: "hard" },
    { real: "Pyramid", fake: "Temple", category: "places", difficulty: "hard" },
];

// Track recently used words to avoid repetition
const recentWordIndices: number[] = [];
const MAX_RECENT = 10;

// Get word pair with difficulty + word pack filtering and anti-repeat
export const getWordPair = (difficulty?: 'easy' | 'medium' | 'hard', wordPack?: string) => {
    let eligible = wordPairs.map((pair, i) => ({ pair, index: i }));

    // Filter by word pack if not 'mixed'
    if (wordPack && wordPack !== 'mixed') {
        eligible = eligible.filter(w => w.pair.category === wordPack);
    }

    // Filter by difficulty if specified
    if (difficulty && difficulty !== 'easy') {
        if (difficulty === 'medium') {
            eligible = eligible.filter(w => w.pair.difficulty === 'easy' || w.pair.difficulty === 'medium');
        }
        // 'hard' uses all words, no filter needed
    } else if (difficulty === 'easy') {
        eligible = eligible.filter(w => w.pair.difficulty === 'easy');
    }

    // Exclude recently used
    eligible = eligible.filter(w => !recentWordIndices.includes(w.index));

    // If we filtered too aggressively, reset recent history
    if (eligible.length === 0) {
        recentWordIndices.length = 0;
        eligible = wordPairs.map((pair, i) => ({ pair, index: i }));
        if (difficulty === 'easy') {
            eligible = eligible.filter(w => w.pair.difficulty === 'easy');
        } else if (difficulty === 'medium') {
            eligible = eligible.filter(w => w.pair.difficulty === 'easy' || w.pair.difficulty === 'medium');
        }
    }

    const chosen = eligible[Math.floor(Math.random() * eligible.length)];

    // Track as recently used
    recentWordIndices.push(chosen.index);
    if (recentWordIndices.length > MAX_RECENT) {
        recentWordIndices.shift();
    }

    // Randomly swap real/fake to prevent meta-gaming
    const shouldSwap = Math.random() > 0.5;

    return {
        realWord: shouldSwap ? chosen.pair.fake : chosen.pair.real,
        fakeWord: shouldSwap ? chosen.pair.real : chosen.pair.fake,
        category: chosen.pair.category,
        difficulty: chosen.pair.difficulty
    };
};

// Classic word list for 2-player draw & guess mode (expanded)
export const drawGuessWords = [
    "Cat", "Dog", "House", "Tree", "Car", "Sun", "Moon", "Star",
    "Pizza", "Burger", "Apple", "Banana", "Elephant", "Lion", "Fish", "Bird",
    "Book", "Phone", "Computer", "Chair", "Table", "Cup", "Flower", "Cloud",
    "Rocket", "Plane", "Boat", "Bicycle", "Guitar", "Drum", "Heart", "Crown",
    "Rainbow", "Snowman", "Castle", "Bridge", "Mountain", "Beach", "Island", "River",
    // Extended words
    "Robot", "Pirate", "Dragon", "Unicorn", "Mermaid", "Wizard", "Ninja", "Knight",
    "Penguin", "Butterfly", "Shark", "Octopus", "Whale", "Turtle", "Spider", "Snail",
    "Volcano", "Tornado", "Lightning", "Waterfall", "Sunrise", "Galaxy", "Comet", "Cave",
    "Treasure", "Sword", "Shield", "Potion", "Wand", "Map", "Key", "Compass",
    "Helicopter", "Submarine", "Spaceship", "Train", "Skateboard", "Surfboard",
    "Camera", "Microphone", "Television", "Headphones", "Laptop", "Gamepad",
    "Pumpkin", "Mushroom", "Cupcake", "Lollipop", "Sushi", "Taco", "Ice Cream",
    "Tiger", "Parrot", "Flamingo", "Giraffe", "Panda", "Koala", "Dinosaur",
];

// Speed round words (simpler words for fast drawing)
export const speedRoundWords = [
    "Cat", "Dog", "Sun", "Moon", "Star", "Fish", "Egg", "Hat", "Cup", "Key",
    "Ball", "Bell", "Car", "Bus", "Eye", "Ear", "Nose", "Hand", "Foot", "Tree",
    "Leaf", "Rain", "Snow", "Fire", "Ice", "Axe", "Bow", "Gem", "Web", "Pen",
    "Bone", "Cake", "Bee", "Ant", "Fan", "Lamp", "Ring", "Sock", "Boot", "Bird",
];

const recentDrawGuessIndices: number[] = [];

export const getDrawGuessWord = () => {
    let eligible = drawGuessWords.map((word, i) => ({ word, index: i }));
    eligible = eligible.filter(w => !recentDrawGuessIndices.includes(w.index));

    if (eligible.length === 0) {
        recentDrawGuessIndices.length = 0;
        eligible = drawGuessWords.map((word, i) => ({ word, index: i }));
    }

    const chosen = eligible[Math.floor(Math.random() * eligible.length)];
    recentDrawGuessIndices.push(chosen.index);
    if (recentDrawGuessIndices.length > 15) recentDrawGuessIndices.shift();

    return chosen.word;
};

// ===================== SOLO MODE: Stored Stroke Datasets =====================
// Pre-recorded drawing data for computer opponent in solo practice mode
export interface SoloDrawing {
    word: string;
    strokes: { x: number; y: number; prevX: number; prevY: number; color: string }[];
}

export const soloDrawings: SoloDrawing[] = [
    {
        word: "Cat",
        strokes: [
            // Head circle
            { x: 200, y: 150, prevX: 180, prevY: 130, color: "#000" },
            { x: 220, y: 130, prevX: 200, prevY: 150, color: "#000" },
            { x: 240, y: 150, prevX: 220, prevY: 130, color: "#000" },
            { x: 220, y: 170, prevX: 240, prevY: 150, color: "#000" },
            { x: 200, y: 150, prevX: 220, prevY: 170, color: "#000" },
            // Ears
            { x: 190, y: 110, prevX: 195, prevY: 130, color: "#000" },
            { x: 200, y: 130, prevX: 190, prevY: 110, color: "#000" },
            { x: 240, y: 130, prevX: 230, prevY: 110, color: "#000" },
            { x: 230, y: 110, prevX: 245, prevY: 130, color: "#000" },
            // Eyes
            { x: 210, y: 145, prevX: 208, prevY: 143, color: "#000" },
            { x: 230, y: 145, prevX: 228, prevY: 143, color: "#000" },
            // Whiskers
            { x: 180, y: 155, prevX: 205, prevY: 158, color: "#000" },
            { x: 260, y: 155, prevX: 235, prevY: 158, color: "#000" },
            { x: 183, y: 162, prevX: 205, prevY: 162, color: "#000" },
            { x: 257, y: 162, prevX: 235, prevY: 162, color: "#000" },
            // Body
            { x: 200, y: 220, prevX: 200, prevY: 170, color: "#000" },
            { x: 240, y: 220, prevX: 240, prevY: 170, color: "#000" },
            { x: 200, y: 220, prevX: 240, prevY: 220, color: "#000" },
            // Tail
            { x: 260, y: 200, prevX: 240, prevY: 220, color: "#000" },
            { x: 270, y: 180, prevX: 260, prevY: 200, color: "#000" },
        ]
    },
    {
        word: "Sun",
        strokes: [
            // Circle
            { x: 220, y: 150, prevX: 200, prevY: 130, color: "#eab308" },
            { x: 240, y: 140, prevX: 220, prevY: 150, color: "#eab308" },
            { x: 250, y: 160, prevX: 240, prevY: 140, color: "#eab308" },
            { x: 240, y: 180, prevX: 250, prevY: 160, color: "#eab308" },
            { x: 220, y: 185, prevX: 240, prevY: 180, color: "#eab308" },
            { x: 200, y: 175, prevX: 220, prevY: 185, color: "#eab308" },
            { x: 195, y: 155, prevX: 200, prevY: 175, color: "#eab308" },
            { x: 200, y: 130, prevX: 195, prevY: 155, color: "#eab308" },
            // Rays
            { x: 220, y: 100, prevX: 220, prevY: 125, color: "#eab308" },
            { x: 220, y: 215, prevX: 220, prevY: 190, color: "#eab308" },
            { x: 165, y: 155, prevX: 190, prevY: 155, color: "#eab308" },
            { x: 275, y: 155, prevX: 250, prevY: 155, color: "#eab308" },
            { x: 185, y: 120, prevX: 200, prevY: 135, color: "#eab308" },
            { x: 255, y: 190, prevX: 240, prevY: 175, color: "#eab308" },
            { x: 255, y: 120, prevX: 240, prevY: 135, color: "#eab308" },
            { x: 185, y: 190, prevX: 200, prevY: 175, color: "#eab308" },
        ]
    },
    {
        word: "House",
        strokes: [
            // Walls
            { x: 150, y: 250, prevX: 150, prevY: 160, color: "#000" },
            { x: 300, y: 160, prevX: 150, prevY: 160, color: "#000" },
            { x: 300, y: 250, prevX: 300, prevY: 160, color: "#000" },
            { x: 150, y: 250, prevX: 300, prevY: 250, color: "#000" },
            // Roof
            { x: 225, y: 100, prevX: 140, prevY: 160, color: "#ef4444" },
            { x: 310, y: 160, prevX: 225, prevY: 100, color: "#ef4444" },
            // Door
            { x: 200, y: 250, prevX: 200, prevY: 200, color: "#000" },
            { x: 250, y: 200, prevX: 200, prevY: 200, color: "#000" },
            { x: 250, y: 250, prevX: 250, prevY: 200, color: "#000" },
            // Window
            { x: 170, y: 180, prevX: 170, prevY: 195, color: "#3b82f6" },
            { x: 190, y: 180, prevX: 170, prevY: 180, color: "#3b82f6" },
            { x: 190, y: 195, prevX: 190, prevY: 180, color: "#3b82f6" },
            { x: 170, y: 195, prevX: 190, prevY: 195, color: "#3b82f6" },
        ]
    },
    {
        word: "Tree",
        strokes: [
            // Trunk
            { x: 215, y: 280, prevX: 215, prevY: 180, color: "#92400e" },
            { x: 230, y: 280, prevX: 230, prevY: 180, color: "#92400e" },
            // Canopy
            { x: 170, y: 190, prevX: 190, prevY: 140, color: "#22c55e" },
            { x: 190, y: 140, prevX: 220, prevY: 100, color: "#22c55e" },
            { x: 220, y: 100, prevX: 250, prevY: 140, color: "#22c55e" },
            { x: 250, y: 140, prevX: 270, prevY: 190, color: "#22c55e" },
            { x: 270, y: 190, prevX: 220, prevY: 180, color: "#22c55e" },
            { x: 220, y: 180, prevX: 170, prevY: 190, color: "#22c55e" },
        ]
    },
    {
        word: "Star",
        strokes: [
            { x: 220, y: 100, prevX: 235, prevY: 155, color: "#eab308" },
            { x: 235, y: 155, prevX: 280, prevY: 155, color: "#eab308" },
            { x: 280, y: 155, prevX: 243, prevY: 185, color: "#eab308" },
            { x: 243, y: 185, prevX: 260, prevY: 230, color: "#eab308" },
            { x: 260, y: 230, prevX: 220, prevY: 200, color: "#eab308" },
            { x: 220, y: 200, prevX: 180, prevY: 230, color: "#eab308" },
            { x: 180, y: 230, prevX: 197, prevY: 185, color: "#eab308" },
            { x: 197, y: 185, prevX: 160, prevY: 155, color: "#eab308" },
            { x: 160, y: 155, prevX: 205, prevY: 155, color: "#eab308" },
            { x: 205, y: 155, prevX: 220, prevY: 100, color: "#eab308" },
        ]
    }
];

export const getSoloDrawing = (): SoloDrawing => {
    return soloDrawings[Math.floor(Math.random() * soloDrawings.length)];
};

const recentSpeedIndices: number[] = [];

export const getSpeedRoundWord = () => {
    let eligible = speedRoundWords.map((word, i) => ({ word, index: i }));
    eligible = eligible.filter(w => !recentSpeedIndices.includes(w.index));

    if (eligible.length === 0) {
        recentSpeedIndices.length = 0;
        eligible = speedRoundWords.map((word, i) => ({ word, index: i }));
    }

    const chosen = eligible[Math.floor(Math.random() * eligible.length)];
    recentSpeedIndices.push(chosen.index);
    if (recentSpeedIndices.length > 15) recentSpeedIndices.shift();

    return chosen.word;
};
