const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./data/vocab.db', (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// frequency: 使用频率 (1-10, 10为最常用)
// difficulty_level: 难度等级 (1=基础, 2=初级, 3=中级, 4=中高级, 5=高级, 6=专业)
const wordList = [
    // 基础词汇 (difficulty_level: 1, rank: 100-500)
    { word: "apple", pronunciation: "/ˈæpəl/", pos: "n.", definition: "苹果", example: "She ate an apple for lunch.", rank: 100, frequency: 10, difficulty_level: 1 },
    { word: "book", pronunciation: "/bʊk/", pos: "n.", definition: "书，书籍", example: "I read a book about history.", rank: 150, frequency: 10, difficulty_level: 1 },
    { word: "cat", pronunciation: "/kæt/", pos: "n.", definition: "猫", example: "The cat sat on the mat.", rank: 120, frequency: 10, difficulty_level: 1 },
    { word: "dog", pronunciation: "/dɒɡ/", pos: "n.", definition: "狗", example: "We could hear a dog barking.", rank: 130, frequency: 10, difficulty_level: 1 },
    { word: "eat", pronunciation: "/iːt/", pos: "v.", definition: "吃", example: "Do you want to eat lunch now?", rank: 200, frequency: 10, difficulty_level: 1 },
    { word: "water", pronunciation: "/ˈwɔːtər/", pos: "n.", definition: "水", example: "I need a glass of water.", rank: 180, frequency: 10, difficulty_level: 1 },
    { word: "house", pronunciation: "/haʊs/", pos: "n.", definition: "房子", example: "They live in a big house.", rank: 220, frequency: 10, difficulty_level: 1 },
    { word: "time", pronunciation: "/taɪm/", pos: "n.", definition: "时间", example: "What time is it?", rank: 250, frequency: 10, difficulty_level: 1 },

    // 初级词汇 (difficulty_level: 2, rank: 500-1500)
    { word: "ability", pronunciation: "/əˈbɪləti/", pos: "n.", definition: "做某事所需的身体或脑力；能力", example: "She had the ability to explain things clearly.", rank: 500, frequency: 9, difficulty_level: 2 },
    { word: "abandon", pronunciation: "/əˈbændən/", pos: "v.", definition: "永远离开某地、某人或某物；抛弃", example: "We had to abandon the car.", rank: 1100, frequency: 7, difficulty_level: 2 },
    { word: "absence", pronunciation: "/ˈæbsəns/", pos: "n.", definition: "缺席；不在场", example: "A new manager was appointed during her absence.", rank: 1200, frequency: 7, difficulty_level: 2 },
    { word: "absolute", pronunciation: "/ˈæbsəluːt/", pos: "adj.", definition: "完全的；绝对的", example: "I have absolute faith in her judgment.", rank: 1300, frequency: 7, difficulty_level: 2 },
    { word: "academic", pronunciation: "/ˌækəˈdemɪk/", pos: "adj.", definition: "学校的；学院的；学术的", example: "The book brings together several academic subjects.", rank: 1500, frequency: 8, difficulty_level: 2 },
    { word: "accept", pronunciation: "/əkˈsept/", pos: "v.", definition: "接受", example: "Please accept my apology.", rank: 800, frequency: 9, difficulty_level: 2 },
    { word: "achieve", pronunciation: "/əˈtʃiːv/", pos: "v.", definition: "达到；实现", example: "She achieved her goal.", rank: 900, frequency: 8, difficulty_level: 2 },
    { word: "advice", pronunciation: "/ədˈvaɪs/", pos: "n.", definition: "建议；忠告", example: "Can you give me some advice?", rank: 1000, frequency: 8, difficulty_level: 2 },

    // 中级词汇 (difficulty_level: 3, rank: 2000-4000)
    { word: "yearn", pronunciation: "/jɜːn/", pos: "v.", definition: "渴望，切盼", example: "Despite his great commercial success he still yearns for critical approval.", rank: 3500, frequency: 5, difficulty_level: 3 },
    { word: "benevolent", pronunciation: "/bəˈnevələnt/", pos: "adj.", definition: "慈善的；仁慈的", example: "He was a benevolent old man and wouldn't hurt a fly.", rank: 4000, frequency: 4, difficulty_level: 3 },
    { word: "wane", pronunciation: "/weɪn/", pos: "v.", definition: "（势力、影响等）衰弱，减退", example: "By the late 70s the band's popularity was beginning to wane.", rank: 4200, frequency: 5, difficulty_level: 3 },
    { word: "eloquent", pronunciation: "/ˈeləkwənt/", pos: "adj.", definition: "雄辩的；有说服力的", example: "She gave an eloquent speech.", rank: 3800, frequency: 5, difficulty_level: 3 },
    { word: "diligent", pronunciation: "/ˈdɪlɪdʒənt/", pos: "adj.", definition: "勤奋的；勤勉的", example: "He is a diligent student.", rank: 3200, frequency: 6, difficulty_level: 3 },
    { word: "ambiguous", pronunciation: "/æmˈbɪɡjuəs/", pos: "adj.", definition: "模棱两可的；含糊的", example: "The statement was ambiguous.", rank: 3600, frequency: 5, difficulty_level: 3 },

    // 中高级词汇 (difficulty_level: 4, rank: 4000-6000)
    { word: "ubiquitous", pronunciation: "/juːˈbɪkwɪtəs/", pos: "adj.", definition: "普遍存在的，无所不在的", example: "Leather is very much in fashion this season, as is the ubiquitous denim.", rank: 4500, frequency: 4, difficulty_level: 4 },
    { word: "zealous", pronunciation: "/ˈzeləs/", pos: "adj.", definition: "热情的；狂热的", example: "No one was more zealous than Neil in supporting the proposal.", rank: 4700, frequency: 4, difficulty_level: 4 },
    { word: "eclectic", pronunciation: "/ɪˈklektɪk/", pos: "adj.", definition: "不拘一格的；兼收并蓄的", example: "It was an eclectic mix of our ethnic foods and traditional Thanksgiving food.", rank: 4800, frequency: 4, difficulty_level: 4 },
    { word: "magnanimous", pronunciation: "/mæɡˈnænɪməs/", pos: "adj.", definition: "（对敌人或失败者）宽宏大量的", example: "The team's manager was magnanimous in victory.", rank: 5100, frequency: 3, difficulty_level: 4 },
    { word: "fabricate", pronunciation: "/ˈfæbrɪkeɪt/", pos: "v.", definition: "捏造，虚构（借口、谎言等）", example: "He was late, so he fabricated an excuse to avoid trouble.", rank: 5200, frequency: 4, difficulty_level: 4 },
    { word: "quintessential", pronunciation: "/ˌkwɪntɪˈsenʃəl/", pos: "adj.", definition: "最典型的；完美的", example: "Sheep's milk cheese is the quintessential Corsican cheese.", rank: 5300, frequency: 4, difficulty_level: 4 },
    { word: "debilitate", pronunciation: "/dɪˈbɪlɪteɪt/", pos: "v.", definition: "使（身心）衰弱", example: "Chemotherapy exhausted and debilitated him.", rank: 5500, frequency: 3, difficulty_level: 4 },
    { word: "xenophobia", pronunciation: "/ˌzenəˈfəʊbiə/", pos: "n.", definition: "仇外，惧外", example: "The government has denied that the new policy is motivated by xenophobia.", rank: 5600, frequency: 4, difficulty_level: 4 },
    { word: "kaleidoscope", pronunciation: "/kəˈlaɪdəskəʊp/", pos: "n.", definition: "千变万化；万花筒", example: "The street bazaar was a kaleidoscope of colors, smells, and sounds.", rank: 5800, frequency: 3, difficulty_level: 4 },
    { word: "vacillate", pronunciation: "/ˈvæsɪleɪt/", pos: "v.", definition: "摇摆；犹豫不定", example: "Her mood vacillated between hope and despair.", rank: 5900, frequency: 3, difficulty_level: 4 },
    { word: "juxtapose", pronunciation: "/ˌdʒʌkstəˈpəʊz/", pos: "v.", definition: "把…并列；把…并置（以作对比）", example: "The exhibition juxtaposes Picasso's early drawings with some of his later works.", rank: 6000, frequency: 3, difficulty_level: 4 },

    // 高级词汇 (difficulty_level: 5, rank: 6000-8000)
    { word: "rambunctious", pronunciation: "/ræmˈbʌŋkʃəs/", pos: "adj.", definition: "精力过剩的；难管束的", example: "The puppy was rambunctious and chewed on everything.", rank: 6100, frequency: 2, difficulty_level: 5 },
    { word: "languid", pronunciation: "/ˈlæŋɡwɪd/", pos: "adj.", definition: "慢悠悠的；慵懒的", example: "He sat on the porch, enjoying the languid afternoon heat.", rank: 6200, frequency: 2, difficulty_level: 5 },
    { word: "taciturn", pronunciation: "/ˈtæsɪtɜːn/", pos: "adj.", definition: "沉默寡言的", example: "He was a taciturn man who spent most of his time alone.", rank: 6300, frequency: 2, difficulty_level: 5 },
    { word: "cacophony", pronunciation: "/kəˈkɒfəni/", pos: "n.", definition: "刺耳嘈杂的声音；杂音", example: "As we entered the farmyard we were met with a cacophony of animal sounds.", rank: 6500, frequency: 2, difficulty_level: 5 },
    { word: "sagacious", pronunciation: "/səˈɡeɪʃəs/", pos: "adj.", definition: "聪明的，睿智的；有远见的", example: "The leader was known for her sagacious decisions during the crisis.", rank: 6700, frequency: 2, difficulty_level: 5 },
    { word: "nefarious", pronunciation: "/nɪˈfeəriəs/", pos: "adj.", definition: "（尤指活动）邪恶的，不道德的", example: "The company's CEO seems to have been involved in some nefarious practices.", rank: 6800, frequency: 2, difficulty_level: 5 },
    { word: "garrulous", pronunciation: "/ˈɡærələs/", pos: "adj.", definition: "（尤指对琐事）喋喋不休的", example: "I had a garrulous neighbor who talked specifically about her cat.", rank: 7000, frequency: 2, difficulty_level: 5 },
    { word: "harangue", pronunciation: "/həˈræŋ/", pos: "v.", definition: "（愤怒而有力地）训斥，谴责", example: "A drunk in the station was haranguing passers-by.", rank: 7200, frequency: 2, difficulty_level: 5 },
    { word: "obfuscate", pronunciation: "/ˈɒbfʌskeɪt/", pos: "v.", definition: "（尤指故意）可能会混淆；使困惑", example: "She was criticized for using arguments that obfuscated the main issue.", rank: 7500, frequency: 2, difficulty_level: 5 },

    // 专业词汇 (difficulty_level: 6, rank: 8000+)
    { word: "iconoclast", pronunciation: "/naɪˈkɒnəklæst/", pos: "n.", definition: "反传统者；打破偶像者", example: "Rogers, an iconoclast in architecture, is sometimes described as shameless.", rank: 8000, frequency: 1, difficulty_level: 6 },
    { word: "palimpsest", pronunciation: "/ˈpælɪmpsest/", pos: "n.", definition: "多层次结构；具有多重意义的事物", example: "The city is a palimpsest of different cultures and eras.", rank: 9000, frequency: 1, difficulty_level: 6 },
    { word: "sesquipedalian", pronunciation: "/ˌseskwɪpɪˈdeɪliən/", pos: "adj.", definition: "（词语）冗长的；好用长词的", example: "His sesquipedalian prose style made the article difficult to read.", rank: 9500, frequency: 1, difficulty_level: 6 },
    { word: "defenestration", pronunciation: "/diːˌfenɪˈstreɪʃən/", pos: "n.", definition: "将人或物从窗户扔出", example: "The defenestration of Prague was a pivotal event in European history.", rank: 9200, frequency: 1, difficulty_level: 6 }
];


db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        vocab_size INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Words table - create if not exists
    db.run(`CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT UNIQUE,
        pronunciation TEXT,
        pos TEXT,
        definition TEXT,
        example TEXT,
        rank INTEGER,
        frequency INTEGER DEFAULT 5,
        difficulty_level INTEGER DEFAULT 3
    )`);

    // Migration: Add new columns if they don't exist
    db.all("PRAGMA table_info(words)", (err, columns) => {
        if (err) {
            console.error('Error checking table info:', err);
            return;
        }

        const columnNames = columns.map(c => c.name);

        if (!columnNames.includes('frequency')) {
            db.run("ALTER TABLE words ADD COLUMN frequency INTEGER DEFAULT 5", (err) => {
                if (err) console.error('Error adding frequency column:', err);
                else console.log('Added frequency column to words table');
            });
        }

        if (!columnNames.includes('difficulty_level')) {
            db.run("ALTER TABLE words ADD COLUMN difficulty_level INTEGER DEFAULT 3", (err) => {
                if (err) console.error('Error adding difficulty_level column:', err);
                else console.log('Added difficulty_level column to words table');
            });
        }
    });

    // Test history table for adaptive testing
    db.run(`CREATE TABLE IF NOT EXISTS test_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        word_id INTEGER,
        is_correct INTEGER,
        word_rank INTEGER,
        tested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(word_id) REFERENCES words(id)
    )`);

    // Learning History
    db.run(`CREATE TABLE IF NOT EXISTS learning_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        word_id INTEGER,
        status TEXT, -- 'learned', 'mastered'
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(word_id) REFERENCES words(id)
    )`);

    // Seed Data with UPSERT - delay to ensure migration completes
    setTimeout(() => {
        const stmt = db.prepare(`
            INSERT INTO words (word, pronunciation, pos, definition, example, rank, frequency, difficulty_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(word) DO UPDATE SET
                definition=excluded.definition,
                pos=excluded.pos,
                frequency=excluded.frequency,
                difficulty_level=excluded.difficulty_level
        `);

        wordList.forEach(w => {
            stmt.run(w.word, w.pronunciation, w.pos, w.definition, w.example, w.rank, w.frequency, w.difficulty_level);
        });
        stmt.finalize();
        console.log('Word data seeded successfully');
    }, 500);
});

module.exports = db;
