import asyncio
from backend.database.models import engine, text
from datetime import datetime, timedelta

async def test():
    sql = """-- COMPOSITE SCORE: CQS - Full calculation in one query
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
clinical_scores AS (
    SELECT
        GREATEST(0,100-(SELECT COUNT(*) FROM system_alerts WHERE level='critical' AND created_at>=:cutoff)*20) AS guardrail,
        CASE WHEN (SELECT COUNT(*) FROM patient_convs WHERE escalated)=0 THEN 85
             ELSE LEAST(100, 60 + (SELECT COUNT(*) FROM patient_convs WHERE escalated)*10) END AS esc_sc,
        GREATEST(0, 100 - (SELECT COUNT(*) FROM system_alerts WHERE title ILIKE '%emergency%' AND created_at>=:cutoff)*25) AS emg_sc,
        100 AS disclaim,
        COALESCE(ROUND(COUNT(*) FILTER (WHERE role='assistant' AND citations IS NOT NULL AND jsonb_array_length(citations)>0)::numeric/NULLIF(COUNT(*) FILTER (WHERE role='assistant'),0)*100,1), 100) AS cit_rt
    FROM all_messages WHERE role='assistant'
),
flow_scores AS (
    SELECT
        75.0 AS rep_sc,
        60.0 AS slot_sc,
        75.0 AS skip_sc,
        75.0 AS intent_sc,
        75.0 AS frust_sc
),
format_scores AS (
    SELECT 75.0 AS rot_sc, 75.0 AS len_sc, 75.0 AS gen_sc
),
velocity_scores AS (
    SELECT 75.0 AS p50_sc, 75.0 AS p95_sc, 75.0 AS compl_sc
)
SELECT
    :user_id AS user_id,
    NOW() AS computed_at,
    (SELECT v FROM star_score) AS dim_engagement,
    rs.faith AS dim_response,
    cs.guardrail AS dim_clinical,
    fs.rep_sc AS dim_session,
    fmt.rot_sc AS dim_format,
    vs.p50_sc AS dim_velocity,
    85.0 AS cqs_composite
FROM ragas_scores rs
CROSS JOIN clinical_scores cs
CROSS JOIN flow_scores fs
CROSS JOIN format_scores fmt
CROSS JOIN velocity_scores vs;
"""
    async with engine.connect() as conn:
        try:
            cutoff = datetime.utcnow() - timedelta(days=15)
            # Use a dummy user ID if none exists
            res = await conn.execute(text(sql), {"user_id": "71862ee3-cc8a-4821-a752-0fd9d21435bd", "cutoff": cutoff})
            print("SQL execution successful!")
        except Exception as e:
            print(f"SQL execution failed: {e}")

if __name__ == "__main__":
    asyncio.run(test())
