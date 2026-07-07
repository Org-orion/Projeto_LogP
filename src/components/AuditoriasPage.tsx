"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronDown, Calendar, Search, ClipboardCheck,
  Plus, X, Loader2, Paperclip, FileText, Upload, User, Trash2,
} from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { supabaseAudit } from "@/lib/supabase-audit";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocStatus = "pendente" | "enviado" | "aprovado" | "na";

interface DocDB {
  id: string;
  setor_id: string;
  nome: string;
  status: DocStatus;
  origem: "padrao" | "custom";
  adicionado_por: number | null;
  ordem: number;
  arquivo_url: string | null;
  grupo: string | null;
}

interface UsuarioSimples {
  id: number;
  nome: string;
}

interface SetorDB {
  id: string;
  auditoria_id: string;
  nome: string;
  cor: string;
  prazo: string | null;
  responsavel: string | null;
  ordem: number;
  auditoria_documentos: DocDB[];
}

interface AuditoriaDB {
  id: string;
  nome: string;
  ano: number;
  descricao: string | null;
  status: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTS: { val: DocStatus; label: string; bg: string; fg: string; bd: string }[] = [
  { val: "pendente", label: "Pendente", bg: "#f3f4f6", fg: "#6b7280", bd: "#d1d5db" },
  { val: "enviado",  label: "Enviado",  bg: "#eff6ff", fg: "#2563eb", bd: "#bfdbfe" },
  { val: "aprovado", label: "Aprovado", bg: "#f0fdf4", fg: "#15803d", bd: "#bbf7d0" },
  { val: "na",       label: "N/A",      bg: "#fafafa", fg: "#9ca3af", bd: "#e5e7eb" },
];

const STORAGE_BUCKET = "documentos-auditoria";

const ACCEPT_FILES = ".pdf,.doc,.docx,.xls,.xlsx";

function fileLabel(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")              return "Ver PDF";
  if (ext === "doc" || ext === "docx") return "Ver Word";
  if (ext === "xls" || ext === "xlsx") return "Ver Excel";
  return "Ver arquivo";
}

function fileExt(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "bin";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcPct(docs: DocDB[]): number {
  if (!docs.length) return 0;
  const done = docs.filter(d => d.status === "aprovado" || d.status === "na").length;
  return Math.round((done / docs.length) * 100);
}

function prazoInfo(iso: string): { text: string; color: string } {
  const days = Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days > 3650 || days < -3650) return { text: "Data inválida", color: "#9ca3af" };
  if (days < 0)   return { text: `Vencido há ${-days}d`,  color: "#ef4444" };
  if (days === 0) return { text: "Vence hoje!",            color: "#f97316" };
  if (days <= 7)  return { text: `${days}d restantes`,     color: "#f97316" };
  if (days <= 30) return { text: `${days}d restantes`,     color: "#eab308" };
  return          { text: `${days}d restantes`,            color: "#15803d" };
}

function globalStats(setores: SetorDB[]) {
  let aprovado = 0, enviado = 0, na = 0, total = 0;
  for (const s of setores)
    for (const d of s.auditoria_documentos) {
      total++;
      if (d.status === "aprovado") aprovado++;
      else if (d.status === "enviado") enviado++;
      else if (d.status === "na") na++;
    }
  const pendente = total - aprovado - enviado - na;
  const pct = total ? Math.round(((aprovado + na) / total) * 100) : 0;
  return { total, aprovado, enviado, na, pendente, pct };
}

// ─── SetorCard ────────────────────────────────────────────────────────────────

function SetorCard({
  setor, expanded, onToggle, onStatus, onPrazo, onResponsavel, onUpload, onAddDoc, onDeleteFile, query, usuarios, isAdmin,
}: {
  setor: SetorDB;
  expanded: boolean;
  onToggle: () => void;
  onStatus: (docId: string, status: DocStatus) => void;
  onPrazo: (setorId: string, prazo: string) => void;
  onResponsavel: (setorId: string, responsavel: string) => void;
  onUpload: (docId: string, file: File) => Promise<void>;
  onAddDoc: (setorId: string, nome: string, file: File) => Promise<void>;
  onDeleteFile: (docId: string) => Promise<void>;
  query: string;
  usuarios: UsuarioSimples[];
  isAdmin: boolean;
}) {
  const [uploadingDoc, setUploadingDoc]   = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc]     = useState<string | null>(null);
  const [addingDoc, setAddingDoc]         = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocNome, setNewDocNome]     = useState("");
  const [saving, setSaving]            = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const addFileRef   = useRef<HTMLInputElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const docs    = setor.auditoria_documentos;
  const pct     = calcPct(docs);
  const pi      = setor.prazo ? prazoInfo(setor.prazo) : null;
  const q       = query.toLowerCase();
  const visible = q ? docs.filter(d => d.nome.toLowerCase().includes(q)) : docs;

  if (q && visible.length === 0) return null;

  const show = expanded || q.length > 0;

  const hasGroups = visible.some(d => d.grupo);
  const groupMap  = new Map<string, DocDB[]>();
  if (hasGroups) {
    for (const d of visible) {
      const g = d.grupo ?? "";
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(d);
    }
  }

  function toggleGroup(g: string) {
    setCollapsedGroups(s => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n; });
  }

  function renderDocRow(doc: DocDB, idx: number, isLast: boolean) {
    return (
      <div key={doc.id} style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 18px",
        background: idx % 2 === 0 ? "#fafafa" : "#fff",
        borderBottom: !isLast ? "1px solid #f3f4f6" : "none",
      }}>
        <span style={{ flex: 1, fontSize: 12.5, color: "#3a4a42", lineHeight: 1.45 }}>
          {doc.nome}
          {doc.origem === "custom" && (
            <span style={{
              marginLeft: 7, fontSize: 9.5, fontWeight: 700,
              color: setor.cor, letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              adicionado
            </span>
          )}
        </span>
        <div style={{ flexShrink: 0 }}>
          {uploadingDoc === doc.id ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9ca3af" }}>
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Enviando...
            </span>
          ) : doc.arquivo_url ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 9px", borderRadius: 99,
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                fontSize: 10.5, fontWeight: 600, color: "#15803d", textDecoration: "none",
              }}>
                <FileText size={11} /> {fileLabel(doc.arquivo_url!)}
              </a>
              {isAdmin && (
                <>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", color: "#9ca3af" }} title="Substituir arquivo">
                    <input type="file" accept={ACCEPT_FILES} style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(doc.id, f); e.target.value = ""; }} />
                    <Paperclip size={12} />
                  </label>
                  <button
                    title="Excluir arquivo"
                    disabled={deletingDoc === doc.id}
                    onClick={async () => {
                      const ok = window.confirm(`Excluir o arquivo de "${doc.nome}"?\n\nEssa ação não pode ser desfeita.`);
                      if (!ok) return;
                      setDeletingDoc(doc.id);
                      await onDeleteFile(doc.id);
                      setDeletingDoc(null);
                    }}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center",
                      color: deletingDoc === doc.id ? "#fca5a5" : "#f87171",
                      opacity: deletingDoc === doc.id ? 0.5 : 1,
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={e => (e.currentTarget.style.color = deletingDoc === doc.id ? "#fca5a5" : "#f87171")}
                  >
                    {deletingDoc === doc.id
                      ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                      : <Trash2 size={12} />}
                  </button>
                </>
              )}
            </div>
          ) : isAdmin ? (
            <label style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 9px", borderRadius: 99,
              background: "transparent", border: "1px solid #e5e7eb",
              fontSize: 10.5, color: "#9ca3af", cursor: "pointer",
            }}>
              <input type="file" accept={ACCEPT_FILES} style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(doc.id, f); e.target.value = ""; }} />
              <Paperclip size={11} /> Anexar
            </label>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {STATUS_OPTS.map(opt => (
            <button key={opt.val}
              onClick={() => isAdmin && onStatus(doc.id, opt.val)}
              style={{
                padding: "3px 9px", borderRadius: 99, fontSize: 10.5,
                fontWeight: doc.status === opt.val ? 600 : 400,
                cursor: isAdmin ? "pointer" : "default",
                transition: "all .15s",
                background: doc.status === opt.val ? opt.bg : "transparent",
                color:      doc.status === opt.val ? opt.fg : "#c4c9c6",
                border:     `1px solid ${doc.status === opt.val ? opt.bd : "transparent"}`,
                fontFamily: "inherit",
                opacity: !isAdmin && doc.status !== opt.val ? 0 : 1,
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (selectedFile) nameInputRef.current?.focus();
  }, [selectedFile]);

  async function handleDocUpload(docId: string, file: File) {
    setUploadingDoc(docId);
    await onUpload(docId, file);
    setUploadingDoc(null);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
    setSelectedFile(file);
    setNewDocNome(nameWithoutExt);
    e.target.value = "";
  }

  async function submitNewDoc() {
    if (!selectedFile || !newDocNome.trim()) return;
    setSaving(true);
    await onAddDoc(setor.id, newDocNome.trim(), selectedFile);
    setSaving(false);
    setSelectedFile(null);
    setNewDocNome("");
    setAddingDoc(false);
  }

  function cancelAdd() {
    setAddingDoc(false);
    setSelectedFile(null);
    setNewDocNome("");
  }

  return (
    <div style={{
      background: "hsl(var(--card))", borderRadius: 10,
      border: "1px solid #e5e7eb",
      borderLeft: `4px solid ${setor.cor}`,
      overflow: "hidden",
    }}>
      {/* Header */}
      <button onClick={onToggle} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 16,
        padding: "14px 18px", background: "none", border: "none",
        cursor: "pointer", textAlign: "left",
      }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f1a14", letterSpacing: "-0.01em" }}>
            {setor.nome}
          </div>
          <div style={{ fontSize: 11.5, color: "#6b7a72", marginTop: 2 }}>
            {docs.length} documentos
            {q && visible.length < docs.length && (
              <span style={{ marginLeft: 6, color: setor.cor, fontWeight: 600 }}>
                · {visible.length} encontrados
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div style={{ width: 130, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "#6b7a72" }}>Concluído</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? "#15803d" : "#0f1a14" }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 5, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: pct === 100 ? "#22c55e" : setor.cor,
              borderRadius: 99, transition: "width .4s",
            }} />
          </div>
        </div>

        {/* Responsável */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <User size={12} style={{ color: setor.responsavel ? setor.cor : "#9ca3af" }} />
          {isAdmin ? (
            <select
              value={setor.responsavel ?? ""}
              onChange={e => onResponsavel(setor.id, e.target.value)}
              style={{
                border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 7px",
                fontSize: 11.5, color: setor.responsavel ? "#0f1a14" : "#9ca3af",
                background: "none", outline: "none", cursor: "pointer", fontFamily: "inherit",
                maxWidth: 140,
              }}
            >
              <option value="">Não atribuído</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.nome}>{u.nome}</option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 11.5, color: setor.responsavel ? "#0f1a14" : "#9ca3af" }}>
              {setor.responsavel ?? "Não atribuído"}
            </span>
          )}
        </div>

        {/* Prazo */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <Calendar size={12} style={{ color: pi ? pi.color : "#9ca3af" }} />
          {isAdmin ? (
            <input
              type="date"
              value={setor.prazo ?? ""}
              onChange={e => onPrazo(setor.id, e.target.value)}
              style={{
                border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 7px",
                fontSize: 11.5, color: pi ? pi.color : "#9ca3af",
                background: "none", outline: "none", cursor: "pointer", fontFamily: "inherit",
              }}
            />
          ) : (
            <span style={{ fontSize: 11.5, color: pi ? pi.color : "#9ca3af" }}>
              {pi ? new Date(setor.prazo!).toLocaleDateString("pt-BR") : "Sem prazo"}
            </span>
          )}
          {pi && (
            <span style={{
              fontSize: 10.5, fontWeight: 600,
              color: pi.color,
              background: pi.color + "18",
              border: `1px solid ${pi.color}40`,
              borderRadius: 99,
              padding: "2px 8px",
              whiteSpace: "nowrap",
            }}>
              {pi.text}
            </span>
          )}
        </div>

        <ChevronDown size={15} style={{
          color: "#9ca3af", flexShrink: 0,
          transform: show ? "rotate(180deg)" : "none",
          transition: "transform .2s",
        }} />
      </button>

      {/* Document list */}
      {show && (
        <div style={{ borderTop: "1px solid #f3f4f6" }}>
          {hasGroups ? (
            Array.from(groupMap.entries()).map(([grupo, groupDocs]) => {
              const isCollapsed = collapsedGroups.has(grupo);
              return (
                <div key={grupo}>
                  <button
                    onClick={() => toggleGroup(grupo)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 18px", background: "#f4f6f4",
                      border: "none", borderBottom: "1px solid #e9ede9",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    }}
                  >
                    <ChevronDown size={13} style={{
                      color: setor.cor, flexShrink: 0,
                      transform: isCollapsed ? "rotate(-90deg)" : "none",
                      transition: "transform .2s",
                    }} />
                    <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: "#3a4a42" }}>
                      {grupo}
                    </span>
                    <span style={{ fontSize: 10.5, color: "#9ca3af" }}>
                      {groupDocs.filter(d => d.status === "aprovado" || d.status === "na").length}/{groupDocs.length}
                    </span>
                  </button>
                  {!isCollapsed && groupDocs.map((doc, i) => renderDocRow(doc, i, i === groupDocs.length - 1))}
                </div>
              );
            })
          ) : (
            visible.map((doc, i) => renderDocRow(doc, i, i === visible.length - 1))
          )}

          {/* Adicionar documento (upload PDF) — apenas admin */}
          {!q && isAdmin && (
            <div style={{ padding: "10px 18px", borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
              {/* Hidden file input for "add" */}
              <input
                ref={addFileRef}
                type="file"
                accept={ACCEPT_FILES}
                style={{ display: "none" }}
                onChange={handleFileSelected}
              />

              {addingDoc && selectedFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* PDF badge */}
                  <span style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 6,
                    background: "#eff6ff", border: "1px solid #bfdbfe",
                    fontSize: 11, color: "#2563eb", whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    <FileText size={11} /> {selectedFile.name}
                  </span>
                  {/* Name input */}
                  <input
                    ref={nameInputRef}
                    value={newDocNome}
                    onChange={e => setNewDocNome(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submitNewDoc(); if (e.key === "Escape") cancelAdd(); }}
                    placeholder="Nome do documento…"
                    style={{
                      flex: 1, border: "1px solid hsl(var(--border))", borderRadius: 6,
                      padding: "5px 10px", fontSize: 12.5, color: "hsl(var(--foreground))",
                      background: "hsl(var(--background))", outline: "none", fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={submitNewDoc}
                    disabled={saving || !newDocNome.trim()}
                    style={{
                      padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: setor.cor, color: "#fff", border: "none",
                      cursor: saving || !newDocNome.trim() ? "not-allowed" : "pointer",
                      opacity: saving || !newDocNome.trim() ? 0.6 : 1,
                      fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    {saving ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Enviando…</> : "Salvar"}
                  </button>
                  <button onClick={cancelAdd} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, lineHeight: 1 }}>
                    <X size={14} />
                  </button>
                </div>
              ) : addingDoc ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => addFileRef.current?.click()}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 6,
                      background: setor.cor + "15", border: `1px solid ${setor.cor}40`,
                      fontSize: 12, color: setor.cor, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <Upload size={13} /> Selecionar PDF…
                  </button>
                  <button onClick={cancelAdd} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, lineHeight: 1 }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingDoc(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "none", border: `1px dashed ${setor.cor}55`,
                    borderRadius: 6, padding: "5px 12px",
                    fontSize: 12, color: setor.cor, cursor: "pointer",
                    fontFamily: "inherit", opacity: 0.75, transition: "opacity .15s",
                  }}
                >
                  <Plus size={12} /> Adicionar documento
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AuditoriaDetail ──────────────────────────────────────────────────────────

function AuditoriaDetail({
  setores, onStatus, onPrazo, onResponsavel, onUpload, onAddDoc, onDeleteFile, usuarios, isAdmin,
}: {
  setores: SetorDB[];
  onStatus: (docId: string, status: DocStatus) => void;
  onPrazo: (setorId: string, prazo: string) => void;
  onResponsavel: (setorId: string, responsavel: string) => void;
  onUpload: (docId: string, file: File) => Promise<void>;
  onAddDoc: (setorId: string, nome: string, file: File) => Promise<void>;
  onDeleteFile: (docId: string) => Promise<void>;
  usuarios: UsuarioSimples[];
  isAdmin: boolean;
}) {
  const [expandedSetores, setExpandedSetores] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const stats     = useMemo(() => globalStats(setores), [setores]);
  const totalDocs = stats.total;
  const LINE      = "#e4e7e4";

  function toggleSetor(id: string) {
    setExpandedSetores(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setExpandedSetores(s => s.size === setores.length ? new Set() : new Set(setores.map(s => s.id)));
  }

  return (
    <div style={{ padding: "20px 24px 24px" }}>

      {/* Stat cards + expand button */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1 }}>
          {[
            { label: "Total de documentos", value: String(totalDocs),     color: "#0f1a14" },
            { label: "Aprovados",           value: String(stats.aprovado), color: "#15803d" },
            { label: "Pendentes",           value: String(stats.pendente), color: "#6b7280" },
            { label: "Concluído",           value: `${stats.pct}%`,
              color: stats.pct >= 80 ? "#15803d" : stats.pct >= 40 ? "#eab308" : "#ef4444" },
          ].map(c => (
            <div key={c.label} style={{ background: "#f8faf9", border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 9.5, color: "#6b7a72", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 300, color: c.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>
        <button onClick={toggleAll} style={{
          alignSelf: "stretch", padding: "0 16px", borderRadius: 10,
          border: `1px solid ${LINE}`, background: "#f8faf9",
          fontSize: 12, color: "#3a4a42", cursor: "pointer",
          fontFamily: "inherit", whiteSpace: "nowrap",
        }}>
          {expandedSetores.size === setores.length ? "Recolher todos" : "Expandir todos"}
        </button>
      </div>

      {/* Global progress bar */}
      <div style={{ background: "#f8faf9", border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#0f1a14" }}>Progresso geral</span>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#6b7a72" }}>
            {[
              { label: "Aprovado", count: stats.aprovado, bg: "#22c55e" },
              { label: "Enviado",  count: stats.enviado,  bg: "#3b82f6" },
              { label: "N/A",      count: stats.na,       bg: "#9ca3af" },
              { label: "Pendente", count: stats.pendente, bg: "#e5e7eb" },
            ].map(l => (
              <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: l.bg }} />
                {l.label} ({l.count})
              </span>
            ))}
          </div>
        </div>
        <div style={{ height: 8, background: "#f3f4f6", borderRadius: 99, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${totalDocs ? (stats.aprovado / totalDocs) * 100 : 0}%`, background: "#22c55e", transition: "width .5s" }} />
          <div style={{ width: `${totalDocs ? (stats.enviado  / totalDocs) * 100 : 0}%`, background: "#3b82f6", transition: "width .5s" }} />
          <div style={{ width: `${totalDocs ? (stats.na       / totalDocs) * 100 : 0}%`, background: "#9ca3af", transition: "width .5s" }} />
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "hsl(var(--card))", border: `1px solid ${LINE}`,
        borderRadius: 8, padding: "9px 14px", marginBottom: 14,
      }}>
        <Search size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar documento em qualquer setor…"
          style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f1a14", background: "none", fontFamily: "inherit" }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1 }}>
            ✕
          </button>
        )}
      </div>

      {/* Setor cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {setores.map(setor => (
          <SetorCard
            key={setor.id}
            setor={setor}
            expanded={expandedSetores.has(setor.id)}
            onToggle={() => toggleSetor(setor.id)}
            onStatus={onStatus}
            onPrazo={onPrazo}
            onResponsavel={onResponsavel}
            onUpload={onUpload}
            onAddDoc={onAddDoc}
            onDeleteFile={onDeleteFile}
            query={query}
            usuarios={usuarios}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}

// ─── AuditoriaRow ─────────────────────────────────────────────────────────────

function AuditoriaRow({ auditoria, usuarios, isAdmin }: { auditoria: AuditoriaDB; usuarios: UsuarioSimples[]; isAdmin: boolean }) {
  const [open, setOpen]       = useState(false);
  const [setores, setSetores] = useState<SetorDB[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const loadedRef             = useRef(false);

  const VERDE = "hsl(var(--primary))";
  const LINE  = "hsl(var(--border))";

  async function loadDetail() {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    setError(null);

    const { data: setoresData, error: setoresErr } = await supabaseAudit
      .from("auditoria_setores")
      .select("id, auditoria_id, nome, cor, prazo, responsavel, ordem")
      .eq("auditoria_id", auditoria.id)
      .order("ordem");

    if (setoresErr || !setoresData) {
      setError("Erro ao carregar setores.");
      loadedRef.current = false;
      setLoading(false);
      return;
    }

    const setorIds = setoresData.map(s => s.id);

    const { data: docsData, error: docsErr } = await supabaseAudit
      .from("auditoria_documentos")
      .select("id, setor_id, nome, status, origem, adicionado_por, ordem, arquivo_url, grupo")
      .in("setor_id", setorIds)
      .order("ordem");

    if (docsErr) {
      setError("Erro ao carregar documentos.");
      loadedRef.current = false;
      setLoading(false);
      return;
    }

    const docsPorSetor = new Map<string, DocDB[]>();
    for (const doc of (docsData ?? []) as DocDB[]) {
      if (!docsPorSetor.has(doc.setor_id)) docsPorSetor.set(doc.setor_id, []);
      docsPorSetor.get(doc.setor_id)!.push(doc);
    }

    const sorted = setoresData.map(s => ({
      ...s,
      auditoria_documentos: docsPorSetor.get(s.id) ?? [],
    })) as SetorDB[];

    setSetores(sorted);
    setLoading(false);
  }

  function handleToggle() {
    setOpen(v => { if (!v) loadDetail(); return !v; });
  }

  async function handleStatus(docId: string, status: DocStatus) {
    setSetores(prev => prev ? prev.map(s => ({
      ...s,
      auditoria_documentos: s.auditoria_documentos.map(d => d.id === docId ? { ...d, status } : d),
    })) : prev);
    await supabaseAudit.from("auditoria_documentos").update({ status }).eq("id", docId);
  }

  async function handlePrazo(setorId: string, prazo: string) {
    setSetores(prev => prev ? prev.map(s => s.id === setorId ? { ...s, prazo: prazo || null } : s) : prev);
    await supabaseAudit.from("auditoria_setores").update({ prazo: prazo || null }).eq("id", setorId);
  }

  async function handleResponsavel(setorId: string, responsavel: string) {
    setSetores(prev => prev ? prev.map(s => s.id === setorId ? { ...s, responsavel: responsavel || null } : s) : prev);
    await supabaseAudit.from("auditoria_setores").update({ responsavel: responsavel || null }).eq("id", setorId);
  }

  async function handleUpload(docId: string, file: File) {
    const path = `${auditoria.id}/${docId}.${fileExt(file)}`;

    const { error: upErr } = await supabaseAudit.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      console.error("Upload error:", upErr);
      toast.error("Erro ao enviar arquivo: " + upErr.message);
      return;
    }

    const { data: { publicUrl } } = supabaseAudit.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    await supabaseAudit.from("auditoria_documentos").update({ arquivo_url: publicUrl }).eq("id", docId);
    toast.success("Arquivo enviado com sucesso.");

    setSetores(prev => prev ? prev.map(s => ({
      ...s,
      auditoria_documentos: s.auditoria_documentos.map(d =>
        d.id === docId ? { ...d, arquivo_url: publicUrl } : d
      ),
    })) : prev);
  }

  async function handleDeleteFile(docId: string) {
    const doc = setores?.flatMap(s => s.auditoria_documentos).find(d => d.id === docId);
    if (!doc?.arquivo_url) return;

    const ext = doc.arquivo_url.split("?")[0].split(".").pop() ?? "bin";
    const path = `${auditoria.id}/${docId}.${ext}`;

    await supabaseAudit.storage.from(STORAGE_BUCKET).remove([path]);
    await supabaseAudit.from("auditoria_documentos").update({ arquivo_url: null }).eq("id", docId);

    setSetores(prev => prev ? prev.map(s => ({
      ...s,
      auditoria_documentos: s.auditoria_documentos.map(d =>
        d.id === docId ? { ...d, arquivo_url: null } : d
      ),
    })) : prev);
    toast.success("Arquivo excluído.");
  }

  async function handleAddDoc(setorId: string, nome: string, file: File) {
    const setor    = setores?.find(s => s.id === setorId);
    const maxOrdem = setor ? Math.max(0, ...setor.auditoria_documentos.map(d => d.ordem)) : 0;

    const { data, error } = await supabaseAudit
      .from("auditoria_documentos")
      .insert({ setor_id: setorId, nome, origem: "custom", status: "pendente", ordem: maxOrdem + 1 })
      .select()
      .single();

    if (!data || error) return;

    const newDoc = data as DocDB;

    const path = `${auditoria.id}/${newDoc.id}.${fileExt(file)}`;
    const { error: upErr } = await supabaseAudit.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (!upErr) {
      const { data: { publicUrl } } = supabaseAudit.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      await supabaseAudit.from("auditoria_documentos").update({ arquivo_url: publicUrl }).eq("id", newDoc.id);
      newDoc.arquivo_url = publicUrl;
    }

    setSetores(prev => prev ? prev.map(s => s.id === setorId ? {
      ...s,
      auditoria_documentos: [...s.auditoria_documentos, newDoc],
    } : s) : prev);
  }

  const stats     = useMemo(() => setores ? globalStats(setores) : null, [setores]);
  const totalDocs = setores ? setores.reduce((a, s) => a + s.auditoria_documentos.length, 0) : null;

  return (
    <div style={{
      border: `1px solid ${open ? "rgba(31,77,52,0.3)" : LINE}`,
      borderRadius: 12, background: "hsl(var(--card))", overflow: "hidden",
      transition: "border-color .2s",
      boxShadow: open ? "0 4px 20px rgba(31,77,52,0.08)" : "none",
    }}>
      <button onClick={handleToggle} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 18,
        padding: "18px 22px", background: "none", border: "none",
        cursor: "pointer", textAlign: "left",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: open ? "rgba(31,77,52,0.1)" : "#f4f6f4",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background .2s",
        }}>
          <ClipboardCheck size={20} style={{ color: open ? VERDE : "#6b7a72" }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0f1a14", letterSpacing: "-0.02em" }}>
            {auditoria.nome}
            <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7a72", marginLeft: 8 }}>
              {auditoria.ano}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "#6b7a72", marginTop: 3 }}>
            {totalDocs !== null
              ? `${setores!.length} setores · ${totalDocs} documentos`
              : auditoria.descricao ?? "Clique para carregar"}
          </div>
        </div>

        {loading && (
          <Loader2 size={16} style={{ color: "#9ca3af", flexShrink: 0, animation: "spin 1s linear infinite" }} />
        )}

        {stats && totalDocs ? (
          <div style={{ width: 160, flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "#6b7a72" }}>Progresso</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: stats.pct === 100 ? "#15803d" : "#0f1a14" }}>
                {stats.pct}%
              </span>
            </div>
            <div style={{ height: 6, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${stats.pct}%`,
                background: stats.pct === 100 ? "#22c55e" : VERDE,
                borderRadius: 99, transition: "width .4s",
              }} />
            </div>
          </div>
        ) : null}

        <div style={{
          padding: "4px 12px", borderRadius: 99, flexShrink: 0,
          background: open ? "rgba(31,77,52,0.1)" : "#f4f6f4",
          fontSize: 11, fontWeight: 600,
          color: open ? VERDE : "#6b7a72",
          transition: "background .2s, color .2s",
        }}>
          {open ? "Aberta" : "Ver detalhes"}
        </div>

        <ChevronDown size={16} style={{
          color: "#9ca3af", flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform .25s",
        }} />
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${LINE}` }}>
          {loading && (
            <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
          )}
          {error && (
            <div style={{ padding: 24, textAlign: "center", color: "#ef4444", fontSize: 13 }}>{error}</div>
          )}
          {setores && !loading && (
            <AuditoriaDetail
              setores={setores}
              onStatus={handleStatus}
              onPrazo={handlePrazo}
              onResponsavel={handleResponsavel}
              onUpload={handleUpload}
              onAddDoc={handleAddDoc}
              onDeleteFile={handleDeleteFile}
              usuarios={usuarios}
              isAdmin={isAdmin}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AuditoriasPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const [auditorias, setAuditorias] = useState<AuditoriaDB[]>([]);
  const [usuarios, setUsuarios]     = useState<UsuarioSimples[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const VERDE = "hsl(var(--primary))";

  useEffect(() => {
    async function load() {
      const [audResult, usrResult] = await Promise.all([
        supabaseAudit
          .from("auditorias")
          .select("id, nome, ano, descricao, status")
          .order("ano", { ascending: false }),
        supabase
          .from("usuarios")
          .select("id, nome")
          .order("nome"),
      ]);
      if (audResult.error) { console.error("supabaseAudit error:", audResult.error); setError("Erro ao carregar auditorias."); }
      else setAuditorias(audResult.data as AuditoriaDB[]);
      if (!usrResult.error) setUsuarios((usrResult.data as UsuarioSimples[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ maxWidth: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.26em", color: VERDE, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
          Certificações · Controle de Documentação
        </div>
        <h1 style={{ fontSize: "clamp(22px, 2.5vw, 30px)", fontWeight: 300, color: "#0f1a14", margin: 0, letterSpacing: "-0.02em" }}>
          Auditorias
        </h1>
        <p style={{ fontSize: 13, color: "#6b7a72", margin: "6px 0 0", fontWeight: 400 }}>
          Clique em uma auditoria para expandir e gerenciar os documentos por setor.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64"><SpinnerCustom /></div>
      )}

      {error && (
        <div style={{ padding: 24, textAlign: "center", color: "#ef4444", fontSize: 13 }}>{error}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {auditorias.map(a => (
          <AuditoriaRow key={a.id} auditoria={a} usuarios={usuarios} isAdmin={isAdmin} />
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
