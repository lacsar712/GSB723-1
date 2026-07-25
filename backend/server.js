const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const app = express();
const PORT = 3000;
const SECRET_KEY = "supersecretkey_vocabulary_1209"; // In prod, use .env

app.use(cors());
app.use(express.json());

// Middleware to authenticate
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token.split(' ')[1], SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hash], function (err) {
        if (err) return res.status(400).json({ error: "用户名已存在" });
        res.json({ id: this.lastID, username, vocab_size: 0 });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (!user || applyPasswordCheck(password, user)) return res.status(401).json({ error: "无效的用户名或密码" });
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, vocab_size: user.vocab_size } });
    });
});

function applyPasswordCheck(password, user) {
    return !bcrypt.compareSync(password, user.password_hash);
}

// User Profile
app.get('/api/me', authenticate, (req, res) => {
    db.get("SELECT id, username, vocab_size, created_at FROM users WHERE id = ?", [req.user.id], (err, row) => {
        res.json(row);
    });
});

// Vocab Test Routes
// Adaptive test: Start with medium difficulty, adjust based on answers
app.get('/api/test/words', (req, res) => {
    // Get words from each difficulty level for adaptive testing
    // Returns words grouped by difficulty for frontend to implement adaptive logic
    const sql = `
        SELECT * FROM words
        ORDER BY difficulty_level ASC, RANDOM()
    `;
    db.all(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get next adaptive test word based on current ability estimate
app.post('/api/test/next-word', authenticate, (req, res) => {
    const { currentAbility, answeredWordIds } = req.body;
    // currentAbility: estimated rank level (starts at 3000)
    // answeredWordIds: array of word IDs already answered

    const excludeIds = answeredWordIds && answeredWordIds.length > 0
        ? answeredWordIds.join(',')
        : '0';

    // Find word closest to current ability estimate
    const sql = `
        SELECT *, ABS(rank - ?) as distance
        FROM words
        WHERE id NOT IN (${excludeIds})
        ORDER BY distance ASC, RANDOM()
        LIMIT 1
    `;

    db.get(sql, [currentAbility], (err, word) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!word) return res.json({ finished: true });
        res.json(word);
    });
});

// Submit test result with detailed answer data for accurate estimation
app.post('/api/test/submit', authenticate, (req, res) => {
    const { answers } = req.body;
    // answers: [{ wordId, rank, isCorrect }]

    if (!answers || answers.length === 0) {
        return res.status(400).json({ error: "No answers provided" });
    }

    // Binary search estimation using Item Response Theory (IRT) simplified
    // Find the rank threshold where user transitions from knowing to not knowing
    const sortedAnswers = [...answers].sort((a, b) => a.rank - b.rank);

    let correctByRank = sortedAnswers.map(a => ({
        rank: a.rank,
        correct: a.isCorrect ? 1 : 0
    }));

    // Calculate weighted average based on correct/incorrect boundary
    // Words answered correctly contribute their rank, incorrect ones don't
    let totalWeight = 0;
    let weightedSum = 0;

    correctByRank.forEach((item, index) => {
        const weight = item.correct ? 1.5 : 0.5;
        weightedSum += item.rank * weight * (item.correct ? 1 : 0.3);
        totalWeight += weight * (item.correct ? 1 : 0.3);
    });

    // Find the highest rank where user got correct
    const correctAnswers = sortedAnswers.filter(a => a.isCorrect);
    const incorrectAnswers = sortedAnswers.filter(a => !a.isCorrect);

    let estimatedVocab;

    if (correctAnswers.length === 0) {
        // All wrong - estimate at lowest rank
        estimatedVocab = Math.min(...sortedAnswers.map(a => a.rank)) * 0.5;
    } else if (incorrectAnswers.length === 0) {
        // All correct - estimate above highest tested rank
        estimatedVocab = Math.max(...sortedAnswers.map(a => a.rank)) * 1.2;
    } else {
        // Mixed results - find the boundary
        const maxCorrectRank = Math.max(...correctAnswers.map(a => a.rank));
        const minIncorrectRank = Math.min(...incorrectAnswers.map(a => a.rank));

        // Estimate is between highest correct and lowest incorrect
        // Weight towards correct answers
        const correctRatio = correctAnswers.length / answers.length;
        estimatedVocab = maxCorrectRank * 0.7 + minIncorrectRank * 0.3;

        // Adjust based on overall performance
        estimatedVocab = estimatedVocab * (0.8 + correctRatio * 0.4);
    }

    estimatedVocab = Math.round(Math.max(100, Math.min(10000, estimatedVocab)));

    // Record test history
    const stmt = db.prepare(`
        INSERT INTO test_history (user_id, word_id, is_correct, word_rank)
        VALUES (?, ?, ?, ?)
    `);

    answers.forEach(a => {
        stmt.run(req.user.id, a.wordId, a.isCorrect ? 1 : 0, a.rank);
    });
    stmt.finalize();

    // Update user vocab size
    db.run("UPDATE users SET vocab_size = ? WHERE id = ?", [estimatedVocab, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            vocab_size: estimatedVocab,
            correct_count: correctAnswers.length,
            total_questions: answers.length,
            accuracy: Math.round((correctAnswers.length / answers.length) * 100)
        });
    });
});

// Recommendation Engine (i+1) - Enhanced with frequency and learning history
app.get('/api/recommend', authenticate, (req, res) => {
    db.get("SELECT vocab_size FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (!user) return res.status(404).json({ error: "用户未找到" });

        const i = user.vocab_size;

        // Enhanced recommendation algorithm:
        // 1. Find words slightly above user's level (i+1 principle)
        // 2. Prioritize high-frequency words (more useful in daily life)
        // 3. Consider words that were skipped before (give second chance after time)
        // 4. Exclude recently learned and recently skipped words

        const sql = `
            SELECT w.*,
                   CASE
                       WHEN w.rank BETWEEN ? AND ? THEN 100  -- Sweet spot: i to i+1500
                       WHEN w.rank BETWEEN ? AND ? THEN 80   -- Slightly above: i+1500 to i+3000
                       WHEN w.rank < ? THEN 60               -- Below level (review)
                       ELSE 40                               -- Much higher
                   END as level_score,
                   (w.frequency * 10) as frequency_score
            FROM words w
            WHERE w.id NOT IN (
                SELECT word_id FROM learning_history
                WHERE user_id = ? AND status = 'learned'
            )
            AND w.id NOT IN (
                SELECT word_id FROM learning_history
                WHERE user_id = ? AND status = 'skipped'
                AND updated_at > datetime('now', '-1 hour')
            )
            ORDER BY (level_score + frequency_score) DESC, w.rank ASC
            LIMIT 1
        `;

        const params = [
            i, i + 1500,           // Sweet spot range
            i + 1500, i + 3000,   // Slightly above range
            i,                     // Below level threshold
            req.user.id,          // For learned exclusion
            req.user.id           // For recent skip exclusion
        ];

        db.get(sql, params, (err, word) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!word) {
                // Fallback: return any unlearned word not recently skipped
                db.get(`
                    SELECT * FROM words
                    WHERE id NOT IN (SELECT word_id FROM learning_history WHERE user_id = ? AND status = 'learned')
                    AND id NOT IN (SELECT word_id FROM learning_history WHERE user_id = ? AND status = 'skipped' AND updated_at > datetime('now', '-1 hour'))
                    ORDER BY frequency DESC, rank ASC
                    LIMIT 1
                `, [req.user.id, req.user.id], (err, fallback) => {
                    if (fallback) return res.json(fallback);
                    return res.json({ message: "暂无新单词. 您已掌握所有词汇!" });
                });
                return;
            }
            res.json(word);
        });
    });
});

// Get multiple recommendations for batch learning
app.get('/api/recommend/batch', authenticate, (req, res) => {
    const limit = parseInt(req.query.limit) || 5;

    db.get("SELECT vocab_size FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (!user) return res.status(404).json({ error: "用户未找到" });

        const i = user.vocab_size;

        const sql = `
            SELECT w.*,
                   CASE
                       WHEN w.rank BETWEEN ? AND ? THEN 100
                       WHEN w.rank BETWEEN ? AND ? THEN 80
                       WHEN w.rank < ? THEN 60
                       ELSE 40
                   END as level_score,
                   (w.frequency * 10) as frequency_score
            FROM words w
            WHERE w.id NOT IN (
                SELECT word_id FROM learning_history
                WHERE user_id = ? AND status = 'learned'
            )
            ORDER BY (level_score + frequency_score) DESC, w.rank ASC
            LIMIT ?
        `;

        db.all(sql, [i, i + 1500, i + 1500, i + 3000, i, req.user.id, limit], (err, words) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(words);
        });
    });
});

// Mark word as learned
app.post('/api/learn/record', authenticate, (req, res) => {
    const { word_id, status } = req.body; // status: 'learned'
    const finalStatus = status || 'learned';
    db.run("INSERT INTO learning_history (user_id, word_id, status) VALUES (?, ?, ?)", [req.user.id, word_id, finalStatus], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // 首次标记为已掌握后，默认安排在 1 天后进入复习队列
        if (finalStatus === 'learned') {
            db.run(`
                INSERT INTO review_schedule (user_id, word_id, interval_days, next_review_at, updated_at)
                VALUES (?, ?, 1, datetime('now', '+1 day'), datetime('now'))
                ON CONFLICT(user_id, word_id) DO NOTHING
            `, [req.user.id, word_id], (scheduleErr) => {
                if (scheduleErr) return res.status(500).json({ error: scheduleErr.message });
                res.json({ success: true });
            });
        } else {
            res.json({ success: true });
        }
    });
});

// Review self-test constants
const DEFAULT_ROUND_SIZE = 5;
const MAX_INTERVAL_DAYS = 30;

// Fetch a round of review questions.
// 优先拉取「下次复习时间已到期」的单词；不足一轮时用尚未到期的已掌握词补足。
app.get('/api/review/session', authenticate, (req, res) => {
    const roundSize = parseInt(req.query.size) || DEFAULT_ROUND_SIZE;

    // Due words first (next_review_at <= now), then not-yet-due, ordered by soonest.
    const sql = `
        SELECT w.id, w.word, w.pronunciation, w.pos, w.definition, w.example,
               rs.next_review_at,
               CASE WHEN rs.next_review_at <= datetime('now') THEN 0 ELSE 1 END as not_due
        FROM review_schedule rs
        JOIN words w ON rs.word_id = w.id
        WHERE rs.user_id = ?
        ORDER BY not_due ASC, rs.next_review_at ASC
        LIMIT ?
    `;

    db.all(sql, [req.user.id, roundSize], (err, words) => {
        if (err) return res.status(500).json({ error: err.message });

        // Distractor pool: other english words used to build 4-option choices on the client.
        db.all("SELECT word FROM words", (poolErr, pool) => {
            if (poolErr) return res.status(500).json({ error: poolErr.message });
            res.json({
                roundSize,
                words: words || [],
                distractorPool: (pool || []).map(p => p.word)
            });
        });
    });
});

// Record a single review answer and update the spaced-repetition schedule.
app.post('/api/review/answer', authenticate, (req, res) => {
    const { word_id, is_correct, selected_word } = req.body;
    if (!word_id) return res.status(400).json({ error: "缺少 word_id" });

    const correct = is_correct ? 1 : 0;

    db.run(
        "INSERT INTO review_answers (user_id, word_id, is_correct, selected_word) VALUES (?, ?, ?, ?)",
        [req.user.id, word_id, correct, selected_word || null],
        (insertErr) => {
            if (insertErr) return res.status(500).json({ error: insertErr.message });

            db.get(
                "SELECT interval_days FROM review_schedule WHERE user_id = ? AND word_id = ?",
                [req.user.id, word_id],
                (getErr, row) => {
                    if (getErr) return res.status(500).json({ error: getErr.message });

                    const currentInterval = row ? row.interval_days : 1;
                    let nextInterval;
                    let nextReviewExpr;

                    if (correct) {
                        // 答对：下一次间隔变为「上次间隔 × 2」（上限 30 天）推迟
                        nextInterval = Math.min(currentInterval * 2, MAX_INTERVAL_DAYS);
                        nextReviewExpr = `datetime('now', '+${nextInterval} day')`;
                    } else {
                        // 答错：重置为当天并重新进入优先复习队列
                        nextInterval = 1;
                        nextReviewExpr = `datetime('now')`;
                    }

                    db.run(`
                        INSERT INTO review_schedule (user_id, word_id, interval_days, next_review_at, updated_at)
                        VALUES (?, ?, ?, ${nextReviewExpr}, datetime('now'))
                        ON CONFLICT(user_id, word_id) DO UPDATE SET
                            interval_days = excluded.interval_days,
                            next_review_at = excluded.next_review_at,
                            updated_at = datetime('now')
                    `, [req.user.id, word_id, nextInterval], (upErr) => {
                        if (upErr) return res.status(500).json({ error: upErr.message });
                        res.json({ success: true, interval_days: nextInterval });
                    });
                }
            );
        }
    );
});

// Statistics
app.get('/api/stats', authenticate, (req, res) => {
    // Get history with word details
    const sql = `
        SELECT lh.*, w.word, w.definition, w.pronunciation 
        FROM learning_history lh
        JOIN words w ON lh.word_id = w.id
        WHERE lh.user_id = ?
        ORDER BY lh.updated_at DESC
    `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ learned_count: rows.length, history: rows });
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
