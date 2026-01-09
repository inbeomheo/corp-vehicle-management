  "use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Car,
  MapPin,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Key,
  ArrowRight,
  Settings,
  Plus,
  Trash2,
  X,
  Home,
  Download,
  Search,
  BarChart3,
  TrendingUp,
  Filter,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";

const PROJECTS = [
  { id: "green", name: "그린동" },
  { id: "pure", name: "초순수" },
];

const DEFAULT_LOCATION = "평택 사무실 앞";
const HISTORY_STORAGE_KEY = "vehicle-app-history-v1";
const STATE_STORAGE_KEY = "vehicle-app-state-v1";

const INITIAL_VEHICLES = [
  {
    id: 1,
    plate: "170허8468",
    model: "K5",
    status: "available",
    lastDriver: "",
    location: DEFAULT_LOCATION,
    projectId: "pure",
  },
  {
    id: 2,
    plate: "721하5723",
    model: "스타리아",
    status: "available",
    lastDriver: "",
    location: DEFAULT_LOCATION,
    projectId: "pure",
  },
  {
    id: 3,
    plate: "222호1406",
    model: "스타리아",
    status: "available",
    lastDriver: "",
    location: DEFAULT_LOCATION,
    projectId: "pure",
  },
  {
    id: 4,
    plate: "721하5724",
    model: "스타리아",
    status: "available",
    lastDriver: "",
    location: DEFAULT_LOCATION,
    projectId: "pure",
  },
  {
    id: 5,
    plate: "170허8466",
    model: "K5",
    status: "available",
    lastDriver: "",
    location: DEFAULT_LOCATION,
    projectId: "green",
  },
  {
    id: 6,
    plate: "222호1047",
    model: "스타리아",
    status: "available",
    lastDriver: "",
    location: DEFAULT_LOCATION,
    projectId: "green",
  },
  {
    id: 7,
    plate: "176허3747",
    model: "K3",
    status: "available",
    lastDriver: "",
    location: DEFAULT_LOCATION,
    projectId: "green",
  },
];

const INITIAL_LOGS = [];

const mapVehicleRow = (row) => ({
  id: row.id,
  plate: row.plate,
  model: row.model,
  status: row.status,
  lastDriver: row.last_driver || "",
  location: row.location,
  projectId: row.project_id,
  memo: row.memo || "",
});

const mapLogRow = (row) => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  plate: row.plate,
  model: row.model,
  driver: row.driver,
  purpose: row.purpose,
  outTime: row.out_time,
  inTime: row.in_time,
  status: row.status,
  projectId: row.project_id,
});

const cardStyle =
  "modern-card overflow-hidden p-0";
const inputStyle =
  "w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium placeholder:text-slate-400";
const labelStyle =
  "block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider ml-1";

const StatusCard = ({ title, count, icon: Icon, color, bgClass }) => (
  <div
    className={`modern-card p-6 flex items-center justify-between group hover:-translate-y-1 transition-transform duration-300`}
  >
    <div>
      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</span>
      <span className={`text-4xl font-black ${color} tracking-tighter`}>{count}</span>
    </div>
    <div className={`w-14 h-14 rounded-2xl ${bgClass} bg-opacity-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
      <Icon size={28} className={color} />
    </div>
  </div>
);

const Dashboard = ({ vehicles, logs, onSelectVehicle, onSelectReturn, onUpdateMemo }) => {
  const availableList = vehicles.filter((v) => v.status === "available");
  const inUseList = vehicles.filter((v) => v.status === "in-use");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [editingMemoId, setEditingMemoId] = useState(null);
  const [memoInput, setMemoInput] = useState("");

  // 고유 운전자 목록
  const uniqueDrivers = [...new Set(logs.map((l) => l.driver))].sort();

  // 통계 데이터 계산
  const vehicleStats = vehicles.map(v => {
    const count = logs.filter(l => l.vehicleId === v.id).length;
    return { ...v, count };
  }).sort((a, b) => b.count - a.count);

  const driverStats = Object.entries(
    logs.reduce((acc, log) => {
      acc[log.driver] = (acc[log.driver] || 0) + 1;
      return acc;
    }, {})
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const filteredLogs = logs.filter((log) => {
    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        log.plate.toLowerCase().includes(term) ||
        log.driver.toLowerCase().includes(term) ||
        log.purpose.toLowerCase().includes(term) ||
        log.model.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }

    // 날짜 필터
    if (dateFrom || dateTo) {
      const logDate = log.outTime.split(" ")[0];
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > dateTo) return false;
    }

    // 차량 필터
    if (filterVehicle && log.vehicleId !== parseInt(filterVehicle, 10)) {
      return false;
    }

    // 운전자 필터
    if (filterDriver && log.driver !== filterDriver) {
      return false;
    }

    return true;
  });

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setFilterVehicle("");
    setFilterDriver("");
    setSearchTerm("");
  };

  const hasActiveFilters = dateFrom || dateTo || filterVehicle || filterDriver;

  const displayedLogs = showAllLogs ? filteredLogs : filteredLogs.slice(0, 10);

  const handleDownloadExcel = () => {
    const data = filteredLogs.map((log) => ({
      "날짜": log.outTime.split(" ")[0],
      "차량번호": log.plate,
      "차종": log.model,
      "운전자": log.driver,
      "용무/목적지": log.purpose,
      "출차시간": log.outTime,
      "반납시간": log.inTime || "미반납",
      "상태": log.status === "completed" ? "반납완료" : "운행중",
      "현장": log.projectId === "green" ? "그린동" : "초순수",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "운행기록");
    
    // 컬럼 너비 자동 조절 (대략적인 값)
    const wscols = [
      { wch: 12 }, // 날짜
      { wch: 12 }, // 차량번호
      { wch: 10 }, // 차종
      { wch: 10 }, // 운전자
      { wch: 25 }, // 용무
      { wch: 20 }, // 출차
      { wch: 20 }, // 반납
      { wch: 10 }, // 상태
      { wch: 10 }, // 현장
    ];
    worksheet["!cols"] = wscols;

    XLSX.writeFile(workbook, `운행기록_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-32">
      <div className="grid grid-cols-2 gap-4">
        <StatusCard
          title="운행 가능"
          count={availableList.length}
          icon={Key}
          color="text-emerald-600"
          bgClass="bg-emerald-500"
        />
        <StatusCard
          title="운행 중"
          count={inUseList.length}
          icon={Car}
          color="text-blue-600"
          bgClass="bg-blue-500"
        />
      </div>

      {/* 차량 리스트 섹션 (예약 편의를 위해 상단 배치) */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={cardStyle}>
          <div className="bg-white px-6 py-5 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
              대기 차량
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold border border-emerald-100">
              {availableList.length}대 가능
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {availableList.length === 0 ? (
              <div className="p-10 text-center text-slate-400 bg-slate-50/50">
                <Car className="w-12 h-12 mx-auto mb-3 opacity-10" />
                <p className="text-sm font-medium">모든 차량이 운행 중입니다</p>
              </div>
            ) : (
              availableList.map((v) => (
                <div
                  key={v.id}
                  className="p-5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => onSelectVehicle(v.id)}>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg text-slate-900 tracking-tight border border-slate-200 bg-slate-50 px-2 py-0.5 rounded">{v.plate}</span>
                        <span className="text-[11px] px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-bold">
                          {v.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 pl-1">
                        <MapPin size={12} className="text-emerald-500" /> {v.location}
                      </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-all shadow-sm group-hover:shadow-md">
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  {/* 메모 영역 */}
                  <div className="mt-3 pl-1">
                    {editingMemoId === v.id ? (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          className="flex-1 px-3 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                          placeholder="예: 주유 필요, 세차 필요"
                          value={memoInput}
                          onChange={(e) => setMemoInput(e.target.value)}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            onUpdateMemo(v.id, memoInput);
                            setEditingMemoId(null);
                            setMemoInput("");
                          }}
                          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setEditingMemoId(null);
                            setMemoInput("");
                          }}
                          className="px-2 py-1.5 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : v.memo ? (
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMemoId(v.id);
                          setMemoInput(v.memo);
                        }}
                      >
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                          📝 {v.memo}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMemoId(v.id);
                          setMemoInput("");
                        }}
                        className="text-[10px] text-slate-400 hover:text-amber-600 font-medium"
                      >
                        + 메모 추가
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={cardStyle}>
          <div className="bg-white px-6 py-5 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              실시간 운행
            </h3>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold border border-blue-100">
              {inUseList.length}대 운행중
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {inUseList.length === 0 ? (
              <div className="p-10 text-center text-slate-400 bg-slate-50/50">
                <Key className="w-12 h-12 mx-auto mb-3 opacity-10" />
                <p className="text-sm font-medium">현재 운행 중인 차량이 없습니다</p>
              </div>
            ) : (
              inUseList.map((v) => (
                <div
                  key={v.id}
                  className="p-5 hover:bg-slate-50 transition-colors flex justify-between items-center group cursor-pointer relative overflow-hidden"
                  onClick={() => onSelectReturn(v.id)}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg text-slate-900 tracking-tight border border-slate-200 bg-slate-50 px-2 py-0.5 rounded">{v.plate}</span>
                      <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-bold">
                        운행중
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mb-1 flex items-center gap-1.5">
                      <User size={14} className="text-blue-500" />
                      <span className="font-bold text-slate-900">{v.lastDriver}</span>
                      <span className="text-slate-400 text-xs">님</span>
                    </div>
                    <div className="text-xs text-slate-400 pl-5 flex items-center gap-1">
                      <Clock size={10} />
                      <span className="truncate max-w-[150px]">
                        {logs.find((l) => l.vehicleId === v.id && l.status === "ongoing")?.purpose}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-blue-200 transform translate-x-2 group-hover:translate-x-0">
                    반납
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 통계 섹션 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={cardStyle}>
          <div className="bg-white px-6 py-5 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-500" />
              차량별 운행 횟수
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {vehicleStats.slice(0, 5).map((v, i) => (
              <div key={v.id} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">{i + 1}</span>
                    {v.plate} ({v.model})
                  </span>
                  <span className="font-bold text-slate-800">{v.count}회</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max((v.count / (vehicleStats[0]?.count || 1)) * 100, 5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={cardStyle}>
          <div className="bg-white px-6 py-5 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              최다 이용자 Top 5
            </h3>
          </div>
          <div className="p-6">
            {driverStats.length === 0 ? (
              <div className="text-center text-slate-400 py-8 text-sm">데이터가 없습니다</div>
            ) : (
              <div className="space-y-3">
                {driverStats.map(([name, count], i) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0 ? 'bg-emerald-100 text-emerald-600' : 
                        i === 1 ? 'bg-blue-100 text-blue-600' : 
                        'bg-slate-200 text-slate-500'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="font-bold text-slate-700">{name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
                      {count}회 운행
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cardStyle}>
        <div className="bg-white px-6 py-5 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            최근 운행 기록
          </h3>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                showFilters || hasActiveFilters
                  ? "bg-blue-100 text-blue-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">필터</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="차량, 운전자 검색..."
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all w-48"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-full text-xs font-bold transition-colors group/btn"
              title="엑셀 다운로드"
            >
              <Download size={14} className="group-hover/btn:scale-110 transition-transform" />
              <span className="hidden sm:inline">엑셀 저장</span>
            </button>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1.5 rounded-full font-bold self-center">
              {filteredLogs.length}건
            </span>
          </div>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 animate-slide-down">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">시작일</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">종료일</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">차량</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={filterVehicle}
                  onChange={(e) => setFilterVehicle(e.target.value)}
                >
                  <option value="">전체</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">운전자</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                >
                  <option value="">전체</option>
                  {uniqueDrivers.map((driver) => (
                    <option key={driver} value={driver}>
                      {driver}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <X size={12} />
                필터 초기화
              </button>
            )}
          </div>
        )}

        {/* 모바일용 검색창 */}
        <div className="md:hidden px-6 pb-4 pt-4 border-b border-slate-50">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="기록 검색 (차량, 이름, 용무)"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-slate-50/50">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-10" />
            <p className="text-sm font-medium">
              {searchTerm ? "검색 결과가 없습니다" : "아직 등록된 운행 기록이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {displayedLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${log.status === 'completed' ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-500'}`}>
                     {log.status === 'completed' ? <CheckCircle size={18} /> : <Car size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-sm tracking-tight">{log.plate}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                        {log.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-bold text-slate-700">{log.driver}</span>
                      <span className="w-0.5 h-2.5 bg-slate-300 rounded-full" />
                      <span className="text-slate-600">{log.purpose}</span>
                    </div>
                  </div>
                </div>

                <div className="pl-14 sm:pl-0 flex flex-row sm:flex-col gap-4 sm:gap-1 text-xs text-slate-500 sm:text-right items-center sm:items-end">
                   <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[10px]">출차</span>
                      <span className="font-medium">{log.outTime}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${log.inTime ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>반납</span>
                      <span className={`font-medium ${log.inTime ? '' : 'text-blue-600'}`}>{log.inTime || "운행중"}</span>
                   </div>
                </div>
              </div>
            ))}
            {filteredLogs.length > 10 && (
              <div className="p-3 text-center bg-slate-50/50">
                <button
                  onClick={() => setShowAllLogs(!showAllLogs)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-2 px-4 rounded-full hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200"
                >
                  {showAllLogs ? "접기" : `전체 기록 보기 (${filteredLogs.length - 10}개 더보기)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const VehicleManager = ({
  vehicles,
  setVehicles,
  showNotification,
  currentProjectId,
  logs,
  setLogs,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    plate: "",
    model: "",
    location: DEFAULT_LOCATION,
  });
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteLogTargetId, setDeleteLogTargetId] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newVehicle.plate || !newVehicle.model || !newVehicle.location) {
      showNotification("모든 정보를 입력해주세요.", "error");
      return;
    }

    const insertPayload = {
      plate: newVehicle.plate,
      model: newVehicle.model,
      status: "available",
      last_driver: "",
      location: newVehicle.location,
      project_id: currentProjectId,
    };

    const { data, error } = await supabase
      .from("vehicles")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !data) {
      showNotification("차량 저장에 실패했습니다.", "error");
      return;
    }

    const vehicle = mapVehicleRow(data);
    setVehicles((prev) => [...prev, vehicle]);
    setNewVehicle({ plate: "", model: "", location: DEFAULT_LOCATION });
    setIsAdding(false);
    showNotification("새로운 차량이 등록되었습니다.");
  };

  const confirmDeleteVehicle = async () => {
    if (!deleteTargetId) return;

    const { error } = await supabase.from("vehicles").delete().eq("id", deleteTargetId);
    if (error) {
      showNotification("차량 삭제에 실패했습니다.", "error");
      return;
    }

    setVehicles((prev) => prev.filter((v) => v.id !== deleteTargetId));
    setDeleteTargetId(null);
    showNotification("차량이 삭제되었습니다.");
  };

  const confirmDeleteLog = async () => {
    if (!deleteLogTargetId) return;

    const { error } = await supabase.from("logs").delete().eq("id", deleteLogTargetId);
    if (error) {
      showNotification("운행 기록 삭제에 실패했습니다.", "error");
      return;
    }

    setLogs((prev) => prev.filter((l) => l.id !== deleteLogTargetId));
    setDeleteLogTargetId(null);
    showNotification("운행 기록이 삭제되었습니다.");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl border border-white/50 transform transition-all scale-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Trash2 size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">차량 삭제</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                정말 이 차량을 삭제하시겠습니까?
                <br />
                삭제된 데이터는 복구할 수 없습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95"
              >
                취소
              </button>
              <button
                onClick={confirmDeleteVehicle}
                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                삭제함
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteLogTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl border border-white/50 transform transition-all scale-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Trash2 size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">운행 기록 삭제</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                선택한 운행 기록을 삭제하시겠습니까?
                <br />
                삭제된 기록은 복구할 수 없습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteLogTargetId(null)}
                className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95"
              >
                취소
              </button>
              <button
                onClick={confirmDeleteLog}
                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                삭제함
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-800">차량 관리</h2>
          <p className="text-sm text-slate-500 mt-1">등록된 차량을 수정하거나 추가합니다.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-300 transition-all active:scale-95"
        >
          {isAdding ? <X size={18} /> : <Plus size={18} />}
          {isAdding ? "취소" : "차량 추가"}
        </button>
      </div>

      {isAdding && (
        <div className={`${cardStyle} p-6 animate-slide-down border-slate-800 border-2`}>
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-slate-800 rounded-full" />
            신규 차량 등록
          </h3>
          <form onSubmit={handleAdd} className="grid gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>차량 번호</label>
                <input
                  type="text"
                  placeholder="예: 12가 3456"
                  className={inputStyle}
                  value={newVehicle.plate}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                />
              </div>
              <div>
                <label className={labelStyle}>모델명</label>
                <input
                  type="text"
                  placeholder="예: G80"
                  className={inputStyle}
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelStyle}>기본 주차 위치</label>
              <input
                type="text"
                placeholder="예: 평택 사무실 앞"
                className={inputStyle}
                value={newVehicle.location}
                onChange={(e) => setNewVehicle({ ...newVehicle, location: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 mt-2 active:scale-[0.98]"
            >
              등록 완료
            </button>
          </form>
        </div>
      )}

      <div className={cardStyle}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">차량 정보</th>
                <th className="px-6 py-4">상태</th>
                <th className="px-6 py-4">위치/사용자</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 text-base">{v.plate}</div>
                    <div className="text-xs font-medium text-slate-400 mt-0.5">{v.model}</div>
                  </td>
                  <td className="px-6 py-4">
                    {v.status === "available" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        대기중
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        운행중
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {v.status === "available" ? v.location : <span className="text-blue-600">{v.lastDriver}</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setDeleteTargetId(v.id)}
                      className="text-slate-300 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100"
                      title="차량 삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cardStyle}>
        <div className="bg-slate-50/50 px-6 py-5 border-b border-slate-100 flex justify-between items-center backdrop-blur-sm">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock size={14} className="text-slate-500" />
            최근 운행 기록 관리
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">
            총 {logs.length}건
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-slate-50/30">
            <Key className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p>삭제할 운행 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-slate-800 text-sm tracking-tight">{log.plate}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium">
                      {log.model}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      <span className="font-medium text-slate-700">{log.driver}</span>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="line-clamp-1">{log.purpose}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={10} className="text-emerald-400" />
                      출차 {log.outTime}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={10} className="text-blue-400" />
                      반납 {log.inTime || "운행중"}
                    </span>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => setDeleteLogTargetId(log.id)}
                    className="text-slate-300 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-xl"
                    title="운행 기록 삭제"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SimpleCheckOut = ({
  vehicles,
  checkoutForm,
  setCheckoutForm,
  driverHistory,
  purposeHistory,
  onSubmit,
}) => (
  <div className={`${cardStyle} p-8 animate-fade-in mb-24`}>
    <div className="mb-8">
      <h2 className="text-2xl font-black text-slate-900 mb-2">운행 시작</h2>
      <p className="text-slate-500">어떤 차량을 사용하시나요?</p>
    </div>
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <label className={labelStyle}>차량 선택</label>
        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {vehicles
            .filter((v) => v.status === "available")
            .map((v) => (
              <div
                key={v.id}
                onClick={() => setCheckoutForm({ ...checkoutForm, vehicleId: v.id })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center group ${
                  parseInt(checkoutForm.vehicleId) === v.id
                    ? "border-emerald-500 bg-emerald-50/30 shadow-sm"
                    : "border-slate-100 hover:border-emerald-200 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="font-bold text-slate-800 text-lg">{v.plate}</div>
                  <div className="text-xs font-medium text-slate-400">{v.model}</div>
                </div>
                <div
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
                    parseInt(checkoutForm.vehicleId) === v.id
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white text-slate-400 border-slate-200"
                  }`}
                >
                  {v.location}
                </div>
              </div>
            ))}
        </div>
      </div>
      <div className="space-y-5">
        <div>
          <label className={labelStyle}>운전자 이름</label>
          <input
            type="text"
            placeholder="예: 홍길동"
            className={inputStyle}
            value={checkoutForm.driver}
            onChange={(e) => setCheckoutForm({ ...checkoutForm, driver: e.target.value })}
          />
          {driverHistory.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {driverHistory.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCheckoutForm({ ...checkoutForm, driver: name })}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className={labelStyle}>목적지 및 용무</label>
          <input
            type="text"
            placeholder="예: 거래처 미팅 (강남역)"
            className={inputStyle}
            value={checkoutForm.purpose}
            onChange={(e) => setCheckoutForm({ ...checkoutForm, purpose: e.target.value })}
          />
          {purposeHistory.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {purposeHistory.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCheckoutForm({ ...checkoutForm, purpose: item })}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        type="submit"
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <span>운행 등록</span>
        <ArrowRight size={20} />
      </button>
    </form>
  </div>
);

const SimpleCheckIn = ({ vehicles, checkinForm, setCheckinForm, onSubmit }) => {
  useEffect(() => {
    if (checkinForm.vehicleId) {
      setCheckinForm(prev => ({ ...prev, location: DEFAULT_LOCATION }));
    }
  }, [checkinForm.vehicleId, setCheckinForm]);

  return (
    <div className={`${cardStyle} p-8 animate-fade-in mb-24`}>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 mb-2">차량 반납</h2>
        <p className="text-slate-500">운행을 마치고 안전하게 복귀하셨군요!</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-8">
        <div>
          <label className={labelStyle}>반납할 차량</label>
          <div className="grid grid-cols-1 gap-3">
            {vehicles.filter((v) => v.status === "in-use").length === 0 && (
              <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                반납할 차량이 없습니다.
              </div>
            )}
            {vehicles
              .filter((v) => v.status === "in-use")
              .map((v) => (
                <div
                  key={v.id}
                  onClick={() => setCheckinForm({ ...checkinForm, vehicleId: v.id })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition-all ${
                    parseInt(checkinForm.vehicleId) === v.id
                      ? "border-blue-500 bg-blue-50/30 shadow-sm"
                      : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-800 text-lg">{v.plate}</div>
                    <div className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-1">
                      <User size={12} /> {v.lastDriver}님 운행 중
                    </div>
                  </div>
                  {parseInt(checkinForm.vehicleId) === v.id && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white animate-fade-in">
                      <CheckCircle size={14} />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
        {checkinForm.vehicleId && (
          <div className="animate-fade-in space-y-6">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">최종 주차 위치</label>
              <select
                className="w-full p-3 bg-white rounded-xl border-0 text-blue-900 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
                value={checkinForm.location}
                onChange={(e) => setCheckinForm({ ...checkinForm, location: e.target.value })}
                required
              >
                <option value={DEFAULT_LOCATION}>{DEFAULT_LOCATION}</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>반납 완료</span>
              <CheckCircle size={20} />
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

const Statistics = ({ vehicles, logs }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // 선택된 월의 데이터 필터링
  const monthLogs = logs.filter((log) => {
    const logDate = log.outTime.split(" ")[0];
    return logDate.startsWith(selectedMonth);
  });

  // 월간 통계
  const totalTrips = monthLogs.length;

  // 차량별 통계
  const vehicleStats = vehicles.map((v) => {
    const trips = monthLogs.filter((l) => l.vehicleId === v.id).length;
    return { ...v, trips };
  }).sort((a, b) => b.trips - a.trips);

  // 운전자별 통계
  const driverStats = Object.entries(
    monthLogs.reduce((acc, log) => {
      acc[log.driver] = (acc[log.driver] || 0) + 1;
      return acc;
    }, {})
  ).sort(([, a], [, b]) => b - a);

  // 월 옵션 생성 (최근 12개월)
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    monthOptions.push({ value, label });
  }

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      {/* 월 선택 */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black text-slate-800">통계</h2>
        <select
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 월간 요약 */}
      <div className={`${cardStyle} p-5`}>
        <div className="text-xs font-bold text-slate-400 uppercase mb-1">운행 횟수</div>
        <div className="text-3xl font-black text-slate-900">{totalTrips}<span className="text-lg text-slate-400 font-medium">회</span></div>
      </div>

      {/* 차량별 통계 */}
      <div className={cardStyle}>
        <div className="bg-white px-6 py-5 border-b border-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Car size={16} className="text-blue-500" />
            차량별 통계
          </h3>
        </div>
        {vehicleStats.length === 0 ? (
          <div className="p-10 text-center text-slate-400">데이터가 없습니다</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {vehicleStats.map((v) => (
              <div key={v.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{v.plate}</div>
                  <div className="text-xs text-slate-400">{v.model}</div>
                </div>
                <div className="text-sm text-right">
                  <div className="font-bold text-slate-700">{v.trips}회</div>
                  <div className="text-[10px] text-slate-400">운행</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 운전자별 통계 */}
      <div className={cardStyle}>
        <div className="bg-white px-6 py-5 border-b border-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <User size={16} className="text-emerald-500" />
            운전자별 통계
          </h3>
        </div>
        {driverStats.length === 0 ? (
          <div className="p-10 text-center text-slate-400">데이터가 없습니다</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {driverStats.map(([driver, count], i) => (
              <div key={driver} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    i === 0 ? "bg-emerald-100 text-emerald-600" :
                    i === 1 ? "bg-blue-100 text-blue-600" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {i + 1}
                  </div>
                  <span className="font-bold text-slate-700">{driver}</span>
                </div>
                <span className="text-sm font-bold text-slate-500">{count}회 운행</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function VehicleHome() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [notification, setNotification] = useState(null);

  const [currentProjectId, setCurrentProjectId] = useState("green");

  const [checkoutForm, setCheckoutForm] = useState({ vehicleId: "", driver: "", purpose: "" });
  const [checkinForm, setCheckinForm] = useState({
    vehicleId: "",
    location: DEFAULT_LOCATION,
  });

  const [driverHistory, setDriverHistory] = useState([]);
  const [purposeHistory, setPurposeHistory] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STATE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.vehicles)) {
        setVehicles(parsed.vehicles);
      }
      if (parsed && Array.isArray(parsed.logs)) {
        setLogs(parsed.logs);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    const fetchFromSupabase = async () => {
      try {
        const { data: vehicleRows, error: vehicleError } = await supabase
          .from("vehicles")
          .select("*")
          .order("id", { ascending: true });
        if (!vehicleError && vehicleRows) {
          setVehicles(vehicleRows.map(mapVehicleRow));
        }

        const { data: logRows, error: logError } = await supabase
          .from("logs")
          .select("*")
          .order("id", { ascending: false });
        if (!logError && logRows) {
          setLogs(logRows.map(mapLogRow));
        }
      } catch (e) {
        // 네트워크 오류 등은 조용히 무시 (localStorage 데이터로만 동작)
      }
    };

    fetchFromSupabase();

    // 실시간 구독 설정
    const vehiclesSubscription = supabase
      .channel('vehicles-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setVehicles((prev) => [...prev, mapVehicleRow(payload.new)]);
          } else if (payload.eventType === 'UPDATE') {
            setVehicles((prev) => 
              prev.map((v) => v.id === payload.new.id ? mapVehicleRow(payload.new) : v)
            );
          } else if (payload.eventType === 'DELETE') {
            setVehicles((prev) => prev.filter((v) => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const logsSubscription = supabase
      .channel('logs-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLogs((prev) => [mapLogRow(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLogs((prev) =>
              prev.map((l) => l.id === payload.new.id ? mapLogRow(payload.new) : l)
            );
          } else if (payload.eventType === 'DELETE') {
            setLogs((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(vehiclesSubscription);
      supabase.removeChannel(logsSubscription);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      vehicles,
      logs,
    };
    window.localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(payload));
  }, [vehicles, logs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.driverHistory)) {
        setDriverHistory(parsed.driverHistory);
      }
      if (parsed && Array.isArray(parsed.purposeHistory)) {
        setPurposeHistory(parsed.purposeHistory);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    const fetchHistoryFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("history_entries")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error || !data) return;

        const drivers = [];
        const purposes = [];

        for (const row of data) {
          if (row.kind === "driver" && !drivers.includes(row.value)) {
            drivers.push(row.value);
          }
          if (row.kind === "purpose" && !purposes.includes(row.value)) {
            purposes.push(row.value);
          }
          if (drivers.length >= 5 && purposes.length >= 5) break;
        }

        if (drivers.length > 0) {
          setDriverHistory(drivers.slice(0, 5));
        }
        if (purposes.length > 0) {
          setPurposeHistory(purposes.slice(0, 5));
        }
      } catch (e) {
        // Supabase 조회 실패 시에는 localStorage 값만 사용
      }
    };

    fetchHistoryFromSupabase();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      driverHistory,
      purposeHistory,
    };
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(payload));
  }, [driverHistory, purposeHistory]);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCheckOut = async (e) => {
    e.preventDefault();
    if (!checkoutForm.vehicleId || !checkoutForm.driver || !checkoutForm.purpose) {
      showNotification("운전자와 목적지를 입력해주세요.", "error");
      return;
    }
    const vehicle = vehicles.find(
      (v) => v.id === parseInt(checkoutForm.vehicleId) && v.projectId === currentProjectId,
    );
    if (!vehicle) return;

    const trimmedDriver = checkoutForm.driver.trim();
    const trimmedPurpose = checkoutForm.purpose.trim();

    if (trimmedDriver) {
      setDriverHistory((prev) => {
        const next = [trimmedDriver, ...prev.filter((item) => item !== trimmedDriver)];
        return next.slice(0, 5);
      });
    }

    if (trimmedPurpose) {
      setPurposeHistory((prev) => {
        const next = [trimmedPurpose, ...prev.filter((item) => item !== trimmedPurpose)];
        return next.slice(0, 5);
      });
    }

    // 히스토리를 Supabase에도 비동기로 저장 (에러는 무시)
    if (trimmedDriver) {
      supabase
        .from("history_entries")
        .insert({ kind: "driver", value: trimmedDriver })
        .then(() => {})
        .catch(() => {});
    }

    if (trimmedPurpose) {
      supabase
        .from("history_entries")
        .insert({ kind: "purpose", value: trimmedPurpose })
        .then(() => {})
        .catch(() => {});
    }

    const now = new Date();
    const outTime =
      now.toLocaleDateString() +
      " " +
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const { data: insertedLog, error: logError } = await supabase
      .from("logs")
      .insert({
        vehicle_id: vehicle.id,
        plate: vehicle.plate,
        model: vehicle.model,
        driver: trimmedDriver,
        purpose: trimmedPurpose,
        out_time: outTime,
        in_time: null,
        status: "ongoing",
        project_id: currentProjectId,
      })
      .select("*")
      .single();

    if (logError || !insertedLog) {
      showNotification("운행 기록 저장에 실패했습니다.", "error");
      return;
    }

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({
        status: "in-use",
        last_driver: trimmedDriver,
        location: "운행 중",
      })
      .eq("id", vehicle.id);

    if (vehicleError) {
      showNotification("차량 상태 업데이트에 실패했습니다.", "error");
      return;
    }

    const newLog = mapLogRow(insertedLog);
    setLogs([newLog, ...logs]);
    setVehicles(
      vehicles.map((v) =>
        v.id === vehicle.id
          ? { ...v, status: "in-use", lastDriver: trimmedDriver, location: "운행 중" }
          : v,
      ),
    );
    setCheckoutForm({ vehicleId: "", driver: "", purpose: "" });
    setActiveTab("dashboard");
    showNotification(`${vehicle.model} 운행을 시작합니다.`);
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!checkinForm.vehicleId) {
      showNotification("반납할 차량을 선택해주세요.", "error");
      return;
    }
    if (!checkinForm.location) {
      showNotification("주차 위치를 입력해주세요.", "error");
      return;
    }

    const vehicle = vehicles.find(
      (v) => v.id === parseInt(checkinForm.vehicleId) && v.projectId === currentProjectId,
    );
    if (!vehicle) return;

    const currentLog = logs.find(
      (l) =>
        l.vehicleId === vehicle.id && l.status === "ongoing" && l.projectId === currentProjectId,
    );
    if (currentLog) {
      const now = new Date();
      const inTime =
        now.toLocaleDateString() +
        " " +
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const { error: logError } = await supabase
        .from("logs")
        .update({
          in_time: inTime,
          status: "completed",
        })
        .eq("id", currentLog.id);

      if (logError) {
        showNotification("운행 기록 업데이트에 실패했습니다.", "error");
        return;
      }

      setLogs(
        logs.map((l) =>
          l.id === currentLog.id
            ? {
                ...l,
                inTime,
                status: "completed",
              }
            : l,
        ),
      );
    }

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({
        status: "available",
        location: checkinForm.location,
      })
      .eq("id", vehicle.id);

    if (vehicleError) {
      showNotification("차량 상태 업데이트에 실패했습니다.", "error");
      return;
    }

    setVehicles(
      vehicles.map((v) =>
        v.id === vehicle.id ? { ...v, status: "available", location: checkinForm.location } : v,
      ),
    );
    setCheckinForm({ vehicleId: "", location: "" });
    setActiveTab("dashboard");
    showNotification("운행이 종료되었습니다.");
  };

  const handleUpdateMemo = async (vehicleId, memo) => {
    const trimmedMemo = memo.trim();

    const { error } = await supabase
      .from("vehicles")
      .update({ memo: trimmedMemo || null })
      .eq("id", vehicleId);

    if (error) {
      showNotification("메모 저장에 실패했습니다.", "error");
      return;
    }

    setVehicles(
      vehicles.map((v) =>
        v.id === vehicleId ? { ...v, memo: trimmedMemo } : v
      )
    );
    showNotification(trimmedMemo ? "메모가 저장되었습니다." : "메모가 삭제되었습니다.");
  };

  const projectVehicles = vehicles.filter((v) => v.projectId === currentProjectId);
  const projectLogs = logs.filter((l) => l.projectId === currentProjectId);

  return (
    <div className="min-h-screen bg-gradient-mesh font-sans text-slate-900 selection:bg-blue-500 selection:text-white pb-32">
      <header className="sticky top-0 z-30 glass-panel border-b-0 rounded-b-3xl mx-2 mt-2">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab("dashboard")}
          >
            <div className="bg-slate-900 text-white p-2 rounded-xl shadow-lg shadow-slate-200 group-hover:scale-105 transition-all duration-300">
              <Car size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">
              법인차량<span className="text-slate-400 font-light">관리</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                activeTab === "dashboard"
                  ? "bg-slate-100 text-slate-900 shadow-inner"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <Home size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                activeTab === "stats"
                  ? "bg-blue-100 text-blue-600 shadow-inner"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <BarChart3 size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                activeTab === "manage"
                  ? "bg-slate-100 text-slate-900 shadow-inner"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <Settings size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      {notification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 px-6 py-3.5 rounded-full shadow-2xl shadow-slate-200 z-50 bg-slate-800/90 backdrop-blur text-white flex items-center gap-3 animate-fade-in-up">
          {notification.type === "error" ? (
            <AlertCircle size={18} className="text-red-400" />
          ) : (
            <CheckCircle size={18} className="text-emerald-400" />
          )}
          <span className="text-sm font-bold">{notification.message}</span>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-5 pt-8 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6 px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Project Location</span>
          <div className="glass-panel p-1 rounded-full flex gap-1">
            {PROJECTS.map((project) => (
              <button
                key={project.id}
                onClick={() => setCurrentProjectId(project.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  currentProjectId === project.id
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "dashboard" && (
          <Dashboard
            vehicles={projectVehicles}
            logs={projectLogs}
            onSelectVehicle={(id) => {
              setCheckoutForm({ ...checkoutForm, vehicleId: id });
              setActiveTab("checkout");
            }}
            onSelectReturn={(id) => {
              setCheckinForm({ ...checkinForm, vehicleId: id });
              setActiveTab("checkin");
            }}
            onUpdateMemo={handleUpdateMemo}
          />
        )}
        {activeTab === "checkout" && (
          <SimpleCheckOut
            vehicles={projectVehicles}
            checkoutForm={checkoutForm}
            setCheckoutForm={setCheckoutForm}
            driverHistory={driverHistory}
            purposeHistory={purposeHistory}
            onSubmit={handleCheckOut}
          />
        )}
        {activeTab === "checkin" && (
          <SimpleCheckIn
            vehicles={projectVehicles}
            checkinForm={checkinForm}
            setCheckinForm={setCheckinForm}
            onSubmit={handleCheckIn}
          />
        )}
        {activeTab === "stats" && (
          <Statistics
            vehicles={projectVehicles}
            logs={projectLogs}
          />
        )}
        {activeTab === "manage" && (
          <VehicleManager
            vehicles={projectVehicles}
            setVehicles={setVehicles}
            showNotification={showNotification}
            currentProjectId={currentProjectId}
            logs={projectLogs}
            setLogs={setLogs}
          />
        )}
      </main>

      {activeTab !== "manage" && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-4 z-20 pointer-events-none animate-fade-in-up">
          <div className="glass-panel p-1.5 rounded-full flex gap-2 pointer-events-auto transform transition-transform hover:scale-[1.02]">
            <button
              onClick={() => setActiveTab("checkout")}
              className="flex items-center gap-2 bg-slate-900 text-white py-3.5 px-8 rounded-full font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
            >
              <Key size={18} />
              <span>운행 시작</span>
            </button>
            <button
              onClick={() => setActiveTab("checkin")}
              className="flex items-center gap-2 bg-white text-slate-700 py-3.5 px-8 rounded-full font-bold hover:bg-slate-50 transition-all active:scale-95 border border-slate-100 shadow-sm"
            >
              <CheckCircle size={18} className="text-blue-600" />
              <span>반납</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce-in { 0% { opacity: 0; transform: translate(-50%, -20px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down { animation: slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
}
