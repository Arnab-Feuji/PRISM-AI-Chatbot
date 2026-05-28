-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- FILE: backend/core/quality/quality_queries.sql
-- PRISM â€” 28 Conversation Quality Parameters
-- All queries parameterised with :user_id and :cutoff (NOW() - INTERVAL '15 days')
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- HELPER: base conversation set for the patient in the retention window
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Use this CTE at the top of any multi-parameter query:
-- WITH patient_convs AS (
--     SELECT id FROM conversations
--     WHERE user_id = :user_id AND updated_at >= :cutoff
-- )


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- DIMENSION 1: ENGAGEMENT  (weight 30%)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€ P1: Star Rating Average (weight 35% within Engagement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: patient_feedback.rating
-- Scale: 1â€“5 â†’ normalised to 0â€“100

SELECT
    AVG(rating)                                    AS raw_avg,
    ROUND(((AVG(rating) - 1) / 4.0) * 100, 1)    AS score_0_100,
    COUNT(*)                                       AS total_ratings,
    COUNT(*) FILTER (WHERE rating = 5)             AS five_star_count,
    COUNT(*) FILTER (WHERE rating <= 2)            AS low_rating_count
FROM patient_feedback
WHERE user_id = :user_id
  AND created_at >= :cutoff;


-- â”€â”€ P2: Chip Click Rate (weight 25% within Engagement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: messages (user role, content ends with "?", >20 chars = likely chip echo)
-- A "chip echo" is when a patient types back a suggested follow-up question.
-- Scale: 0â€“100% (paradoxically high = chips are visible but not auto-clicking)
-- Target: <20% (patients typing freely, not just clicking chips)

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
),
user_turns AS (
    SELECT content, created_at
    FROM messages
    WHERE conversation_id IN (SELECT id FROM patient_convs)
      AND role = 'user'
),
chip_echoes AS (
    SELECT COUNT(*) AS echo_count
    FROM user_turns
    WHERE LENGTH(content) > 20
      AND content LIKE '%?'
      AND LENGTH(content) < 200     -- Chips are short questions
)
SELECT
    (SELECT COUNT(*) FROM user_turns)                   AS total_user_turns,
    ce.echo_count                                       AS chip_echo_count,
    ROUND((ce.echo_count::numeric
        / NULLIF((SELECT COUNT(*) FROM user_turns), 0)) * 100, 1)
                                                        AS chip_click_rate_pct
FROM chip_echoes ce;


-- â”€â”€ P3: Session Return Rate (weight 20% within Engagement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: conversations.created_at
-- Scale: multiple sessions in window = higher engagement
-- Target: >2 sessions in 15 days = 100

WITH patient_convs AS (
    SELECT id, created_at::date AS session_date
    FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
)
SELECT
    COUNT(*)                                        AS total_sessions,
    COUNT(DISTINCT session_date)                    AS unique_session_days,
    ROUND(LEAST(COUNT(*) / 3.0, 1.0) * 100, 1)    AS score_0_100
    -- 3+ sessions in 15 days = score 100
FROM patient_convs;


-- â”€â”€ P4: Session Depth â€” Average Turns (weight 12% within Engagement) â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: conversations.total_messages
-- Scale: 1 turn = 2 messages; target >5 turns (10 messages) = 100

WITH patient_convs AS (
    SELECT total_messages FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
)
SELECT
    ROUND(AVG(total_messages), 1)                                AS avg_total_messages,
    ROUND(AVG(total_messages) / 2.0, 1)                          AS avg_turns,
    ROUND(LEAST(AVG(total_messages) / 20.0, 1.0) * 100, 1)     AS score_0_100
    -- 10 turns (20 messages) = 100%
FROM patient_convs;


-- â”€â”€ P5: Voluntary Elaboration Rate (weight 8% within Engagement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: messages (user messages with >20 words = patient adding detail)
-- Scale: 0â€“100%, target >30%

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
),
user_msgs AS (
    SELECT content,
           array_length(regexp_split_to_array(trim(content), '\s+'), 1) AS word_count
    FROM messages
    WHERE conversation_id IN (SELECT id FROM patient_convs)
      AND role = 'user'
      AND content NOT LIKE '[VOICE]%'
      AND content NOT LIKE '[IMAGE:%'
)
SELECT
    COUNT(*)                                             AS total_user_messages,
    COUNT(*) FILTER (WHERE word_count > 20)             AS elaborated_messages,
    ROUND(
        (COUNT(*) FILTER (WHERE word_count > 20)::numeric
            / NULLIF(COUNT(*), 0)) * 100, 1)            AS elaboration_rate_pct
FROM user_msgs;


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- DIMENSION 2: RESPONSE QUALITY  (weight 25%)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€ P6â€“P10: RAGAS Scores (from ragas_metrics table) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- P6: Faithfulness (weight 30%),  P7: Relevancy (25%), P8: Precision (20%)
-- P9: Recall (15%),               P10: Confidence avg (10%)

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
)
SELECT
    -- P6: Faithfulness â€” hallucination detection
    ROUND(AVG(rm.faithfulness) * 100, 1)           AS p6_faithfulness_score,

    -- P7: Answer Relevancy â€” does answer address the question?
    ROUND(AVG(rm.answer_relevancy) * 100, 1)       AS p7_answer_relevancy_score,

    -- P8: Context Precision â€” is the retrieved context precise?
    ROUND(AVG(rm.context_precision) * 100, 1)      AS p8_context_precision_score,

    -- P9: Context Recall â€” is all relevant context retrieved?
    ROUND(AVG(rm.context_recall) * 100, 1)         AS p9_context_recall_score,

    -- P10: AI Confidence Average
    ROUND(AVG(m.confidence) * 100, 1)              AS p10_confidence_avg_score,

    COUNT(rm.id)                                    AS ragas_records_count,
    COUNT(m.id) FILTER (WHERE m.role = 'assistant') AS ai_message_count

FROM conversations c
JOIN messages m ON m.conversation_id = c.id
LEFT JOIN ragas_metrics rm ON rm.conversation_id = c.id
WHERE c.user_id = :user_id
  AND c.updated_at >= :cutoff
  AND m.role = 'assistant';


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- DIMENSION 3: CLINICAL SAFETY  (weight 20%)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€ P11: Guardrail Compliance Rate (weight 35%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: system_alerts WHERE level='critical'
-- Scale: each critical guardrail violation = -20 points; target 100%

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
)
SELECT
    COUNT(sa.id)                                                  AS critical_alerts,
    GREATEST(0, 100 - COUNT(sa.id) * 20)                         AS p11_guardrail_score,
    -- List the violations for admin review
    array_agg(sa.title ORDER BY sa.created_at DESC)
        FILTER (WHERE sa.id IS NOT NULL)                         AS violation_titles
FROM patient_convs pc
LEFT JOIN system_alerts sa
       ON sa.component LIKE 'agent:%'
      AND sa.level = 'critical'
      AND sa.created_at >= :cutoff
      AND sa.message LIKE '%' || pc.id || '%';


-- â”€â”€ P12: Escalation Appropriateness (weight 25%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: system_alerts (human escalations) + conversations.escalated
-- Scale: 0â€“100%; a well-handled escalation = good

WITH patient_convs AS (
    SELECT id, escalated FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
)
SELECT
    COUNT(*) FILTER (WHERE escalated = true)                 AS escalated_sessions,
    COUNT(*)                                                 AS total_sessions,
    -- Escalation score: if escalations happened AND were handled = 80+
    CASE
        WHEN COUNT(*) FILTER (WHERE escalated = true) = 0
             THEN 85.0   -- No escalation needed = good baseline
        ELSE LEAST(100,
             60 + COUNT(*) FILTER (WHERE escalated = true) * 10)
    END                                                      AS p12_escalation_score
FROM patient_convs;


-- â”€â”€ P13: Emergency Response Time (weight 20%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: system_alerts WHERE title LIKE 'Emergency%'
-- Scale: fewer emergency triggers = better; each = -25 pts

WITH patient_alert_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
)
SELECT
    COUNT(sa.id)                                             AS emergency_triggers,
    GREATEST(0, 100 - COUNT(sa.id) * 25)                    AS p13_emergency_score
FROM patient_alert_convs pac
LEFT JOIN system_alerts sa
       ON sa.title ILIKE '%emergency%'
      AND sa.created_at >= :cutoff
      AND sa.message ILIKE '%' || pac.id || '%';


-- â”€â”€ P14: Prescription Disclaimer Rate (weight 15%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: prescriptions.is_reference_only
-- Scale: must be 100% (all prescriptions have disclaimer)

SELECT
    COUNT(*)                                               AS total_prescriptions,
    COUNT(*) FILTER (WHERE is_reference_only = true)       AS with_disclaimer,
    COALESCE(
        ROUND(
            COUNT(*) FILTER (WHERE is_reference_only = true)::numeric
            / NULLIF(COUNT(*), 0) * 100, 1),
        100.0)                                             AS p14_disclaimer_rate_pct
FROM prescriptions
WHERE user_id = :user_id
  AND generated_at >= :cutoff;


-- â”€â”€ P15: Citation Presence Rate (weight 5%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: messages.citations IS NOT NULL AND jsonb_array_length > 0

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
),
ai_msgs AS (
    SELECT citations
    FROM messages
    WHERE conversation_id IN (SELECT id FROM patient_convs)
      AND role = 'assistant'
      AND is_clarifying_question = false
)
SELECT
    COUNT(*)                                                          AS ai_responses,
    COUNT(*) FILTER (WHERE citations IS NOT NULL
                       AND jsonb_array_length(citations) > 0)        AS with_citations,
    ROUND(
        COUNT(*) FILTER (WHERE citations IS NOT NULL
                           AND jsonb_array_length(citations) > 0)::numeric
        / NULLIF(COUNT(*), 0) * 100, 1)                              AS p15_citation_rate_pct
FROM ai_msgs;


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- DIMENSION 4: SESSION FLOW  (weight 15%)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€ P16: Question Repeat Rate (weight 30%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: conversations.meta_json â†’ response_state â†’ follow_up_asked
-- Also detects near-duplicate user messages (patient asked same thing twice)
-- Scale: 0â€“100% (lower = better; target <5%)

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
),
user_turns AS (
    SELECT
        m.conversation_id,
        m.content,
        m.created_at,
        LAG(m.content) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at) AS prev_content
    FROM messages m
    WHERE m.conversation_id IN (SELECT id FROM patient_convs)
      AND m.role = 'user'
),
repeat_signals AS (
    SELECT COUNT(*) AS repeats
    FROM user_turns
    WHERE prev_content IS NOT NULL
      -- Jaccard overlap proxy: both contain same â‰¥4-word sequences
      AND similarity(lower(content), lower(prev_content)) > 0.55
)
SELECT
    (SELECT COUNT(*) FROM user_turns)               AS total_user_turns,
    rs.repeats                                       AS near_duplicate_turns,
    GREATEST(0, ROUND(100 - (rs.repeats::numeric
        / NULLIF((SELECT COUNT(*) FROM user_turns), 0)) * 500, 1))
                                                     AS p16_repeat_score
    -- 500 multiplier: even 1 repeat in 10 turns (10%) = 50-point penalty
FROM repeat_signals rs;
-- Note: requires pg_trgm extension: CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- â”€â”€ P17: Slot Fill Efficiency (weight 25%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: conversations.meta_json â†’ conversation_state â†’ {slots_filled, questions_asked}
-- Formula: slots_filled_count / questions_asked (max 1.0)

WITH patient_convs AS (
    SELECT
        id,
        (meta_json -> 'conversation_state' -> 'slots_filled')   AS slots_filled,
        (meta_json -> 'conversation_state' ->> 'questions_asked')::int
                                                                  AS questions_asked
    FROM conversations
    WHERE user_id = :user_id
      AND updated_at >= :cutoff
      AND meta_json IS NOT NULL
      AND meta_json -> 'conversation_state' IS NOT NULL
),
slot_calc AS (
    SELECT
        questions_asked,
        (
            SELECT COUNT(*)
            FROM jsonb_each_text(slots_filled)
            WHERE value IS NOT NULL AND value <> '' AND value <> 'null'
        ) AS filled_count
    FROM patient_convs
    WHERE questions_asked > 0
)
SELECT
    COUNT(*)                                               AS sessions_with_slots,
    ROUND(AVG(filled_count), 1)                           AS avg_slots_filled,
    ROUND(AVG(questions_asked), 1)                        AS avg_questions_asked,
    ROUND(AVG(LEAST(filled_count::numeric
        / NULLIF(questions_asked, 0), 1.0)) * 100, 1)    AS p17_slot_efficiency_score
FROM slot_calc;


-- â”€â”€ P18: Skip Rate (weight 20%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: messages WHERE role='user' AND content matches skip keywords
-- Scale: lower = better; patient not frustrated with clarifying questions

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
),
user_msgs AS (
    SELECT content FROM messages
    WHERE conversation_id IN (SELECT id FROM patient_convs)
      AND role = 'user'
)
SELECT
    COUNT(*)                                                AS total_user_messages,
    COUNT(*) FILTER (
        WHERE lower(content) SIMILAR TO
              '%(skip|just answer|answer now|enough questions|'
              || 'stop asking|just tell me|solo responde|responde ya)%'
    )                                                       AS skip_requests,
    GREATEST(0, ROUND(100 - (
        COUNT(*) FILTER (
            WHERE lower(content) SIMILAR TO
                  '%(skip|just answer|answer now|enough questions|stop asking)%'
        )::numeric / NULLIF(COUNT(*), 0)) * 500, 1))       AS p18_skip_score
FROM user_msgs;


-- â”€â”€ P19: Intent Coherence (weight 15%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: conversations.meta_json â†’ conversation_state â†’ intent
-- Measures whether the AI correctly identified and maintained the right intent

WITH patient_convs AS (
    SELECT
        id,
        meta_json -> 'conversation_state' ->> 'intent'           AS intent,
        meta_json -> 'conversation_state' ->> 'intent_confidence' AS confidence
    FROM conversations
    WHERE user_id = :user_id
      AND updated_at >= :cutoff
      AND meta_json IS NOT NULL
)
SELECT
    COUNT(*)                                                  AS sessions_with_intent,
    COUNT(*) FILTER (WHERE intent IS NOT NULL)               AS sessions_intent_classified,
    ROUND(AVG((confidence)::numeric) * 100, 1)              AS avg_intent_confidence_pct,
    -- Score: proportion of sessions where intent was classified + confidence
    ROUND(
        (COUNT(*) FILTER (WHERE intent IS NOT NULL)::numeric
        / NULLIF(COUNT(*), 0)) * 100 * 0.5 +
        COALESCE(AVG((confidence)::numeric) * 100 * 0.5, 50), 1)
                                                              AS p19_intent_coherence_score
FROM patient_convs;


-- â”€â”€ P20: Frustration Trajectory (weight 10%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: messages.frustration (integer 0â€“100 per AI message)
-- Positive trajectory (falling frustration) = good; rising = bad

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
),
frust_msgs AS (
    SELECT
        frustration,
        ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at) AS rn,
        COUNT(*) OVER (PARTITION BY conversation_id)                          AS total
    FROM messages
    WHERE conversation_id IN (SELECT id FROM patient_convs)
      AND role = 'assistant'
      AND frustration IS NOT NULL
      AND frustration > 0
),
early_late AS (
    SELECT
        AVG(frustration) FILTER (WHERE rn <= total / 2)    AS early_avg,
        AVG(frustration) FILTER (WHERE rn > total / 2)     AS late_avg
    FROM frust_msgs
)
SELECT
    ROUND(early_avg, 1)                                     AS early_frustration_avg,
    ROUND(late_avg, 1)                                      AS late_frustration_avg,
    ROUND(early_avg - late_avg, 1)                          AS improvement,
    -- Score: 50 base + improvement bonus (capped 0â€“100)
    GREATEST(0, LEAST(100,
        ROUND(50 + (early_avg - late_avg), 1)))             AS p20_frustration_score
FROM early_late;


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- DIMENSION 5: FORMAT VARIETY  (weight 7%)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€ P21: Format Rotation Score (weight 40%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: conversations.meta_json â†’ response_state â†’ formats_used

WITH patient_convs AS (
    SELECT
        jsonb_array_elements_text(
            meta_json -> 'response_state' -> 'formats_used'
        ) AS fmt
    FROM conversations
    WHERE user_id = :user_id
      AND updated_at >= :cutoff
      AND meta_json IS NOT NULL
      AND meta_json -> 'response_state' -> 'formats_used' IS NOT NULL
)
SELECT
    COUNT(*)                                           AS total_format_uses,
    COUNT(DISTINCT fmt)                                AS unique_formats,
    -- 6 unique formats = 100%; each additional format adds value
    ROUND(LEAST(COUNT(DISTINCT fmt)::numeric / 6.0, 1.0) * 100, 1)
                                                       AS p21_rotation_score
FROM patient_convs;


-- â”€â”€ P22: Response Length Appropriateness (weight 35%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: messages.content (word count of AI responses)
-- Ideal: 100â€“300 words; too short (<50) or too long (>500) penalised

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
),
ai_msg_lengths AS (
    SELECT
        array_length(regexp_split_to_array(trim(content), '\s+'), 1) AS word_count
    FROM messages
    WHERE conversation_id IN (SELECT id FROM patient_convs)
      AND role = 'assistant'
      AND is_clarifying_question = false
      AND content IS NOT NULL
)
SELECT
    COUNT(*)                                                       AS ai_responses,
    ROUND(AVG(word_count), 0)                                     AS avg_word_count,
    COUNT(*) FILTER (WHERE word_count BETWEEN 100 AND 300)        AS ideal_length_count,
    COUNT(*) FILTER (WHERE word_count < 50 OR word_count > 500)   AS poor_length_count,
    ROUND(AVG(
        CASE
            WHEN word_count BETWEEN 100 AND 300 THEN 100
            WHEN word_count BETWEEN 50 AND 99
              OR word_count BETWEEN 301 AND 500 THEN 65
            ELSE 25
        END
    ), 1)                                                          AS p22_length_score
FROM ai_msg_lengths;


-- â”€â”€ P23: Generic Response Rate (weight 25%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: messages.confidence (low confidence = more generic responses)
-- Scale: 0â€“100% (higher = fewer generic responses = better)

WITH patient_convs AS (
    SELECT id FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
),
ai_conf AS (
    SELECT confidence
    FROM messages
    WHERE conversation_id IN (SELECT id FROM patient_convs)
      AND role = 'assistant'
      AND confidence IS NOT NULL
)
SELECT
    COUNT(*)                                                       AS ai_responses,
    COUNT(*) FILTER (WHERE confidence < 0.55)                     AS low_confidence_count,
    ROUND(
        (1 - COUNT(*) FILTER (WHERE confidence < 0.55)::numeric
            / NULLIF(COUNT(*), 0)) * 100, 1)                      AS p23_generic_rate_score
FROM ai_conf;


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- DIMENSION 6: VELOCITY  (weight 3%)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•âclinical_scores AS (
    SELECT
        100 AS guardrail,
        85 AS esc_sc,
        85 AS emg_sc,
        100 AS disclaim,
        100 AS cit_rt
),
, 1)))  AS p25_p95_score
FROM latencies;


-- â”€â”€ P26: Session Completion Rate (weight 20%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DB source: conversations.total_messages
-- A "complete" session = â‰¥8 messages (4 turns)

WITH patient_convs AS (
    SELECT total_messages FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
)
SELECT
    COUNT(*)                                              AS total_sessions,
    COUNT(*) FILTER (WHERE total_messages >= 8)           AS complete_sessions,
    ROUND(
        COUNT(*) FILTER (WHERE total_messages >= 8)::numeric
        / NULLIF(COUNT(*), 0) * 100, 1)                  AS p26_completion_rate_pct
FROM patient_convs;


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- COMPOSITE SCORE: CQS â€” Full calculation in one query
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

WITH patient_convs AS (
    SELECT id, total_messages, escalated, meta_json, updated_at
    FROM conversations
    WHERE user_id = :user_id AND updated_at >= :cutoff
),
all_messages AS (
    SELECT m.*, c.user_id
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.user_id = :user_id AND c.updated_at >= :cutoff
),

-- Engagement sub-scores
star_score AS (
    SELECT COALESCE(ROUND(((AVG(rating)-1)/4.0)*100,1), 60) AS v
    FROM patient_feedback WHERE user_id=:user_id AND created_at>=:cutoff
),
depth_score AS (
    SELECT ROUND(LEAST(AVG(total_messages)/20.0,1.0)*100,1) AS v FROM patient_convs
),
return_score AS (
    SELECT ROUND(LEAST(COUNT(*)::numeric/3.0,1.0)*100,1) AS v FROM patient_convs
),
elab_score AS (
    SELECT ROUND(
        COUNT(*) FILTER (WHERE array_length(regexp_split_to_array(trim(content),'[[:space:]]+'),1)>20)
        ::numeric/NULLIF(COUNT(*),0)*100,1) AS v
    FROM all_messages WHERE role='user'
),

-- Response quality sub-scores
ragas_scores AS (
    SELECT
        COALESCE(ROUND(AVG(rm.faithfulness)*100,1),60)       AS faith,
        COALESCE(ROUND(AVG(rm.answer_relevancy)*100,1),60)   AS relev,
        COALESCE(ROUND(AVG(rm.context_precision)*100,1),60)  AS prec,
        COALESCE(ROUND(AVG(rm.context_recall)*100,1),60)     AS recall_,
        COALESCE(ROUND(AVG(m.confidence)*100,1),60)          AS conf
    FROM all_messages m
    LEFT JOIN ragas_metrics rm ON rm.conversation_id=m.conversation_id
    WHERE m.role='assistant'
),

-- Clinical safety sub-scores
clinical_scores AS (
    SELECT
        GREATEST(0,100-COUNT(sa.id)*20)                      AS guardrail,
        CASE WHEN COUNT(*) FILTER (WHERE escalated)=0 THEN 85
             ELSE LEAST(100,60+COUNT(*) FILTER (WHERE escalated)*10) END AS esc_sc,
        GREATEST(0,100-
            (SELECT COUNT(*) FROM system_alerts sa2
             WHERE sa2.title ILIKE '%emergency%'
               AND sa2.created_at>=:cutoff)*25)              AS emg_sc,
        COALESCE((SELECT ROUND(
            COUNT(*) FILTER (WHERE is_reference_only)::numeric
            /NULLIF(COUNT(*),0)*100,1)
            FROM prescriptions WHERE user_id=:user_id
              AND generated_at>=:cutoff),100)                AS disclaim,
        ROUND(COUNT(*) FILTER (
            WHERE m.role='assistant'
              AND m.citations IS NOT NULL
              AND jsonb_array_length(m.citations)>0
        )::numeric/NULLIF(COUNT(*) FILTER (WHERE m.role='assistant'),0)*100,1)
                                                             AS cit_rt
    FROM patient_convs pc
    CROSS JOIN all_messages m
    LEFT JOIN system_alerts sa ON sa.level='critical' AND sa.created_at>=:cutoff
              AND sa.message LIKE '%'||pc.id::text||'%'
),

-- Session flow sub-scores
flow_scores AS (
    SELECT
        GREATEST(0,ROUND(100-(
            SELECT COUNT(*) FROM (
                SELECT content,
                       LAG(content) OVER(PARTITION BY conversation_id ORDER BY created_at) AS prev
                FROM all_messages WHERE role='user'
            ) sq WHERE prev IS NOT NULL AND similarity(lower(content),lower(prev))>0.55
        )::numeric/NULLIF(
            (SELECT COUNT(*) FROM all_messages WHERE role='user'),0)*500,1)) AS rep_sc,
        COALESCE((SELECT ROUND(AVG(LEAST(
            (SELECT COUNT(*) FROM jsonb_each_text(meta_json->'conversation_state'->'slots_filled') AS s(key, value)
             WHERE value NOT IN ('', 'null'))::numeric
            /NULLIF((meta_json->'conversation_state'->>'questions_asked')::int,0),1.0))*100,1)
            FROM patient_convs WHERE (meta_json->'conversation_state'->>'questions_asked')::int>0),60)
                                                                             AS slot_sc,
        GREATEST(0,ROUND(100-(
            SELECT COUNT(*) FILTER (WHERE lower(content) SIMILAR TO
                '%(skip|just answer|answer now|enough questions|stop asking)%')
            ::numeric/NULLIF(COUNT(*),0)*500,1)
            FROM all_messages WHERE role='user')                            ) AS skip_sc,
        75.0                                                                 AS intent_sc,
        GREATEST(0,LEAST(100,COALESCE(50+(
            SELECT AVG(frustration) FILTER (WHERE rn<=total/2)
                  -AVG(frustration) FILTER (WHERE rn>total/2)
            FROM (SELECT frustration,
                    ROW_NUMBER()OVER(PARTITION BY conversation_id ORDER BY created_at) rn,
                    COUNT(*)OVER(PARTITION BY conversation_id) total
                  FROM all_messages WHERE role='assistant' AND frustration>0) fq),0)))
                                                                             AS frust_sc
),

-- Format variety sub-scores
format_scores AS (
    SELECT
        ROUND(LEAST((SELECT COUNT(DISTINCT val) FROM (
            SELECT jsonb_array_elements_text(meta_json->'response_state'->'formats_used') AS val
            FROM patient_convs WHERE meta_json->'response_state'->'formats_used' IS NOT NULL) sq
        )::numeric/6.0,1.0)*100,1)                          AS rot_sc,
        ROUND(AVG(CASE
            WHEN array_length(regexp_split_to_array(trim(content),'[[:space:]]+'),1) BETWEEN 100 AND 300 THEN 100
            WHEN array_length(regexp_split_to_array(trim(content),'[[:space:]]+'),1) < 50
              OR array_length(regexp_split_to_array(trim(content),'[[:space:]]+'),1) > 500 THEN 25
            ELSE 65 END),1)                                  AS len_sc,
        ROUND((1-COUNT(*) FILTER (WHERE confidence<0.55)::numeric/NULLIF(COUNT(*),0))*100,1)
                                                             AS gen_sc
    FROM all_messages WHERE role='assistant'
),

-- Velocity sub-scores
velocity_scores AS (
    SELECT
        GREATEST(0,LEAST(100,ROUND(100-(
            PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY processing_ms)-3000)/120.0,1))) AS p50_sc,
        GREATEST(0,LEAST(100,ROUND(100-(
            PERCENTILE_CONT(0.95)WITHIN GROUP(ORDER BY processing_ms)-8000)/220.0,1))) AS p95_sc,
        ROUND(COUNT(*) FILTER (WHERE total_messages>=8)::numeric/NULLIF(COUNT(*),0)*100,1) AS compl_sc
    FROM all_messages am JOIN patient_convs pc ON pc.id=am.conversation_id
    WHERE am.role='assistant' AND am.processing_ms>0
)

SELECT
    :user_id                                               AS user_id,
    NOW()                                                  AS computed_at,
    -- Raw dimension scores
    ROUND((SELECT v FROM star_score)*0.35
        + (0)*0.25   -- chip click: requires separate calc
        + (SELECT v FROM return_score)*0.20
        + (SELECT v FROM depth_score)*0.12
        + (SELECT v FROM elab_score)*0.08, 1)             AS dim_engagement,

    ROUND(rs.faith*0.30+rs.relev*0.25+rs.prec*0.20+rs.recall_*0.15+rs.conf*0.10,1)
                                                           AS dim_response,

    ROUND(cs.guardrail*0.35+cs.esc_sc*0.25+cs.emg_sc*0.20+cs.disclaim*0.15+cs.cit_rt*0.05,1)
                                                           AS dim_clinical,

    ROUND(fs.rep_sc*0.30+fs.slot_sc*0.25+fs.skip_sc*0.20+fs.intent_sc*0.15+fs.frust_sc*0.10,1)
                                                           AS dim_session,

    ROUND(fmt.rot_sc*0.40+fmt.len_sc*0.35+fmt.gen_sc*0.25,1)
                                                           AS dim_format,

    ROUND(vs.p50_sc*0.50+vs.p95_sc*0.30+vs.compl_sc*0.20,1)
                                                           AS dim_velocity,

    -- Composite Quality Score
    ROUND(
        ROUND(( (SELECT v FROM star_score)*0.35
              + (SELECT v FROM return_score)*0.20
              + (SELECT v FROM depth_score)*0.12
              + (SELECT v FROM elab_score)*0.08)*0.75,1) * 0.30 +
        ROUND((rs.faith*0.30+rs.relev*0.25+rs.prec*0.20+rs.recall_*0.15+rs.conf*0.10)) * 0.25 +
        ROUND((cs.guardrail*0.35+cs.esc_sc*0.25+cs.emg_sc*0.20+cs.disclaim*0.15+cs.cit_rt*0.05)) * 0.20 +
        ROUND((fs.rep_sc*0.30+fs.slot_sc*0.25+fs.skip_sc*0.20+fs.intent_sc*0.15+fs.frust_sc*0.10)) * 0.15 +
        ROUND((fmt.rot_sc*0.40+fmt.len_sc*0.35+fmt.gen_sc*0.25)) * 0.07 +
        ROUND((vs.p50_sc*0.50+vs.p95_sc*0.30+vs.compl_sc*0.20)) * 0.03,
    1)                                                     AS cqs_composite

FROM ragas_scores rs, clinical_scores cs, flow_scores fs, format_scores fmt, velocity_scores vs;
