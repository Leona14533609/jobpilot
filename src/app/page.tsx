"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Pencil,
  Plus,
  Settings,
  Search,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ViewKey = "dashboard" | "tracker" | "resumes" | "emotion" | "settings" | "about";
type TrackerView = "table" | "kanban";
type ApplicationStatus = "准备投递" | "已投递" | "待跟进" | "面试中" | "Offer" | "已拒";
type ApplicationType = "校招" | "暑期实习";
type ApplicationTypeFilter = "全部" | ApplicationType;
type InternshipConversion = "是" | "否" | "不确定";
type InternshipInfoSource = "学长学姐" | "小红书" | "内推人" | "其他";
type InfoConfidence = "高" | "中" | "低";
type InternshipIntensity = "轻度" | "中等" | "重度";
type YesNo = "是" | "否";
type Emotion = "平稳" | "焦虑" | "沮丧" | "有动力" | "疲惫" | "自我怀疑";

type ApplicationRecord = {
  id: string;
  company: string;
  role: string;
  industry: string;
  applicationType: ApplicationType;
  location: string;
  appliedDate: string;
  status: ApplicationStatus;
  jd: string;
  resumeVersionId: string;
  resumeVersion?: string;
  interviewTime: string;
  contact: string;
  channel: string;
  notes: string;
  interviews: InterviewRecord[];
  priorityScores: PriorityScores;
  internship: InternshipInfo;
  updatedAt: string;
};

type ApplicationFormState = Omit<ApplicationRecord, "id" | "updatedAt">;

type InterviewRecord = {
  id: string;
  round: string;
  date: string;
  interviewer: string;
  questions: string;
  score: number;
  summary: string;
  nextAction: string;
  updatedAt: string;
};

type PriorityScores = {
  salary: number;
  growth: number;
  match: number;
  location: number;
  company: number;
};

type InternshipInfo = {
  hasConversionChance: InternshipConversion;
  conversionDetails: string;
  infoSource: InternshipInfoSource;
  infoConfidence: InfoConfidence;
  startDate: string;
  endDate: string;
  intensity: InternshipIntensity;
  affectsAutumnRecruitment: YesNo;
};

type ResumeVersion = {
  id: string;
  name: string;
  note: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileDataUrl: string;
  createdAt: string;
};

type EmotionRecord = {
  id: string;
  date: string;
  emotion: Emotion;
  note: string;
  createdAt: string;
};

type JobPilotExport = {
  version: 1;
  exportedAt: string;
  applications: ApplicationRecord[];
  resumeVersions: ResumeVersion[];
  emotionRecords: EmotionRecord[];
};

const storageKey = "jobpilot:applications:v1";
const resumeStorageKey = "jobpilot:resume-versions:v1";
const emotionStorageKey = "jobpilot:emotions:v1";
const usernameStorageKey = "job_username";
const statuses: ApplicationStatus[] = ["准备投递", "已投递", "待跟进", "面试中", "Offer", "已拒"];
const applicationTypeFilters: ApplicationTypeFilter[] = ["全部", "校招", "暑期实习"];
const applicationTypes: ApplicationType[] = ["校招", "暑期实习"];
const industries = ["金融", "互联网", "咨询", "快消", "科技", "国企/央企", "教育", "医疗健康", "其他"];
const encouragementMessages = [
  "今天也会有好消息",
  "今天继续向offer靠近",
  "慢一点也没关系",
  "今天先推进一小步",
  "已经在变好了",
];
const highStressEmotions = new Set<Emotion>(["焦虑", "沮丧", "疲惫", "自我怀疑"]);
const emotionActions: Record<Emotion, string> = {
  平稳: "保持当前节奏",
  焦虑: "拆分今天只做一个小任务",
  沮丧: "先复盘一个可控改进点",
  有动力: "适合推进重点岗位",
  疲惫: "暂停海投，整理已投岗位",
  自我怀疑: "回看已有进展和完成事项",
};
const emotionCheckins: { emotion: Emotion; emoji: string; label: string }[] = [
  { emotion: "有动力", emoji: "😊", label: "超棒" },
  { emotion: "平稳", emoji: "😐", label: "平静" },
  { emotion: "焦虑", emoji: "😰", label: "焦虑" },
  { emotion: "沮丧", emoji: "😔", label: "低落" },
  { emotion: "疲惫", emoji: "😮‍💨", label: "疲惫" },
  { emotion: "自我怀疑", emoji: "😟", label: "怀疑" },
];

const emptyForm: ApplicationFormState = {
  company: "",
  role: "",
  industry: "",
  applicationType: "校招",
  location: "",
  appliedDate: new Date().toISOString().slice(0, 10),
  status: "已投递",
  jd: "",
  resumeVersionId: "",
  resumeVersion: "",
  interviewTime: "",
  contact: "",
  channel: "",
  notes: "",
  interviews: [],
  priorityScores: {
    salary: 3,
    growth: 3,
    match: 3,
    location: 3,
    company: 3,
  },
  internship: {
    hasConversionChance: "不确定",
    conversionDetails: "",
    infoSource: "其他",
    infoConfidence: "中",
    startDate: "",
    endDate: "",
    intensity: "中等",
    affectsAutumnRecruitment: "否",
  },
};

const emptyInterviewForm = {
  round: "",
  date: getLocalDate(),
  interviewer: "",
  questions: "",
  score: 3,
  summary: "",
  nextAction: "",
};

const seedResumeVersions: ResumeVersion[] = [
  { id: "resume-general", name: "通用版", note: "适合多数岗位的基础版本", fileName: "", fileType: "", fileSize: 0, fileDataUrl: "", createdAt: "2026-04-01" },
  { id: "resume-product", name: "产品岗版", note: "突出用户研究、需求拆解和项目推进", fileName: "", fileType: "", fileSize: 0, fileDataUrl: "", createdAt: "2026-04-01" },
  { id: "resume-data", name: "数据分析版", note: "突出 SQL、指标分析和业务洞察", fileName: "", fileType: "", fileSize: 0, fileDataUrl: "", createdAt: "2026-04-01" },
  { id: "resume-consulting", name: "咨询岗版", note: "突出结构化分析、市场研究和表达", fileName: "", fileType: "", fileSize: 0, fileDataUrl: "", createdAt: "2026-04-01" },
];

const seedApplications: ApplicationRecord[] = [
  {
    id: "seed-1",
    company: "AstraFin",
    role: "Junior Data Analyst",
    industry: "金融",
    applicationType: "校招",
    location: "Singapore",
    appliedDate: "2026-04-18",
    status: "面试中",
    jd: "负责业务数据分析、指标看板维护、用户留存与转化分析，支持产品和运营团队做决策。",
    resumeVersionId: "resume-data",
    interviewTime: "2026-04-30",
    contact: "Janel Tan",
    channel: "LinkedIn",
    notes: "准备用户留存分析案例，补充 SQL 项目经历。",
    interviews: [
      {
        id: "interview-seed-1",
        round: "一面",
        date: "2026-04-30",
        interviewer: "数据团队 Lead",
        questions: "如何分析用户留存下降？如何设计指标看板？",
        score: 4,
        summary: "案例表达清楚，指标拆解较完整。",
        nextAction: "补充 SQL 窗口函数和留存 cohort 口径。",
        updatedAt: "2026-04-30",
      },
    ],
    priorityScores: { salary: 4, growth: 5, match: 4, location: 3, company: 4 },
    internship: emptyForm.internship,
    updatedAt: "2026-04-18",
  },
  {
    id: "seed-2",
    company: "Nimbus AI",
    role: "Product Associate",
    industry: "互联网",
    applicationType: "暑期实习",
    location: "Remote",
    appliedDate: "2026-04-16",
    status: "待跟进",
    jd: "协助产品经理进行用户研究、需求整理、竞品分析和迭代跟进，要求良好的沟通与执行能力。",
    resumeVersionId: "resume-product",
    interviewTime: "",
    contact: "Recruiting Team",
    channel: "官网",
    notes: "5 个工作日后跟进，强调用户研究和跨团队协作经历。",
    interviews: [],
    priorityScores: { salary: 3, growth: 4, match: 5, location: 5, company: 4 },
    internship: {
      hasConversionChance: "不确定",
      conversionDetails: "团队表示表现优秀会进入秋招快速通道，但名额不固定。",
      infoSource: "内推人",
      infoConfidence: "中",
      startDate: "2026-06-15",
      endDate: "2026-08-30",
      intensity: "中等",
      affectsAutumnRecruitment: "否",
    },
    updatedAt: "2026-04-16",
  },
  {
    id: "seed-3",
    company: "BrightPath",
    role: "Business Analyst",
    industry: "咨询",
    applicationType: "校招",
    location: "Jakarta",
    appliedDate: "2026-04-09",
    status: "Offer",
    jd: "负责市场研究、业务建模、增长策略分析，与销售和产品团队协作推动商业项目。",
    resumeVersionId: "resume-data",
    interviewTime: "",
    contact: "Marcus Lee",
    channel: "内推",
    notes: "评估薪酬、成长路径和团队稳定性。",
    interviews: [],
    priorityScores: { salary: 4, growth: 4, match: 4, location: 3, company: 5 },
    internship: emptyForm.internship,
    updatedAt: "2026-04-20",
  },
  {
    id: "seed-4",
    company: "BlueOrbit",
    role: "Strategy Intern",
    industry: "金融",
    applicationType: "暑期实习",
    location: "Bangkok",
    appliedDate: "2026-03-29",
    status: "已拒",
    jd: "支持战略项目，进行市场规模测算、竞品研究和管理层汇报材料准备。",
    resumeVersionId: "resume-general",
    interviewTime: "",
    contact: "Amy Wong",
    channel: "校园招聘",
    notes: "复盘：市场规模测算结构需要更清晰。",
    interviews: [],
    priorityScores: { salary: 3, growth: 3, match: 2, location: 3, company: 3 },
    internship: {
      hasConversionChance: "否",
      conversionDetails: "项目制实习，往届反馈转正名额较少。",
      infoSource: "学长学姐",
      infoConfidence: "高",
      startDate: "2026-06-01",
      endDate: "2026-08-15",
      intensity: "重度",
      affectsAutumnRecruitment: "是",
    },
    updatedAt: "2026-04-05",
  },
];

type NavItem = { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }> };

const navItems: NavItem[] = [
  { key: "dashboard", label: "首页总览", icon: LayoutDashboard },
  { key: "tracker", label: "投递管理", icon: BriefcaseBusiness },
  { key: "resumes", label: "简历版本", icon: FileText },
  { key: "emotion", label: "情绪管理", icon: HeartPulse },
  { key: "settings", label: "数据设置", icon: Settings },
];

const bottomNavItems: NavItem[] = [
  { key: "about", label: "关于作者", icon: UserRound },
];

const applicationTableColumns = [
  { label: "公司", className: "sticky left-0 z-20 min-w-[180px] bg-slate-50" },
  { label: "岗位", className: "sticky left-[180px] z-20 min-w-[160px] bg-slate-50 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]" },
  { label: "行业", className: "min-w-[120px]" },
  { label: "类型", className: "min-w-[120px]" },
  { label: "优先级", className: "min-w-[120px]" },
  { label: "Base", className: "min-w-[140px]" },
  { label: "投递日期", className: "min-w-[140px]" },
  { label: "状态", className: "min-w-[140px]" },
  { label: "简历版本", className: "min-w-[140px]" },
  { label: "暑期信息", className: "min-w-[180px]" },
  { label: "面试时间", className: "min-w-[160px]" },
  { label: "联系人", className: "min-w-[140px]" },
  { label: "渠道", className: "min-w-[140px]" },
  { label: "操作", className: "min-w-[140px]" },
];

function loadApplications() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<ApplicationRecord>[];
    if (!Array.isArray(parsed)) return [];
    return normalizeApplications(parsed);
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

function normalizeApplications(items: Partial<ApplicationRecord>[]) {
  return items.map((item) => ({
      id: item.id ?? createId(),
      company: item.company ?? "",
      role: item.role ?? "",
      industry: item.industry ?? "",
      applicationType: item.applicationType ?? "校招",
      location: item.location ?? "",
      appliedDate: item.appliedDate ?? getLocalDate(),
      status: item.status ?? "已投递",
      jd: item.jd ?? "",
      resumeVersionId: item.resumeVersionId ?? inferResumeVersionId(item.resumeVersion),
      resumeVersion: item.resumeVersion,
      interviewTime: item.interviewTime ?? "",
      contact: item.contact ?? "",
      channel: item.channel ?? "",
      notes: item.notes ?? "",
      interviews: Array.isArray(item.interviews) ? item.interviews : [],
      priorityScores: normalizePriorityScores(item.priorityScores),
      internship: normalizeInternshipInfo(item.internship),
      updatedAt: item.updatedAt ?? item.appliedDate ?? getLocalDate(),
  }));
}

function loadResumeVersions() {
  if (typeof window === "undefined") return seedResumeVersions;
  const raw = window.localStorage.getItem(resumeStorageKey);
  if (!raw) return seedResumeVersions;

  try {
    const parsed = JSON.parse(raw) as Partial<ResumeVersion>[];
    return Array.isArray(parsed) && parsed.length > 0 ? normalizeResumeVersions(parsed) : seedResumeVersions;
  } catch {
    window.localStorage.removeItem(resumeStorageKey);
    return seedResumeVersions;
  }
}

function normalizeResumeVersions(items: Partial<ResumeVersion>[]) {
  return items.map((item) => ({
    id: item.id ?? createResumeId(),
    name: item.name ?? "未命名版本",
    note: item.note ?? "",
    fileName: item.fileName ?? "",
    fileType: item.fileType ?? "",
    fileSize: item.fileSize ?? 0,
    fileDataUrl: item.fileDataUrl ?? "",
    createdAt: item.createdAt ?? new Date().toISOString(),
  }));
}

function loadEmotionRecords() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(emotionStorageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as EmotionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(emotionStorageKey);
    return [];
  }
}

function loadUsername() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(usernameStorageKey) ?? "";
}

function createId() {
  return `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createResumeId() {
  return `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInterviewId() {
  return `interview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmotionId() {
  return `emotion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getLocalDate(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function formatFileSize(size: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeDateInput(value?: string) {
  return value?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

function inferResumeVersionId(value?: string) {
  if (!value) return "resume-general";
  const normalized = value.toLowerCase();
  if (normalized.includes("data") || value.includes("数据")) return "resume-data";
  if (normalized.includes("product") || value.includes("产品")) return "resume-product";
  if (normalized.includes("consult") || value.includes("咨询")) return "resume-consulting";
  return "resume-general";
}

function isInterviewOrBetter(status: ApplicationStatus) {
  return status === "面试中" || status === "Offer";
}

function normalizePriorityScores(scores?: Partial<PriorityScores>) {
  return {
    salary: scores?.salary ?? 3,
    growth: scores?.growth ?? 3,
    match: scores?.match ?? 3,
    location: scores?.location ?? 3,
    company: scores?.company ?? 3,
  };
}

function normalizeInternshipInfo(info?: Partial<InternshipInfo>) {
  return {
    hasConversionChance: info?.hasConversionChance ?? "不确定",
    conversionDetails: info?.conversionDetails ?? "",
    infoSource: info?.infoSource ?? "其他",
    infoConfidence: info?.infoConfidence ?? "中",
    startDate: info?.startDate ?? "",
    endDate: info?.endDate ?? "",
    intensity: info?.intensity ?? "中等",
    affectsAutumnRecruitment: info?.affectsAutumnRecruitment ?? "否",
  };
}

function getPriorityAverage(scores: PriorityScores) {
  return Number(((scores.salary + scores.growth + scores.match + scores.location + scores.company) / 5).toFixed(1));
}

function getPriorityLevel(score: number) {
  if (score >= 4) return "高";
  if (score >= 3) return "中";
  return "低";
}

function priorityBadge(level: string) {
  if (level === "高") return "success";
  if (level === "中") return "warning";
  return "soft";
}

function statusBadge(status: ApplicationStatus) {
  if (status === "Offer") return "success";
  if (status === "面试中") return "warning";
  if (status === "已拒") return "destructive";
  return "soft";
}

function emotionBadge(emotion: Emotion) {
  if (emotion === "有动力") return "success";
  if (emotion === "焦虑" || emotion === "疲惫") return "warning";
  if (emotion === "沮丧" || emotion === "自我怀疑") return "destructive";
  return "soft";
}

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function AboutAuthor() {
  return (
    <>
      <PageHeader title="关于作者" />

      <div className="mx-auto max-w-4xl space-y-10">
        <Card>
          <CardHeader>
            <CardTitle>为什么做这个工具</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-9 text-slate-700">
            <p>这个工具是我在复盘自己暑期实习和春秋招经历时做的。</p>
            <p>
              当时投了很多岗位但一直在零散记录， 一直缺乏一种“掌控感”。
            </p>
            <p>
              不知道哪些需要跟进， 也不确定哪些岗位值得继续投入时间，也很难记录自己投递和当下面试完的状态和情绪。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>理念 + 咨询入口</CardTitle>
          </CardHeader>
          <CardContent className="space-y-7 text-sm leading-9 text-slate-700">
            <p>
              本人非绩优主义宣传者， 初衷是希望大家能够在少有确定性的市场中保持高配得感，通过数据看到自己的进展，少受一些带节奏的话术的影响，keep real并保持自己的节奏。
            </p>
            <div>
              <p className="font-medium text-slate-950">写在最后</p>
              <p>如果你现在：</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>不太确定方向</li>
                <li>投递很多但没反馈</li>
                <li>需要留学文书选校或求职面试辅导简历修改等帮助</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p>可以直接找我聊一聊。</p>
              <p className="whitespace-nowrap overflow-x-auto text-[13px] leading-6 text-slate-500">
                （咨询服务收费，牛马的时间很宝贵呜呜谢谢体谅，本人非专业留学和求职咨询服务提供者所以一定不贵。随缘接单！初衷还是分享工具）
              </p>
            </div>
            <a
              href="https://www.xiaohongshu.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              👉 小红书私信我
            </a>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [trackerView, setTrackerView] = useState<TrackerView>("table");
  const [applicationTypeFilter, setApplicationTypeFilter] = useState<ApplicationTypeFilter>("全部");
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>(() => loadResumeVersions());
  const [applications, setApplications] = useState<ApplicationRecord[]>(() => loadApplications());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ApplicationFormState>(emptyForm);
  const [resumeEditingId, setResumeEditingId] = useState<string | null>(null);
  const [resumeForm, setResumeForm] = useState({ name: "", note: "", fileName: "", fileType: "", fileSize: 0, fileDataUrl: "" });
  const [interviewEditingId, setInterviewEditingId] = useState<string | null>(null);
  const [interviewForm, setInterviewForm] = useState(emptyInterviewForm);
  const [query, setQuery] = useState("");
  const [importText, setImportText] = useState("");
  const [dataNotice, setDataNotice] = useState("");
  const [emotionRecords, setEmotionRecords] = useState<EmotionRecord[]>(() => loadEmotionRecords());
  const [emotionForm, setEmotionForm] = useState<{ emotion: Emotion; note: string }>({
    emotion: "平稳",
    note: "",
  });
  const [username, setUsername] = useState(() => loadUsername());
  const [encouragement] = useState(
    () => encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)],
  );

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    window.localStorage.setItem(resumeStorageKey, JSON.stringify(resumeVersions));
  }, [resumeVersions]);

  useEffect(() => {
    window.localStorage.setItem(emotionStorageKey, JSON.stringify(emotionRecords));
  }, [emotionRecords]);

  useEffect(() => {
    const trimmedName = username.trim();
    if (trimmedName) {
      window.localStorage.setItem(usernameStorageKey, trimmedName);
    } else {
      window.localStorage.removeItem(usernameStorageKey);
    }
  }, [username]);

  const selectedApplication = applications.find((item) => item.id === selectedId) ?? null;
  const editingApplication = applications.find((item) => item.id === editingId) ?? null;
  const getResumeVersionName = useCallback(
    (id: string, fallback?: string) =>
      resumeVersions.find((version) => version.id === id)?.name ?? fallback ?? "未绑定",
    [resumeVersions],
  );
  const defaultResumeVersionId = resumeVersions[0]?.id ?? "";
  const today = getLocalDate();

  const stats = useMemo(() => {
    return {
      total: applications.length,
      interviewing: applications.filter((item) => item.status === "面试中").length,
      offers: applications.filter((item) => item.status === "Offer").length,
      followUp: applications.filter((item) => item.status === "待跟进").length,
      conversionRate:
        applications.length === 0
          ? 0
          : Math.round((applications.filter((item) => isInterviewOrBetter(item.status)).length / applications.length) * 100),
    };
  }, [applications]);

  const resumeUsageStats = useMemo(() => {
    return resumeVersions.map((version) => {
      const boundApplications = applications.filter((item) => item.resumeVersionId === version.id);
      const interviewCount = boundApplications.filter((item) => isInterviewOrBetter(item.status)).length;
      return {
        ...version,
        usageCount: boundApplications.length,
        interviewCount,
      };
    });
  }, [applications, resumeVersions]);

  const bestResumeVersion = [...resumeUsageStats].sort((a, b) => b.interviewCount - a.interviewCount)[0] ?? null;
  const chartPalette = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const statusChartData = useMemo(
    () =>
      statuses.map((status) => ({
        name: status,
        value: applications.filter((item) => item.status === status).length,
      })),
    [applications],
  );

  const industryChartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of applications) {
      const key = item.industry?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [applications]);

  const locationChartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of applications) {
      const key = item.location?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [applications]);

  const resumeVersionChartData = useMemo(
    () =>
      resumeUsageStats
        .filter((version) => version.usageCount > 0)
        .map((version) => ({ name: version.name, value: version.usageCount })),
    [resumeUsageStats],
  );
  const { interviewReminders, hasInterviewSchedule } = useMemo(() => {
    const extractDate = (value: unknown) => {
      if (typeof value !== "string") return "";
      return value.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
    };

    const isReviewed = (record: unknown) => {
      if (!record || typeof record !== "object") return false;
      const typed = record as {
        questions?: unknown;
        summary?: unknown;
        nextAction?: unknown;
        score?: unknown;
      };
      const questions = typeof typed.questions === "string" ? typed.questions.trim() : "";
      const summary = typeof typed.summary === "string" ? typed.summary.trim() : "";
      const nextAction = typeof typed.nextAction === "string" ? typed.nextAction.trim() : "";
      const scoreValue = typeof typed.score === "number" ? typed.score : Number(typed.score);
      const hasScore = Number.isFinite(scoreValue) && scoreValue !== 0;
      return Boolean(questions || summary || nextAction || hasScore);
    };

    const buildWhenLabel = (date: string, time?: unknown) => {
      const trimmedTime = typeof time === "string" ? time.trim() : "";
      return trimmedTime ? `${date} ${trimmedTime}` : date;
    };

    const reminders: Array<{
      key: string;
      applicationId: string;
      company: string;
      role: string;
      date: string;
      whenLabel: string;
      kind: "today" | "past" | "future";
      message: string;
    }> = [];
    let hasSchedule = false;

    for (const application of applications) {
      const scheduleByDate = new Map<string, { whenLabel: string; reviewed: boolean }>();

      const addSchedule = (date: string, time: unknown, reviewed: boolean) => {
        if (!date) return;
        hasSchedule = true;
        const existing = scheduleByDate.get(date);
        const whenLabel = existing?.whenLabel ?? buildWhenLabel(date, time);
        scheduleByDate.set(date, {
          whenLabel,
          reviewed: (existing?.reviewed ?? false) || reviewed,
        });
      };

      for (const interview of application.interviews ?? []) {
        const interviewData = interview as unknown as { interviewDate?: unknown; interviewTime?: unknown; date?: unknown };
        addSchedule(
          extractDate(interviewData.interviewDate ?? interviewData.date),
          interviewData.interviewTime,
          isReviewed(interview),
        );
      }

      const applicationInterviewDate = extractDate(application.interviewTime);
      if (applicationInterviewDate) {
        const matchedReview = scheduleByDate.get(applicationInterviewDate)?.reviewed ?? false;
        addSchedule(applicationInterviewDate, undefined, matchedReview);
      }

      for (const [date, entry] of scheduleByDate.entries()) {
        if (date === today) {
          reminders.push({
            key: `${application.id}:${date}`,
            applicationId: application.id,
            company: application.company,
            role: application.role,
            date,
            whenLabel: entry.whenLabel,
            kind: "today",
            message: "你今天有面试，结束后记得记录问题和复盘。",
          });
          continue;
        }

        if (date < today) {
          if (entry.reviewed) continue;
          reminders.push({
            key: `${application.id}:${date}`,
            applicationId: application.id,
            company: application.company,
            role: application.role,
            date,
            whenLabel: entry.whenLabel,
            kind: "past",
            message: "你有一场已完成的面试还没有复盘，建议补充面试问题和表现记录。",
          });
          continue;
        }

        reminders.push({
          key: `${application.id}:${date}`,
          applicationId: application.id,
          company: application.company,
          role: application.role,
          date,
          whenLabel: entry.whenLabel,
          kind: "future",
          message: "你有即将到来的面试，可以提前准备常见问题。",
        });
      }
    }

    const kindOrder = { today: 0, future: 1, past: 2 } as const;
    reminders.sort((a, b) => {
      const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
      if (kindDiff !== 0) return kindDiff;
      if (a.kind === "past") return b.date.localeCompare(a.date);
      return a.date.localeCompare(b.date);
    });

    return { interviewReminders: reminders, hasInterviewSchedule: hasSchedule };
  }, [applications, today]);

  const filteredApplications = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const typeFilteredApplications =
      applicationTypeFilter === "全部"
        ? applications
        : applications.filter((item) => item.applicationType === applicationTypeFilter);
    if (!keyword) return typeFilteredApplications;
    return typeFilteredApplications.filter((item) =>
      [
        item.company,
        item.role,
        item.industry,
        item.location,
        item.status,
        item.channel,
        item.contact,
        item.applicationType,
        item.internship.conversionDetails,
        item.internship.infoSource,
        getResumeVersionName(item.resumeVersionId, item.resumeVersion),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [applicationTypeFilter, applications, getResumeVersionName, query]);

  const sortedApplications = useMemo(
    () =>
      [...filteredApplications].sort(
        (a, b) => getPriorityAverage(b.priorityScores) - getPriorityAverage(a.priorityScores),
      ),
    [filteredApplications],
  );

  const topPriorityApplications = useMemo(
    () =>
      [...applications]
        .sort((a, b) => getPriorityAverage(b.priorityScores) - getPriorityAverage(a.priorityScores))
        .slice(0, 3),
    [applications],
  );
  const hasUserData = applications.length > 0 || emotionRecords.length > 0;

  const recentApplications = [...applications]
    .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate))
    .slice(0, 5);
  const sortedEmotionRecords = [...emotionRecords].sort((a, b) => b.date.localeCompare(a.date));
  const recentEmotionRecords = sortedEmotionRecords.slice(0, 7);
  const todayEmotion = emotionRecords.find((item) => item.date === today) ?? null;
  const latestEmotion = sortedEmotionRecords[0] ?? null;
  const dashboardEmotion = todayEmotion ?? latestEmotion;
  const hasHighStressStreak =
    sortedEmotionRecords.length >= 3 &&
    sortedEmotionRecords.slice(0, 3).every((item) => highStressEmotions.has(item.emotion));

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, appliedDate: getLocalDate(), resumeVersionId: defaultResumeVersionId });
    setIsFormOpen(true);
  };

  const openEditForm = (record: ApplicationRecord) => {
    setEditingId(record.id);
    setForm({
      company: record.company,
      role: record.role,
      industry: record.industry,
      applicationType: record.applicationType,
      location: record.location,
      appliedDate: record.appliedDate,
      status: record.status,
      jd: record.jd,
      resumeVersionId: record.resumeVersionId || inferResumeVersionId(record.resumeVersion),
      resumeVersion: record.resumeVersion ?? "",
      interviewTime: normalizeDateInput(record.interviewTime),
      contact: record.contact,
      channel: record.channel,
      notes: record.notes,
      interviews: record.interviews,
      priorityScores: record.priorityScores,
      internship: record.internship,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveApplication = () => {
    if (!form.company.trim() || !form.role.trim() || !form.resumeVersionId) return;
    const now = new Date().toISOString();
    const selectedResumeName = getResumeVersionName(form.resumeVersionId);

    if (editingId) {
      setApplications((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...form,
                company: form.company.trim(),
                role: form.role.trim(),
                resumeVersion: selectedResumeName,
                updatedAt: now,
              }
            : item,
        ),
      );
    } else {
      const record: ApplicationRecord = {
        id: createId(),
        ...form,
        company: form.company.trim(),
        role: form.role.trim(),
        resumeVersion: selectedResumeName,
        updatedAt: now,
      };
      setApplications((current) => [record, ...current]);
    }

    closeForm();
  };

  const deleteApplication = (id: string) => {
    const target = applications.find((item) => item.id === id);
    if (!target) return;
    const confirmed = window.confirm(`确认删除「${target.company} · ${target.role}」这条投递记录吗？`);
    if (!confirmed) return;
    setApplications((current) => current.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) closeForm();
  };

  const updateStatus = (id: string, status: ApplicationStatus) => {
    setApplications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  };

  const saveEmotionRecord = () => {
    if (todayEmotion) return;
    const record: EmotionRecord = {
      id: createEmotionId(),
      date: today,
      emotion: emotionForm.emotion,
      note: emotionForm.note.trim(),
      createdAt: new Date().toISOString(),
    };
    setEmotionRecords((current) => [record, ...current]);
    setEmotionForm({ emotion: "平稳", note: "" });
  };

  const deleteEmotionRecord = (id: string) => {
    setEmotionRecords((current) => current.filter((item) => item.id !== id));
  };

  const openResumeCreateForm = () => {
    setResumeEditingId(null);
    setResumeForm({ name: "", note: "", fileName: "", fileType: "", fileSize: 0, fileDataUrl: "" });
  };

  const openResumeEditForm = (version: ResumeVersion) => {
    setResumeEditingId(version.id);
    setResumeForm({
      name: version.name,
      note: version.note,
      fileName: version.fileName,
      fileType: version.fileType,
      fileSize: version.fileSize,
      fileDataUrl: version.fileDataUrl,
    });
  };

  const handleResumeFileChange = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setResumeForm((current) => ({
        ...current,
        fileName: file.name,
        fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "",
        fileSize: file.size,
        fileDataUrl: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const saveResumeVersion = () => {
    if (!resumeForm.name.trim()) return;
    const payload = {
      name: resumeForm.name.trim(),
      note: resumeForm.note.trim(),
      fileName: resumeForm.fileName,
      fileType: resumeForm.fileType,
      fileSize: resumeForm.fileSize,
      fileDataUrl: resumeForm.fileDataUrl,
    };
    if (resumeEditingId) {
      setResumeVersions((current) =>
        current.map((version) => (version.id === resumeEditingId ? { ...version, ...payload } : version)),
      );
    } else {
      setResumeVersions((current) => [
        ...current,
        {
          id: createResumeId(),
          ...payload,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setResumeEditingId(null);
    setResumeForm({ name: "", note: "", fileName: "", fileType: "", fileSize: 0, fileDataUrl: "" });
  };

  const deleteResumeVersion = (id: string) => {
    const target = resumeVersions.find((version) => version.id === id);
    if (!target) return;
    const usedCount = applications.filter((item) => item.resumeVersionId === id).length;
    const confirmed = window.confirm(
      usedCount > 0
        ? `「${target.name}」已被 ${usedCount} 条投递使用。删除后这些投递将显示为未绑定，确认删除吗？`
        : `确认删除「${target.name}」吗？`,
    );
    if (!confirmed) return;
    setResumeVersions((current) => current.filter((version) => version.id !== id));
    setApplications((current) =>
      current.map((item) => (item.resumeVersionId === id ? { ...item, resumeVersionId: "" } : item)),
    );
    if (resumeEditingId === id) openResumeCreateForm();
  };

  const resetInterviewForm = () => {
    setInterviewEditingId(null);
    setInterviewForm({ ...emptyInterviewForm, date: getLocalDate() });
  };

  const openInterviewEditForm = (interview: InterviewRecord) => {
    setInterviewEditingId(interview.id);
    setInterviewForm({
      round: interview.round,
      date: interview.date,
      interviewer: interview.interviewer,
      questions: interview.questions,
      score: interview.score,
      summary: interview.summary,
      nextAction: interview.nextAction,
    });
  };

  const saveInterviewRecord = () => {
    if (!selectedApplication || !interviewForm.round.trim()) return;
    const now = new Date().toISOString();
    setApplications((current) =>
      current.map((item) => {
        if (item.id !== selectedApplication.id) return item;
        const nextInterview: InterviewRecord = {
          id: interviewEditingId ?? createInterviewId(),
          round: interviewForm.round.trim(),
          date: interviewForm.date,
          interviewer: interviewForm.interviewer.trim(),
          questions: interviewForm.questions.trim(),
          score: interviewForm.score,
          summary: interviewForm.summary.trim(),
          nextAction: interviewForm.nextAction.trim(),
          updatedAt: now,
        };
        return {
          ...item,
          interviews: interviewEditingId
            ? item.interviews.map((interview) => (interview.id === interviewEditingId ? nextInterview : interview))
            : [nextInterview, ...item.interviews],
          updatedAt: now,
        };
      }),
    );
    resetInterviewForm();
  };

  const deleteInterviewRecord = (applicationId: string, interviewId: string) => {
    setApplications((current) =>
      current.map((item) =>
        item.id === applicationId
          ? {
              ...item,
              interviews: item.interviews.filter((interview) => interview.id !== interviewId),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    if (interviewEditingId === interviewId) resetInterviewForm();
  };

  const exportData = () => {
    const payload: JobPilotExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      applications,
      resumeVersions,
      emotionRecords,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobpilot-backup-${getLocalDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setDataNotice("已导出当前数据备份。");
  };

  const importData = () => {
    try {
      const payload = JSON.parse(importText) as Partial<JobPilotExport>;
      if (!Array.isArray(payload.applications) || !Array.isArray(payload.resumeVersions)) {
        setDataNotice("导入失败：请粘贴 JobPilot 导出的 JSON 数据。");
        return;
      }
      setApplications(normalizeApplications(payload.applications));
      setResumeVersions(payload.resumeVersions.length > 0 ? normalizeResumeVersions(payload.resumeVersions) : seedResumeVersions);
      setEmotionRecords(Array.isArray(payload.emotionRecords) ? payload.emotionRecords : []);
      setImportText("");
      setDataNotice("导入成功，数据已保存到当前浏览器。");
    } catch {
      setDataNotice("导入失败：JSON 格式不正确。");
    }
  };

  const clearAllData = () => {
    const confirmed = window.confirm("确认清空当前浏览器中的 JobPilot 数据吗？此操作不可恢复，建议先导出备份。");
    if (!confirmed) return;
    setApplications([]);
    setResumeVersions(seedResumeVersions);
    setEmotionRecords([]);
    setSelectedId(null);
    setDataNotice("已清空个人数据，并保留默认简历版本。");
  };

  const loadDemoData = () => {
    const confirmed = applications.length > 0
      ? window.confirm("加载示例数据会替换当前投递记录，确认继续吗？")
      : true;
    if (!confirmed) return;
    setApplications(seedApplications);
    setResumeVersions(seedResumeVersions);
    setEmotionRecords([]);
    setDataNotice("已加载示例数据，你可以在投递管理中体验完整流程。");
    setActiveView("dashboard");
  };

  const isSaveDisabled = !form.company.trim() || !form.role.trim() || !form.resumeVersionId;
  const isResumeSaveDisabled = !resumeForm.name.trim();
  const isInterviewSaveDisabled = !interviewForm.round.trim();

  return (
    <main className="flex h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">JobPilot</p>
          <h2 className="mt-2 text-lg font-semibold">今天也在找工作</h2>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                activeView === item.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="space-y-3 border-t border-slate-100 p-4">
          {bottomNavItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                activeView === item.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-10">
          <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
            {[...navItems, ...bottomNavItems].map((item) => (
              <Button
                key={item.key}
                size="sm"
                variant={activeView === item.key ? "default" : "secondary"}
                onClick={() => setActiveView(item.key)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                  今天也在找工作
                </h1>
                <p className="mt-2 text-sm text-slate-500 md:text-base">
                  {username.trim() ? `${username.trim()}，${encouragement}` : "今天也会有好消息"}
                </p>
              </div>
              <Input
                className="w-full lg:w-64"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="请输入你的名字（可选）"
              />
            </div>
          </div>

          {activeView === "dashboard" && (
            <>
              <PageHeader
                title="首页总览"
                subtitle="快速查看求职进度、待跟进机会和最近更新的投递记录。"
                action={
                  <Button
                    onClick={() => {
                      setActiveView("tracker");
                      openCreateForm();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    新增投递
                  </Button>
                }
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="总投递数" value={`${stats.total}`} hint="所有已记录岗位" />
                <MetricCard label="面试中" value={`${stats.interviewing}`} hint="需要重点准备" />
                <MetricCard label="Offer" value={`${stats.offers}`} hint="进入决策阶段" />
                <MetricCard label="待跟进" value={`${stats.followUp}`} hint="建议 48 小时内推进" />
                <MetricCard label="投递转化率" value={`${stats.conversionRate}%`} hint="面试中 + Offer / 总投递" />
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                数据保存在本地浏览器，清除缓存会丢失。
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
                <div className="space-y-6">
                  {!hasUserData && (
                    <Card className="border-slate-300 bg-white">
                      <CardContent className="p-6">
                        <p className="text-lg font-semibold text-slate-950">开始建立你的求职工作台</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          JobPilot 会把投递记录、简历版本、面试复盘、优先级和情绪节奏整理在一个地方。当前版本不需要账号，数据保存在当前浏览器。
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            onClick={() => {
                              setActiveView("tracker");
                              openCreateForm();
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            新增第一条投递
                          </Button>
                          <Button variant="secondary" onClick={loadDemoData}>加载示例数据</Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>建议优先准备评分最高的 3 个岗位</CardTitle>
                      <CardDescription>按薪资、成长、匹配度、地点、公司吸引力平均分排序。</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                      {topPriorityApplications.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 md:col-span-3">
                          新增投递并填写优先级评分后，这里会推荐最值得准备的岗位。
                        </div>
                      ) : topPriorityApplications.map((item) => {
                        const average = getPriorityAverage(item.priorityScores);
                        const level = getPriorityLevel(average);
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedId(item.id);
                              setActiveView("tracker");
                            }}
                            className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant={priorityBadge(level) as never}>{level}优先级</Badge>
                              <span className="text-xs font-medium text-slate-500">{average}/5</span>
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-950">{item.role}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.company}</p>
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>最近投递记录</CardTitle>
                      <CardDescription>按投递日期排序，点击可查看详情。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {recentApplications.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                          暂无投递记录
                        </div>
                      ) : recentApplications.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedId(item.id);
                            setActiveView("tracker");
                          }}
                        className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {(() => {
                          const average = getPriorityAverage(item.priorityScores);
                          const level = getPriorityLevel(average);
                          return (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-950">{item.role}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.company} · {item.location || "未填写 Base"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={priorityBadge(level) as never}>{level}优先级 · {average}</Badge>
                            <Badge variant="soft">{getResumeVersionName(item.resumeVersionId, item.resumeVersion)}</Badge>
                            <Badge variant={statusBadge(item.status) as never}>{item.status}</Badge>
                          </div>
                        </div>
                          );
                        })()}
                        <p className="mt-2 text-xs text-slate-500">{item.appliedDate} · {item.channel || "渠道未填写"}</p>
                      </button>
                      ))}
                    </CardContent>
                  </Card>

                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle>今日情绪状态</CardTitle>
                          <CardDescription>把状态转成今天可执行的一步。</CardDescription>
                        </div>
                        {dashboardEmotion && (
                          <Badge variant={emotionBadge(dashboardEmotion.emotion) as never}>
                            {todayEmotion ? dashboardEmotion.emotion : `最近：${dashboardEmotion.emotion}`}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {dashboardEmotion ? (
                        <>
                          <p className="text-sm text-slate-600">
                            {todayEmotion ? "今日已记录。" : `今日尚未记录，最近一次是 ${dashboardEmotion.date}。`}
                          </p>
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">行动建议</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">{emotionActions[dashboardEmotion.emotion]}</p>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                          今日未记录情绪。记录后这里会显示对应行动建议。
                        </div>
                      )}
                      <Button className="mt-4" size="sm" variant="secondary" onClick={() => setActiveView("emotion")}>
                        进入情绪管理
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle>面试记录提醒</CardTitle>
                          <CardDescription>根据面试时间动态提示需要准备或补充复盘的面试。</CardDescription>
                        </div>
                        <Badge variant={interviewReminders.length > 0 ? "warning" : "soft"}>{interviewReminders.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {interviewReminders.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                          {hasInterviewSchedule
                            ? "当前没有需要提醒的面试。"
                            : "还没有面试安排。你可以在投递记录中手动添加面试时间。"}
                        </div>
                      ) : (
                        interviewReminders.map((reminder) => (
                          <div key={reminder.key} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-950">{reminder.company}</p>
                                <p className="mt-1 text-sm text-slate-500">{reminder.role}</p>
                                <p className="mt-1 text-xs text-slate-500">面试时间：{reminder.whenLabel}</p>
                                <p className="mt-1 text-xs font-medium text-slate-700">{reminder.message}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedId(reminder.applicationId);
                                  setActiveView("tracker");
                                }}
                              >
                                去记录复盘
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardDescription>
                        {bestResumeVersion ? `当前面试产出最多：${bestResumeVersion.name}` : "记录投递后会自动统计版本效果。"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      {resumeUsageStats.map((version) => (
                        <div key={version.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-950">{version.name}</p>
                              <p className="mt-1 text-xs text-slate-500">{version.note || "暂无备注"}</p>
                            </div>
                            <Badge variant="soft">{version.usageCount} 次</Badge>
                          </div>
                          <p className="mt-3 text-xs text-slate-500">带来面试 / Offer：{version.interviewCount} 次</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}

          {activeView === "tracker" && (
            <>
              <PageHeader
                title="投递管理"
                subtitle="集中管理所有岗位记录、沟通进展、面试安排和后续行动。"
                action={
                  <Button onClick={openCreateForm}>
                    <Plus className="h-4 w-4" />
                    新增投递
                  </Button>
                }
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="总投递数" value={`${stats.total}`} hint="当前记录总数" />
                <MetricCard label="面试中" value={`${stats.interviewing}`} hint="需要安排准备" />
                <MetricCard label="Offer" value={`${stats.offers}`} hint="等待最终决策" />
                <MetricCard label="待跟进" value={`${stats.followUp}`} hint="建议主动推进" />
                <MetricCard label="投递转化率" value={`${stats.conversionRate}%`} hint="面试中 + Offer / 总投递" />
              </div>

              <Card className="mt-6">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="relative min-w-0 flex-1 md:max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="搜索公司、岗位、地点、渠道、联系人..."
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex rounded-xl bg-slate-100 p-1">
                      {applicationTypeFilters.map((type) => (
                        <button
                          key={type}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                            applicationTypeFilter === type ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                          )}
                          onClick={() => setApplicationTypeFilter(type)}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="flex rounded-xl bg-slate-100 p-1">
                      <button
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                          trackerView === "table" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                        )}
                        onClick={() => setTrackerView("table")}
                      >
                        表格视图
                      </button>
                      <button
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                          trackerView === "kanban" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                        )}
                        onClick={() => setTrackerView("kanban")}
                      >
                        数据看板
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {trackerView === "table" ? (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>投递记录表</CardTitle>
                    <CardDescription>可以查看详情、编辑、删除，也可以直接修改状态。</CardDescription>
                  </CardHeader>
                  <CardContent className="w-full overflow-x-auto pb-4 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
                    <table className="w-full min-w-[2040px] border-separate border-spacing-0 text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          {applicationTableColumns.map((column) => (
                            <th key={column.label} className={cn("whitespace-nowrap border-b border-slate-200 px-4 py-3 font-medium", column.className)}>
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedApplications.map((item) => {
                          const average = getPriorityAverage(item.priorityScores);
                          const level = getPriorityLevel(average);
                          return (
                          <tr key={item.id} className="group align-top hover:bg-slate-50">
                            <td className="sticky left-0 z-10 min-w-[180px] whitespace-nowrap border-b border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-950 group-hover:bg-slate-50">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditForm(item);
                                }}
                                className="cursor-pointer text-left text-slate-950 transition hover:text-slate-900 hover:underline"
                              >
                                {item.company}
                              </button>
                            </td>
                            <td className="sticky left-[180px] z-10 min-w-[160px] whitespace-nowrap border-b border-slate-100 bg-white px-4 py-3 text-sm shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)] group-hover:bg-slate-50">{item.role}</td>
                            <td className="min-w-[120px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{item.industry || "-"}</td>
                            <td className="min-w-[120px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm">
                              <Badge variant={item.applicationType === "暑期实习" ? "warning" : "soft"}>{item.applicationType}</Badge>
                            </td>
                            <td className="min-w-[120px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm">
                              <Badge variant={priorityBadge(level) as never}>{level} · {average}</Badge>
                            </td>
                            <td className="min-w-[140px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{item.location || "-"}</td>
                            <td className="min-w-[140px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{item.appliedDate}</td>
                            <td className="min-w-[140px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm">
                              <select
                                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                                value={item.status}
                                onChange={(event) => updateStatus(item.id, event.target.value as ApplicationStatus)}
                              >
                                {statuses.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </td>
                            <td className="min-w-[140px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm">
                              <Badge variant="soft">{getResumeVersionName(item.resumeVersionId, item.resumeVersion)}</Badge>
                            </td>
                            <td className="min-w-[180px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-xs text-slate-600">
                              {item.applicationType === "暑期实习" ? (
                                <div className="space-y-1">
                                  <p>转正：{item.internship.hasConversionChance}</p>
                                  <p>{item.internship.infoSource} · 可信度{item.internship.infoConfidence}</p>
                                </div>
                              ) : "-"}
                            </td>
                            <td className="min-w-[160px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{item.interviewTime || "-"}</td>
                            <td className="min-w-[140px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{item.contact || "-"}</td>
                            <td className="min-w-[140px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{item.channel || "-"}</td>
                            <td className="min-w-[140px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm">
                              <div className="flex gap-1.5">
                                <Button size="sm" variant="secondary" onClick={() => setSelectedId(item.id)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => openEditForm(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => deleteApplication(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {sortedApplications.length === 0 && (
                      <div className="py-10 text-center text-sm text-slate-500">
                        {query ? "没有找到匹配的投递记录。" : "还没有投递记录，点击右上角新增第一条。"}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>投递进度分布</CardTitle>
                        <CardDescription>按投递状态统计当前记录数量。</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {applications.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                            还没有投递记录，新增第一条后这里会显示分布。
                          </div>
                        ) : (
                          <>
                            <div className="h-64 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2}>
                                    {statusChartData.map((entry, index) => (
                                      <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {statusChartData.map((entry) => (
                                <div key={entry.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                  <span className="truncate">{entry.name}</span>
                                  <span className="font-medium text-slate-900">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>行业分布</CardTitle>
                        <CardDescription>统计投递记录中的行业字段。</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {industryChartData.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                            暂无行业数据，可在投递记录中补充行业信息。
                          </div>
                        ) : (
                          <>
                            <div className="h-72 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={industryChartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis type="number" tickLine={false} axisLine={false} />
                                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={88} />
                                  <Tooltip />
                                  <Bar dataKey="value" radius={[8, 8, 8, 8]} fill="#0ea5e9" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {industryChartData.map((entry) => (
                                <div key={entry.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                  <span className="truncate">{entry.name}</span>
                                  <span className="font-medium text-slate-900">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>城市 / Base 分布</CardTitle>
                        <CardDescription>统计投递记录中的 Base 字段。</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {locationChartData.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                            暂无 Base 数据，可在投递记录中补充 Base 信息。
                          </div>
                        ) : (
                          <>
                            <div className="h-72 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={locationChartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis type="number" tickLine={false} axisLine={false} />
                                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={88} />
                                  <Tooltip />
                                  <Bar dataKey="value" radius={[8, 8, 8, 8]} fill="#10b981" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {locationChartData.map((entry) => (
                                <div key={entry.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                  <span className="truncate">{entry.name}</span>
                                  <span className="font-medium text-slate-900">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>简历版本使用情况</CardTitle>
                        <CardDescription>统计每个简历版本被绑定的次数。</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {resumeVersionChartData.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                            暂无简历版本使用数据。
                          </div>
                        ) : (
                          <>
                            <div className="h-72 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={resumeVersionChartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis type="number" tickLine={false} axisLine={false} />
                                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={88} />
                                  <Tooltip />
                                  <Bar dataKey="value" radius={[8, 8, 8, 8]} fill="#6366f1" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {resumeVersionChartData.map((entry) => (
                                <div key={entry.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                  <span className="truncate">{entry.name}</span>
                                  <span className="font-medium text-slate-900">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}

          {activeView === "resumes" && (
            <>
              <PageHeader
                title="简历版本"
                subtitle="管理不同岗位方向的简历版本，并追踪它们在投递中的使用效果。"
                action={
                  <Button onClick={saveResumeVersion} disabled={isResumeSaveDisabled}>
                    <Plus className="h-4 w-4" />
                    {resumeEditingId ? "保存版本" : "新增版本"}
                  </Button>
                }
              />

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
	                  <Card>
	                  <CardHeader>
	                    <CardTitle>{resumeEditingId ? "编辑简历版本" : "新增简历版本"}</CardTitle>
	                    <CardDescription>名称必填，可上传 PDF / DOC / DOCX 并记录对应版本。</CardDescription>
	                  </CardHeader>
	                  <CardContent className="space-y-4">
                    <Field label="版本名称 *">
                      <Input
                        value={resumeForm.name}
                        onChange={(event) => setResumeForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="例如：产品岗版"
                      />
                    </Field>
                    <Field label="备注">
                      <Textarea
                        value={resumeForm.note}
                        onChange={(event) => setResumeForm((current) => ({ ...current, note: event.target.value }))}
	                        placeholder="例如：偏数据分析，突出 SQL 和指标项目。"
	                      />
	                    </Field>
	                    <Field label="上传简历文件">
	                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
	                        <input
	                          type="file"
	                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	                          onChange={(event) => handleResumeFileChange(event.target.files?.[0])}
	                          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
	                        />
	                        <p className="mt-2 text-xs leading-5 text-slate-500">
	                          当前版本不上传服务器，文件会保存在本地浏览器，之后可以从这里打开。
	                        </p>
	                        {resumeForm.fileName && (
	                          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
	                            <div className="flex flex-wrap items-center justify-between gap-2">
	                              <div>
	                                <p className="text-sm font-medium text-slate-950">{resumeForm.fileName}</p>
	                                <p className="mt-1 text-xs text-slate-500">
	                                  {resumeForm.fileType || "文件"} {formatFileSize(resumeForm.fileSize) && `· ${formatFileSize(resumeForm.fileSize)}`}
	                                </p>
	                              </div>
	                              {resumeForm.fileDataUrl && (
	                                <a
	                                  href={resumeForm.fileDataUrl}
	                                  target="_blank"
	                                  rel="noopener noreferrer"
	                                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
	                                >
	                                  打开文件
	                                </a>
	                              )}
	                            </div>
	                          </div>
	                        )}
	                      </div>
	                    </Field>
	                    <div className="flex flex-wrap gap-2">
                      <Button onClick={saveResumeVersion} disabled={isResumeSaveDisabled}>
                        <CheckCircle2 className="h-4 w-4" />
                        {resumeEditingId ? "保存修改" : "创建版本"}
                      </Button>
                      {resumeEditingId && (
                        <Button variant="secondary" onClick={openResumeCreateForm}>取消编辑</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>版本列表与使用统计</CardTitle>
                    <CardDescription>每条投递会绑定一个简历版本，方便后续复盘转化效果。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resumeUsageStats.map((version) => (
                      <div key={version.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="soft">{version.name}</Badge>
                              {bestResumeVersion?.id === version.id && version.interviewCount > 0 && (
                                <Badge variant="success">当前效果最好</Badge>
                              )}
                            </div>
	                            <p className="mt-2 text-sm text-slate-600">{version.note || "暂无备注"}</p>
	                            {version.fileName ? (
	                              <div className="mt-2 flex max-w-full flex-wrap items-center gap-2">
	                                <div className="inline-flex min-w-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
	                                  <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" />
	                                  <span className="truncate">{version.fileName}</span>
	                                  {formatFileSize(version.fileSize) && <span className="ml-1 shrink-0">· {formatFileSize(version.fileSize)}</span>}
	                                </div>
	                                {version.fileDataUrl && (
	                                  <a
	                                    href={version.fileDataUrl}
	                                    target="_blank"
	                                    rel="noopener noreferrer"
	                                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
	                                  >
	                                    打开文件
	                                  </a>
	                                )}
	                              </div>
	                            ) : (
	                              <p className="mt-2 text-xs text-slate-400">未上传简历文件</p>
	                            )}
	                            <p className="mt-2 text-xs text-slate-500">
	                              使用 {version.usageCount} 次 · 带来面试 / Offer {version.interviewCount} 次
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="secondary" onClick={() => openResumeEditForm(version)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => deleteResumeVersion(version.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {resumeUsageStats.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                        暂无简历版本，请先创建一个版本。
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeView === "emotion" && (
            <>
              <PageHeader
                title="情绪管理"
                subtitle="记录求职过程中的状态，并把情绪转化为下一步行动。"
                action={
                  <Button onClick={saveEmotionRecord} disabled={Boolean(todayEmotion)}>
                    <Plus className="h-4 w-4" />
                    {todayEmotion ? "今日已记录" : "记录今日情绪"}
                  </Button>
                }
              />

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>心情打卡</CardTitle>
                      <CardDescription>今天对于求职的感觉如何？</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {todayEmotion ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-950">{todayEmotion.date}</p>
                              <p className="mt-1 text-sm text-slate-500">{todayEmotion.note || "暂无备注"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl">{emotionCheckins.find((item) => item.emotion === todayEmotion.emotion)?.emoji ?? "🙂"}</p>
                              <Badge className="mt-2" variant={emotionBadge(todayEmotion.emotion) as never}>{todayEmotion.emotion}</Badge>
                            </div>
                          </div>
                          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium text-slate-500">行动建议</p>
                            <p className="mt-1 text-sm text-slate-900">{emotionActions[todayEmotion.emotion]}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                              {emotionCheckins.map((item) => (
                                <button
                                  key={`${item.emotion}-${item.label}`}
                                  onClick={() => setEmotionForm((current) => ({ ...current, emotion: item.emotion }))}
                                  className={cn(
                                    "flex min-h-[96px] flex-col items-center justify-center rounded-xl border px-3 py-4 text-center transition",
                                    emotionForm.emotion === item.emotion
                                      ? "border-slate-300 bg-slate-50 shadow-sm"
                                      : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50",
                                  )}
                                >
                                  <span className="text-4xl leading-none">{item.emoji}</span>
                                  <span className="mt-3 text-sm font-semibold text-slate-600">{item.label}</span>
                                </button>
                              ))}
                            </div>
                            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm font-medium text-slate-400">
                              选择一个心情来完成打卡
                            </div>
                          </div>
                          <Field label="当天备注">
                            <Textarea
                              value={emotionForm.note}
                              onChange={(event) => setEmotionForm((current) => ({ ...current, note: event.target.value }))}
                              placeholder="例如：今天投递效率还可以，但等待反馈有点紧张。"
                            />
                          </Field>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">行动建议</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">{emotionActions[emotionForm.emotion]}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {hasHighStressStreak && (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardContent className="p-5">
                        <p className="text-sm font-medium text-amber-900">最近压力偏高，建议降低投递强度，优先复盘和休息。</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>最近 7 天情绪记录</CardTitle>
                    <CardDescription>用于观察求职节奏，不做评价，只辅助行动安排。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentEmotionRecords.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                        暂无情绪记录。记录一次后，这里会显示最近 7 天状态。
                      </div>
                    ) : (
                      recentEmotionRecords.map((record) => (
                        <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-slate-950">{record.date}</p>
                                <Badge variant={emotionBadge(record.emotion) as never}>{record.emotion}</Badge>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">{record.note || "暂无备注"}</p>
                              <p className="mt-2 text-xs text-slate-500">建议：{emotionActions[record.emotion]}</p>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => deleteEmotionRecord(record.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeView === "settings" && (
            <>
              <PageHeader
                title="数据设置"
                action={<Button onClick={exportData}><Download className="h-4 w-4" /> 导出备份</Button>}
              />

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>数据说明</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 text-sm leading-7 text-slate-600">
                    <p>当前数据保存在你的浏览器本地（localStorage），不会上传服务器，也不需要账号。</p>
                    <div className="space-y-3">
                      <p>这意味着：</p>
                      <ul className="list-disc space-y-2 pl-5">
                        <li>关闭网页后再次打开，同一浏览器中数据仍然存在</li>
                        <li>如果更换设备 / 更换浏览器 / 清除缓存，数据将无法恢复</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <p>为了避免数据丢失，建议你定期进行备份：</p>
                      <div className="space-y-1.5">
                        <p>👉 使用右侧「导出 JSON」功能保存数据</p>
                        <p>👉 在需要时可通过「导入数据」恢复</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>数据操作</CardTitle>
                    <CardDescription>支持用户自助备份、迁移和体验示例数据。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dataNotice && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{dataNotice}</div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={exportData}>
                        <Download className="h-4 w-4" />
                        导出 JSON
                      </Button>
                      <Button variant="secondary" onClick={loadDemoData}>加载示例数据</Button>
                      <Button variant="secondary" onClick={clearAllData}>清空个人数据</Button>
                    </div>
                    <Field label="导入备份 JSON">
                      <Textarea
                        value={importText}
                        onChange={(event) => setImportText(event.target.value)}
                        placeholder="粘贴从 JobPilot 导出的 JSON 内容..."
                      />
                    </Field>
                    <Button variant="secondary" onClick={importData} disabled={!importText.trim()}>
                      <Upload className="h-4 w-4" />
                      导入数据
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeView === "about" && <AboutAuthor />}
        </div>
      </section>

      {selectedApplication && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 p-5">
            <div>
              <p className="text-sm text-slate-500">投递详情</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedApplication.company}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedApplication.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-[calc(100vh-89px)] space-y-5 overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">状态</p>
                <select
                  className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  value={selectedApplication.status}
                  onChange={(event) => updateStatus(selectedApplication.id, event.target.value as ApplicationStatus)}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">投递日期</p>
                <p className="mt-2 text-sm font-medium">{selectedApplication.appliedDate}</p>
              </div>
	              <div className="rounded-xl border border-slate-200 p-3">
	                <p className="text-xs text-slate-500">Base 地</p>
	                <p className="mt-2 text-sm font-medium">{selectedApplication.location || "-"}</p>
	              </div>
	              <div className="rounded-xl border border-slate-200 p-3">
	                <p className="text-xs text-slate-500">行业类型</p>
	                <p className="mt-2 text-sm font-medium">{selectedApplication.industry || "-"}</p>
	              </div>
	              <div className="rounded-xl border border-slate-200 p-3">
	                <p className="text-xs text-slate-500">投递渠道</p>
                <p className="mt-2 text-sm font-medium">{selectedApplication.channel || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">投递类型</p>
                <Badge className="mt-2" variant={selectedApplication.applicationType === "暑期实习" ? "warning" : "soft"}>
                  {selectedApplication.applicationType}
                </Badge>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">使用简历版本</p>
                <Badge className="mt-2" variant="soft">
                  {getResumeVersionName(selectedApplication.resumeVersionId, selectedApplication.resumeVersion)}
                </Badge>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">面试时间</p>
                <p className="mt-2 text-sm font-medium">{selectedApplication.interviewTime || "-"}</p>
              </div>
            </div>

            {selectedApplication.applicationType === "暑期实习" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-950">暑期实习信息</p>
                  <Badge variant="warning">转正机会：{selectedApplication.internship.hasConversionChance}</Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-amber-100 bg-white/70 p-3">
                    <p className="text-xs text-slate-500">信息来源</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {selectedApplication.internship.infoSource} · 可信度{selectedApplication.internship.infoConfidence}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-white/70 p-3">
                    <p className="text-xs text-slate-500">实习周期</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {selectedApplication.internship.startDate || "未填写"} - {selectedApplication.internship.endDate || "未填写"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-white/70 p-3">
                    <p className="text-xs text-slate-500">投入程度</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{selectedApplication.internship.intensity}</p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-white/70 p-3">
                    <p className="text-xs text-slate-500">是否影响秋招</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{selectedApplication.internship.affectsAutumnRecruitment}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-amber-100 bg-white/70 p-3">
                  <p className="text-xs text-slate-500">转正情况</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {selectedApplication.internship.conversionDetails || "未填写"}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4">
              {(() => {
                const average = getPriorityAverage(selectedApplication.priorityScores);
                const level = getPriorityLevel(average);
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-950">岗位优先级评分</p>
                      <Badge variant={priorityBadge(level) as never}>{level}优先级 · {average}/5</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-5">
                      {[
                        ["薪资", selectedApplication.priorityScores.salary],
                        ["成长", selectedApplication.priorityScores.growth],
                        ["匹配度", selectedApplication.priorityScores.match],
                        ["地点", selectedApplication.priorityScores.location],
                        ["公司吸引力", selectedApplication.priorityScores.company],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-950">联系人</p>
              <p className="mt-2 text-sm text-slate-600">{selectedApplication.contact || "未填写"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-950">岗位 JD</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedApplication.jd || "未填写"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-950">备注</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedApplication.notes || "未填写"}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-950">面试记录</p>
                  <p className="mt-1 text-xs text-slate-500">记录每一轮面试问题、评分、复盘和下一步行动。</p>
                </div>
                {interviewEditingId && (
                  <Button size="sm" variant="secondary" onClick={resetInterviewForm}>取消编辑</Button>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="轮次 *">
                  <Input
                    value={interviewForm.round}
                    onChange={(event) => setInterviewForm((current) => ({ ...current, round: event.target.value }))}
                    placeholder="例如：一面 / HR 面 / 终面"
                  />
                </Field>
                <Field label="时间">
                  <Input
                    type="date"
                    value={interviewForm.date}
                    onChange={(event) => setInterviewForm((current) => ({ ...current, date: event.target.value }))}
                  />
                </Field>
                <Field label="面试官">
                  <Input
                    value={interviewForm.interviewer}
                    onChange={(event) => setInterviewForm((current) => ({ ...current, interviewer: event.target.value }))}
                    placeholder="面试官姓名或角色"
                  />
                </Field>
                <Field label="表现评分">
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                    value={interviewForm.score}
                    onChange={(event) => setInterviewForm((current) => ({ ...current, score: Number(event.target.value) }))}
                  >
                    {[1, 2, 3, 4, 5].map((score) => (
                      <option key={score} value={score}>{score} 分</option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="面试问题">
                    <Textarea
                      value={interviewForm.questions}
                      onChange={(event) => setInterviewForm((current) => ({ ...current, questions: event.target.value }))}
                      placeholder="记录被问到的问题、追问点或案例题..."
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="复盘总结">
                    <Textarea
                      value={interviewForm.summary}
                      onChange={(event) => setInterviewForm((current) => ({ ...current, summary: event.target.value }))}
                      placeholder="哪些地方表现好，哪些地方需要补强..."
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="下一步行动">
                    <Textarea
                      value={interviewForm.nextAction}
                      onChange={(event) => setInterviewForm((current) => ({ ...current, nextAction: event.target.value }))}
                      placeholder="例如：补一个项目案例、复习 SQL、发送感谢邮件..."
                    />
                  </Field>
                </div>
              </div>
              <Button className="mt-4" onClick={saveInterviewRecord} disabled={isInterviewSaveDisabled}>
                <CheckCircle2 className="h-4 w-4" />
                {interviewEditingId ? "保存面试记录" : "新增面试记录"}
              </Button>

              <div className="mt-5 space-y-3">
                {selectedApplication.interviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                    暂无面试记录
                  </div>
                ) : (
                  selectedApplication.interviews.map((interview) => (
                    <div key={interview.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-slate-950">{interview.round}</p>
                            <Badge variant={interview.score <= 2 ? "warning" : "soft"}>{interview.score}/5</Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {interview.date || "未填写时间"} · {interview.interviewer || "面试官未填写"}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => openInterviewEditForm(interview)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => deleteInterviewRecord(selectedApplication.id, interview.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {interview.score <= 2 && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-800">
                          建议重点复盘该轮面试
                        </div>
                      )}
                      {interview.questions && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">问题：{interview.questions}</p>}
                      {interview.summary && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">复盘：{interview.summary}</p>}
                      {interview.nextAction && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">下一步：{interview.nextAction}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => openEditForm(selectedApplication)}>
                <Pencil className="h-4 w-4" />
                编辑记录
              </Button>
              <Button variant="secondary" onClick={() => deleteApplication(selectedApplication.id)}>
                <Trash2 className="h-4 w-4" />
                删除记录
              </Button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {editingApplication ? "编辑投递记录" : "新增投递记录"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">公司、岗位和简历版本为必填项，其余字段可后续补充。</p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="公司名称 *">
                <Input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="例如：AstraFin" />
              </Field>
	              <Field label="岗位名称 *">
	                <Input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="例如：Product Manager Intern" />
	              </Field>
	              <Field label="行业类型">
	                <select
	                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
	                  value={form.industry}
	                  onChange={(event) => setForm({ ...form, industry: event.target.value })}
	                >
	                  <option value="">请选择行业</option>
	                  {industries.map((industry) => (
	                    <option key={industry} value={industry}>{industry}</option>
	                  ))}
	                </select>
	              </Field>
	              <Field label="Base 地">
	                <Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="例如：上海 / Remote" />
	              </Field>
              <Field label="投递日期">
                <Input type="date" value={form.appliedDate} onChange={(event) => setForm({ ...form, appliedDate: event.target.value })} />
              </Field>
              <Field label="投递类型">
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                  value={form.applicationType}
                  onChange={(event) => setForm({ ...form, applicationType: event.target.value as ApplicationType })}
                >
                  {applicationTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </Field>
              <Field label="状态">
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as ApplicationStatus })}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </Field>
              <Field label="使用简历版本 *">
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                  value={form.resumeVersionId}
                  onChange={(event) => setForm({ ...form, resumeVersionId: event.target.value })}
                >
                  <option value="">请选择简历版本</option>
                  {resumeVersions.map((version) => (
                    <option key={version.id} value={version.id}>{version.name}</option>
                  ))}
                </select>
              </Field>
              {form.applicationType === "暑期实习" && (
                <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-950">暑期实习信息</p>
                      <p className="mt-1 text-xs text-slate-500">记录转正、信息来源和实习安排，方便和校招投递分开判断。</p>
                    </div>
                    <Badge variant="warning">暑期实习</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Field label="是否有转正机会">
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                        value={form.internship.hasConversionChance}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            internship: {
                              ...form.internship,
                              hasConversionChance: event.target.value as InternshipConversion,
                            },
                          })
                        }
                      >
                        {(["是", "否", "不确定"] as InternshipConversion[]).map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="信息来源">
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                        value={form.internship.infoSource}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            internship: {
                              ...form.internship,
                              infoSource: event.target.value as InternshipInfoSource,
                            },
                          })
                        }
                      >
                        {(["学长学姐", "小红书", "内推人", "其他"] as InternshipInfoSource[]).map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="信息可信度">
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                        value={form.internship.infoConfidence}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            internship: {
                              ...form.internship,
                              infoConfidence: event.target.value as InfoConfidence,
                            },
                          })
                        }
                      >
                        {(["高", "中", "低"] as InfoConfidence[]).map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="投入程度">
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                        value={form.internship.intensity}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            internship: {
                              ...form.internship,
                              intensity: event.target.value as InternshipIntensity,
                            },
                          })
                        }
                      >
                        {(["轻度", "中等", "重度"] as InternshipIntensity[]).map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="实习开始时间">
                      <Input
                        type="date"
                        value={form.internship.startDate}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            internship: {
                              ...form.internship,
                              startDate: event.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field label="实习结束时间">
                      <Input
                        type="date"
                        value={form.internship.endDate}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            internship: {
                              ...form.internship,
                              endDate: event.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field label="是否影响秋招">
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                        value={form.internship.affectsAutumnRecruitment}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            internship: {
                              ...form.internship,
                              affectsAutumnRecruitment: event.target.value as YesNo,
                            },
                          })
                        }
                      >
                        {(["否", "是"] as YesNo[]).map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="转正情况">
                        <Textarea
                          value={form.internship.conversionDetails}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              internship: {
                                ...form.internship,
                                conversionDetails: event.target.value,
                              },
                            })
                          }
                          placeholder="例如：往届约 20% 转正，主要看业务线名额和实习评价。"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-950">岗位优先级评分</p>
                    <p className="mt-1 text-xs text-slate-500">用于排序和 Dashboard 推荐，1 分最低，5 分最高。</p>
                  </div>
                  {(() => {
                    const average = getPriorityAverage(form.priorityScores);
                    const level = getPriorityLevel(average);
                    return <Badge variant={priorityBadge(level) as never}>{level}优先级 · {average}/5</Badge>;
                  })()}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-5">
                  {[
                    ["薪资", "salary"],
                    ["成长", "growth"],
                    ["匹配度", "match"],
                    ["地点", "location"],
                    ["公司吸引力", "company"],
                  ].map(([label, key]) => (
                    <Field key={key} label={label}>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                        value={form.priorityScores[key as keyof PriorityScores]}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            priorityScores: {
                              ...form.priorityScores,
                              [key]: Number(event.target.value),
                            },
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((score) => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              </div>
	              <Field label="面试时间">
	                <Input type="date" value={form.interviewTime} onChange={(event) => setForm({ ...form, interviewTime: event.target.value })} />
	              </Field>
              <Field label="联系人">
                <Input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="招聘负责人 / 内推人" />
              </Field>
              <Field label="投递渠道">
                <Input value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} placeholder="LinkedIn / 官网 / 内推 / Boss" />
              </Field>
              <div className="md:col-span-2">
                <Field label="岗位 JD">
                  <Textarea value={form.jd} onChange={(event) => setForm({ ...form, jd: event.target.value })} placeholder="粘贴岗位描述、要求、薪资范围等信息..." />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="备注">
                  <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="记录跟进事项、面试重点、复盘结论..." />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-5">
              <Button variant="secondary" onClick={closeForm}>取消</Button>
              <Button onClick={saveApplication} disabled={isSaveDisabled}>
                <CheckCircle2 className="h-4 w-4" />
                保存记录
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
