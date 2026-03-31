import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { ChevronDown, Copy, ExternalLink, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import insuranceConfig from "../insurance_config.json";

/**
 * @typedef {Object} AppListItem
 * @property {string} id
 * @property {string} title
 * @property {string=} subtitle
 * @property {Array<string>=} bullets
 * @property {Array<string>=} tips
 * @property {string=} right
 * @property {string=} link
 * @property {"open"|"copy"=} link_kind
 */

/**
 * @typedef {Object} AppTab
 * @property {string} id
 * @property {string} title
 * @property {Array<AppListItem>=} items
 */

/**
 * @typedef {Object} AppAccordionItem
 * @property {string} id
 * @property {string} title
 * @property {string=} subtitle
 * @property {Array<AppTab>=} tabs
 */

/**
 * @typedef {Object} AppModule
 * @property {string} id
 * @property {string} title
 * @property {string=} description
 * @property {Array<AppAccordionItem>=} accordion
 */

/**
 * @typedef {Object} InsuranceConfigRoot
 * @property {string} main_title
 * @property {Array<AppModule>=} modules
 */

/**
 * @param {string} id
 * @returns {void}
 */
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * 打开 Module 1 并平滑滚动到锚点
 * @param {Function} setVisible
 * @returns {void}
 */
function openScienceModule(setVisible) {
  setVisible(true);
  window.setTimeout(() => {
    scrollToId("science");
  }, 30);
}

/**
 * @typedef {"obinutuzumab"|"pola"|"glofit"|"mosun"} DrugKey
 */

/**
 * @typedef {Object} ScheduleRow
 * @property {number} index
 * @property {string} desc
 * @property {Date} date
 * @property {string} dose
 * @property {string} note
 */

/** @type {Record<DrugKey, string>} */
const DRUG_LABELS = {
  obinutuzumab: "奥妥珠单抗",
  pola: "维泊妥珠单抗",
  glofit: "格菲妥珠单抗",
  mosun: "莫妥珠单抗"
};

/** @type {Record<DrugKey, Array<string>>} */
const DRUG_PLANS = {
  obinutuzumab: ["G-CHOP", "G-CVP", "G-B"],
  pola: ["标准方案"],
  glofit: ["标准递增方案"],
  mosun: ["阶梯式剂量方案"]
};

/**
 * @param {Date} d
 * @returns {Date}
 */
function cloneDate(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * @param {Date} d
 * @param {number} days
 * @returns {Date}
 */
function addDays(d, days) {
  const x = cloneDate(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * @param {Date} d
 * @param {number} weeks
 * @returns {Date}
 */
function addWeeks(d, weeks) {
  const x = cloneDate(d);
  x.setDate(x.getDate() + 7 * weeks);
  return x;
}

/**
 * @param {Date} d
 * @param {number} months
 * @returns {Date}
 */
function addMonths(d, months) {
  const x = cloneDate(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

/**
 * @param {Date} d
 * @returns {string}
 */
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {string} input
 * @returns {Date}
 */
function parseDateInput(input) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return cloneDate(new Date());
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 格菲妥珠单抗：第1行（预处理）备注 */
const GLOFIT_NOTE_ROW1 =
  "奥妥珠单抗预处理（若与GemOx联用，于第2天给予GemOx）。";

/** 格菲妥珠单抗：第4-10行（方案备注） */
const GLOFIT_NOTE_ROW4_10 = "或与GemOx联用";

/** 莫妥珠单抗：第10行备注（达到 CR 则停止） */
const MOSUN_NOTE_ROW10_CR = "若本次治疗后达到CR（完全缓解），则停止莫妥珠单抗给药。";

/** 莫妥珠单抗：第11-19行备注（PR/SD 则持续至第17周期） */
const MOSUN_NOTE_ROW11_19_PR_SD = "若第8周期后达到PR/SD,继续治疗至第17个周期。";

/** 维泊妥珠第 6 周期 R-CHP 联合给药说明 */
const POLA_RCHP_CYCLE6_NOTE =
  "本周期与 R-CHP 联合：维泊妥珠单抗与利妥昔单抗、环磷酰胺、多柔比星及口服泼尼松同日序贯给药；给药顺序、预处理与输注监测以科室方案及说明书为准，请与主诊团队确认各药物剂量与时间安排。";

/**
 * @param {DrugKey} drug
 * @param {string} plan
 * @param {Date} startDate
 * @returns {Array<ScheduleRow>}
 */
function generateSchedule(drug, plan, startDate) {
  const base = cloneDate(startDate);
  /** @type {Array<ScheduleRow>} */
  const rows = [];

  if (drug === "glofit") {
    rows.push({ index: 1, desc: "预处理（第1天）", date: cloneDate(base), dose: "", note: GLOFIT_NOTE_ROW1 });
    rows.push({ index: 2, desc: "1周后", date: addWeeks(base, 1), dose: "2.5mg", note: "" });
    rows.push({ index: 3, desc: "2周后", date: addWeeks(base, 2), dose: "10mg", note: "" });
    rows.push({ index: 4, desc: "3周后", date: addWeeks(base, 3), dose: "30mg", note: GLOFIT_NOTE_ROW4_10 });

    let d = addWeeks(base, 3);
    for (let i = 5; i <= 13; i++) {
      d = addDays(d, 21);
      rows.push({
        index: i,
        desc: "间隔3周",
        date: cloneDate(d),
        dose: "30mg",
        note: i <= 10 ? GLOFIT_NOTE_ROW4_10 : "单药"
      });
    }
    return rows;
  }

  if (drug === "mosun") {
    rows.push({ index: 1, desc: "起始", date: cloneDate(base), dose: "1mg", note: "" });
    rows.push({ index: 2, desc: "1周后", date: addWeeks(base, 1), dose: "2mg", note: "" });
    rows.push({ index: 3, desc: "2周后", date: addWeeks(base, 2), dose: "60mg", note: "" });
    rows.push({ index: 4, desc: "3周后", date: addWeeks(base, 3), dose: "60mg", note: "" });

    let d = addWeeks(base, 3);
    for (let i = 5; i <= 19; i++) {
      d = addDays(d, 21);
      let note = "";
      if (i === 10) note = MOSUN_NOTE_ROW10_CR;
      if (i >= 11) note = MOSUN_NOTE_ROW11_19_PR_SD;

      rows.push({
        index: i,
        desc: "间隔3周",
        date: cloneDate(d),
        dose: "30mg",
        note
      });
    }
    return rows;
  }

  if (drug === "pola") {
    rows.push({ index: 1, desc: "起始", date: cloneDate(base), dose: "", note: "" });
    let d = cloneDate(base);
    for (let i = 2; i <= 6; i++) {
      d = addDays(d, 21);
      const isSix = i === 6;
      rows.push({
        index: i,
        desc: "间隔3周",
        date: cloneDate(d),
        dose: "",
        note: isSix ? POLA_RCHP_CYCLE6_NOTE : ""
      });
    }
    return rows;
  }

  if (drug === "obinutuzumab") {
    rows.push({ index: 1, desc: "起始", date: cloneDate(base), dose: "", note: "" });
    rows.push({ index: 2, desc: "1周后", date: addWeeks(base, 1), dose: "", note: "" });
    rows.push({ index: 3, desc: "2周后", date: addWeeks(base, 2), dose: "", note: "" });
    rows.push({ index: 4, desc: "3周后", date: addWeeks(base, 3), dose: "", note: "" });

    if (plan === "G-CHOP" || plan === "G-CVP") {
      let d = addWeeks(base, 3);
      for (let i = 5; i <= 10; i++) {
        d = addDays(d, 21);
        rows.push({
          index: i,
          desc: "间隔3周",
          date: cloneDate(d),
          dose: "",
          note: i >= 9 ? "单药" : ""
        });
      }
      d = cloneDate(rows[rows.length - 1].date);
      for (let i = 11; i <= 13; i++) {
        d = addMonths(d, 2);
        rows.push({
          index: i,
          desc: "间隔2个月",
          date: cloneDate(d),
          dose: "",
          note: "单药维持"
        });
      }
      return rows;
    }

    if (plan === "G-B") {
      let d = addWeeks(base, 3);
      for (let i = 5; i <= 8; i++) {
        d = addDays(d, 28);
        rows.push({
          index: i,
          desc: "间隔4周",
          date: cloneDate(d),
          dose: "",
          note: ""
        });
      }
      d = cloneDate(rows[rows.length - 1].date);
      for (let i = 9; i <= 13; i++) {
        d = addMonths(d, 2);
        rows.push({
          index: i,
          desc: "间隔2个月",
          date: cloneDate(d),
          dose: "",
          note: "单药维持"
        });
      }
      return rows;
    }
  }

  return rows;
}

/**
 * @param {{ dose: string, note: string }} props
 */
function DoseAndNoteCell({ dose, note }) {
  const hasDose = Boolean(dose && String(dose).trim());
  const hasNote = Boolean(note && String(note).trim());

  const noteText = hasNote ? String(note) : "";

  return (
    <div className="min-w-0 text-left">
      {hasDose ? <span className="font-bold text-[#3B82F6]">{dose}</span> : null}
      {hasNote ? (
        <span
          className={[
            hasDose ? "ml-1.5" : "",
            "inline text-[11px] sm:text-[12px] font-normal italic leading-snug text-slate-400 break-words whitespace-normal"
          ].join(" ")}
        >
          {noteText}
        </span>
      ) : null}
    </div>
  );
}

function Module2Calculator() {
  const todayStr = useMemo(() => formatDate(cloneDate(new Date())), []);
  /** @type {[DrugKey, React.Dispatch<React.SetStateAction<DrugKey>>]} */
  const [drug, setDrug] = useState(/** @type {DrugKey} */ ("obinutuzumab"));
  const plans = DRUG_PLANS[drug];
  const [plan, setPlan] = useState(() => DRUG_PLANS.obinutuzumab[0]);
  const [firstDate, setFirstDate] = useState(todayStr);

  useEffect(() => {
    setPlan(DRUG_PLANS[drug][0]);
  }, [drug]);

  const schedule = useMemo(() => {
    const start = parseDateInput(firstDate);
    return generateSchedule(drug, plan, start);
  }, [drug, plan, firstDate]);

  /** @type {Array<DrugKey>} */
  // Pill Toggle 2x2：左到右顺序
  // 维泊妥珠单抗 -> 格菲妥珠单抗 -> 奥妥珠单抗 -> 莫妥珠单抗
  const drugOrder = ["pola", "glofit", "obinutuzumab", "mosun"];

  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const pillGridRef = useRef(null);
  /** @type {Array<React.RefObject<HTMLButtonElement>>} */
  const pillCellRefs = useMemo(
    () => [React.createRef(), React.createRef(), React.createRef(), React.createRef()],
    []
  );

  const activeDrugIdx = drugOrder.indexOf(drug);
  const [slider, setSlider] = useState({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const measure = () => {
      const grid = pillGridRef.current;
      const cell = pillCellRefs[activeDrugIdx]?.current;
      if (!grid || !cell) return;
      setSlider({
        x: cell.offsetLeft,
        y: cell.offsetTop,
        w: cell.offsetWidth,
        h: cell.offsetHeight
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeDrugIdx, pillCellRefs]);

  return (
    <div className="flex min-h-0 min-w-0 flex-col font-sans">
      {/* Pill Toggle：2x2 */}
      <div>
        <div className="relative rounded-3xl bg-[rgba(59,130,246,0.06)] p-1">
          <div ref={pillGridRef} className="relative grid grid-cols-2 gap-1">
            <div
              aria-hidden
              className="absolute rounded-2xl bg-[#3B82F6] shadow-md transition-transform duration-300 ease-out"
              style={{
                left: 0,
                top: 0,
                width: slider.w || 0,
                height: slider.h || 0,
                transform: `translate(${slider.x}px, ${slider.y}px)`
              }}
            />

            {drugOrder.map((key, idx) => {
              const active = drug === key;
              return (
                <button
                  key={key}
                  ref={pillCellRefs[idx]}
                  type="button"
                  onClick={() => setDrug(key)}
                  className={[
                    "relative z-10 flex items-center justify-center rounded-2xl px-2 py-2 text-[13px] font-semibold transition-colors duration-200 sm:px-3 sm:py-3 sm:text-sm",
                    active ? "text-white" : "text-[#0B3D91] hover:text-[#007AFF]"
                  ].join(" ")}
                >
                  {DRUG_LABELS[key]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex min-h-0 flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
          用药方案
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full border-0 border-b border-slate-300 bg-transparent px-1 pb-2 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-[#3B82F6]"
          >
            {plans.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
          首次用药日期
          <input
            type="date"
            value={firstDate}
            onChange={(e) => setFirstDate(e.target.value)}
            className="w-full border-0 border-b border-slate-300 bg-transparent px-1 pb-2 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-[#3B82F6]"
          />
        </label>
      </div>

      {/* Table */}
      <div className="mt-4 min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-[rgba(255,255,255,0.65)] backdrop-blur-[10px]">
        <div className="max-h-[min(520px,56vh)] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[360px] sm:min-w-[520px] border-collapse table-fixed text-left text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 bg-[#3B82F6] text-white">
              <tr>
                <th className="w-[45px] px-2 py-2.5 text-left text-xs font-bold whitespace-nowrap">#</th>
                <th className="min-w-[180px] w-[28%] px-2 py-2.5 text-left text-xs font-bold whitespace-nowrap">描述</th>
                <th className="w-[130px] px-2 py-2.5 text-left text-xs font-bold whitespace-nowrap">具体日期</th>
                <th className="px-2 py-2.5 text-left text-xs font-bold">剂量与关键备注</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, idx) => (
                <tr
                  key={row.index}
                  className={[
                    "border-t border-slate-200/60",
                    idx % 2 === 0 ? "bg-white" : "bg-[rgba(59,130,246,0.03)]"
                  ].join(" ")}
                >
                  {/* 时间轴 */}
                  <td className="w-[45px] px-2 py-2 align-top">
                    <div className="flex items-stretch gap-2">
                      <div className="mt-1 h-full w-[2px] border-r-2 border-dashed border-[#93c5fd]/90" />
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F4FF] text-xs font-bold text-[#007AFF]">
                        {row.index}
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-2 align-top whitespace-nowrap text-slate-800">{row.desc}</td>
                  <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-xs text-slate-800">
                    {formatDate(row.date)}
                  </td>
                  <td className="min-w-0 px-2 py-2 align-top whitespace-normal">
                    <DoseAndNoteCell dose={row.dose} note={row.note} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 self-start rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        onClick={() => scrollToId("science")}
      >
        返回保障科普
      </button>
    </div>
  );
}

/**
 * @param {string} text
 * @returns {Array<{label: string, value: string}>}
 */
function parseL1Description(text) {
  const raw = String(text || "")
    .replace(/\\\\n/g, "\n") // 兼容 JSON 里被双重转义的 \\n
    .replace(/\\n/g, "\n")
    .trim();

  /** @type {Array<{label: string, value: string}>} */
  const rows = [];

  // 优先按“性质/准入门槛/保费与保额…”这种字段拆分（允许有/无冒号）
  const keys = ["性质", "准入门槛", "保费与保额", "保障范围", "理赔门槛", "定位", "定义", "举例", "共同特点"];
  const keyRe = new RegExp("(" + keys.join("|") + ")\\s*：?", "g");
  const matches = Array.from(raw.matchAll(keyRe));

  if (matches.length) {
    matches.forEach((m, i) => {
      const label = String(m[1] || "").trim();
      const start = (m.index || 0) + String(m[0] || "").length;
      const end = i + 1 < matches.length ? (matches[i + 1].index || raw.length) : raw.length;
      const value = raw
        .slice(start, end)
        .replace(/^[\s：]+/g, "")
        .replace(/\s*\n\s*/g, "\n")
        .trim();
      if (label && value) rows.push({ label, value });
    });
    return rows;
  }

  // 兜底：逐行处理（兼容 “作用” 单独一行，下一行才是内容）
  const lines = raw
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  /** @type {string|null} */
  let pendingLabel = null;

  lines.forEach((line) => {
    const idx = line.indexOf("：");
    if (idx > 0) {
      pendingLabel = null;
      rows.push({ label: line.slice(0, idx), value: line.slice(idx + 1).trim() });
      return;
    }

    if (keys.includes(line)) {
      pendingLabel = line;
      return;
    }

    if (pendingLabel) {
      rows.push({ label: pendingLabel, value: line });
      pendingLabel = null;
      return;
    }

    if (rows.length) {
      rows[rows.length - 1].value += " " + line;
      return;
    }

    rows.push({ label: "说明", value: line });
  });

  return rows;
}

/**
 * @param {string} s
 * @returns {boolean}
 */
function isLikelyValidity(s) {
  const t = String(s || "");
  if (!t) return false;
  if (t.includes("有效期")) return true;
  return /\d{4}\/\d{1,2}\/\d{1,2}/.test(t);
}

/**
 * @param {string} text
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

/**
 * @param {{tab: AppTab}} props
 */
function DrugSwiper({ tab }) {
  const items = tab.items || [];
  const [active, setActive] = useState(0);
  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const trackRef = useRef(null);

  useEffect(() => {
    setActive(0);
    if (trackRef.current) trackRef.current.scrollTo({ left: 0, behavior: "auto" });
  }, [tab.id]);

  return (
    <div className="mt-3">
      <div
        ref={trackRef}
        className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        onScroll={(e) => {
          const el = /** @type {HTMLDivElement} */ (e.currentTarget);
          const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          setActive(Math.min(Math.max(idx, 0), Math.max(0, items.length - 1)));
        }}
      >
        {items.map((it) => (
          <div key={it.id} className="w-full shrink-0 snap-start pr-0">
            <div className="glass-strong rounded-2xl p-4 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-slate-900">{it.title}</div>
                </div>
                {it.right && isLikelyValidity(it.right) ? (
                  <div className="text-xs text-slate-500">{it.right}</div>
                ) : null}
              </div>

              {it.subtitle ? (
                <div className="mt-2 text-xs leading-relaxed text-slate-600">{it.subtitle}</div>
              ) : null}

              {it.bullets?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-600">
                  {it.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              ) : null}

              {it.tips?.length ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                  <div className="mb-1 flex items-center gap-2 text-slate-700">
                    <Sparkles className="h-4 w-4 text-mint-breath" />
                    <span className="font-semibold">小贴士</span>
                  </div>
                  <div className="space-y-1">
                    {it.tips.map((t, idx) => (
                      <div key={idx}>{t}</div>
                    ))}
                  </div>
                </div>
              ) : null}

              {it.link ? (
                <div className="mt-3">
                  <button
                    type="button"
                    className="group inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-600 hover:text-white active:bg-blue-600 active:text-white"
                    onClick={() => {
                      if (it.link_kind === "copy") {
                        copyToClipboard(it.link || "");
                        return;
                      }
                      window.open(it.link, "_blank", "noopener,noreferrer");
                    }}
                  >
                    {it.link_kind === "copy" ? (
                      <Copy className="h-3.5 w-3.5 shrink-0 text-blue-900 group-hover:text-white group-active:text-white" aria-hidden />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-900 group-hover:text-white group-active:text-white" aria-hidden />
                    )}
                    {it.link_kind === "copy" ? "复制链接" : "打开链接"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {items.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`第 ${idx + 1} 个药物`}
              className={[
                "h-2 rounded-full transition-all",
                idx === active ? "w-6 bg-[#d4af37]" : "w-2 bg-slate-300"
              ].join(" ")}
              onClick={() => {
                const el = trackRef.current;
                if (!el) return;
                el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
                setActive(idx);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {{tabs: Array<AppTab>}} props
 */
function SegmentedTabs({ tabs }) {
  const [active, setActive] = useState(0);
  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const segRef = useRef(null);
  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const indicatorRef = useRef(null);

  const activeTab = tabs[active];

  /** @param {number} idx */
  function activate(idx) {
    setActive(idx);
    requestAnimationFrame(() => {
      const seg = segRef.current;
      const ind = indicatorRef.current;
      if (!seg || !ind) return;
      const btn = /** @type {HTMLElement|null} */ (seg.querySelector(`[data-idx="${idx}"]`));
      if (!btn) return;
      ind.style.width = `${btn.offsetWidth}px`;
      ind.style.transform = `translateX(${btn.offsetLeft}px)`;

      // 自动把选中项滚到可见区域
      const left = btn.offsetLeft;
      const right = left + btn.offsetWidth;
      const viewL = seg.scrollLeft;
      const viewR = viewL + seg.clientWidth;
      if (left < viewL) seg.scrollTo({ left, behavior: "smooth" });
      else if (right > viewR) seg.scrollTo({ left: right - seg.clientWidth, behavior: "smooth" });
    });
  }

  useEffect(() => {
    activate(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.map((t) => t.id).join("|")]);

  return (
    <div>
      <div
        ref={segRef}
        className="hide-scrollbar relative flex max-w-full gap-5 overflow-x-auto rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm"
        onScroll={() => {
          const seg = segRef.current;
          const ind = indicatorRef.current;
          if (!seg || !ind) return;
          const btn = /** @type {HTMLElement|null} */ (seg.querySelector(`[data-idx="${active}"]`));
          if (!btn) return;
          ind.style.width = `${btn.offsetWidth}px`;
          ind.style.transform = `translateX(${btn.offsetLeft}px)`;
        }}
      >
        <div
          ref={indicatorRef}
          className="pointer-events-none absolute bottom-2 left-0 h-0.5 rounded-full bg-[#d4af37] transition-all"
        />
        {tabs.map((t, idx) => (
          <button
            key={t.id}
            type="button"
            data-idx={idx}
            className={[
              "relative z-10 shrink-0 whitespace-nowrap px-2 py-1 text-xs font-semibold",
              idx === active ? "text-tech-blue" : "text-slate-500 hover:text-slate-700"
            ].join(" ")}
            onClick={() => activate(idx)}
          >
            {t.title}
          </button>
        ))}
      </div>

      {activeTab ? <DrugSwiper tab={activeTab} /> : null}
    </div>
  );
}

/**
 * @param {{data: InsuranceConfigRoot|null}} props
 */
function InsuranceTool({ data }) {
  const modules = data?.modules || [];
  /** @type {Record<string, boolean>} */
  const [descExpanded, setDescExpanded] = useState({});

  function toggleDesc(moduleId) {
    setDescExpanded((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  }

  return (
    <div className="legacy-m1-cards mt-6">
      {modules.map((m) => (
        <div key={m.id} className="legacy-m1-card">
          <div className="legacy-m1-inner">
            {m.description ? (
              (() => {
                const descRows = parseL1Description(m.description);
                const expanded = Boolean(descExpanded[m.id]);
                const showMore = descRows.length > 4;
                const shown = expanded ? descRows : descRows.slice(0, 4);

                return (
                  <div className="legacy-m1-head">
                    <div className="legacy-m1-title">{m.title}</div>

                    <div
                      className={[
                        "legacy-m1-desc legacy-m1-desc-rows",
                        showMore
                          ? expanded
                            ? "legacy-m1-desc-rows--expanded legacy-m1-desc-rows--active"
                            : "legacy-m1-desc-rows--collapsed"
                          : ""
                      ].join(" ")}
                      onClick={() => {
                        if (!showMore) return;
                        toggleDesc(m.id);
                      }}
                      role={showMore ? "button" : undefined}
                      tabIndex={showMore ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (!showMore) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleDesc(m.id);
                        }
                      }}
                      aria-label={expanded ? "收起详情" : "展开详情"}
                    >
                      {shown.map((row, idx) => (
                        <div key={idx} className="legacy-m1-desc-row">
                          <div className="legacy-m1-desc-label">{row.label}</div>
                          <div className="legacy-m1-desc-value">{row.value}</div>
                        </div>
                      ))}
                    </div>

                    {showMore ? (
                      <div className="legacy-m1-desc-expand">
                        <button
                          type="button"
                          className="legacy-m1-desc-expand-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDesc(m.id);
                          }}
                          aria-label={expanded ? "收起详情" : "展开详情"}
                        >
                          <ChevronDown
                            className={["h-5 w-5 transition-transform", expanded ? "rotate-180" : "rotate-0"].join(" ")}
                            aria-hidden
                          />
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })()
            ) : (
              <div className="legacy-m1-head">
                <div className="legacy-m1-title">{m.title}</div>
              </div>
            )}

            <div className="legacy-m1-accordion">
              {(m.accordion || []).map((acc) => (
                <details
                  key={acc.id}
                  className="legacy-m1-acc2"
                >
                  <summary className="legacy-m1-acc2-summary">
                    <div className="legacy-m1-acc2-left">
                      <div>
                        <div className="legacy-m1-acc2-title">{acc.title}</div>
                        {acc.subtitle ? (
                          <div className="legacy-m1-acc2-subtitle">{acc.subtitle}</div>
                        ) : null}
                      </div>
                    </div>
                    <span className="legacy-m1-acc2-chevron" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none">
                        <path
                          d="M5.5 7.5L10 12l4.5-4.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </summary>
                  {acc.tabs?.length ? (
                    <div className="legacy-m1-acc2-body">
                      <SegmentedTabs tabs={acc.tabs} />
                    </div>
                  ) : null}
                </details>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{children: React.ReactNode, id: string, className?: string}} props
 */
function Section({ children, id, className }) {
  return (
    <section id={id} className={["mx-auto w-full max-w-7xl px-5 py-14 md:px-8", className || ""].join(" ")}>
      {children}
    </section>
  );
}

export default function App() {
  /** @type {InsuranceConfigRoot} */
  const data = insuranceConfig;
  const [isVisible, setIsVisible] = useState(false);

  const nav = useMemo(
    () => [
      { id: "science", label: "保障科普" },
      { id: "drugs", label: "创新药指南" }
    ],
    []
  );

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { margin: "-20% 0px -20% 0px" });

  return (
    <div className="min-h-screen text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-tech-blue/20 ring-1 ring-tech-blue/35">
              <HeartPulse className="h-5 w-5 text-mint-breath" />
            </div>
            <div className="text-sm font-semibold tracking-wider">MedTech Insurance</div>
          </div>
          <div className="hidden items-center gap-6 text-sm md:flex">
            {nav.map((x) => (
              <button
                key={x.id}
                type="button"
                className="text-slate-600 hover:text-slate-900"
                onClick={() => scrollToId(x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section ref={heroRef} className="mx-auto w-full max-w-7xl px-5 pt-6 md:px-8">
        <div className="grid overflow-hidden rounded-3xl shadow-xl md:grid-cols-2 md:min-h-[70vh] md:items-stretch">
          <div className="flex flex-col justify-center bg-white py-12 pl-6 pr-6 md:h-full md:pl-12 md:pr-12">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-r from-[#002347] to-[#007AFF] bg-clip-text text-3xl font-bold leading-tight tracking-wider text-transparent md:text-5xl"
            >
              用科学与保障，
              <br />
              护航生命健康
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600 md:text-base"
            >
              深入了解多层次保障体系与创新药使用指南，让每一份保障更有温度。
            </motion.p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-lg bg-[#002347] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                onClick={() => openScienceModule(setIsVisible)}
              >
                了解多层次保障
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#002347] bg-white px-5 py-3 text-sm font-semibold text-[#002347] transition hover:bg-slate-50"
                onClick={() => scrollToId("drugs")}
              >
                查看创新药指南
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden md:h-full">
            <img
              src="/assets/insurance_bg.jpg"
              alt="insurance background"
              className="aspect-video h-full w-full object-cover md:aspect-auto"
              onError={(e) => {
                // 兜底：你没放 jpg 时仍能看到背景
                e.currentTarget.src = "/assets/insurance_bg.svg";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-deep-navy/25 via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* Module 1 */}
      <Section id="science">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="mt-2 text-2xl font-bold text-[#007AFF] md:text-3xl">多层次保障科普</div>
          </div>
          <div className="hidden md:block text-xs text-slate-400">
            {heroInView ? "首屏已进入视口" : "向上滚动查看首屏"}
          </div>
        </div>

        <div className="mt-8">
          {!isVisible ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              className="glass-strong rounded-3xl p-7 shadow-xl"
            >
              <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold">用结构化信息，降低理解门槛</div>
                  <div className="mt-1 text-sm text-slate-500">
                    从居民医保到惠民保与商业险，按层级展开查看目录、政策与入口。
                  </div>
                </div>
                <button
                  type="button"
                  className="group inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-900 transition-colors hover:bg-blue-600 hover:text-white active:bg-blue-600 active:text-white"
                  onClick={() => openScienceModule(setIsVisible)}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-900 group-hover:text-white group-active:text-white" aria-hidden />
                  科普保障小工具
                </button>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              <motion.div
                key="science-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.08 } }
                  }}
                  className="grid gap-4 md:grid-cols-3"
                >
                  {[
                    { icon: ShieldCheck, title: "基本医保", desc: "保基本 · 广覆盖" },
                    { icon: Sparkles, title: "惠民保", desc: "普惠 · 低门槛" },
                    { icon: HeartPulse, title: "商业保险", desc: "全面 · 高保障" }
                  ].map((c, idx) => (
                    <motion.div
                      key={idx}
                      variants={{ hidden: { opacity: 0, x: -18 }, show: { opacity: 1, x: 0 } }}
                      className="rounded-3xl bg-card-border p-[1px]"
                    >
                      <div className="glass rounded-3xl p-5 shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-tech-blue/10 ring-1 ring-tech-blue/35">
                            <c.icon className="h-5 w-5 text-[#007AFF]" />
                          </div>
                          <div>
                            <div className="text-xl font-semibold text-slate-900 md:text-2xl">{c.title}</div>
                            <div className="text-xs text-slate-500">{c.desc}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
                  <InsuranceTool data={data} />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </Section>

      {/* Module 2 */}
      <Section id="drugs" className="pt-20">
        <div className="grid gap-6 md:min-h-[60vh] md:grid-cols-2 md:items-stretch md:gap-0">
          <motion.div
            className="order-1 min-h-full w-full overflow-visible rounded-3xl bg-[rgba(255,255,255,0.85)] backdrop-blur-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:h-full md:rounded-r-none"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55 }}
          >
            <img
              src="/assets/drugs_bg.jpg"
              alt="drugs background"
              className="mask-fade-x h-full w-full object-contain object-center"
              onError={(e) => {
                // 兜底：你没放 jpg 时仍能看到背景
                e.currentTarget.src = "/assets/drugs_bg.svg";
              }}
            />
          </motion.div>

          <div className="order-2 flex min-h-0 w-full flex-col rounded-3xl bg-[rgba(255,255,255,0.85)] p-6 backdrop-blur-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:rounded-l-none md:p-8 md:h-full">
            <div className="shrink-0 text-xl font-bold text-[#007AFF] sm:text-2xl md:text-3xl">创新药使用指南</div>
            <div className="mt-5 min-h-0 flex-1 overflow-hidden overflow-x-visible">
              <Module2Calculator />
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-10 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
          <div>提示：本页面为科普工具，具体政策以当地医保与产品条款为准。</div>
          <div>© {new Date().getFullYear()} Roche. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}





