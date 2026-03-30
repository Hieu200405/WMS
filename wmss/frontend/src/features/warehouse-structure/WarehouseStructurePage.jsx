import { useMemo, useState, useEffect, useCallback } from "react";
import { Plus, Pencil, MapPin, Trash2, LayoutGrid, ChevronDown, ChevronRight } from "lucide-react";
import { WarehouseVisualMap } from "./WarehouseVisualMap.jsx";
import { useTranslation } from "react-i18next";
import { Modal } from "../../components/Modal.jsx";
import { Input } from "../../components/forms/Input.jsx";
import { Select } from "../../components/forms/Select.jsx";
import { BarcodeInput } from "../../components/forms/BarcodeInput.jsx";
import { Tag } from "../../components/Tag.jsx";
import { VN_LOCATIONS } from "../../data/vn_locations.js";
import { apiClient } from "../../services/apiClient.js";
import toast from "react-hot-toast";

const LEVELS = [
  { value: "warehouse", label: "Kho" },
  { value: "zone", label: "Khu vực" },
  { value: "aisle", label: "Dãy" },
  { value: "rack", label: "Kệ" },
  { value: "bin", label: "Ngăn" }
];

const WAREHOUSE_TYPES = [
  { value: 'Main', label: 'Kho tổng' },
  { value: 'Branch', label: 'Chi nhánh' },
  { value: 'Distribution', label: 'Trung tâm phân phối' },
  { value: 'Cold', label: 'Kho lạnh' },
  { value: 'Chemical', label: 'Kho hóa chất' },
  { value: 'HighValue', label: 'Kho giá trị cao' }
];

const LEVEL_LABELS = Object.fromEntries(LEVELS.map((level) => [level.value, level.label]));
const WAREHOUSE_TYPE_LABELS = Object.fromEntries(
  WAREHOUSE_TYPES.map((type) => [type.value, type.label])
);


const emptyNode = {
  name: "",
  type: "warehouse",
  code: "",
  barcode: "",
  warehouseType: "",
  parentId: null,
  address: "",
  city: "",
  province: "",
  ward: "",
  lat: "",
  lng: "",
  notes: "",
  capacity: 0
};

export function WarehouseStructurePage() {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyNode);
  const [highlightId, setHighlightId] = useState(null);
  const [mapNode, setMapNode] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [hasInitializedExpand, setHasInitializedExpand] = useState(false);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient('/warehouse');
      setNodes(res.data || res || []);
    } catch (error) {
      console.error(error);
      toast.error('Thất bại khi tải cấu trúc kho');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  // Derived location lists based on selection
  const provinces = useMemo(() => VN_LOCATIONS.map(p => ({ value: p.name, label: p.name })), []);

  const districts = useMemo(() => {
    const selectedProvince = VN_LOCATIONS.find(p => p.name === form.province);
    return selectedProvince ? selectedProvince.districts.map(d => ({ value: d.name, label: d.name })) : [];
  }, [form.province]);

  const wards = useMemo(() => {
    const selectedProvince = VN_LOCATIONS.find(p => p.name === form.province);
    const selectedDistrict = selectedProvince?.districts.find(d => d.name === form.city);
    return selectedDistrict ? selectedDistrict.wards.map(w => ({ value: w, label: w })) : [];
  }, [form.province, form.city]);

  const tree = useMemo(() => {
    const map = new Map();
    // Assuming backend returns flat list with parentId
    nodes.forEach((node) => map.set(node.id, { ...node, children: [] }));
    const roots = [];
    map.forEach((node) => {
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // If parent not found (e.g. filtered out or error), treat as root or orphan?
          // For now, treat as root to be safe, or skip. Let's push to roots if parent missing in dataset.
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });
    return roots;
  }, [nodes]);

  useEffect(() => {
    if (!hasInitializedExpand && tree.length > 0) {
      setExpandedIds(new Set(tree.map((node) => node.id)));
      setHasInitializedExpand(true);
    }
  }, [tree, hasInitializedExpand]);

  const openCreateModal = (parent) => {
    setEditing(null);
    setForm({
      ...emptyNode,
      parentId: parent?.id ?? "",
      type: parent ? nextLevel(parent.type) : "warehouse"
    });
    setOpen(true);
  };

  const openEditModal = (node) => {
    setEditing(node);
    setForm({
      ...emptyNode,
      ...node,
      lat: node.lat || "",
      lng: node.lng || "",
      capacity: node.capacity || 0
    });
    setOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      parentId: form.parentId || undefined,
      address: form.address || "",
      city: form.city || "",
      province: form.province || "",
      ward: form.ward || "",
      notes: form.notes || "",
      lat: form.lat ? Number(form.lat) : undefined,
      lng: form.lng ? Number(form.lng) : undefined,
      capacity: Number(form.capacity) || 0
    };

    try {
      if (editing) {
        await apiClient(`/warehouse/${editing.id}`, { method: 'PUT', body: payload });
        toast.success('Cập nhật thành công');
      } else {
        await apiClient('/warehouse', { method: 'POST', body: payload });
        toast.success('Tạo mới thành công');
      }
      setOpen(false);
      fetchNodes();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Thất bại khi thực hiện thao tác');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa node kho này không?')) return;
    try {
      await apiClient(`/warehouse/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa thành công');
      fetchNodes();
    } catch (error) {
      console.error(error);
      toast.error('Thất bại khi xóa');
    }
  }

  const handleBarcodeScan = (value) => {
    const node = nodes.find((item) => item.barcode === value);
    if (node) {
      setHighlightId(node.id);
      setTimeout(() => setHighlightId(null), 2000);
      const element = document.getElementById(`node-${node.id}`);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (editing) {
      setForm((prev) => ({ ...prev, barcode: value }));
    } else {
      toast('Không tìm thấy vị trí');
    }
  };

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = [];
    const collect = (list) => {
      list.forEach((item) => {
        allIds.push(item.id);
        if (item.children?.length) collect(item.children);
      });
    };
    collect(tree);
    setExpandedIds(new Set(allIds));
  };

  const collapseAll = () => setExpandedIds(new Set());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t("warehouse.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("warehouse.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BarcodeInput label={t("warehouse.barcode")} onScan={handleBarcodeScan} />
          <button
            type="button"
            onClick={() => openCreateModal(null)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            {t("warehouse.addNode")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading structure...</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("warehouse.title2")}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("warehouse.subtitle2")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("warehouse.expandAll")}
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("warehouse.collapseAll")}
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {tree.map((node) => (
              <WarehouseNodeRow
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                onToggle={toggleExpanded}
                onAddChild={openCreateModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onViewMap={setMapNode}
                highlightId={highlightId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Visual Map Modal */}
      <Modal
        open={!!mapNode}
        onClose={() => setMapNode(null)}
        title={mapNode ? `Bản đồ: ${mapNode.name}` : 'Bản đồ'}
        maxWidth="max-w-5xl"
        actions={
          <button
            onClick={() => setMapNode(null)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {t("app.close")}
          </button>
        }
      >
        <WarehouseVisualMap nodeId={mapNode?.id} />
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("warehouse.editNode") : t("warehouse.addNode")}
        actions={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("app.cancel")}
            </button>
            <button
              type="submit"
              form="warehouse-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t("app.save")}
            </button>
          </>
        }
      >
        <form id="warehouse-form" className="space-y-4" onSubmit={handleSubmit}>
          <Select
            label={t("warehouse.type")}
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            options={LEVELS}
          />
          {form.type === 'warehouse' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50 space-y-3">
              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Thông tin kho</h4>
              <Select
                label={"Loại kho"}
                value={form.warehouseType}
                onChange={(event) => setForm((prev) => ({ ...prev, warehouseType: event.target.value }))}
                options={WAREHOUSE_TYPES}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Tỉnh / Thành phố"
                  value={form.province}
                  onChange={(e) => setForm(prev => ({ ...prev, province: e.target.value, city: "", ward: "" }))}
                  options={[{ value: "", label: "Chọn tỉnh/thành" }, ...provinces]}
                />
                <Select
                  label="Quận / Huyện"
                  value={form.city}
                  onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value, ward: "" }))}
                  options={[{ value: "", label: "Chọn quận/huyện" }, ...districts]}
                  disabled={!form.province}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Phường / Xã"
                  value={form.ward}
                  onChange={(e) => setForm(prev => ({ ...prev, ward: e.target.value }))}
                  options={[{ value: "", label: "Chọn phường/xã" }, ...wards]}
                  disabled={!form.city}
                />
                <Input
                  label="Số nhà, Tên đường"
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="VD: 123 Đường Nam Kỳ Khởi Nghĩa"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Kinh độ (Lng)"
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(event) => setForm((prev) => ({ ...prev, lng: event.target.value }))}
                />
                <Input
                  label="Vĩ độ (Lat)"
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(event) => setForm((prev) => ({ ...prev, lat: event.target.value }))}
                />
              </div>
              <Input
                label="Ghi chú (Giờ hoạt động...)"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          )}

          <Input
            label={t("warehouse.name")}
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <Input
            label={t("warehouse.code")}
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            required
          />
          {['bin', 'rack'].includes(form.type) && (
            <Input
              label="Sức chứa tối đa (Số lượng SP)"
              type="number"
              min="0"
              value={form.capacity}
              onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
              placeholder="0 = Không giới hạn"
            />
          )}
          <Input
            label={t("warehouse.barcode")}
            value={form.barcode}
            onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
}


function WarehouseNodeRow({
  node,
  depth,
  expandedIds,
  onToggle,
  onAddChild,
  onEdit,
  onDelete,
  onViewMap,
  highlightId
}) {
  const { t } = useTranslation();
  const displayAddressParts = [node.address, node.ward, node.city, node.province].filter(Boolean);
  const fullAddress = displayAddressParts.join(', ');
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = expandedIds.has(node.id);

  return (
    <div>
      <div
        id={`node-${node.id}`}
        className={`flex flex-wrap items-start gap-3 px-4 py-3 ${highlightId === node.id
            ? "bg-indigo-50/70 ring-1 ring-indigo-200 dark:bg-indigo-500/10"
            : "bg-transparent"
          }`}
      >
        <div className="flex items-start gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="h-6 w-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Tag
              label={LEVEL_LABELS[node.type] || LEVEL_LABELS[String(node.type || "").toLowerCase()] || node.type}
            />
            {node.warehouseType && (
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                {WAREHOUSE_TYPE_LABELS[node.warehouseType] || node.warehouseType}
              </span>
            )}
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {node.name}
            </h3>
            {hasChildren && (
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                {node.children.length} Nhánh
              </span>
            )}
          </div>
          {node.capacity > 0 && (
            <div className="mt-1">
              <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                Max: {node.capacity}
              </span>
            </div>
          )}
          {fullAddress ? null : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("app.edit")}
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("app.delete")}
          </button>
          {node.type !== "bin" ? (
            <>
              <button
                type="button"
                onClick={() => onViewMap(node)}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-300 px-2 py-1 text-xs font-medium text-teal-600 transition hover:bg-teal-50 dark:border-teal-600 dark:text-teal-200 dark:hover:bg-teal-500/10"
                title="Visual map"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {t("warehouse.mapView")}
              </button>
              <button
                type="button"
                onClick={() => onAddChild(node)}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-200 dark:hover:bg-indigo-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("warehouse.addChild")}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {hasChildren && isExpanded ? (
        <div className="space-y-1">
          {node.children.map((child) => (
            <WarehouseNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewMap={onViewMap}
              highlightId={highlightId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function nextLevel(type) {
  const index = LEVELS.findIndex((level) => level.value === type);
  return LEVELS[Math.min(index + 1, LEVELS.length - 1)].value;
}
