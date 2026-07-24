const db = require('./database');

const DEFAULT_QUIZ_SIZE = 5;
const INITIAL_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 30;

function getDueWords(userId, limit) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT lh.id as learning_id, lh.last_interval, lh.next_review_at, lh.review_count,
                   w.id as word_id, w.word, w.pronunciation, w.pos, w.definition, w.example
            FROM learning_history lh
            JOIN words w ON lh.word_id = w.id
            WHERE lh.user_id = ? AND lh.status = 'learned'
            AND (lh.next_review_at IS NULL OR lh.next_review_at <= datetime('now'))
            ORDER BY lh.next_review_at ASC
            LIMIT ?
        `;
        db.all(sql, [userId, limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getUpcomingWords(userId, limit, excludeIds) {
    return new Promise((resolve, reject) => {
        const exclude = excludeIds.length > 0 ? excludeIds.join(',') : '0';
        const sql = `
            SELECT lh.id as learning_id, lh.last_interval, lh.next_review_at, lh.review_count,
                   w.id as word_id, w.word, w.pronunciation, w.pos, w.definition, w.example
            FROM learning_history lh
            JOIN words w ON lh.word_id = w.id
            WHERE lh.user_id = ? AND lh.status = 'learned'
            AND lh.next_review_at > datetime('now')
            AND w.id NOT IN (${exclude})
            ORDER BY lh.next_review_at ASC
            LIMIT ?
        `;
        db.all(sql, [userId, limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getDistractors(correctWordId, count) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT word FROM words
            WHERE id != ?
            ORDER BY RANDOM()
            LIMIT ?
        `;
        db.all(sql, [correctWordId, count], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.word));
        });
    });
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function buildQuizQuestion(wordEntry) {
    const distractors = await getDistractors(wordEntry.word_id, 3);
    const options = shuffleArray([wordEntry.word, ...distractors]);
    return {
        learningId: wordEntry.learning_id,
        wordId: wordEntry.word_id,
        word: wordEntry.word,
        pronunciation: wordEntry.pronunciation,
        definition: wordEntry.definition,
        example: wordEntry.example,
        options: options
    };
}

async function getQuizQuestions(userId, quizSize = DEFAULT_QUIZ_SIZE) {
    const dueWords = await getDueWords(userId, quizSize);
    let questions = [];

    for (const w of dueWords) {
        questions.push(await buildQuizQuestion(w));
    }

    if (questions.length < quizSize) {
        const needed = quizSize - questions.length;
        const excludeIds = dueWords.map(w => w.word_id);
        const upcomingWords = await getUpcomingWords(userId, needed, excludeIds);
        for (const w of upcomingWords) {
            questions.push(await buildQuizQuestion(w));
        }
    }

    return questions;
}

function calculateNextInterval(isCorrect, lastInterval) {
    if (!isCorrect) {
        return 0;
    }
    if (lastInterval === 0) {
        return INITIAL_INTERVAL_DAYS;
    }
    return Math.min(lastInterval * 2, MAX_INTERVAL_DAYS);
}

function updateReviewRecord(learningId, isCorrect) {
    return new Promise((resolve, reject) => {
        db.get("SELECT last_interval, review_count FROM learning_history WHERE id = ?", [learningId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                reject(new Error('Learning record not found'));
                return;
            }

            const nextInterval = calculateNextInterval(isCorrect, row.last_interval);
            const nextReviewAt = nextInterval === 0
                ? "datetime('now')"
                : `datetime('now', '+${nextInterval} days')`;

            const sql = `
                UPDATE learning_history
                SET last_interval = ?,
                    next_review_at = ${nextReviewAt},
                    review_count = review_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            db.run(sql, [nextInterval, learningId], function(err) {
                if (err) reject(err);
                else resolve({
                    nextInterval,
                    reviewCount: row.review_count + 1
                });
            });
        });
    });
}

function getLearnedCount(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT COUNT(*) as count FROM learning_history WHERE user_id = ? AND status = 'learned'",
            [userId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            }
        );
    });
}

module.exports = {
    DEFAULT_QUIZ_SIZE,
    INITIAL_INTERVAL_DAYS,
    MAX_INTERVAL_DAYS,
    getQuizQuestions,
    updateReviewRecord,
    calculateNextInterval,
    getLearnedCount
};
