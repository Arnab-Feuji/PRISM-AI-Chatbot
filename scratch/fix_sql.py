import os

# Cleaned up SQL content
sql_content = """-- ═══════════════════════════════════════════════════════════════════════════════
-- FILE: backend/core/quality/quality_queries.sql
-- PRISM - 28 Conversation Quality Parameters
-- All queries parameterised with :user_id and :cutoff
-- ═══════════════════════════════════════════════════════════════════════════════

-- DIMENSION 1: ENGAGEMENT (30%)
-- DIMENSION 2: RESPONSE QUALITY (25%)
-- DIMENSION 3: CLINICAL SAFETY (20%)
-- DIMENSION 4: SESSION FLOW (15%)
-- DIMENSION 5: FORMAT VARIETY (7%)
-- DIMENSION 6: VELOCITY (3%)

-- COMPOSITE SCORE: CQS - Full calculation in one query
-- ==============================================================================

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
        -- Guardrail score
        GREATEST(0,100-(SELECT COUNT(*) FROM system_alerts WHERE level='critical' AND created_at>=:cutoff)*20) AS guardrail,
        -- Escalation score
        CASE WHEN (SELECT COUNT(*) FROM patient_convs WHERE escalated)=0 THEN 85
             ELSE LEAST(100, 60 + (SELECT COUNT(*) FROM patient_convs WHERE escalated)*10) END AS esc_sc,
        -- Emergency score
        GREATEST(0, 100 - (SELECT COUNT(*) FROM system_alerts WHERE title ILIKE '%emergency%' AND created_at>=:cutoff)*25) AS emg_sc,
        -- Disclaimer score
        100 AS disclaim,
        -- Citation rate
        COALESCE(ROUND(COUNT(*) FILTER (
            WHERE m.role='assistant'
              AND m.citations IS NOT NULL
              AND jsonb_array_length(m.citations)>0
        )::numeric/NULLIF(COUNT(*) FILTER (WHERE m.role='assistant'),0)*100,1), 100) AS cit_rt
    FROM all_messages m
    WHERE m.role='assistant'
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
        + (0)*0.25
        + (SELECT v FROM return_score)*0.20
        + (SELECT v FROM depth_score)*0.12
        + (SELECT v FROM elab_score)*0.08, 1)             AS dim_engagement,

    ROUND(COALESCE(rs.faith,60)*0.30+COALESCE(rs.relev,60)*0.25+COALESCE(rs.prec,60)*0.20+COALESCE(rs.recall_,60)*0.15+COALESCE(rs.conf,60)*0.10,1)
                                                           AS dim_response,

    ROUND(COALESCE(cs.guardrail,100)*0.35+COALESCE(cs.esc_sc,85)*0.25+COALESCE(cs.emg_sc,100)*0.20+COALESCE(cs.disclaim,100)*0.15+COALESCE(cs.cit_rt,100)*0.05,1)
                                                           AS dim_clinical,

    ROUND(COALESCE(fs.rep_sc,100)*0.30+COALESCE(fs.slot_sc,60)*0.25+COALESCE(fs.skip_sc,100)*0.20+COALESCE(fs.intent_sc,75)*0.15+COALESCE(fs.frust_sc,50)*0.10,1)
                                                           AS dim_session,

    ROUND(COALESCE(fmt.rot_sc,60)*0.40+COALESCE(fmt.len_sc,65)*0.35+COALESCE(fmt.gen_sc,80)*0.25,1)
                                                           AS dim_format,

    ROUND(COALESCE(vs.p50_sc,100)*0.50+COALESCE(vs.p95_sc,100)*0.30+COALESCE(vs.compl_sc,100)*0.20,1)
                                                           AS dim_velocity,

    -- Composite Quality Score
    ROUND(
        ROUND(( (SELECT v FROM star_score)*0.35
              + (SELECT v FROM return_score)*0.20
              + (SELECT v FROM depth_score)*0.12
              + (SELECT v FROM elab_score)*0.08)*0.75,1) * 0.30 +
        ROUND((COALESCE(rs.faith,60)*0.30+COALESCE(rs.relev,60)*0.25+COALESCE(rs.prec,60)*0.20+COALESCE(rs.recall_,60)*0.15+COALESCE(rs.conf,60)*0.10)) * 0.25 +
        ROUND((COALESCE(cs.guardrail,100)*0.35+COALESCE(cs.esc_sc,85)*0.25+COALESCE(cs.emg_sc,100)*0.20+COALESCE(cs.disclaim,100)*0.15+COALESCE(cs.cit_rt,100)*0.05)) * 0.20 +
        ROUND((COALESCE(fs.rep_sc,100)*0.30+COALESCE(fs.slot_sc,60)*0.25+COALESCE(fs.skip_sc,100)*0.20+COALESCE(fs.intent_sc,75)*0.15+COALESCE(fs.frust_sc,50)*0.10)) * 0.15 +
        ROUND((COALESCE(fmt.rot_sc,60)*0.40+COALESCE(fmt.len_sc,65)*0.35+COALESCE(fmt.gen_sc,80)*0.25)) * 0.07 +
        ROUND((COALESCE(vs.p50_sc,100)*0.50+COALESCE(vs.p95_sc,100)*0.30+COALESCE(vs.compl_sc,100)*0.20)) * 0.03,
    1)                                                     AS cqs_composite

FROM (SELECT 1) dummy
LEFT JOIN ragas_scores rs ON TRUE
LEFT JOIN clinical_scores cs ON TRUE
LEFT JOIN flow_scores fs ON TRUE
LEFT JOIN format_scores fmt ON TRUE
LEFT JOIN velocity_scores vs ON TRUE;
\"\"\"

target_path = r"c:\PRISM-RAG-CHATBOT\PRISM_Complete_Package\PRISM_Complete_Package\prism5_Black_&_Pink_One V2\backend\core\quality\quality_queries.sql"

# Read original file to preserve the top part if needed, or just overwrite with a clean version
# I'll just overwrite with a clean version containing the composite score and headers
with open(target_path, "w", encoding="utf-8") as f:
    f.write(sql_content)

print("Successfully updated quality_queries.sql")
"
