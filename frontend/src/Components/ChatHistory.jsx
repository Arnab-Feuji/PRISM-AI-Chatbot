import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import api from "../services/api";
import { formatTopicTimestamp } from "../utils/datetime";

// ─── Time group labels ─────────────────────────────────────────────────────────
function getTimeGroup(ageDays) {
  if (ageDays === 0) return "Today";
  if (ageDays === 1) return "Yesterday";
  if (ageDays <= 7)  return "This week";
  if (ageDays <= 14) return "Last week";
  return "Older";
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HISTORY PANEL
// ═══════════════════════════════════════════════════════════════════════════════
export default function ChatHistory({
  isOpen,
  onClose,
  onRestoreConversation,    // (conversationData, { scrollToMessageId }) → restores into PatientApp
  currentConvId,            // Highlight the active conversation
}) {
  const [history, setHistory]       = useState(null);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [searchQuery, setSearchQuery]   = useState("");
  const [filterDisease, setFilterDisease] = useState("");
  const [filterAgent, setFilterAgent]     = useState("");
  const [allTopicsData, setAllTopicsData] = useState(null);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [openDropdown, setOpenDropdown]   = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const searchRef                   = useRef(null);

  // ── Load history ─────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, sRes] = await Promise.all([
        api.get("/history"),
        api.get("/history/stats"),
      ]);
      setHistory(hRes.data);
      setStats(sRes.data);
    } catch (e) {
      console.error("History load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isOpen) loadHistory(); }, [isOpen, loadHistory]);

  // ── Load all topics (single source for table + filters + search) ──────────
  const loadAllTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const res = await api.get("/history/topics");
      setAllTopicsData(res.data);
    } catch (e) {
      console.error("Topics load error:", e);
      setAllTopicsData({ topics: [], total: 0, header_title: "All conversations", filters: { by_disease: {}, by_agent: {} } });
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAllTopics();
    }
  }, [isOpen, loadAllTopics]);

  // ── Client-side filter + search ─────────────────────────────────────────────
  const displayData = useMemo(() => {
    if (!allTopicsData) return null;

    const filters = allTopicsData.filters || { by_disease: {}, by_agent: {} };
    let topics = allTopicsData.topics || [];
    let header_title = "All conversations";

    if (filterDisease && filterAgent) {
      topics = topics.filter(t => t.disease_code === filterDisease && t.agent_id === filterAgent);
      const d = filters.by_disease[filterDisease];
      const a = d?.agents?.[filterAgent];
      header_title = `${d?.disease_name || filterDisease} · ${a?.agent_name || filterAgent}`;
    } else if (filterDisease) {
      topics = topics.filter(t => t.disease_code === filterDisease);
      const d = filters.by_disease[filterDisease];
      header_title = `${d?.disease_name || filterDisease} · All agents`;
    } else if (filterAgent) {
      topics = topics.filter(t => t.agent_id === filterAgent);
      const a = filters.by_agent[filterAgent];
      header_title = `All diseases · ${a?.agent_name || filterAgent}`;
    }

    const q = searchQuery.trim().toLowerCase();
    const isSearch = q.length >= 2;
    if (isSearch) {
      topics = topics.filter(t =>
        (t.topic || "").toLowerCase().includes(q) ||
        (t.starting_line || "").toLowerCase().includes(q) ||
        (t.agent_name || "").toLowerCase().includes(q) ||
        (t.disease_name || "").toLowerCase().includes(q) ||
        (t.timestamp_label || "").toLowerCase().includes(q)
      );
      header_title = `Search results for "${searchQuery.trim()}"`;
    }

    return {
      ...allTopicsData,
      topics,
      header_title,
      is_search: isSearch,
      search_query: searchQuery.trim(),
    };
  }, [allTopicsData, filterDisease, filterAgent, searchQuery]);

  const filterMeta = allTopicsData?.filters || { by_disease: {}, by_agent: {} };
  const byDisease  = filterMeta.by_disease || {};
  const byAgent    = filterMeta.by_agent || {};

  const diseaseOptions = useMemo(() =>
    Object.values(byDisease)
      .sort((a, b) => a.disease_name.localeCompare(b.disease_name))
      .map(d => ({ value: d.disease_code, label: `${d.disease_icon} ${d.disease_name}` })),
    [byDisease]
  );

  const agentOptions = useMemo(() => {
    const source = filterDisease
      ? Object.values(byDisease[filterDisease]?.agents || {})
      : Object.values(byAgent);
    return source
      .sort((a, b) => a.agent_name.localeCompare(b.agent_name))
      .map(a => ({ value: a.agent_id, label: `${a.agent_icon} ${a.agent_name}` }));
  }, [byDisease, byAgent, filterDisease]);

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
  }, []);

  // ── Delete conversation ────────────────────────────────────────────────────
  const handleDelete = useCallback(async (convId, e) => {
    e.stopPropagation();
    setDeleting(convId);
    try {
      await api.delete(`/history/${convId}`);
      await loadHistory();
      loadAllTopics();
    } catch { } finally { setDeleting(null); }
  }, [loadHistory, loadAllTopics]);

  // ── Clear all history ─────────────────────────────────────────────────────
  const handleClearAll = useCallback(async () => {
    try {
      await api.delete("/history");
      setConfirmClearAll(false);
      await loadHistory();
      loadAllTopics();
    } catch { setConfirmClearAll(false); }
  }, [loadHistory, loadAllTopics]);

  // ── Restore conversation ──────────────────────────────────────────────────
  const handleRestore = useCallback(async (card, scrollToMessageId = null) => {
    try {
      const convId = card.conversation_id || card.id;
      const res = await api.get(`/history/${convId}`);
      if (res.data.found && onRestoreConversation) {
        onRestoreConversation(res.data, {
          scrollToMessageId: scrollToMessageId || card.first_message_id || null,
        });
        onClose();
      }
    } catch (e) {
      console.error("Restore error:", e);
    }
  }, [onRestoreConversation, onClose]);

  if (!isOpen) return null;

  const drawerWidth = 480;

  return (
    <div style={{
      position:    "fixed",
      inset:       0,
      zIndex:      900,
      display:     "flex",
      pointerEvents: "none",
    }}>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position:       "absolute",
          inset:          0,
          background:     "rgba(0,0,0,.25)",
          pointerEvents:  "all",
          animation:      "fadeIn .2s ease",
        }}
      />

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      <div style={{
        position:       "relative",
        width:          drawerWidth,
        height:         "100%",
        background:     "#FFFFFF",
        boxShadow:      "4px 0 24px rgba(0,0,0,.15)",
        display:        "flex",
        flexDirection:  "column",
        pointerEvents:  "all",
        animation:      "slideRight .22s ease",
        overflowY:      "hidden",
        fontFamily:     "system-ui, -apple-system, sans-serif",
        transition:     "width .2s ease",
      }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div style={{
          padding:       "14px 16px 10px",
          borderBottom:  "1px solid #F1F5F9",
          background:    "#0D2240",
          flexShrink:    0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🕐</span>
              <div>
                <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}>
                  Chat History
                </div>
                {stats && (
                  <div style={{ color: "#6B8CAE", fontSize: 10 }}>
                    {stats.conversations} conversations · {stats.messages} messages · last {stats.retention_days} days
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none",
              color: "#6B8CAE", fontSize: 20, cursor: "pointer" }}>×</button>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative" }}>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search messages…"
              style={{
                width:        "100%",
                padding:      "7px 32px 7px 10px",
                border:       "1px solid #1E3254",
                borderRadius: 8,
                background:   "#0A1628",
                color:        "#FFFFFF",
                fontSize:     12,
                fontFamily:   "inherit",
                outline:      "none",
                boxSizing:    "border-box",
              }}
            />
            <span style={{ position: "absolute", right: 8, top: 8, fontSize: 12, color: "#4B7CBE" }}>
              🔍
            </span>
          </div>
        </div>

        {/* ── Filter bar (Disease + Agent) ──────────────────────────────── */}
        <div style={{
          padding:       "8px 12px",
          borderBottom:  "1px solid #E2E8F0",
          display:       "flex",
          gap:           6,
          flexShrink:    0,
          flexWrap:      "wrap",
          position:      "relative",
          zIndex:        50,
          background:    "#FFFFFF",
        }}>
          <FilterDropdown
            id="disease"
            openId={openDropdown}
            setOpenId={setOpenDropdown}
            value={filterDisease}
            placeholder="All Diseases"
            options={[{ value: "", label: "All Diseases" }, ...diseaseOptions]}
            onChange={(val) => {
              setFilterDisease(val);
              if (filterAgent) {
                const valid = val
                  ? Object.keys(byDisease[val]?.agents || {})
                  : Object.keys(byAgent);
                if (!valid.includes(filterAgent)) setFilterAgent("");
              }
            }}
          />
          <FilterDropdown
            id="agent"
            openId={openDropdown}
            setOpenId={setOpenDropdown}
            value={filterAgent}
            placeholder="All Agents"
            options={[{ value: "", label: "All Agents" }, ...agentOptions]}
            onChange={setFilterAgent}
          />
          {(filterDisease || filterAgent) && (
            <button onClick={() => { setFilterDisease(""); setFilterAgent(""); }}
              style={{ padding: "4px 8px", border: "1px solid #E2E8F0",
                       borderRadius: 6, fontSize: 11, cursor: "pointer",
                       background: "transparent", color: "#64748B", fontFamily: "inherit" }}>
              ✕
            </button>
          )}
        </div>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>
          <AgentTopicTable
            data={displayData}
            loading={topicsLoading || loading}
            onRestore={handleRestore}
            onRename={loadAllTopics}
            currentConvId={currentConvId}
            showAgentColumn={!filterAgent}
          />
        </div>

        {/* ── Footer: retention notice + clear all ─────────────────────── */}
        <div style={{
          padding:       "10px 14px",
          borderTop:     "1px solid #F1F5F9",
          background:    "#F8FAFC",
          flexShrink:    0,
        }}>
          <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 8, textAlign: "center" }}>
            💾 Conversations kept for 15 days · Auto-deleted after expiry
          </div>
          {!confirmClearAll ? (
            <button
              onClick={() => setConfirmClearAll(true)}
              style={{
                width:        "100%",
                padding:      "6px",
                background:   "transparent",
                border:       "1px solid #FCA5A5",
                borderRadius: 6,
                color:        "#EF4444",
                fontSize:     11,
                cursor:       "pointer",
                fontFamily:   "inherit",
              }}
            >
              🗑 Clear all history
            </button>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setConfirmClearAll(false)}
                style={{ flex: 1, padding: "6px", background: "transparent",
                         border: "1px solid #E2E8F0", borderRadius: 6,
                         fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={handleClearAll}
                style={{ flex: 1, padding: "6px", background: "#EF4444",
                         border: "none", borderRadius: 6, color: "#fff",
                         fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Yes, clear all
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideRight { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>
    </div>
  );
}

// ─── Conversation Card ─────────────────────────────────────────────────────────
function ConvCard({ card, onRestore, onDelete, deleting, currentConvId }) {
  const isActive  = card.conversation_id === currentConvId;
  const isDeleting = deleting === card.conversation_id;
  const expiryWarning = card.expires_in_days <= 2;

  return (
    <div
      onClick={() => !isDeleting && onRestore(card)}
      style={{
        padding:      "10px 14px",
        borderBottom: "1px solid #F8FAFC",
        cursor:       "pointer",
        background:   isActive ? "#EFF6FF" : "transparent",
        borderLeft:   isActive ? `3px solid ${card.disease_color || "#2563EB"}` : "3px solid transparent",
        transition:   "all .1s",
        opacity:      isDeleting ? 0.4 : 1,
        display:      "flex",
        gap:          10,
        alignItems:   "flex-start",
        position:     "relative",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F8FAFC"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Icon */}
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{card.agent_icon}</span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title + time */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
          <div style={{
            fontSize:     12,
            fontWeight:   600,
            color:        "#0F172A",
            lineHeight:   1.3,
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
            flex:         1,
          }}>
            {card.title}
          </div>
          <div style={{ fontSize: 9, color: "#94A3B8", flexShrink: 0, marginTop: 1 }}>
            {card.age_label}
          </div>
        </div>

        {/* Snippet */}
        {card.snippet && (
          <div style={{
            fontSize:     11,
            color:        "#64748B",
            lineHeight:   1.4,
            overflow:     "hidden",
            display:      "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            marginBottom: 4,
          }}>
            {card.snippet}
          </div>
        )}

        {/* Meta badges */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{
            fontSize: 9, fontWeight: 600,
            color: card.disease_color || "#6B7280",
            background: (card.disease_color || "#6B7280") + "15",
            padding: "1px 5px", borderRadius: 3,
          }}>
            {card.disease_icon} {card.disease_code}
          </span>
          <span style={{
            fontSize: 9, color: "#64748B",
            background: "#F1F5F9",
            padding: "1px 5px", borderRadius: 3,
          }}>
            {card.agent_name}
          </span>
          <span style={{ fontSize: 9, color: "#94A3B8" }}>
            {card.user_turns} Q&A
          </span>
          {card.escalated && (
            <span style={{ fontSize: 9, color: "#B91C1C", background: "#FEF2F2",
                           padding: "1px 5px", borderRadius: 3 }}>⚡ Escalated</span>
          )}
          {expiryWarning && (
            <span style={{ fontSize: 9, color: "#92400E", background: "#FEF3C7",
                           padding: "1px 5px", borderRadius: 3 }}>
              ⚠ Expires in {card.expires_in_days}d
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={e => onDelete(card.conversation_id, e)}
        title="Delete conversation"
        style={{
          background:   "none",
          border:       "none",
          color:        "#CBD5E1",
          fontSize:     13,
          cursor:       "pointer",
          padding:      "2px 4px",
          flexShrink:   0,
          marginTop:    1,
          opacity:      0,
          transition:   "opacity .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#EF4444"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "0"; e.currentTarget.style.color = "#CBD5E1"; }}
      >
        🗑
      </button>
    </div>
  );
}

// ─── Timeline view ─────────────────────────────────────────────────────────────
function TimelineView({ groups, timeOrder, onRestore, onDelete, deleting, currentConvId, empty }) {
  if (empty) return <EmptyState />;
  return (
    <div>
      {timeOrder.map(group => {
        const cards = groups[group];
        if (!cards?.length) return null;
        return (
          <div key={group}>
            <div style={{
              padding:      "8px 14px 4px",
              fontSize:     10,
              fontWeight:   700,
              color:        "#94A3B8",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              background:   "#FAFAFA",
              borderBottom: "1px solid #F1F5F9",
            }}>
              {group} · {cards.length}
            </div>
            {cards.map(c => (
              <ConvCard key={c.conversation_id} card={c}
                onRestore={onRestore} onDelete={onDelete}
                deleting={deleting} currentConvId={currentConvId} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Disease view ──────────────────────────────────────────────────────────────
function DiseaseView({ byDisease, expandedDisease, expandedAgent,
                       onToggleDisease, onToggleAgent, onSelectAgent, onRestore, onDelete, deleting, currentConvId }) {
  if (!Object.keys(byDisease).length) return <EmptyState />;
  return (
    <div>
      {Object.values(byDisease)
        .sort((a, b) => (b.last_active || "").localeCompare(a.last_active || ""))
        .map(disease => (
          <div key={disease.disease_code}>
            {/* Disease header */}
            <button
              onClick={() => onToggleDisease(disease.disease_code)}
              style={{
                width:        "100%",
                padding:      "10px 14px",
                background:   expandedDisease === disease.disease_code
                              ? disease.disease_color + "10"
                              : "#F8FAFC",
                border:       "none",
                borderBottom: "1px solid #E2E8F0",
                borderLeft:   `4px solid ${disease.disease_color}`,
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
                gap:          8,
                fontFamily:   "inherit",
              }}
            >
              <span style={{ fontSize: 18 }}>{disease.disease_icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#0F172A", flex: 1, textAlign: "left" }}>
                {disease.disease_name}
              </span>
              <span style={{ fontSize: 10, color: "#94A3B8" }}>
                {disease.total_convs} conv
              </span>
              <span style={{ fontSize: 10, color: disease.disease_color }}>
                {expandedDisease === disease.disease_code ? "▼" : "▶"}
              </span>
            </button>

            {/* Agent list within disease */}
            {expandedDisease === disease.disease_code && (
              Object.values(disease.agents)
                .sort((a, b) => (b.last_active || "").localeCompare(a.last_active || ""))
                .map(agent => (
                  <div key={agent.agent_id} style={{ marginLeft: 4 }}>
                    <div style={{ display: "flex", alignItems: "stretch" }}>
                      <button
                        onClick={() => onSelectAgent?.(disease.disease_code, agent.agent_id)}
                        title="View topic history"
                        style={{
                          flex:         1,
                          padding:      "8px 14px 8px 20px",
                          background:   expandedAgent === agent.agent_id ? "#EFF6FF" : "transparent",
                          border:       "none",
                          borderBottom: "1px solid #F8FAFC",
                          cursor:       "pointer",
                          display:      "flex",
                          alignItems:   "center",
                          gap:          6,
                          fontFamily:   "inherit",
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{agent.agent_icon}</span>
                        <span style={{ fontSize: 12, color: "#374151", flex: 1, textAlign: "left" }}>
                          {agent.agent_name}
                        </span>
                        <span style={{ fontSize: 10, color: "#2563EB", fontWeight: 600 }}>Topics →</span>
                        <span style={{ fontSize: 10, color: "#94A3B8" }}>{agent.total_convs}</span>
                      </button>
                      <button
                        onClick={() => onToggleAgent(agent.agent_id)}
                        title="Expand conversations"
                        style={{
                          padding:      "8px 10px",
                          background:   "transparent",
                          border:       "none",
                          borderBottom: "1px solid #F8FAFC",
                          cursor:       "pointer",
                          color:        "#94A3B8",
                          fontSize:     10,
                          fontFamily:   "inherit",
                        }}
                      >
                        {expandedAgent === agent.agent_id ? "▼" : "▶"}
                      </button>
                    </div>
                    {expandedAgent === agent.agent_id && agent.conversations.map(c => (
                      <ConvCard key={c.conversation_id} card={c}
                        onRestore={onRestore} onDelete={onDelete}
                        deleting={deleting} currentConvId={currentConvId} />
                    ))}
                  </div>
                ))
            )}
          </div>
        ))}
    </div>
  );
}

// ─── Topic view (Semantic grouping) ───────────────────────────────────────────
function TopicView({ byTopic, expandedTopic, expandedDisease, expandedAgent,
                     onToggleTopic, onToggleDisease, onToggleAgent, onRestore, onDelete, deleting, currentConvId }) {
  if (!byTopic.length) return <EmptyState />;
  return (
    <div>
      {byTopic.map(topic => (
        <div key={topic.label}>
          {/* Topic header */}
          <button
            onClick={() => onToggleTopic(topic.label)}
            style={{
              width:        "100%",
              padding:      "12px 14px",
              background:   expandedTopic === topic.label ? "#F1F5F9" : "#FFFFFF",
              border:       "none",
              borderBottom: "1px solid #E2E8F0",
              cursor:       "pointer",
              display:      "flex",
              alignItems:   "center",
              gap:          10,
              fontFamily:   "inherit",
              textAlign:    "left"
            }}
          >
            <span style={{ fontSize: 18 }}>🏷️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{topic.label}</div>
              <div style={{ fontSize: 10, color: "#64748B" }}>
                {topic.total_convs} related interaction{topic.total_convs !== 1 ? "s" : ""}
              </div>
            </div>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>
              {expandedTopic === topic.label ? "▼" : "▶"}
            </span>
          </button>

          {/* Nested Disease/Agent list for this topic */}
          {expandedTopic === topic.label && (
            <div style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <DiseaseView
                byDisease={topic.diseases}
                expandedDisease={expandedDisease}
                expandedAgent={expandedAgent}
                onToggleDisease={onToggleDisease}
                onToggleAgent={onToggleAgent}
                onRestore={onRestore}
                onDelete={onDelete}
                deleting={deleting}
                currentConvId={currentConvId}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Agent view ────────────────────────────────────────────────────────────────
function AgentView({ byAgent, expandedAgent, onToggleAgent, onSelectAgent, onRestore, onDelete, deleting, currentConvId }) {
  if (!Object.keys(byAgent).length) return <EmptyState />;
  return (
    <div>
      {Object.values(byAgent)
        .sort((a, b) => b.total_convs - a.total_convs)
        .map(agent => (
          <div key={agent.agent_id}>
            <div style={{ display: "flex", alignItems: "stretch" }}>
              <button
                onClick={() => onSelectAgent?.(agent.agent_id, agent.disease_code)}
                style={{
                  flex:         1,
                  padding:      "10px 14px",
                  background:   expandedAgent === agent.agent_id ? "#EFF6FF" : "#F8FAFC",
                  border:       "none",
                  borderBottom: "1px solid #E2E8F0",
                  borderLeft:   `4px solid ${agent.disease_color || "#6B7280"}`,
                  cursor:       "pointer",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  fontFamily:   "inherit",
                }}
              >
                <span style={{ fontSize: 16 }}>{agent.agent_icon}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>
                    {agent.agent_name}
                  </div>
                  <div style={{ fontSize: 10, color: "#94A3B8" }}>
                    {agent.disease_name} · {agent.agent_id}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: "#2563EB", fontWeight: 600 }}>Topics →</span>
                <span style={{ fontSize: 10, color: "#94A3B8" }}>{agent.total_convs}</span>
              </button>
              <button
                onClick={() => onToggleAgent(agent.agent_id)}
                title="Expand conversations"
                style={{
                  padding:      "10px 8px",
                  background:   "#F8FAFC",
                  border:       "none",
                  borderBottom: "1px solid #E2E8F0",
                  cursor:       "pointer",
                  color:        "#94A3B8",
                  fontSize:     10,
                  fontFamily:   "inherit",
                }}
              >
                {expandedAgent === agent.agent_id ? "▼" : "▶"}
              </button>
            </div>
            {expandedAgent === agent.agent_id && agent.conversations.map(c => (
              <ConvCard key={c.conversation_id} card={c}
                onRestore={onRestore} onDelete={onDelete}
                deleting={deleting} currentConvId={currentConvId} />
            ))}
          </div>
        ))}
    </div>
  );
}

// ─── Search Results ─────────────────────────────────────────────────────────────
function SearchResults({ results, query, searching, onRestore, onDelete, deleting, currentConvId }) {
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [expandedDisease, setExpandedDisease] = useState(null);
  const [expandedAgent, setExpandedAgent] = useState(null);

  if (searching) return <LoadingState label="Searching…" />;
  if (!results)  return <div style={{ padding: "20px", textAlign: "center", fontSize: 12, color: "#94A3B8" }}>Type to search…</div>;
  
  const totalConvs = results.reduce((acc, t) => acc + t.total_convs, 0);

  if (!results.length) return (
    <div style={{ padding: "30px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
      <div style={{ fontSize: 13, color: "#64748B" }}>No results for "{query}"</div>
    </div>
  );

  return (
    <div>
      <div style={{ padding: "8px 14px", fontSize: 10, color: "#94A3B8", borderBottom: "1px solid #F1F5F9", background: "#FAFAFA" }}>
        {totalConvs} interaction{totalConvs !== 1 ? "s" : ""} across {results.length} topic{results.length !== 1 ? "s" : ""} for "{query}"
      </div>
      <TopicView 
        byTopic={results}
        expandedTopic={expandedTopic}
        expandedDisease={expandedDisease}
        expandedAgent={expandedAgent}
        onToggleTopic={label => { setExpandedTopic(expandedTopic === label ? null : label); setExpandedDisease(null); setExpandedAgent(null); }}
        onToggleDisease={dc => { setExpandedDisease(expandedDisease === dc ? null : dc); setExpandedAgent(null); }}
        onToggleAgent={aid => setExpandedAgent(expandedAgent === aid ? null : aid)}
        onRestore={onRestore}
        onDelete={onDelete}
        deleting={deleting}
        currentConvId={currentConvId}
      />
    </div>
  );
}

// ─── Topic browse (pick disease + agent) ───────────────────────────────────────
function TopicBrowseView({ byDisease, onSelectDiseaseAgent }) {
  if (!Object.keys(byDisease).length) return <EmptyState />;
  return (
    <div>
      <div style={{
        padding: "10px 14px",
        fontSize: 11,
        color: "#64748B",
        background: "#F8FAFC",
        borderBottom: "1px solid #E2E8F0",
        lineHeight: 1.5,
      }}>
        Select a disease and agent above, or tap an agent below to view your topic history.
      </div>
      {Object.values(byDisease)
        .sort((a, b) => (b.last_active || "").localeCompare(a.last_active || ""))
        .map(disease => (
          <div key={disease.disease_code}>
            <div style={{
              padding: "8px 14px",
              fontSize: 10,
              fontWeight: 700,
              color: disease.disease_color,
              background: disease.disease_color + "08",
              borderBottom: "1px solid #F1F5F9",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <span>{disease.disease_icon}</span> {disease.disease_name}
            </div>
            {Object.values(disease.agents)
              .sort((a, b) => (b.last_active || "").localeCompare(a.last_active || ""))
              .map(agent => (
                <button
                  key={agent.agent_id}
                  onClick={() => onSelectDiseaseAgent(disease.disease_code, agent.agent_id)}
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 24px",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid #F8FAFC",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontSize: 14 }}>{agent.agent_icon}</span>
                  <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{agent.agent_name}</span>
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>{agent.total_convs} chats</span>
                  <span style={{ fontSize: 10, color: "#2563EB" }}>→</span>
                </button>
              ))}
          </div>
        ))}
    </div>
  );
}

// ─── Custom filter dropdown (avoids native select overlap) ─────────────────────
function FilterDropdown({ id, openId, setOpenId, value, onChange, placeholder, options }) {
  const isOpen = openId === id;
  const selected = options.find(o => o.value === value);

  return (
    <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setOpenId(isOpen ? null : id)}
        style={{
          width: "100%",
          padding: "6px 28px 6px 8px",
          border: "1px solid #E2E8F0",
          borderRadius: 6,
          fontSize: 11,
          fontFamily: "inherit",
          background: "#FFF",
          cursor: "pointer",
          color: value ? "#0F172A" : "#64748B",
          textAlign: "left",
          position: "relative",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {selected?.label || placeholder}
        <span style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 9,
          color: "#94A3B8",
        }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>
      {isOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 998 }}
            onClick={() => setOpenId(null)}
          />
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#FFF",
            border: "1px solid #E2E8F0",
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,.14)",
            zIndex: 999,
            maxHeight: 220,
            overflowY: "auto",
          }}>
            {options.map(opt => (
              <button
                key={opt.value || "__all__"}
                type="button"
                onClick={() => { onChange(opt.value); setOpenId(null); }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  borderBottom: "1px solid #F8FAFC",
                  background: opt.value === value ? "#EFF6FF" : "#FFF",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "inherit",
                  textAlign: "left",
                  color: opt.value === value ? "#2563EB" : "#374151",
                  fontWeight: opt.value === value ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Agent Topic Table (3 columns: Topic, Timestamp, Starting Line) ────────────
function AgentTopicTable({ data, loading, onRestore, onRename, currentConvId, showAgentColumn }) {
  const [editingId, setEditingId]     = useState(null);
  const [editValue, setEditValue]     = useState("");
  const [renameError, setRenameError] = useState("");
  const [renaming, setRenaming]       = useState(false);

  const handleStartRename = (row, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(row.conversation_id);
    setEditValue(row.topic);
    setRenameError("");
  };

  const handleSaveRename = async (convId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!editValue.trim()) { setRenameError("Topic cannot be empty"); return; }
    setRenaming(true);
    setRenameError("");
    try {
      await api.patch(`/history/topics/${convId}`, { topic: editValue.trim() });
      setEditingId(null);
      onRename?.();
    } catch (err) {
      setRenameError(err.response?.data?.detail || "Rename failed. Please try again.");
    } finally {
      setRenaming(false);
    }
  };

  if (loading) return <LoadingState label="Loading topics…" />;
  if (!data) return <LoadingState label="Loading topics…" />;

  const topics = data.topics || [];

  if (!topics.length) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
          {data.header_title || "All conversations"}
        </div>
        <div style={{ fontSize: 11, color: "#94A3B8" }}>
          {data.is_search
            ? `No results for "${data.search_query}"`
            : "No conversations yet. Start chatting — your history will appear here."}
        </div>
      </div>
    );
  }

  const headerTitle = data.header_title
    || (data.disease_name && data.agent_name
      ? `${data.disease_name} · ${data.agent_name}`
      : "All conversations");

  return (
    <div>
      {/* Summary header */}
      <div style={{
        padding: "12px 14px 10px",
        borderBottom: "1px solid #F1F5F9",
        background: "#FFFFFF",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 3 }}>
          {headerTitle}
        </div>
        <div style={{ fontSize: 11, color: "#94A3B8" }}>
          {topics.length} topic{topics.length !== 1 ? "s" : ""} · chronological from first chat
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 0.95fr 1.15fr",
        gap: 8,
        padding: "8px 14px 6px",
        borderBottom: "1px solid #F1F5F9",
        fontSize: 10,
        fontWeight: 600,
        color: "#CBD5E1",
        textTransform: "uppercase",
        letterSpacing: ".05em",
      }}>
        <span>Topic</span>
        <span>Timestamp</span>
        <span>Starting Line</span>
      </div>

      {/* Rows */}
      {topics.map(row => {
        const isActive  = row.conversation_id === currentConvId;
        const isEditing = editingId === row.conversation_id;

        return (
          <div
            key={row.conversation_id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 0.95fr 1.15fr",
              gap: 8,
              padding: "14px 14px",
              borderBottom: "1px solid #F8FAFC",
              alignItems: "start",
              background: isActive ? "#FAFBFF" : "#FFFFFF",
            }}
          >
            {/* Topic + Rename */}
            <div style={{ minWidth: 0 }}>
              {isEditing ? (
                <div>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleSaveRename(row.conversation_id, e);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    style={{
                      width: "100%",
                      padding: "4px 6px",
                      fontSize: 12,
                      border: "1px solid #2563EB",
                      borderRadius: 4,
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      marginBottom: 4,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={e => handleSaveRename(row.conversation_id, e)}
                      disabled={renaming}
                      style={{
                        fontSize: 11, padding: 0, background: "none", border: "none",
                        color: "#2563EB", cursor: "pointer", fontFamily: "inherit",
                        textDecoration: "underline",
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        fontSize: 11, padding: 0, background: "none", border: "none",
                        color: "#94A3B8", cursor: "pointer", fontFamily: "inherit",
                        textDecoration: "underline",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  {renameError && (
                    <div style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{renameError}</div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onRestore(row, row.first_message_id)}
                    style={{
                      display: "block",
                      padding: 0,
                      margin: 0,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#2563EB",
                      textAlign: "left",
                      lineHeight: 1.4,
                      marginBottom: showAgentColumn && row.agent_name ? 2 : 4,
                    }}
                  >
                    {row.topic}
                  </button>
                  {showAgentColumn && row.agent_name && (
                    <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 4 }}>
                      {row.agent_name}
                    </div>
                  )}
                  <button
                    onClick={e => handleStartRename(row, e)}
                    style={{
                      padding: 0,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 11,
                      color: "#94A3B8",
                      textDecoration: "underline",
                    }}
                  >
                    Rename
                  </button>
                </>
              )}
            </div>

            {/* Timestamp */}
            <button
              onClick={() => onRestore(row, row.first_message_id)}
              style={{
                padding: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11,
                color: "#64748B",
                textAlign: "left",
                lineHeight: 1.45,
                whiteSpace: "normal",
              }}
            >
              {formatTopicTimestamp(row.timestamp) || row.timestamp_label}
            </button>

            {/* Starting line — italic, quoted */}
            <button
              onClick={() => onRestore(row, row.first_message_id)}
              style={{
                padding: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11,
                color: "#475569",
                fontStyle: "italic",
                textAlign: "left",
                lineHeight: 1.45,
              }}
            >
              &ldquo;{row.starting_line}&rdquo;
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared small components ───────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#64748B", marginBottom: 6 }}>No conversations yet</div>
      <div style={{ fontSize: 11, color: "#94A3B8" }}>Start chatting with any PRISM agent — your history will appear here.</div>
    </div>
  );
}

function LoadingState({ label = "Loading history…" }) {
  return (
    <div style={{ padding: "30px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
      <div style={{ marginBottom: 10 }}>⟳</div>{label}
    </div>
  );
}