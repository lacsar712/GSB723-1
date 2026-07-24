const db = require('./database');

const DEFAULT_BATCH_SIZE = 5;
const MAX_INTERVAL_DAYS = 30;
const INITIAL_INTERVAL_DAYS = 1;
const DISTRACTOR_COUNT = 3;

function generateSessionId() {
    return 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function toSqliteDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
        pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}

function calculateNextReview(currentIntervalDays, isCorrect) {
    if (isCorrect) {
        const nextInterval = Math.min(currentIntervalDays * 2, MAX_INTERVAL_DAYS);
        const nextReviewAt = addDays(new Date(), nextInterval);
        return {
            intervalDays: nextInterval,
            nextReviewAt: toSqliteDate(nextReviewAt),
            dueImmediately: false
        };
    } else {
        return {
            intervalDays: INITIAL_INTERVAL_DAYS,
            nextReviewAt: toSqliteDate(new Date()),
            dueImmediately: true
        };
    }
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function fetchDueReviewWords(userId, limit, callback) {
    const sql = `
        SELECT lh.id as learning_id, lh.interval_days, lh.review_count, lh.next_review_at,
               w.id as word_id, w.word, w.pronunciation, w.pos, w.definition, w.example, w.rank, w.difficulty_level
        FROM learning_history lh
        JOIN words w ON lh.word_id = w.id
        WHERE lh.user_id = ? AND lh.status = 'learned'
          AND lh.next_review_at IS NOT NULL
          AND datetime(lh.next_review_at) <= datetime('now')
        ORDER BY lh.next_review_at ASC
        LIMIT ?
    `;
    db.all(sql, [userId, limit], callback);
}

function fetchSupplementaryWords(userId, limit, excludeWordIds, callback) {
    if (limit <= 0) return callback(null, []);
    const placeholders = excludeWordIds.length > 0 ? excludeWordIds.map(() => '?').join(',') : '0';
    const sql = `
        SELECT lh.id as learning_id, lh.interval_days, lh.review_count, lh.next_review_at,
               w.id as word_id, w.word, w.pronunciation, w.pos, w.definition, w.example, w.rank, w.difficulty_level
        FROM learning_history lh
        JOIN words w ON lh.word_id = w.id
        WHERE lh.user_id = ? AND lh.status = 'learned'
          AND w.id NOT IN (${placeholders})
        ORDER BY lh.next_review_at ASC
        LIMIT ?
    `;
    const params = [userId, ...excludeWordIds, limit];
    db.all(sql, params, callback);
}

function fetchDistractors(correctWordId, difficultyLevel, count, callback) {
    const sql = `
        SELECT word FROM words
        WHERE id != ? AND difficulty_level = ?
        ORDER BY RANDOM()
        LIMIT ?
    `;
    db.all(sql, [correctWordId, difficultyLevel, count], (err, rows) => {
        if (err) return callback(err);
        if (rows.length < count) {
            const fallbackSql = `
                SELECT word FROM words
                WHERE id != ?
                ORDER BY RANDOM()
                LIMIT ?
            `;
            db.all(fallbackSql, [correctWordId, count], (fallbackErr, fallbackRows) => {
                if (fallbackErr) return callback(fallbackErr);
                const seen = new Set(rows.map(r => r.word));
                const merged = [...rows];
                for (const r of fallbackRows) {
                    if (!seen.has(r.word)) {
                        merged.push(r);
                        seen.add(r.word);
                    }
                    if (merged.length >= count) break;
                }
                callback(null, merged.slice(0, count).map(r => r.word));
            });
        } else {
            callback(null, rows.map(r => r.word));
        }
    });
}

function buildQuestionForWord(wordRow, distractors, sessionId) {
    const options = shuffleArray([wordRow.word, ...distractors]);
    return {
        sessionId,
        wordId: wordRow.word_id,
        learningId: wordRow.learning_id,
        word: wordRow.word,
        pronunciation: wordRow.pronunciation,
        pos: wordRow.pos,
        definition: wordRow.definition,
        example: wordRow.example,
        options
    };
}

function buildReviewBatch(userId, batchSize, callback) {
    const size = batchSize || DEFAULT_BATCH_SIZE;
    const sessionId = generateSessionId();

    fetchDueReviewWords(userId, size, (dueErr, dueWords) => {
        if (dueErr) return callback(dueErr);

        const collected = [...dueWords];
        const excludeIds = collected.map(w => w.word_id);
        const remaining = size - collected.length;

        fetchSupplementaryWords(userId, remaining, excludeIds, (supErr, supWords) => {
            if (supErr) return callback(supErr);
            collected.push(...supWords);

            if (collected.length === 0) {
                return callback(null, { sessionId, questions: [] });
            }

            let pending = collected.length;
            const questions = new Array(collected.length);
            let failed = false;

            collected.forEach((w, idx) => {
                const difficulty = w.difficulty_level || 3;
                fetchDistractors(w.word_id, difficulty, DISTRACTOR_COUNT, (distErr, distractors) => {
                    if (failed) return;
                    if (distErr) {
                        failed = true;
                        return callback(distErr);
                    }
                    questions[idx] = buildQuestionForWord(w, distractors, sessionId);
                    pending--;
                    if (pending === 0) {
                        callback(null, { sessionId, questions });
                    }
                });
            });
        });
    });
}

function recordAnswer(sessionId, userId, wordId, selectedOption, isCorrect, callback) {
    db.run(
        `INSERT INTO review_answers (session_id, user_id, word_id, selected_option, is_correct)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, userId, wordId, selectedOption, isCorrect ? 1 : 0],
        function (err) {
            if (err) return callback(err);
            callback(null, { answerId: this.lastID });
        }
    );
}

function updateLearningSchedule(userId, wordId, isCorrect, callback) {
    db.get(
        `SELECT interval_days, review_count FROM learning_history
         WHERE user_id = ? AND word_id = ? AND status = 'learned'`,
        [userId, wordId],
        (err, row) => {
            if (err) return callback(err);
            const currentInterval = row ? row.interval_days || INITIAL_INTERVAL_DAYS : INITIAL_INTERVAL_DAYS;
            const currentReviewCount = row ? row.review_count || 0 : 0;
            const result = calculateNextReview(currentInterval, isCorrect);

            db.run(
                `UPDATE learning_history
                 SET interval_days = ?,
                     next_review_at = ?,
                     review_count = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND word_id = ? AND status = 'learned'`,
                [result.intervalDays, result.nextReviewAt, currentReviewCount + 1, userId, wordId],
                (updateErr) => {
                    if (updateErr) return callback(updateErr);
                    callback(null, result);
                }
            );
        }
    );
}

function initializeLearningSchedule(userId, wordId, callback) {
    const firstReviewAt = toSqliteDate(addDays(new Date(), INITIAL_INTERVAL_DAYS));
    db.run(
        `UPDATE learning_history
         SET interval_days = ?,
             next_review_at = ?,
             review_count = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND word_id = ? AND status = 'learned'
           AND (next_review_at IS NULL OR next_review_at = '')`,
        [INITIAL_INTERVAL_DAYS, firstReviewAt, userId, wordId],
        callback
    );
}

function getSessionResults(sessionId, userId, callback) {
    const sql = `
        SELECT ra.is_correct, ra.selected_option,
               w.id as word_id, w.word, w.pronunciation, w.pos, w.definition, w.example
        FROM review_answers ra
        JOIN words w ON ra.word_id = w.id
        WHERE ra.session_id = ? AND ra.user_id = ?
        ORDER BY ra.id ASC
    `;
    db.all(sql, [sessionId, userId], (err, rows) => {
        if (err) return callback(err);
        const total = rows.length;
        const correct = rows.filter(r => r.is_correct === 1).length;
        const wrong = total - correct;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        const wrongAnswers = rows
            .filter(r => r.is_correct === 0)
            .map(r => ({
                wordId: r.word_id,
                word: r.word,
                pronunciation: r.pronunciation,
                pos: r.pos,
                definition: r.definition,
                example: r.example,
                selectedOption: r.selected_option
            }));
        callback(null, {
            sessionId,
            total,
            correct,
            wrong,
            accuracy,
            wrongAnswers
        });
    });
}

function getReviewStats(userId, callback) {
    const now = toSqliteDate(new Date());
    db.get(
        `SELECT COUNT(*) as due_count
         FROM learning_history
         WHERE user_id = ? AND status = 'learned'
           AND next_review_at IS NOT NULL
           AND datetime(next_review_at) <= datetime(?)`,
        [userId, now],
        (dueErr, dueRow) => {
            if (dueErr) return callback(dueErr);
            db.get(
                `SELECT COUNT(*) as total_count
                 FROM learning_history
                 WHERE user_id = ? AND status = 'learned'`,
                [userId],
                (totalErr, totalRow) => {
                    if (totalErr) return callback(totalErr);
                    callback(null, {
                        dueCount: dueRow.due_count,
                        totalLearned: totalRow.total_count
                    });
                }
            );
        }
    );
}

module.exports = {
    DEFAULT_BATCH_SIZE,
    MAX_INTERVAL_DAYS,
    INITIAL_INTERVAL_DAYS,
    generateSessionId,
    calculateNextReview,
    addDays,
    toSqliteDate,
    shuffleArray,
    buildReviewBatch,
    recordAnswer,
    updateLearningSchedule,
    initializeLearningSchedule,
    getSessionResults,
    getReviewStats
};
