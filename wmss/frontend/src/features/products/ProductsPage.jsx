import { useMemo, useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Check, X, Trash2, Save, ArrowLeft, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { NumberInput } from '../../components/forms/NumberInput.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { apiClient } from '../../services/apiClient.js';
import { formatCurrency } from '../../utils/formatters.js';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/PageHeader.jsx';

const emptyProduct = {
  sku: '',
  name: '',
  categoryId: '',
  preferredSupplierId: '',
  priceIn: 0,
  priceOut: 0,
  unit: '',
  barcode: '',
  image: '',
  description: '',
  minStock: 0,
};

const emptySupplierProduct = {
  supplierId: '',
  priceIn: 0,
  currency: 'VND',
  isPreferred: false,
  supplierSku: ''
};

export function ProductsPage() {
  const { t } = useTranslation();
  const { searchTerm = '' } = useOutletContext() ?? {};

  // Data States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // UI States
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState(emptyProduct);

  // Supplier Tab States
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierView, setSupplierView] = useState('list');
  const [supplierForm, setSupplierForm] = useState(emptySupplierProduct);
  const [editingSP, setEditingSP] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodRes, catRes, supRes] = await Promise.all([
          apiClient('/products'),
          apiClient('/categories'),
          apiClient('/partners', { params: { type: 'supplier' } })
        ]);
        setProducts(prodRes.data || []);
        setCategories(catRes.data || []);
        setSuppliers(supRes.data || []);
      } catch (error) {
        console.error(error);
        toast.error('Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchSupplierProducts = useCallback(async (productId) => {
    setLoadingSuppliers(true);
    try {
      const res = await apiClient('/supplier-products', { params: { productId } });
      setSupplierProducts(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách NCC');
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  useEffect(() => {
    if (editing && activeTab === 'suppliers') {
      fetchSupplierProducts(editing.id);
      setSupplierView('list');
    }
  }, [editing, activeTab, fetchSupplierProducts]);

  const refreshProducts = async () => {
    try {
      const res = await apiClient('/products');
      setProducts(res.data || []);
    } catch (e) { console.error(e); }
  };

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const byCategory = !categoryFilter || product.categoryId === categoryFilter;
      const lowered = searchTerm.toLowerCase();
      const bySearch =
        !searchTerm ||
        product.name.toLowerCase().includes(lowered) ||
        product.sku.toLowerCase().includes(lowered);
      return byCategory && bySearch;
    });
  }, [products, categoryFilter, searchTerm]);

  const openCreateModal = () => {
    setForm(emptyProduct);
    setEditing(null);
    setActiveTab('general');
    setOpen(true);
  };

  const openEditModal = (product) => {
    setEditing(product);
    setForm(product);
    setActiveTab('general');
    setOpen(true);
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editing) {
        const { preferredSupplierId, ...updatePayload } = form;
        await apiClient(`/products/${editing.id}`, { method: 'PUT', body: updatePayload });
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        if (!form.preferredSupplierId) {
          toast.error('Vui lòng chọn nhà cung cấp');
          return;
        }
        await apiClient('/products', { method: 'POST', body: form });
        toast.success('Tạo sản phẩm thành công');
      }
      setOpen(false);
      refreshProducts();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Lỗi khi lưu sản phẩm');
    }
  };

  const handlePrintLabel = (product) => {
    const printWindow = window.open('', '', 'width=600,height=400');
    if (!printWindow) {
      toast.error('Vui lòng cho phép popup để in tem');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Tem sản phẩm - ${product.sku}</title>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&display=swap" rel="stylesheet">
          <style>
            @page { size: auto; margin: 0mm; }
            body { font-family: sans-serif; text-align: center; margin: 0; padding: 20px; }
            .label { 
                border: 2px solid #000; 
                padding: 10px; 
                display: inline-block; 
                margin: 10px; 
                width: 300px; 
                height: 180px;
                box-sizing: border-box;
                position: relative;
            }
            .name { font-size: 16px; font-weight: bold; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .barcode { font-family: 'Libre Barcode 39 Text', cursive; font-size: 48px; line-height: 1; margin: 10px 0; }
            .sku { font-size: 14px; color: #333; font-weight: bold; }
            .info { display: flex; justify-content: space-between; margin-top: 15px; font-size: 14px; border-top: 1px dashed #ccc; padding-top: 5px; }
            .price { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="name">${product.name}</div>
            <div class="barcode">*${product.sku}*</div>
            <div class="sku">SKU: ${product.sku}</div>
            <div class="info">
                <span>ĐVT: ${product.unit || 'Cái'}</span>
                <span class="price">${product.priceOut.toLocaleString()} ₫</span>
            </div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const supplierId =
        typeof supplierForm.supplierId === 'string'
          ? supplierForm.supplierId
          : supplierForm.supplierId?.id || supplierForm.supplierId?._id || '';
      if (!supplierId) {
        toast.error('Vui lòng chọn một nhà cung cấp');
        return;
      }
      const payload = { ...supplierForm, supplierId, productId: editing.id };

      if (editingSP) {
        await apiClient(`/supplier-products/${editingSP.id}`, {
          method: 'PUT',
          body: payload
        });
        toast.success('Cập nhật NCC thành công');
      } else {
        await apiClient('/supplier-products', {
          method: 'POST',
          body: payload
        });
        toast.success('Thêm NCC thành công');
      }

      setSupplierView('list');
      fetchSupplierProducts(editing.id);
      if (payload.isPreferred && typeof payload.priceIn === 'number') {
        setForm((prev) => ({ ...prev, priceIn: payload.priceIn }));
      }
      refreshProducts();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Lỗi khi lưu NCC');
    }
  };

  const handleDeleteSupplierProduct = async (id) => {
    if (!confirm('Xóa nhà cung cấp này khỏi sản phẩm?')) return;
    try {
      await apiClient(`/supplier-products/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa');
      fetchSupplierProducts(editing.id);
    } catch (error) {
      console.error(error);
      toast.error('Không thể xóa');
    }
  };

  const startAddSupplier = () => {
    setSupplierForm(emptySupplierProduct);
    setEditingSP(null);
    setSupplierView('add');
  };

  const startEditSupplier = (sp) => {
    setSupplierForm({
      supplierId: sp.supplierId?.id || sp.supplierId?._id || sp.supplierId,
      priceIn: sp.priceIn,
      currency: sp.currency,
      isPreferred: sp.isPreferred,
      supplierSku: sp.supplierSku || ''
    });
    setEditingSP(sp);
    setSupplierView('add');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const promise = apiClient('/upload/image', {
        method: 'POST',
        body: formData,
      });

      toast.promise(promise, {
        loading: 'Uploading...',
        success: 'Upload xong',
        error: 'Upload thất bại'
      });

      const res = await promise;
      setForm(prev => ({ ...prev, image: res.url }));
    } catch (error) {
      console.error(error);
      toast.error('Lỗi upload ảnh');
    }
  };

  const handleBulkDelete = async (ids) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${ids.length} sản phẩm đã chọn?`)) return;
    const toastId = toast.loading('Đang xóa...');
    try {
      // Sequential delete to avoid overwhelming server or if backend doesn't support bulk
      for (const id of ids) {
        await apiClient.delete(`/products/${id}`);
      }
      toast.success(`Đã xóa ${ids.length} sản phẩm`, { id: toastId });
      refreshProducts();
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi khi xóa sản phẩm', { id: toastId });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('products.title')}
        description={t('products.categoryFilter')}
        actions={
          <div className="flex items-center gap-3">
            <Select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              placeholder={t('products.allCategories')}
              options={[{ value: '', label: 'Tất cả' }, ...categoryOptions]}
            />
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              {t('products.create')}
            </button>
          </div>
        }
      />

      <DataTable
        data={filteredProducts}
        enableSelection={true}
        renderBulkActions={(selectedIds) => (
          <button
            type="button"
            onClick={() => handleBulkDelete(selectedIds)}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100 transition-colors border border-rose-200"
          >
            <Trash2 className="h-4 w-4" />
            Xóa ({selectedIds.length})
          </button>
        )}
        columns={[
          {
            key: 'image',
            header: '',
            sortable: false,
            render: (value) => (
              value ? (
                <img src={value} alt="" className="h-10 w-10 rounded object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-[10px]">img</div>
              )
            )
          },
          { key: 'sku', header: t('products.sku') },
          { key: 'name', header: t('products.name') },
          {
            key: 'categoryId',
            header: t('products.category'),
            render: (value) => categories.find((cat) => cat.id === value)?.name ?? '—',
          },
          { key: 'unit', header: t('products.unit') },
          {
            key: 'priceIn',
            header: t('products.priceIn'),
            render: (value) => formatCurrency(value),
          },
          {
            key: 'priceOut',
            header: t('products.priceOut'),
            render: (value) => formatCurrency(value),
          },
          {
            key: 'actions',
            header: t('app.actions'),
            sortable: false,
            render: (_, row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintLabel(row)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="In tem mã vạch"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {t('products.printLabel')}
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(row)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('app.edit')}
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}
        maxWidth="max-w-3xl"
        actions={
          activeTab === 'general' ? (
            <>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t('app.cancel')}
              </button>
              <button
                type="submit"
                form="product-form"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                {t('app.save')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Đóng
            </button>
          )
        }
      >
        <div className="mb-6 flex space-x-4 border-b border-slate-200 dark:border-slate-700">
          <button
            className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'general' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('general')}
          >
            Thông tin chung
          </button>
          {editing && (
            <button
              className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'suppliers' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('suppliers')}
            >
              Nhà cung cấp
            </button>
          )}
        </div>

        {activeTab === 'general' ? (
          <form id="product-form" className="space-y-4" onSubmit={handleProductSubmit}>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t('products.image', 'Product Image')}
              </span>
              <div className="flex items-center gap-4">
                {form.image ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <img src={form.image} alt="Product" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, image: '' }))}
                      className="absolute right-0 top-0 bg-red-500 p-0.5 text-white hover:bg-red-600"
                    >
                      <div className="h-3 w-3">×</div>
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800">
                    <span className="text-xs text-slate-400">No Image</span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="SKU"
                value={form.sku}
                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                required
              />
              <Input
                label="Barcode"
                value={form.barcode}
                onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
              />
            </div>
            <Input
              label={t('products.name')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />

            <Input
              label="Mô tả"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Chi tiết về sản phẩm..."
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Select
                label={t('products.category')}
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                options={categoryOptions}
                placeholder="Chọn danh mục"
                required
              />
              {!editing ? (
                <Select
                  label="Nhà cung cấp ưu tiên"
                  value={form.preferredSupplierId}
                  onChange={(event) => setForm((prev) => ({ ...prev, preferredSupplierId: event.target.value }))}
                  options={supplierOptions}
                  placeholder="Chọn nhà cung cấp"
                  required
                />
              ) : null}
              <Input
                label={t('products.unit')}
                value={form.unit}
                onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <NumberInput
                label="Giá nhập (Chuẩn)"
                min={0}
                value={form.priceIn}
                onChange={(event) => setForm((prev) => ({ ...prev, priceIn: Number(event.target.value) }))}
                required
              />
              <NumberInput
                label="Giá bán"
                min={0}
                value={form.priceOut}
                onChange={(event) => setForm((prev) => ({ ...prev, priceOut: Number(event.target.value) }))}
                required
              />
              <NumberInput
                label="Tồn kho tối thiểu"
                min={0}
                value={form.minStock}
                onChange={(event) => setForm((prev) => ({ ...prev, minStock: Number(event.target.value) }))}
              />
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {supplierView === 'list' ? (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold">Danh sách nhà cung cấp cho sản phẩm này</h3>
                  <button
                    onClick={startAddSupplier}
                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded hover:bg-indigo-100 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Thêm NCC
                  </button>
                </div>

                {loadingSuppliers ? (
                  <p className="text-sm text-slate-500">Đang tải...</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Nhà cung cấp</th>
                          <th className="px-4 py-2">Giá nhập</th>
                          <th className="px-4 py-2 text-center">Ưu tiên</th>
                          <th className="px-4 py-2">SKU NCC</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {supplierProducts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-4 text-center text-slate-500">Chưa có nhà cung cấp nào được gán.</td>
                          </tr>
                        ) : (
                          supplierProducts.map((sp) => (
                            <tr key={sp.id}>
                              <td className="px-4 py-2 font-medium">{sp.supplierId?.name || 'N/A'}</td>
                              <td className="px-4 py-2 text-indigo-600 font-semibold">
                                {sp.priceIn?.toLocaleString()} {sp.currency}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {sp.isPreferred && <Check className="h-4 w-4 inline text-green-500" />}
                              </td>
                              <td className="px-4 py-2 text-slate-500">{sp.supplierSku || '-'}</td>
                              <td className="px-4 py-2 text-right">
                                <button onClick={() => startEditSupplier(sp)} className="text-slate-400 hover:text-indigo-600 mr-2"><Pencil className="h-3 w-3" /></button>
                                <button onClick={() => handleDeleteSupplierProduct(sp.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleSaveSupplier} className="space-y-4 bg-slate-50 p-4 rounded-lg dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{editingSP ? 'Cập nhật NCC' : 'Thêm NCC cho sản phẩm'}</h3>
                  <button type="button" onClick={() => setSupplierView('list')} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Quay lại
                  </button>
                </div>

                <Select
                  label="Chọn nhà cung cấp"
                  value={supplierForm.supplierId}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, supplierId: e.target.value }))}
                  options={supplierOptions}
                  placeholder="Nhà cung cấp"
                  required
                  disabled={!!editingSP}
                />

                <div className="grid grid-cols-2 gap-4">
                  <NumberInput
                    label="Giá nhập"
                    value={supplierForm.priceIn}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, priceIn: Number(e.target.value) }))}
                    required
                    min={0}
                  />
                  <Select
                    label="Tiền tệ"
                    value={supplierForm.currency}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, currency: e.target.value }))}
                    options={[{ value: 'VND', label: 'VND' }, { value: 'USD', label: 'USD' }]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Mã SKU của NCC (Tùy chọn)"
                    value={supplierForm.supplierSku}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, supplierSku: e.target.value }))}
                  />
                  <div className="flex items-center pt-8">
                    <input
                      type="checkbox"
                      id="sp-pref"
                      checked={supplierForm.isPreferred}
                      onChange={(e) => setSupplierForm(prev => ({ ...prev, isPreferred: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor="sp-pref" className="text-sm">Nhà cung cấp ưu tiên</label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setSupplierView('list')} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50">Hủy</button>
                  <button type="submit" className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-500 flex items-center gap-1">
                    <Save className="h-3 w-3" /> Lưu
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}


